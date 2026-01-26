import logger from '../utils/logger';
import { secureGetItem, secureRemoveItem } from '../utils/secureStorage';

// URLs de los backends
const API_LOCALS = [
  'http://10.28.168.57:5000',
  'http://localhost:5000'
];
const API_DEPLOYED = 'https://cierre-caja-api.onrender.com';
const API_TIMEOUT = 15000; // 15 segundos de timeout para backends locales cuando ya está configurado
const API_TIMEOUT_INITIAL = 45000; // 45 segundos para la PRIMERA conexión (descubrimiento)

// Variable para almacenar qué backend está funcionando
let workingApiBase = null;

// Contador de fallos consecutivos por backend
// Un backend solo se considera "caído" después de fallar múltiples veces
const backendFailureCount = new Map();
const MAX_FAILURES_BEFORE_BLACKLIST = 3; // Número de fallos antes de marcar como no disponible

// Blacklist de backends locales que NO están disponibles en esta sesión
// Esto evita intentar conectar con backends que ya sabemos que no responden
let failedLocalBackends = new Set();

/**
 * Limpia la blacklist de backends locales fallidos y contadores
 * Útil si se quiere reintentar con todos los backends
 */
export const clearBackendBlacklist = () => {
  failedLocalBackends.clear();
  backendFailureCount.clear();
  logger.info('🔄 Blacklist y contadores de fallos limpiados - Se reintentará con todos los backends');
};

/**
 * Detecta si el frontend está corriendo en un entorno local
 * @returns {boolean} - true si es local, false si está desplegado
 */
const isLocalEnvironment = () => {
  const hostname = window.location.hostname;

  // PRIMERO: Verificar si es un dominio de producción conocido
  // Si es un dominio de producción, SIEMPRE retornar false (no es local)
  const productionDomains = [
    'onrender.com',
    'netlify.app',
    'vercel.app',
    'github.io',
    'herokuapp.com',
    'railway.app',
    'fly.dev'
  ];

  const isProductionDomain = productionDomains.some(domain =>
    hostname.endsWith(domain) || hostname.includes(domain)
  );

  if (isProductionDomain) {
    return false; // Es producción, NO es local
  }

  // SEGUNDO: Verificar si es una IP/hostname local
  const isLocal = (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.') ||
    hostname.startsWith('172.17.') ||
    hostname.startsWith('172.18.') ||
    hostname.startsWith('172.19.') ||
    hostname.startsWith('172.2') ||
    hostname.startsWith('172.30.') ||
    hostname.startsWith('172.31.')
  );

  return isLocal;
};

/**
 * Función para hacer fetch con timeout
 * @param {string} url - URL completa
 * @param {object} options - Opciones de fetch
 * @param {number} timeout - Timeout en milisegundos
 * @returns {Promise} - Promesa con la respuesta
 */
const fetchWithTimeout = async (url, options, timeout) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: 'include',  // Enviar cookies en todas las peticiones
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Función helper para hacer peticiones autenticadas a la API con fallback inteligente
 * - Si el frontend está en LOCAL: Prioridad backends locales -> fallback a desplegado
 * - Si el frontend está DESPLEGADO: Solo usa backend desplegado
 * @param {string} endpoint - El endpoint de la API (ej: '/api/sum_payments')
 * @param {object} options - Opciones de fetch (method, body, etc.)
 * @param {number} customTimeout - Timeout personalizado en milisegundos (opcional)
 * @returns {Promise} - Promesa con la respuesta de la API
 */
export const authenticatedFetch = async (endpoint, options = {}, customTimeout = null) => {
  // Obtener el token del almacenamiento seguro
  const token = secureGetItem('authToken');

  // Preparar los headers
  const headers = {
    ...(options.headers || {}),
  };

  // Solo agregar Content-Type si no es FormData
  // FormData necesita que el navegador establezca el Content-Type automáticamente
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Agregar el token si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Si Content-Type es undefined, eliminarlo
  if (headers['Content-Type'] === undefined) {
    delete headers['Content-Type'];
  }

  // Opciones de fetch con headers
  const fetchOptions = {
    ...options,
    headers,
  };

  let response = null;
  let lastError = null;

  // Detectar si estamos en entorno local o desplegado
  const isLocal = isLocalEnvironment();

  if (isLocal) {
    logger.info('Frontend en entorno LOCAL - Prioridad: backends locales');
  } else {
    logger.info('Frontend en entorno DESPLEGADO - Usando solo backend desplegado');
  }

  // Si ya sabemos qué backend funciona, usar ese EXCLUSIVAMENTE
  if (workingApiBase) {
    // Si estamos desplegados, solo usar el backend desplegado
    if (!isLocal && workingApiBase !== API_DEPLOYED) {
      workingApiBase = null; // Resetear si cambiamos de entorno
    } else {
      try {
        const isLocalBackend = API_LOCALS.includes(workingApiBase);
        const timeout = customTimeout || (isLocalBackend ? API_TIMEOUT : 80000);
        response = await fetchWithTimeout(
          `${workingApiBase}${endpoint}`,
          fetchOptions,
          timeout
        );

        // Si la conexión fue exitosa (incluso con errores HTTP), retornar la respuesta
        // Solo resetear workingApiBase si hay error de CONEXIÓN (timeout, red, etc.)
        if (response.status === 401) {
          secureRemoveItem('authToken');
          secureRemoveItem('authUser');
          window.location.href = '/login';
          throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
        }
        if (response.status === 403) {
          window.location.href = '/unauthorized';
          throw new Error('No tienes permisos para acceder a este recurso.');
        }

        // Retornar la respuesta (exitosa o con error HTTP)
        // No resetear workingApiBase porque el backend SÍ está disponible
        logger.info(`✅ Usando backend configurado ${workingApiBase} - No se intentará con otros backends`);
        return response;
      } catch (error) {
        // Solo resetear si hay error de CONEXIÓN (no error HTTP)
        logger.warn(`Error de conexión con ${workingApiBase}:`, error.message);
        lastError = error;

        // Si el backend que estaba funcionando ahora falla, limpiar blacklist y contadores
        // Las condiciones de red pueden haber cambiado
        if (API_LOCALS.includes(workingApiBase)) {
          failedLocalBackends.clear();
          backendFailureCount.clear();
          logger.info('🔄 Backend configurado falló - Limpiando blacklist y contadores para reintentar');
        }

        workingApiBase = null; // Resetear solo si hay error de conexión
      }
    }
  }

  // LÓGICA PARA ENTORNO LOCAL: Intentar backends locales primero
  if (isLocal) {
    // Filtrar backends locales que NO están en la blacklist
    const availableLocalBackends = API_LOCALS.filter(api => !failedLocalBackends.has(api));

    if (availableLocalBackends.length === 0) {
      logger.warn('⚠️ Todos los backends locales están en blacklist - Saltando a backend desplegado');
    } else if (failedLocalBackends.size > 0) {
      logger.info(`ℹ️ Backends en blacklist (no se intentarán): ${Array.from(failedLocalBackends).join(', ')}`);
    }

    for (const localApi of availableLocalBackends) {
      try {
        // Usar timeout más largo si aún no tenemos backend configurado (primera conexión)
        const isInitialDiscovery = !workingApiBase;
        const timeout = customTimeout || (isInitialDiscovery ? API_TIMEOUT_INITIAL : API_TIMEOUT);

        if (isInitialDiscovery) {
          logger.info(`🔄 Descubriendo backend local (timeout ${timeout/1000}s):`, localApi);
        } else {
          logger.info(`🔄 Intentando conectar con backend local (timeout ${timeout/1000}s):`, localApi);
        }

        response = await fetchWithTimeout(
          `${localApi}${endpoint}`,
          fetchOptions,
          timeout
        );

        // ✅ ÉXITO: Resetear contador de fallos y guardar como backend funcionando
        backendFailureCount.delete(localApi);
        workingApiBase = localApi;
        logger.info(`✅ Backend local configurado: ${localApi} - Peticiones futuras usarán este backend exclusivamente`);

        // Si la respuesta es 401 (no autorizado), limpiar la sesión
        if (response.status === 401) {
          secureRemoveItem('authToken');
          secureRemoveItem('authUser');
          window.location.href = '/login';
          throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
        }

        // Si la respuesta es 403 (sin permisos), redirigir a unauthorized
        if (response.status === 403) {
          window.location.href = '/unauthorized';
          throw new Error('No tienes permisos para acceder a este recurso.');
        }

        return response;
      } catch (localError) {
        // Incrementar contador de fallos
        const currentFailures = (backendFailureCount.get(localApi) || 0) + 1;
        backendFailureCount.set(localApi, currentFailures);

        // Solo agregar a blacklist después de múltiples fallos consecutivos
        if (currentFailures >= MAX_FAILURES_BEFORE_BLACKLIST) {
          failedLocalBackends.add(localApi);
          logger.warn(`❌ Backend local ${localApi} falló ${currentFailures} veces - AGREGADO A BLACKLIST`);
        } else {
          logger.warn(`⚠️ Backend local ${localApi} falló (intento ${currentFailures}/${MAX_FAILURES_BEFORE_BLACKLIST}) - Reintentará en próxima petición`);
        }

        lastError = localError;
        // Continuar con el siguiente backend local disponible
      }
    }

    // Si todos los backends locales fallaron, intentar con el desplegado como fallback
    logger.warn('⚠️ TODOS los backends locales fallaron - Intentando con backend desplegado como último recurso');
  }

  // Intentar con el backend desplegado (solo si estamos en producción O si los backends locales fallaron)
  try {
    logger.info('🌐 Conectando con backend desplegado:', API_DEPLOYED);
    const timeout = customTimeout || 30000; // Timeout más largo para el backend desplegado (30 segundos por defecto)
    response = await fetchWithTimeout(
      `${API_DEPLOYED}${endpoint}`,
      fetchOptions,
      timeout
    );

    // Si la conexión fue exitosa, guardar que el backend desplegado funciona
    workingApiBase = API_DEPLOYED;
    logger.info('Conectado exitosamente con backend desplegado');

    // Si la respuesta es 401 (no autorizado), limpiar la sesión
    if (response.status === 401) {
      secureRemoveItem('authToken');
      secureRemoveItem('authUser');
      window.location.href = '/login';
      throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
    }

    // Si la respuesta es 403 (sin permisos), redirigir a unauthorized
    if (response.status === 403) {
      window.location.href = '/unauthorized';
      throw new Error('No tienes permisos para acceder a este recurso.');
    }

    return response;
  } catch (deployedError) {
    const errorDetails = isLocal
      ? {
        locales: API_LOCALS.join(', '),
        deployed: API_DEPLOYED,
        lastError: deployedError.message,
      }
      : {
        deployed: API_DEPLOYED,
        lastError: deployedError.message,
      };

    logger.error('Error de conexión:', errorDetails);

    throw new Error(
      'No se pudo conectar con el servidor. Por favor verifica tu conexión a internet.'
    );
  }
};

/**
 * Función para enviar el cierre de caja
 * @param {object} payload - Los datos del cierre
 * @returns {Promise} - Promesa con los resultados
 */
export const submitCashClosing = async (payload) => {
  const response = await authenticatedFetch('/api/sum_payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al procesar el cierre de caja');
  }

  return await response.json();
};

/**
 * Función para realizar preconsulta a Alegra
 * Obtiene resumen de ventas antes de hacer el cierre de caja
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {Promise} - Promesa con los datos de la preconsulta
 */
export const getPreconsulta = async (date) => {
  const response = await authenticatedFetch(`/api/preconsulta?date=${date}`, {
    method: 'GET',
  }, 60000); // Timeout de 60 segundos

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al realizar la preconsulta');
  }

  return await response.json();
};

/**
 * Función para obtener comparación de ventas año sobre año
 * @param {string} date - Fecha opcional en formato YYYY-MM-DD (si no se proporciona, usa la fecha actual)
 * @returns {Promise} - Promesa con los datos de comparación
 */
export const getSalesComparisonYoY = async (date = null) => {
  const endpoint = date ? `/api/sales_comparison_yoy?date=${date}` : '/api/sales_comparison_yoy';

  const response = await authenticatedFetch(endpoint, {
    method: 'GET',
  }, 60000); // Timeout de 60 segundos para esta petición

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al obtener comparación de ventas');
  }

  return await response.json();
};

/**
 * Obtiene la URL de la documentación de la API (Swagger)
 * @returns {string} - URL completa de la documentación
 */
export const getApiDocsUrl = () => {
  if (isLocalEnvironment()) {
    // En local, intentar con la IP de red primero, luego localhost
    return `${API_LOCALS[0]}/api/docs`;
  } else {
    // En producción, usar el backend desplegado
    return `${API_DEPLOYED}/api/docs`;
  }
};

export default {
  authenticatedFetch,
  submitCashClosing,
  getPreconsulta,
  getSalesComparisonYoY,
  getApiDocsUrl,
  clearBackendBlacklist,
};

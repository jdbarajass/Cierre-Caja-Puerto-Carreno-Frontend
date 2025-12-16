import logger from '../utils/logger';
import { secureGetItem, secureRemoveItem } from '../utils/secureStorage';

// URLs de los backends
const API_LOCALS = [
  'http://10.28.168.57:5000',
  'http://localhost:5000'
];
const API_DEPLOYED = 'https://cierre-caja-api.onrender.com';
const API_TIMEOUT = 15000; // 15 segundos de timeout para los backends locales

// Variable para almacenar qué backend está funcionando
let workingApiBase = null;

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

  // Si ya sabemos qué backend funciona, usar ese primero
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

        // Si la respuesta es exitosa, retornarla
        if (response.ok || response.status === 401 || response.status === 403) {
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
          return response;
        }
      } catch (error) {
        logger.warn(`Error al conectar con ${workingApiBase}:`, error.message);
        lastError = error;
        workingApiBase = null; // Resetear para intentar con todos
      }
    }
  }

  // LÓGICA PARA ENTORNO LOCAL: Intentar backends locales primero
  if (isLocal) {
    for (const localApi of API_LOCALS) {
      try {
        logger.info('Intentando conectar con backend local:', localApi);
        const timeout = customTimeout || API_TIMEOUT;
        response = await fetchWithTimeout(
          `${localApi}${endpoint}`,
          fetchOptions,
          timeout
        );

        // Si la conexión fue exitosa, guardar que este backend local funciona
        workingApiBase = localApi;
        logger.info('Conectado exitosamente con backend local:', localApi);

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
        logger.warn(`Backend local ${localApi} no disponible`);
        lastError = localError;
        // Continuar con el siguiente backend local
      }
    }

    // Si todos los backends locales fallaron, intentar con el desplegado como fallback
    logger.warn('Backends locales no disponibles, intentando con backend desplegado como fallback...');
  }

  // Intentar con el backend desplegado
  try {
    logger.info('Conectando con backend desplegado:', API_DEPLOYED);
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

export default {
  authenticatedFetch,
  submitCashClosing,
  getSalesComparisonYoY,
};

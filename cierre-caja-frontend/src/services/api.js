import logger from '../utils/logger';

// URLs de los backends (prioridad: locales -> desplegado)
const API_LOCALS = [
  'http://10.28.168.57:5000',
  'http://localhost:5000'
];
const API_DEPLOYED = 'https://cierre-caja-api.onrender.com';
const API_TIMEOUT = 15000; // 15 segundos de timeout para los backends locales

// Variable para almacenar qué backend está funcionando
let workingApiBase = null;

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
 * Función helper para hacer peticiones autenticadas a la API con fallback
 * Intenta primero con el backend local, si falla usa el desplegado
 * @param {string} endpoint - El endpoint de la API (ej: '/api/sum_payments')
 * @param {object} options - Opciones de fetch (method, body, etc.)
 * @returns {Promise} - Promesa con la respuesta de la API
 */
export const authenticatedFetch = async (endpoint, options = {}) => {
  // Obtener el token del localStorage
  const token = localStorage.getItem('authToken');

  // Preparar los headers
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Agregar el token si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Opciones de fetch con headers
  const fetchOptions = {
    ...options,
    headers,
  };

  let response = null;
  let lastError = null;

  // Si ya sabemos qué backend funciona, usar ese primero
  if (workingApiBase) {
    try {
      const isLocal = API_LOCALS.includes(workingApiBase);
      response = await fetchWithTimeout(
        `${workingApiBase}${endpoint}`,
        fetchOptions,
        isLocal ? API_TIMEOUT : 80000
      );

      // Si la respuesta es exitosa, retornarla
      if (response.ok || response.status === 401) {
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          window.location.href = '/login';
          throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
        }
        return response;
      }
    } catch (error) {
      logger.warn(`Error al conectar con ${workingApiBase}:`, error.message);
      lastError = error;
      workingApiBase = null; // Resetear para intentar con todos
    }
  }

  // Intentar con cada backend local
  for (const localApi of API_LOCALS) {
    try {
      logger.info('Intentando conectar con backend local:', localApi);
      response = await fetchWithTimeout(
        `${localApi}${endpoint}`,
        fetchOptions,
        API_TIMEOUT
      );

      // Si la conexión fue exitosa, guardar que este backend local funciona
      workingApiBase = localApi;
      logger.info('Conectado exitosamente con backend local:', localApi);

      // Si la respuesta es 401 (no autorizado), limpiar la sesión
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        window.location.href = '/login';
        throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      }

      return response;
    } catch (localError) {
      logger.warn(`Backend local ${localApi} no disponible`);
      lastError = localError;
      // Continuar con el siguiente backend local
    }
  }

  // Si todos los backends locales fallaron, intentar con el desplegado
  logger.warn('Todos los backends locales no disponibles, intentando con backend desplegado...');
  try {
    logger.info('Intentando conectar con backend desplegado:', API_DEPLOYED);
    response = await fetchWithTimeout(
      `${API_DEPLOYED}${endpoint}`,
      fetchOptions,
      30000 // Timeout más largo para el backend desplegado (30 segundos)
    );

    // Si la conexión fue exitosa, guardar que el backend desplegado funciona
    workingApiBase = API_DEPLOYED;
    logger.info('Conectado exitosamente con backend desplegado');

    // Si la respuesta es 401 (no autorizado), limpiar la sesión
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.href = '/login';
      throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
    }

    return response;
  } catch (deployedError) {
    logger.error('Todos los backends fallaron:', {
      locales: API_LOCALS.map(api => api).join(', '),
      deployed: API_DEPLOYED,
      lastError: deployedError.message,
    });
    throw new Error(
      'No se pudo conectar con ningún servidor. Por favor verifica tu conexión a internet.'
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

export default {
  authenticatedFetch,
  submitCashClosing,
};

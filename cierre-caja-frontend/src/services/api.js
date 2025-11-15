import logger from '../utils/logger';

// URLs de los backends (prioridad: local -> desplegado)
const API_LOCAL = 'http://10.28.168.57:5000';
const API_DEPLOYED = 'https://cierre-caja-api.onrender.com';
const API_TIMEOUT = 15000; // 15 segundos de timeout para el backend local

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
 * @param {string} endpoint - El endpoint de la API (ej: '/sum_payments')
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
      response = await fetchWithTimeout(
        `${workingApiBase}${endpoint}`,
        fetchOptions,
        workingApiBase === API_LOCAL ? API_TIMEOUT : 80000
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
      workingApiBase = null; // Resetear para intentar con ambos
    }
  }

  // Intentar primero con el backend local
  try {
    logger.info('Intentando conectar con backend local:', API_LOCAL);
    response = await fetchWithTimeout(
      `${API_LOCAL}${endpoint}`,
      fetchOptions,
      API_TIMEOUT
    );

    // Si la conexión fue exitosa, guardar que el backend local funciona
    workingApiBase = API_LOCAL;
    logger.info('Conectado exitosamente con backend local');

    // Si la respuesta es 401 (no autorizado), limpiar la sesión
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.href = '/login';
      throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
    }

    return response;
  } catch (localError) {
    logger.warn('Backend local no disponible, intentando con backend desplegado...');
    lastError = localError;

    // Si falla el local, intentar con el desplegado
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
      logger.error('Ambos backends fallaron:', {
        local: lastError.message,
        deployed: deployedError.message,
      });
      throw new Error(
        'No se pudo conectar con ningún servidor. Por favor verifica tu conexión a internet.'
      );
    }
  }
};

/**
 * Función para enviar el cierre de caja
 * @param {object} payload - Los datos del cierre
 * @returns {Promise} - Promesa con los resultados
 */
export const submitCashClosing = async (payload) => {
  const response = await authenticatedFetch('/sum_payments', {
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

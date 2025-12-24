/**
 * Utilidad para realizar peticiones con reintentos automáticos
 * Útil cuando el servidor está en cold start y necesita tiempo para iniciarse
 */

/**
 * Realiza una petición con reintentos automáticos
 *
 * @param {Function} fetchFunction - Función que realiza la petición (debe retornar una Promise)
 * @param {Object} options - Opciones de configuración
 * @param {number} options.maxRetries - Número máximo de reintentos (default: 3)
 * @param {number} options.retryDelay - Milisegundos de espera entre reintentos (default: 8000)
 * @param {Function} options.shouldRetry - Función que determina si debe reintentar basado en el resultado
 * @param {Function} options.onRetry - Callback que se llama antes de cada reintento
 * @returns {Promise} - Resultado de la petición
 */
export const fetchWithRetry = async (
  fetchFunction,
  {
    maxRetries = 3,
    retryDelay = 8000,
    shouldRetry = (result, error) => {
      // Por defecto, reintenta si:
      // 1. Hay un error de red/timeout
      // 2. El resultado es null/undefined
      // 3. El resultado indica servidor en cold start
      if (error) {
        return error.name === 'TypeError' ||
               error.message?.includes('timeout') ||
               error.message?.includes('network') ||
               error.message?.includes('fetch');
      }
      return !result || result.success === false;
    },
    onRetry = (retryCount, maxRetries) => {
      console.log(`🔄 Reintento ${retryCount}/${maxRetries} - Esperando ${retryDelay/1000} segundos...`);
    }
  } = {}
) => {
  let lastError = null;
  let lastResult = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Si es un reintento, esperar antes de hacer la petición
      if (attempt > 0) {
        onRetry(attempt, maxRetries);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      console.log(`📡 Intento ${attempt + 1}/${maxRetries + 1}`);

      // Ejecutar la función de fetch
      const result = await fetchFunction();
      lastResult = result;
      lastError = null;

      // Verificar si debemos reintentar
      if (!shouldRetry(result, null) || attempt === maxRetries) {
        // No reintentar, retornar el resultado
        return result;
      }

      console.log(`⚠️ Resultado no válido, preparando reintento...`);

    } catch (error) {
      lastError = error;
      lastResult = null;

      console.error(`❌ Error en intento ${attempt + 1}:`, error.message);

      // Si es el último intento o no debemos reintentar este error, lanzar
      if (attempt === maxRetries || !shouldRetry(null, error)) {
        throw error;
      }

      console.log(`⚠️ Error recuperable, preparando reintento...`);
    }
  }

  // Si llegamos aquí, se agotaron los reintentos
  if (lastError) {
    throw lastError;
  }

  return lastResult;
};

/**
 * Wrapper específico para peticiones de ventas
 * Detecta automáticamente cold start cuando las ventas son 0
 *
 * @param {Function} fetchFunction - Función que realiza la petición
 * @param {Object} options - Opciones adicionales
 * @returns {Promise} - Resultado de la petición
 */
export const fetchSalesWithRetry = async (fetchFunction, options = {}) => {
  return fetchWithRetry(fetchFunction, {
    maxRetries: 3,
    retryDelay: 8000,
    shouldRetry: (result, error) => {
      // Reintentar si hay error
      if (error) {
        return error.name === 'TypeError' ||
               error.message?.includes('timeout') ||
               error.message?.includes('network') ||
               error.message?.includes('fetch');
      }

      // Reintentar si no hay resultado o no es exitoso
      if (!result || !result.success) {
        return true;
      }

      // Reintentar si es el primer intento y las ventas son 0
      // (posible cold start)
      const isFirstAttempt = options.currentAttempt === 0;
      if (isFirstAttempt) {
        const hasZeroSales = result.total_sales === 0 ||
                           (result.data && Array.isArray(result.data) && result.data.length === 0);
        return hasZeroSales;
      }

      return false;
    },
    ...options
  });
};

export default {
  fetchWithRetry,
  fetchSalesWithRetry
};

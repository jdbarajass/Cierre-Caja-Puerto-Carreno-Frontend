import { authenticatedFetch } from './api';
import logger from '../utils/logger';

/**
 * Servicio para interactuar con los endpoints directos de Alegra (APIs Avanzadas)
 * Estos endpoints son más rápidos y consultan directamente las APIs de Alegra
 * Timeout configurado a 3 minutos para consultas de inventario completo
 */

const DIRECT_API_TIMEOUT = 180000; // 3 minutos para traer todo el inventario

/**
 * Obtiene el reporte de valor de inventario
 * @param {Object} params - Parámetros de consulta
 * @param {string} params.toDate - Fecha hasta la cual obtener el inventario (YYYY-MM-DD)
 * @param {number} params.limit - Límite de items por página (max: 1000, default: 100)
 * @param {number} params.page - Número de página (default: 1)
 * @param {string} params.query - Búsqueda por nombre de producto (opcional)
 * @returns {Promise<Object>} - Datos de inventario con paginación
 */
export const getInventoryValueReport = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.toDate) queryParams.append('toDate', params.toDate);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.query) queryParams.append('query', params.query);

    const queryString = queryParams.toString();
    const endpoint = `/api/direct/inventory/value-report${queryString ? `?${queryString}` : ''}`;

    logger.info('Obteniendo inventario (API Directa):', params);
    const response = await authenticatedFetch(endpoint, { method: 'GET' }, DIRECT_API_TIMEOUT);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener inventario');
    }

    return await response.json();
  } catch (error) {
    logger.error('Error en getInventoryValueReport:', error);
    throw error;
  }
};

/**
 * Obtiene los totales de ventas agrupados por día o mes
 * @param {Object} params - Parámetros de consulta
 * @param {string} params.from - Fecha de inicio (YYYY-MM-DD) - REQUERIDO
 * @param {string} params.to - Fecha de fin (YYYY-MM-DD) - REQUERIDO
 * @param {string} params.groupBy - Agrupar por 'day' o 'month' (default: 'day')
 * @param {number} params.limit - Límite de resultados (default: 30)
 * @param {number} params.start - Offset para paginación (default: 0)
 * @returns {Promise<Object>} - Datos de totales de ventas
 */
export const getSalesTotals = async (params = {}) => {
  try {
    if (!params.from || !params.to) {
      throw new Error('Los parámetros "from" y "to" son requeridos');
    }

    const queryParams = new URLSearchParams();
    queryParams.append('from', params.from);
    queryParams.append('to', params.to);
    if (params.groupBy) queryParams.append('groupBy', params.groupBy);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.start) queryParams.append('start', params.start.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/direct/sales/totals?${queryString}`;

    logger.info('Obteniendo totales de ventas (API Directa):', params);
    const response = await authenticatedFetch(endpoint, { method: 'GET' }, DIRECT_API_TIMEOUT);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener totales de ventas');
    }

    return await response.json();
  } catch (error) {
    logger.error('Error en getSalesTotals:', error);
    throw error;
  }
};

/**
 * Obtiene TODOS los documentos de ventas detallados (facturas) para un rango de fechas
 * El backend ahora implementa paginación automática y trae TODAS las facturas (30 en 30)
 *
 * @param {Object} params - Parámetros de consulta
 * @param {string} params.from - Fecha de inicio (YYYY-MM-DD) - REQUERIDO
 * @param {string} params.to - Fecha de fin (YYYY-MM-DD) - REQUERIDO
 * @returns {Promise<Object>} - Datos con TODOS los documentos de ventas
 */
export const getSalesDocuments = async (params = {}) => {
  try {
    if (!params.from || !params.to) {
      throw new Error('Los parámetros "from" y "to" son requeridos');
    }

    const queryParams = new URLSearchParams();
    queryParams.append('from', params.from);
    queryParams.append('to', params.to);

    const queryString = queryParams.toString();
    const endpoint = `/api/direct/sales/documents?${queryString}`;

    logger.info('Obteniendo TODOS los documentos de ventas (API Directa con paginación automática):', params);
    const response = await authenticatedFetch(endpoint, { method: 'GET' }, DIRECT_API_TIMEOUT);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener documentos de ventas');
    }

    return await response.json();
  } catch (error) {
    logger.error('Error en getSalesDocuments:', error);
    throw error;
  }
};

/**
 * Obtiene un resumen rápido de ventas (endpoint rápido)
 * @param {Object} params - Parámetros de consulta
 * @param {string} params.from - Fecha de inicio (YYYY-MM-DD) - REQUERIDO
 * @param {string} params.to - Fecha de fin (YYYY-MM-DD) - REQUERIDO
 * @returns {Promise<Object>} - Resumen rápido de ventas
 */
export const getQuickSalesSummary = async (params = {}) => {
  try {
    if (!params.from || !params.to) {
      throw new Error('Los parámetros "from" y "to" son requeridos');
    }

    const queryParams = new URLSearchParams();
    queryParams.append('from', params.from);
    queryParams.append('to', params.to);

    const queryString = queryParams.toString();
    const endpoint = `/api/sales/quick-summary?${queryString}`;

    logger.info('Obteniendo resumen rápido de ventas:', params);
    const response = await authenticatedFetch(endpoint, { method: 'GET' }, 30000); // 30 segundos timeout

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener resumen de ventas');
    }

    return await response.json();
  } catch (error) {
    logger.error('Error en getQuickSalesSummary:', error);
    throw error;
  }
};

export default {
  getInventoryValueReport,
  getSalesTotals,
  getSalesDocuments,
  getQuickSalesSummary,
};

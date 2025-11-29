import { authenticatedFetch } from './api';
import logger from '../utils/logger';

/**
 * Servicio para interactuar con los endpoints de análisis por tallas
 * Versión API: 2.1.3
 */

/**
 * Obtiene el análisis global de ventas por talla
 * @param {Object} options - Opciones de filtro
 * @param {string} options.date - Fecha específica (YYYY-MM-DD)
 * @param {string} options.startDate - Fecha inicio del rango
 * @param {string} options.endDate - Fecha fin del rango
 * @returns {Promise<Object>} - Datos del análisis por talla
 */
export const getAnalisisPorTalla = async (options = {}) => {
  const { date, startDate, endDate } = options;

  let params = new URLSearchParams();
  if (date) params.append('date', date);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const queryString = params.toString();
  const endpoint = `/api/products/analysis/sizes${queryString ? `?${queryString}` : ''}`;

  try {
    logger.info('Obteniendo análisis por talla:', endpoint);
    const response = await authenticatedFetch(endpoint, {}, 60000); // Timeout de 60s

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener análisis por talla');
    }

    const data = await response.json();
    logger.info('Análisis por talla obtenido exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al obtener análisis por talla:', error.message);
    throw error;
  }
};

/**
 * Obtiene el análisis de ventas por categoría y talla
 * @param {Object} options - Opciones de filtro
 * @param {string} options.date - Fecha específica (YYYY-MM-DD)
 * @param {string} options.startDate - Fecha inicio del rango
 * @param {string} options.endDate - Fecha fin del rango
 * @returns {Promise<Object>} - Datos del análisis por categoría y talla
 */
export const getAnalisisPorCategoriaTalla = async (options = {}) => {
  const { date, startDate, endDate } = options;

  let params = new URLSearchParams();
  if (date) params.append('date', date);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const queryString = params.toString();
  const endpoint = `/api/products/analysis/category-sizes${queryString ? `?${queryString}` : ''}`;

  try {
    logger.info('Obteniendo análisis por categoría y talla:', endpoint);
    const response = await authenticatedFetch(endpoint, {}, 60000); // Timeout de 60s

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener análisis por categoría y talla');
    }

    const data = await response.json();
    logger.info('Análisis por categoría y talla obtenido exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al obtener análisis por categoría y talla:', error.message);
    throw error;
  }
};

/**
 * Obtiene el análisis de ventas por departamento y talla
 * @param {Object} options - Opciones de filtro
 * @param {string} options.date - Fecha específica (YYYY-MM-DD)
 * @param {string} options.startDate - Fecha inicio del rango
 * @param {string} options.endDate - Fecha fin del rango
 * @returns {Promise<Object>} - Datos del análisis por departamento y talla
 */
export const getAnalisisPorDepartamentoTalla = async (options = {}) => {
  const { date, startDate, endDate } = options;

  let params = new URLSearchParams();
  if (date) params.append('date', date);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const queryString = params.toString();
  const endpoint = `/api/products/analysis/department-sizes${queryString ? `?${queryString}` : ''}`;

  try {
    logger.info('Obteniendo análisis por departamento y talla:', endpoint);
    const response = await authenticatedFetch(endpoint, {}, 60000); // Timeout de 60s

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener análisis por departamento y talla');
    }

    const data = await response.json();
    logger.info('Análisis por departamento y talla obtenido exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al obtener análisis por departamento y talla:', error.message);
    throw error;
  }
};

export default {
  getAnalisisPorTalla,
  getAnalisisPorCategoriaTalla,
  getAnalisisPorDepartamentoTalla
};

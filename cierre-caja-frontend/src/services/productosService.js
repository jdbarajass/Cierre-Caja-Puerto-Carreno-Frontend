import { authenticatedFetch } from './api';
import logger from '../utils/logger';

/**
 * Servicio para interactuar con los endpoints de análisis de productos
 */

/**
 * Obtiene el resumen ejecutivo de productos
 * @param {Object} options - Opciones de filtro
 * @param {string} options.date - Fecha específica (YYYY-MM-DD)
 * @param {string} options.startDate - Fecha inicio del rango
 * @param {string} options.endDate - Fecha fin del rango
 * @returns {Promise<Object>} - Datos del resumen
 */
export const getResumenProductos = async (options = {}) => {
  const { date, startDate, endDate } = options;

  let params = new URLSearchParams();
  if (date) params.append('date', date);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const queryString = params.toString();
  const endpoint = `/api/products/summary${queryString ? `?${queryString}` : ''}`;

  try {
    logger.info('Obteniendo resumen de productos:', endpoint);
    const response = await authenticatedFetch(endpoint);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener resumen de productos');
    }

    const data = await response.json();
    logger.info('Resumen obtenido exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al obtener resumen de productos:', error.message);
    throw error;
  }
};

/**
 * Obtiene el top N de productos más vendidos
 * @param {Object} options - Opciones de filtro
 * @param {string} options.date - Fecha específica
 * @param {string} options.startDate - Fecha inicio
 * @param {string} options.endDate - Fecha fin
 * @param {number} options.limit - Cantidad de productos (default: 10)
 * @param {boolean} options.unified - Si true, unifica variantes (default: false)
 * @returns {Promise<Object>} - Datos de los productos
 */
export const getTopProductos = async (options = {}) => {
  const { date, startDate, endDate, limit = 10, unified = false } = options;

  let params = new URLSearchParams();
  if (date) params.append('date', date);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  params.append('limit', limit);
  params.append('unified', unified);

  const queryString = params.toString();
  const endpoint = `/api/products/top-sellers?${queryString}`;

  try {
    logger.info('Obteniendo top productos:', endpoint);
    const response = await authenticatedFetch(endpoint);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener top productos');
    }

    const data = await response.json();
    logger.info('Top productos obtenido exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al obtener top productos:', error.message);
    throw error;
  }
};

/**
 * Obtiene el análisis por categorías
 * @param {Object} options - Opciones de filtro
 * @param {string} options.date - Fecha específica
 * @param {string} options.startDate - Fecha inicio
 * @param {string} options.endDate - Fecha fin
 * @returns {Promise<Object>} - Datos de categorías
 */
export const getCategorias = async (options = {}) => {
  const { date, startDate, endDate } = options;

  let params = new URLSearchParams();
  if (date) params.append('date', date);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const queryString = params.toString();
  const endpoint = `/api/products/categories${queryString ? `?${queryString}` : ''}`;

  try {
    logger.info('Obteniendo categorías de productos:', endpoint);
    const response = await authenticatedFetch(endpoint);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener categorías');
    }

    const data = await response.json();
    logger.info('Categorías obtenidas exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al obtener categorías:', error.message);
    throw error;
  }
};

/**
 * Obtiene el análisis completo de productos
 * @param {Object} options - Opciones de filtro
 * @param {string} options.date - Fecha específica
 * @param {string} options.startDate - Fecha inicio
 * @param {string} options.endDate - Fecha fin
 * @returns {Promise<Object>} - Datos completos del análisis
 */
export const getAnalisisCompleto = async (options = {}) => {
  const { date, startDate, endDate } = options;

  let params = new URLSearchParams();
  if (date) params.append('date', date);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const queryString = params.toString();
  const endpoint = `/api/products/analysis${queryString ? `?${queryString}` : ''}`;

  try {
    logger.info('Obteniendo análisis completo:', endpoint);
    const response = await authenticatedFetch(endpoint, {}, 60000); // Timeout de 60s para análisis completo

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener análisis completo');
    }

    const data = await response.json();
    logger.info('Análisis completo obtenido exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al obtener análisis completo:', error.message);
    throw error;
  }
};

/**
 * Descarga el reporte en PDF
 * @param {Object} options - Opciones de filtro
 * @param {string} options.date - Fecha específica
 * @param {string} options.startDate - Fecha inicio
 * @param {string} options.endDate - Fecha fin
 * @returns {Promise<void>} - Descarga el archivo PDF
 */
export const descargarReportePDF = async (options = {}) => {
  const { date, startDate, endDate } = options;

  let params = new URLSearchParams();
  if (date) params.append('date', date);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const queryString = params.toString();
  const endpoint = `/api/products/analysis/pdf${queryString ? `?${queryString}` : ''}`;

  try {
    logger.info('Generando PDF:', endpoint);
    const response = await authenticatedFetch(endpoint, {}, 90000); // Timeout de 90s para PDF

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al generar PDF');
    }

    // Convertir respuesta a blob
    const blob = await response.blob();

    // Crear URL temporal
    const urlBlob = window.URL.createObjectURL(blob);

    // Crear enlace de descarga
    const a = document.createElement('a');
    a.href = urlBlob;

    // Nombre del archivo
    const fileName = date
      ? `reporte_productos_${date}.pdf`
      : startDate && endDate
        ? `reporte_productos_${startDate}_${endDate}.pdf`
        : `reporte_productos_${new Date().toISOString().split('T')[0]}.pdf`;

    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    // Limpiar
    window.URL.revokeObjectURL(urlBlob);
    document.body.removeChild(a);

    logger.info('PDF descargado exitosamente:', fileName);
  } catch (error) {
    logger.error('Error al descargar PDF:', error.message);
    throw error;
  }
};

export default {
  getResumenProductos,
  getTopProductos,
  getCategorias,
  getAnalisisCompleto,
  descargarReportePDF
};

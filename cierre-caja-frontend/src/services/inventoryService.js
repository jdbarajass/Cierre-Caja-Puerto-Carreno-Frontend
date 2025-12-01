import { authenticatedFetch } from './api';
import logger from '../utils/logger';

/**
 * Servicio para interactuar con los endpoints de análisis de inventario
 */

/**
 * Obtiene el resumen ejecutivo del inventario
 * @returns {Promise<Object>} - Datos del resumen
 */
export const getSummary = async () => {
  const endpoint = '/api/inventory/summary';

  try {
    logger.info('Obteniendo resumen de inventario:', endpoint);
    const response = await authenticatedFetch(endpoint);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener resumen de inventario');
    }

    const data = await response.json();
    logger.info('Resumen de inventario obtenido exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al obtener resumen de inventario:', error.message);
    throw error;
  }
};

/**
 * Obtiene el análisis por departamento
 * @returns {Promise<Object>} - Datos por departamento
 */
export const getByDepartment = async () => {
  const endpoint = '/api/inventory/by-department';

  try {
    logger.info('Obteniendo análisis por departamento:', endpoint);
    const response = await authenticatedFetch(endpoint);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener análisis por departamento');
    }

    const data = await response.json();
    logger.info('Análisis por departamento obtenido exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al obtener análisis por departamento:', error.message);
    throw error;
  }
};

/**
 * Obtiene el análisis completo de inventario (todo en uno)
 * @returns {Promise<Object>} - Datos completos del análisis
 */
export const getFullAnalysis = async () => {
  const endpoint = '/api/inventory/analysis';

  try {
    logger.info('Obteniendo análisis completo de inventario:', endpoint);
    const response = await authenticatedFetch(endpoint, {}, 60000); // Timeout de 60s

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
 * Obtiene el análisis por categoría
 * @returns {Promise<Object>} - Datos por categoría
 */
export const getByCategory = async () => {
  const endpoint = '/api/inventory/by-category';

  try {
    logger.info('Obteniendo análisis por categoría:', endpoint);
    const response = await authenticatedFetch(endpoint);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener análisis por categoría');
    }

    const data = await response.json();
    logger.info('Análisis por categoría obtenido exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al obtener análisis por categoría:', error.message);
    throw error;
  }
};

/**
 * Obtiene el análisis por talla
 * @returns {Promise<Object>} - Datos por talla
 */
export const getBySize = async () => {
  const endpoint = '/api/inventory/by-size';

  try {
    logger.info('Obteniendo análisis por talla:', endpoint);
    const response = await authenticatedFetch(endpoint);

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
 * Obtiene productos sin stock
 * @returns {Promise<Object>} - Lista de productos sin stock
 */
export const getOutOfStock = async () => {
  const endpoint = '/api/inventory/out-of-stock';

  try {
    logger.info('Obteniendo productos sin stock:', endpoint);
    const response = await authenticatedFetch(endpoint);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener productos sin stock');
    }

    const data = await response.json();
    logger.info('Productos sin stock obtenidos exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al obtener productos sin stock:', error.message);
    throw error;
  }
};

/**
 * Obtiene productos con bajo stock
 * @param {number} threshold - Umbral de stock bajo (default: 5)
 * @returns {Promise<Object>} - Lista de productos con bajo stock
 */
export const getLowStock = async (threshold = 5) => {
  const endpoint = `/api/inventory/low-stock?threshold=${threshold}`;

  try {
    logger.info('Obteniendo productos con bajo stock:', endpoint);
    const response = await authenticatedFetch(endpoint);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener productos con bajo stock');
    }

    const data = await response.json();
    logger.info('Productos con bajo stock obtenidos exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al obtener productos con bajo stock:', error.message);
    throw error;
  }
};

/**
 * Obtiene top productos por valor de inventario
 * @param {number} limit - Cantidad de productos (default: 20)
 * @returns {Promise<Object>} - Lista de top productos
 */
export const getTopByValue = async (limit = 20) => {
  const endpoint = `/api/inventory/top-by-value?limit=${limit}`;

  try {
    logger.info('Obteniendo top productos por valor:', endpoint);
    const response = await authenticatedFetch(endpoint);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener top productos');
    }

    const data = await response.json();
    logger.info('Top productos obtenidos exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al obtener top productos:', error.message);
    throw error;
  }
};

/**
 * Obtiene el análisis ABC (Pareto)
 * @returns {Promise<Object>} - Datos del análisis ABC
 */
export const getABCAnalysis = async () => {
  const endpoint = '/api/inventory/abc-analysis';

  try {
    logger.info('Obteniendo análisis ABC:', endpoint);
    const response = await authenticatedFetch(endpoint);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener análisis ABC');
    }

    const data = await response.json();
    logger.info('Análisis ABC obtenido exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al obtener análisis ABC:', error.message);
    throw error;
  }
};

/**
 * Sube un archivo de inventario (CSV o Excel) para análisis
 * @param {File} file - Archivo a subir (.csv, .xlsx, .xls)
 * @returns {Promise<Object>} - Análisis del archivo
 */
export const uploadFile = async (file) => {
  const endpoint = '/api/inventory/upload-file';

  try {
    logger.info('Subiendo archivo de inventario:', file.name);

    const formData = new FormData();
    formData.append('file', file);

    const response = await authenticatedFetch(endpoint, {
      method: 'POST',
      body: formData
    }, 60000); // Timeout de 60s para archivos grandes

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al procesar el archivo');
    }

    const data = await response.json();
    logger.info('Archivo procesado exitosamente');
    return data;
  } catch (error) {
    logger.error('Error al subir archivo de inventario:', error.message);
    throw error;
  }
};

export default {
  getSummary,
  getByDepartment,
  getFullAnalysis,
  getByCategory,
  getBySize,
  getOutOfStock,
  getLowStock,
  getTopByValue,
  getABCAnalysis,
  uploadFile
};

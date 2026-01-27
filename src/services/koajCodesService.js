import { authenticatedFetch } from './api';
import logger from '../utils/logger';

/**
 * Obtener lista de todos los códigos KOAJ
 * @param {Object} filters - Filtros opcionales
 * @param {string} filters.search - Buscar por código o categoría
 * @param {string} filters.applies_to - Filtrar por género
 * @returns {Promise<Object>} - Lista de códigos
 */
export const getKoajCodes = async (filters = {}) => {
  try {
    logger.info('Solicitando códigos KOAJ...');

    // Construir query params
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.applies_to) params.append('applies_to', filters.applies_to);

    const queryString = params.toString();
    const endpoint = queryString ? `/api/koaj-codes?${queryString}` : '/api/koaj-codes';

    const response = await authenticatedFetch(endpoint, {
      method: 'GET',
    });

    // Verificar si la respuesta es JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      logger.error('Respuesta no es JSON:', contentType);
      throw new Error('Error de comunicacion con el servidor');
    }

    const data = await response.json();

    if (!response.ok) {
      logger.error('Error del servidor:', response.status, data.message);
      if (response.status === 401) {
        throw new Error('Sesion expirada. Por favor inicie sesion nuevamente.');
      }
      throw new Error(data.message || 'Error al obtener códigos KOAJ');
    }

    logger.info('Códigos KOAJ obtenidos exitosamente:', data.total);
    return data;
  } catch (error) {
    logger.error('Error en getKoajCodes:', error);
    throw error;
  }
};

/**
 * Obtener guía de lectura de códigos de barras KOAJ
 * @returns {Promise<Object>} - Guía de interpretación
 */
export const getCodeGuide = async () => {
  try {
    logger.info('Solicitando guía de códigos KOAJ...');

    const response = await authenticatedFetch('/api/koaj-codes/guide', {
      method: 'GET',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener guía de códigos');
    }

    logger.info('Guía de códigos obtenida exitosamente');
    return data;
  } catch (error) {
    logger.error('Error en getCodeGuide:', error);
    throw error;
  }
};

/**
 * Crear un nuevo código KOAJ (solo admin)
 * @param {Object} codeData - Datos del código
 * @returns {Promise<Object>} - Código creado
 */
export const createKoajCode = async (codeData) => {
  try {
    const response = await authenticatedFetch('/api/koaj-codes', {
      method: 'POST',
      body: JSON.stringify(codeData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al crear código');
    }

    return data;
  } catch (error) {
    logger.error('Error en createKoajCode:', error);
    throw error;
  }
};

/**
 * Actualizar un código KOAJ (solo admin)
 * @param {number} codeId - ID del código
 * @param {Object} codeData - Datos a actualizar
 * @returns {Promise<Object>} - Código actualizado
 */
export const updateKoajCode = async (codeId, codeData) => {
  try {
    const response = await authenticatedFetch(`/api/koaj-codes/${codeId}`, {
      method: 'PUT',
      body: JSON.stringify(codeData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al actualizar código');
    }

    return data;
  } catch (error) {
    logger.error('Error en updateKoajCode:', error);
    throw error;
  }
};

/**
 * Desactivar un código KOAJ (solo admin)
 * @param {number} codeId - ID del código
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const deleteKoajCode = async (codeId) => {
  try {
    const response = await authenticatedFetch(`/api/koaj-codes/${codeId}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al desactivar código');
    }

    return data;
  } catch (error) {
    logger.error('Error en deleteKoajCode:', error);
    throw error;
  }
};

export default {
  getKoajCodes,
  getCodeGuide,
  createKoajCode,
  updateKoajCode,
  deleteKoajCode,
};

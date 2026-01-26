import { authenticatedFetch } from './api';
import logger from '../utils/logger';

/**
 * Obtener lista de todos los usuarios (solo admin)
 * @returns {Promise<Object>} - Lista de usuarios
 */
export const getUsers = async () => {
  try {
    logger.info('Solicitando lista de usuarios...');
    const response = await authenticatedFetch('/api/users', {
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
      if (response.status === 403) {
        throw new Error('No tiene permisos para acceder a esta seccion.');
      }
      throw new Error(data.message || 'Error al obtener usuarios');
    }

    logger.info('Usuarios obtenidos exitosamente:', data.total);
    return data;
  } catch (error) {
    logger.error('Error en getUsers:', error);
    throw error;
  }
};

/**
 * Obtener un usuario por ID (solo admin)
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object>} - Datos del usuario
 */
export const getUser = async (userId) => {
  try {
    const response = await authenticatedFetch(`/api/users/${userId}`, {
      method: 'GET',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener usuario');
    }

    return data;
  } catch (error) {
    logger.error('Error en getUser:', error);
    throw error;
  }
};

/**
 * Crear un nuevo usuario (solo admin)
 * @param {Object} userData - Datos del usuario
 * @param {string} userData.email - Email del usuario
 * @param {string} userData.password - Contrasena
 * @param {string} userData.name - Nombre del usuario
 * @param {string} userData.role - Rol (admin o sales)
 * @returns {Promise<Object>} - Usuario creado
 */
export const createUser = async (userData) => {
  try {
    const response = await authenticatedFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al crear usuario');
    }

    return data;
  } catch (error) {
    logger.error('Error en createUser:', error);
    throw error;
  }
};

/**
 * Actualizar un usuario (solo admin)
 * @param {number} userId - ID del usuario
 * @param {Object} userData - Datos a actualizar
 * @returns {Promise<Object>} - Usuario actualizado
 */
export const updateUser = async (userId, userData) => {
  try {
    const response = await authenticatedFetch(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al actualizar usuario');
    }

    return data;
  } catch (error) {
    logger.error('Error en updateUser:', error);
    throw error;
  }
};

/**
 * Desactivar (soft delete) un usuario (solo admin)
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object>} - Resultado de la operacion
 */
export const deleteUser = async (userId) => {
  try {
    const response = await authenticatedFetch(`/api/users/${userId}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al desactivar usuario');
    }

    return data;
  } catch (error) {
    logger.error('Error en deleteUser:', error);
    throw error;
  }
};

/**
 * Cambiar la contrasena propia del usuario autenticado
 * @param {string} currentPassword - Contrasena actual
 * @param {string} newPassword - Nueva contrasena
 * @returns {Promise<Object>} - Resultado de la operacion
 */
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await authenticatedFetch('/api/users/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al cambiar contrasena');
    }

    return data;
  } catch (error) {
    logger.error('Error en changePassword:', error);
    throw error;
  }
};

/**
 * Resetear la contrasena de un usuario (solo admin)
 * @param {number} userId - ID del usuario
 * @param {string} newPassword - Nueva contrasena
 * @returns {Promise<Object>} - Resultado de la operacion
 */
export const resetPassword = async (userId, newPassword) => {
  try {
    const response = await authenticatedFetch(`/api/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({
        new_password: newPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al resetear contrasena');
    }

    return data;
  } catch (error) {
    logger.error('Error en resetPassword:', error);
    throw error;
  }
};

export default {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  resetPassword,
};

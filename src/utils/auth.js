import { secureGetItem, secureRemoveItem } from './secureStorage';

/**
 * Obtiene el rol del usuario actual desde localStorage
 * @returns {string|null} - El rol del usuario ('admin' o 'sales') o null si no hay usuario
 */
export const getUserRole = () => {
  const user = getUser();
  return user?.role || null;
};

/**
 * Verifica si el usuario actual es administrador
 * @returns {boolean} - true si el usuario es admin, false en caso contrario
 */
export const isAdmin = () => {
  return getUserRole() === 'admin';
};

/**
 * Admin de solo lectura (rol 'viewer' del backend): ve todo como el admin
 * (AuthContext le guarda role 'admin'), pero no puede modificar nada. Las
 * peticiones que modifican se cortan en services/api.js y en el backend.
 * @returns {boolean}
 */
export const isReadOnly = () => {
  return getUser()?.readOnly === true;
};

/**
 * Verifica si el usuario actual es del equipo de ventas
 * @returns {boolean} - true si el usuario es sales, false en caso contrario
 */
export const isSales = () => {
  return getUserRole() === 'sales';
};

/**
 * Verifica si el usuario puede acceder según los roles permitidos
 * @param {string[]} allowedRoles - Array de roles permitidos (ej: ['admin', 'sales'])
 * @returns {boolean} - true si el usuario tiene uno de los roles permitidos
 */
export const canAccess = (allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true; // Si no se especifican roles, permitir acceso
  }
  
  const userRole = getUserRole();
  return userRole && allowedRoles.includes(userRole);
};

/**
 * Obtiene los datos completos del usuario desde localStorage
 * @returns {object|null} - Objeto con datos del usuario o null si no hay usuario
 */
export const getUser = () => {
  const userStr = secureGetItem('authUser');
  if (!userStr) return null;
  
  try {
    return typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Obtiene el token de autenticación desde localStorage
 * @returns {string|null} - Token JWT o null si no hay sesión
 */
export const getToken = () => {
  return secureGetItem('authToken');
};

/**
 * Cierra la sesión del usuario, limpiando todos los datos de autenticación
 */
export const logout = () => {
  secureRemoveItem('authToken');
  secureRemoveItem('authUser');
};

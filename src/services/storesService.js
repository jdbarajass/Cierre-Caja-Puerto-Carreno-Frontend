import { authenticatedFetch } from './api';
import logger from '../utils/logger';

/**
 * Comparativo entre tiendas (solo admin): ventas de Alegra + operación de
 * cada tienda en el rango. Ver GET /api/stores/comparison en el backend.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 */
export const getStoreComparison = async (startDate, endDate) => {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  // Cada día del rango es una consulta a Alegra por tienda: rangos largos tardan.
  const response = await authenticatedFetch(`/api/stores/comparison?${params}`, { method: 'GET' }, 180000);
  const data = await response.json();
  if (!response.ok || !data.success) {
    logger.error('Error en comparativo de tiendas:', response.status, data.message);
    throw new Error(data.message || 'No se pudo cargar el comparativo de tiendas');
  }
  return data;
};

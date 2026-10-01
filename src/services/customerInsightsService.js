import { authenticatedFetch } from './api';
import logger from '../utils/logger';

/**
 * Dashboard de clientes (solo admin, tienda activa vía X-Store). Ver
 * /api/analytics/customers/* en el backend (reportes agregados de Alegra).
 */

// Alegra suma el rango en el servidor, pero las primeras consultas de un
// rango (sin caché) pueden tardar en Render.
const TIMEOUT = 120000;

const request = async (endpoint, fallbackMessage) => {
  const response = await authenticatedFetch(endpoint, { method: 'GET' }, TIMEOUT);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    logger.error(`Error en ${endpoint}:`, response.status, data.message);
    const error = new Error(data.message || fallbackMessage);
    error.code = data.code; // ej. 'alegra_not_configured'
    throw error;
  }
  return data;
};

/**
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {number} limit - clientes por ranking
 */
export const getCustomersSummary = (startDate, endDate, limit = 25) => {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate, limit: String(limit) });
  return request(`/api/analytics/customers/summary?${params}`, 'No se pudo cargar el dashboard de clientes');
};

/** @param {number} days - días sin comprar (30, 60, 90, 120 o 180) */
export const getInactiveCustomers = (days = 90) =>
  request(`/api/analytics/customers/inactive?days=${days}`, 'No se pudieron cargar las clientas inactivas');

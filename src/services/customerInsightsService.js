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

// ── Resumen de facturas guardado por tienda (fase 4) ────────────────────────

/** Días cargados desde el 1-ene-2026 y calidad de los datos (vendedora, cédula, descuento). */
export const getInvoiceFactsStatus = () =>
  request('/api/analytics/invoice-facts/status', 'No se pudo consultar la carga de facturas');

/**
 * Carga la siguiente tanda de días que falten. El backend se detiene solo a
 * los ~150 s y devuelve hasta dónde llegó.
 * @param {number} maxDays - días a cargar (1-31)
 */
export const syncInvoiceFacts = async (maxDays) => {
  const response = await authenticatedFetch('/api/analytics/invoice-facts/sync', {
    method: 'POST',
    body: JSON.stringify({ max_days: maxDays }),
  }, 200000);
  const data = await response.json().catch(() => ({}));
  if (!response.ok && !data.status) {
    const error = new Error(data.message || 'No se pudieron cargar las facturas');
    error.code = data.code;
    throw error;
  }
  return data; // con error de Alegra a mitad de tanda: success=false + lo que alcanzó
};

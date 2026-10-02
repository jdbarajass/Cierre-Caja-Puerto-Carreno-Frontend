import { authenticatedFetch } from './api';
import logger from '../utils/logger';

/**
 * Estadísticas → Prendas (solo admin, tienda activa vía X-Store). Ver
 * /api/analytics/garments/* en el backend.
 */

const request = async (endpoint, timeout, fallbackMessage) => {
  const response = await authenticatedFetch(endpoint, { method: 'GET' }, timeout);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    logger.error(`Error en ${endpoint}:`, response.status, data.message);
    const error = new Error(data.message || fallbackMessage);
    error.code = data.code; // ej. 'alegra_not_configured'
    throw error;
  }
  return data;
};

const rangeQuery = (startDate, endDate) => new URLSearchParams({ start_date: startDate, end_date: endDate });

/** Prendas por factura y precio promedio (total y por vendedora) y más vendidas. Rápido. */
export const getGarmentsSummary = (startDate, endDate) =>
  request(`/api/analytics/garments/summary?${rangeQuery(startDate, endDate)}`, 60000,
    'No se pudo cargar el resumen de prendas');

/**
 * Agotados, curva de tallas y rotación: cruza con el stock actual de Alegra
 * (~55 consultas la primera vez; luego caché de 5 min en el servidor).
 */
export const getGarmentsStock = (startDate, endDate) =>
  request(`/api/analytics/garments/stock?${rangeQuery(startDate, endDate)}`, 200000,
    'No se pudo consultar el stock en Alegra');

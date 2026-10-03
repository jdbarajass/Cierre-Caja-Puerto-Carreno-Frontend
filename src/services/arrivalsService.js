import { authenticatedFetch } from './api';
import logger from '../utils/logger';

/**
 * Estadísticas → Llegadas (solo admin, tienda activa vía X-Store). Ver
 * /api/analytics/arrivals en el backend.
 */

const parse = async (response, endpoint, fallbackMessage) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    logger.error(`Error en ${endpoint}:`, response.status, data.message);
    const error = new Error(data.message || fallbackMessage);
    error.code = data.code; // ej. 'alegra_not_configured'
    throw error;
  }
  return data;
};

/** Llegadas de mercancía del periodo con lo vendido de cada una (lee la base: rápido). */
export const getArrivals = async (startDate, endDate) => {
  const endpoint = `/api/analytics/arrivals?${new URLSearchParams({ start_date: startDate, end_date: endDate })}`;
  const response = await authenticatedFetch(endpoint, { method: 'GET' }, 60000);
  return parse(response, endpoint, 'No se pudieron cargar las llegadas de mercancía');
};

/** Vuelve a cargar las compras desde Alegra (también se cargan solas cada noche). */
export const syncArrivals = async () => {
  const endpoint = '/api/analytics/arrivals/sync';
  const response = await authenticatedFetch(endpoint, { method: 'POST' }, 120000);
  return parse(response, endpoint, 'No se pudieron cargar las compras de Alegra');
};

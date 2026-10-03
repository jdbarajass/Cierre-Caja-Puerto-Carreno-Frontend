import { authenticatedFetch } from './api';
import logger from '../utils/logger';

/**
 * Estadísticas → Día y hora (solo admin, tienda activa vía X-Store). Ver
 * /api/analytics/sales-patterns en el backend.
 */
export const getSalesPatterns = async (startDate, endDate, sellerId) => {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  if (sellerId) params.set('seller_id', sellerId);
  const endpoint = `/api/analytics/sales-patterns?${params}`;
  const response = await authenticatedFetch(endpoint, { method: 'GET' }, 60000);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    logger.error(`Error en ${endpoint}:`, response.status, data.message);
    const error = new Error(data.message || 'No se pudieron cargar las ventas por día y hora');
    error.code = data.code;
    throw error;
  }
  return data;
};

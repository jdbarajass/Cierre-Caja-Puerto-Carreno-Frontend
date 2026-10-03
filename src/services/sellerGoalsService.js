import { authenticatedFetch } from './api';
import logger from '../utils/logger';

/**
 * Estadísticas → Metas por vendedora (solo admin, tienda activa vía X-Store).
 * Ver /api/analytics/seller-goals en el backend.
 */
const parse = async (response, endpoint, fallbackMessage) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    logger.error(`Error en ${endpoint}:`, response.status, data.message);
    const error = new Error(data.message || fallbackMessage);
    error.code = data.code;
    throw error;
  }
  return data;
};

/** Metas y avance del mes (YYYY-MM). */
export const getSellerGoals = async (month) => {
  const endpoint = `/api/analytics/seller-goals?${new URLSearchParams({ month })}`;
  const response = await authenticatedFetch(endpoint, { method: 'GET' }, 90000);
  return parse(response, endpoint, 'No se pudieron cargar las metas');
};

/** Ajusta la meta de una vendedora; amount null = volver a la automática. */
export const saveSellerGoal = async ({ month, sellerId, sellerName, amount }) => {
  const endpoint = '/api/analytics/seller-goals';
  const response = await authenticatedFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify({ month, seller_id: sellerId, seller_name: sellerName, amount }),
  }, 30000);
  return parse(response, endpoint, 'No se pudo guardar la meta');
};

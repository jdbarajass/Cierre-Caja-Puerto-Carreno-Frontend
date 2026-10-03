import { authenticatedFetch } from './api';
import logger from '../utils/logger';

/**
 * Alertas diarias (solo admin, tienda activa vía X-Store). Ver
 * /api/analytics/alerts en el backend (Fase D4).
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

/** Alertas sin descartar de los últimos 7 días. */
export const getAlerts = async () => {
  const endpoint = '/api/analytics/alerts';
  const response = await authenticatedFetch(endpoint, { method: 'GET' }, 30000);
  return parse(response, endpoint, 'No se pudieron cargar las alertas');
};

/** Calcula las alertas del último día cerrado (se hace sola cada noche). */
export const generateAlerts = async () => {
  const endpoint = '/api/analytics/alerts/generate';
  const response = await authenticatedFetch(endpoint, { method: 'POST', body: '{}' }, 200000);
  return parse(response, endpoint, 'No se pudieron calcular las alertas');
};

export const dismissAlert = async (id) => {
  const endpoint = `/api/analytics/alerts/${id}/dismiss`;
  const response = await authenticatedFetch(endpoint, { method: 'POST' }, 30000);
  return parse(response, endpoint, 'No se pudo descartar la alerta');
};

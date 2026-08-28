import { authenticatedFetch } from './api';
import logger from '../utils/logger';

const BASE = '/api/accounts';

async function handle(res) {
  const ct = res.headers.get('content-type');
  if (!ct || !ct.includes('application/json'))
    throw new Error('Error de comunicación con el servidor');
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión expirada. Inicie sesión nuevamente.');
    if (res.status === 403) throw new Error('No tiene permisos para esta acción.');
    if (res.status === 404) throw new Error(data.message || 'No encontrado');
    throw new Error(data.message || 'Error en la operación');
  }
  return data;
}

export const getAccounts = async () => {
  try {
    return await handle(await authenticatedFetch(BASE));
  } catch (e) { logger.error('getAccounts:', e); throw e; }
};

export const getMovements = async ({ accountId, type, startDate, endDate, limit } = {}) => {
  try {
    const params = new URLSearchParams();
    if (accountId) params.set('account_id', accountId);
    if (type) params.set('type', type);
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    if (limit) params.set('limit', limit);
    const q = params.toString() ? `?${params}` : '';
    return await handle(await authenticatedFetch(`${BASE}/movements${q}`));
  } catch (e) { logger.error('getMovements:', e); throw e; }
};

export const manualAdjustment = async (payload) => {
  try {
    return await handle(await authenticatedFetch(`${BASE}/manual-adjustment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }));
  } catch (e) { logger.error('manualAdjustment:', e); throw e; }
};

export const transferBetweenAccounts = async (payload) => {
  try {
    return await handle(await authenticatedFetch(`${BASE}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }));
  } catch (e) { logger.error('transferBetweenAccounts:', e); throw e; }
};

export const syncDaily = async (date) => {
  try {
    return await handle(await authenticatedFetch(`${BASE}/sync-daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(date ? { date } : {})
    }));
  } catch (e) { logger.error('syncDaily:', e); throw e; }
};

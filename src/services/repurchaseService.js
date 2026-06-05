import { authenticatedFetch } from './api';
import logger from '../utils/logger';

const BASE = '/api/repurchase';

async function handle(res) {
  const ct = res.headers.get('content-type');
  if (!ct || !ct.includes('application/json'))
    throw new Error('Error de comunicación con el servidor');
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión expirada. Inicie sesión nuevamente.');
    if (res.status === 403) throw new Error('No tiene permisos para esta acción.');
    throw new Error(data.message || 'Error en la operación');
  }
  return data;
}

export const getEntries = async ({ year, month } = {}) => {
  try {
    const params = new URLSearchParams();
    if (year)  params.set('year',  year);
    if (month) params.set('month', month);
    const q = params.toString() ? `?${params}` : '';
    return await handle(await authenticatedFetch(`${BASE}${q}`));
  } catch (e) { logger.error('getEntries:', e); throw e; }
};

export const createEntry = async (payload) => {
  try {
    return await handle(await authenticatedFetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }));
  } catch (e) { logger.error('createEntry:', e); throw e; }
};

export const updateEntry = async (id, payload) => {
  try {
    return await handle(await authenticatedFetch(`${BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }));
  } catch (e) { logger.error('updateEntry:', e); throw e; }
};

export const deleteEntry = async (id) => {
  try {
    return await handle(await authenticatedFetch(`${BASE}/${id}`, { method: 'DELETE' }));
  } catch (e) { logger.error('deleteEntry:', e); throw e; }
};

export const getMonthlySummary = async () => {
  try {
    return await handle(await authenticatedFetch(`${BASE}/monthly-summary`));
  } catch (e) { logger.error('getMonthlySummary:', e); throw e; }
};

// ─── Compras realizadas por el socio ─────────────────────────────────────────

export const getPurchases = async ({ year, month } = {}) => {
  try {
    const params = new URLSearchParams();
    if (year)  params.set('year',  year);
    if (month) params.set('month', month);
    const q = params.toString() ? `?${params}` : '';
    return await handle(await authenticatedFetch(`${BASE}/purchases${q}`));
  } catch (e) { logger.error('getPurchases:', e); throw e; }
};

export const createPurchase = async (payload) => {
  try {
    return await handle(await authenticatedFetch(`${BASE}/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }));
  } catch (e) { logger.error('createPurchase:', e); throw e; }
};

export const updatePurchase = async (id, payload) => {
  try {
    return await handle(await authenticatedFetch(`${BASE}/purchases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }));
  } catch (e) { logger.error('updatePurchase:', e); throw e; }
};

export const deletePurchase = async (id) => {
  try {
    return await handle(await authenticatedFetch(`${BASE}/purchases/${id}`, { method: 'DELETE' }));
  } catch (e) { logger.error('deletePurchase:', e); throw e; }
};

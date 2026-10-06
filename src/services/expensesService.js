// Cuentas → Gastos (Fase 1 del plan docs/PLAN_CUENTAS_DIARIAS.md del backend):
// gastos y otros movimientos de plata, gastos fijos del mes y préstamos
// entre tiendas. Todo pasa por authenticatedFetch (manda X-Store).
import { authenticatedFetch } from './api';
import logger from '../utils/logger';

const BASE = '/api/expenses';

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

const json = (method, payload) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const call = async (name, url, options) => {
  try {
    return await handle(await authenticatedFetch(url, options));
  } catch (e) { logger.error(`${name}:`, e); throw e; }
};

export const getExpenses = ({ year, month }) =>
  call('getExpenses', `${BASE}?year=${year}&month=${month}`);
export const createExpense = (payload) => call('createExpense', BASE, json('POST', payload));
export const updateExpense = (id, payload) => call('updateExpense', `${BASE}/${id}`, json('PUT', payload));
export const deleteExpense = (id) => call('deleteExpense', `${BASE}/${id}`, { method: 'DELETE' });

export const getFixedExpenses = ({ year, month }) =>
  call('getFixedExpenses', `${BASE}/fixed?year=${year}&month=${month}`);
export const createFixedExpense = (payload) => call('createFixedExpense', `${BASE}/fixed`, json('POST', payload));
export const updateFixedExpense = (id, payload) => call('updateFixedExpense', `${BASE}/fixed/${id}`, json('PUT', payload));
export const deleteFixedExpense = (id) => call('deleteFixedExpense', `${BASE}/fixed/${id}`, { method: 'DELETE' });
export const loadFixedTemplate = () => call('loadFixedTemplate', `${BASE}/fixed/load-template`, { method: 'POST' });

export const getInterStoreLoans = () => call('getInterStoreLoans', `${BASE}/inter-store`);

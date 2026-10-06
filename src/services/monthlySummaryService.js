// Cuentas → Año (Fase 3 del plan docs/PLAN_CUENTAS_DIARIAS.md del backend):
// resumen mensual y anual, valores escritos a mano e inventario de fin de mes.
import { authenticatedFetch } from './api';
import logger from '../utils/logger';

const BASE = '/api/monthly-summary';

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

export const getMonthlySummary = (year) => call('getMonthlySummary', `${BASE}?year=${year}`);
export const saveSummaryOverride = (payload) => call('saveSummaryOverride', `${BASE}/override`, json('PUT', payload));
export const loadInventory = (payload = {}) => call('loadInventory', `${BASE}/inventory`, json('POST', payload));

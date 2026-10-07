// Fase 4 del plan docs/PLAN_CUENTAS_DIARIAS.md del backend: configuración
// financiera por tienda (crecimiento de la meta, META 2, regla 70/30) e
// incentivos por meta con su pago a Gastos.
import { authenticatedFetch } from './api';
import logger from '../utils/logger';

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

export const getFinanceSettings = () => call('getFinanceSettings', '/api/finance-settings');
export const saveFinanceSettings = (payload) => call('saveFinanceSettings', '/api/finance-settings', json('PUT', payload));

export const getIncentives = (month) => {
  const [year, m] = month.split('-').map(Number);
  return call('getIncentives', `/api/incentives?year=${year}&month=${m}`);
};
export const createIncentiveRule = (payload) => call('createIncentiveRule', '/api/incentives/rules', json('POST', payload));
export const updateIncentiveRule = (id, payload) => call('updateIncentiveRule', `/api/incentives/rules/${id}`, json('PUT', payload));
export const deleteIncentiveRule = (id) => call('deleteIncentiveRule', `/api/incentives/rules/${id}`, { method: 'DELETE' });
export const loadIncentivesTemplate = () => call('loadIncentivesTemplate', '/api/incentives/rules/load-template', { method: 'POST' });
export const payIncentive = (payload) => call('payIncentive', '/api/incentives/pay', json('POST', payload));

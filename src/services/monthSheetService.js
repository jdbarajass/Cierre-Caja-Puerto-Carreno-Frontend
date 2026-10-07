// Cuentas → Mes (Fase 2 del plan docs/PLAN_CUENTAS_DIARIAS.md del backend):
// hoja del mes por medio de pago, conciliación, comisiones y cierre de mes.
import { authenticatedFetch } from './api';
import logger from '../utils/logger';

const BASE = '/api/month-sheet';

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

const call = async (name, url, options, timeout = null) => {
  try {
    return await handle(await authenticatedFetch(url, options, timeout));
  } catch (e) { logger.error(`${name}:`, e); throw e; }
};

export const getMonthSheet = ({ year, month }) => call('getMonthSheet', `${BASE}?year=${year}&month=${month}`);
// La primera carga trae todos los recibos desde el 1-sep (unas 50 páginas de
// Alegra, 1-2 minutos): con el tiempo de espera normal (80 s) la página se
// rendía con "No se pudo conectar". El servidor corta a los 240 s.
export const SYNC_PAYMENTS_TIMEOUT = 230000;
export const syncPayments = (since) => call('syncPayments', `${BASE}/sync-payments`, json('POST', since ? { since } : {}), SYNC_PAYMENTS_TIMEOUT);
export const saveReconciliation = (payload) => call('saveReconciliation', `${BASE}/reconciliation`, json('PUT', payload));
export const registerCommissions = ({ year, month }) => call('registerCommissions', `${BASE}/commissions`, json('POST', { year, month }));
export const closeMonth = ({ year, month, notes }) => call('closeMonth', `${BASE}/close`, json('POST', { year, month, notes }));
export const reopenMonth = ({ year, month }) => call('reopenMonth', `${BASE}/close?year=${year}&month=${month}`, { method: 'DELETE' });

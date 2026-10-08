// Respaldo de facturas (docs/PLAN_BLINDAJE_COPIA.md del backend): estado de la
// copia, repaso completo, congelarla antes de una anulación masiva y Excel.
import { authenticatedFetch } from './api';
import logger from '../utils/logger';

const BASE = '/api/facts-freeze';

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
    return await handle(await authenticatedFetch(url, options, 120000));
  } catch (e) { logger.error(`${name}:`, e); throw e; }
};

export const getFreezeStatus = (until) =>
  call('getFreezeStatus', `${BASE}/status${until ? `?until=${until}` : ''}`);
export const startReview = (until) => call('startReview', `${BASE}/review`, json('POST', { until }));
export const freezeCopy = (until, confirm) => call('freezeCopy', `${BASE}/freeze`, json('POST', { until, confirm }));

export const downloadBackup = async (year, store) => {
  const res = await authenticatedFetch(`${BASE}/backup.xlsx?year=${year}`, {}, 180000);
  if (!res.ok) throw new Error('No se pudo generar el respaldo');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `respaldo_facturas_${year}_${store || 'tienda'}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// Reconstrucción de 2025 (docs/PLAN_RECONSTRUCCION_2025.md del backend):
// cargar 2025, revisar la anulación masiva de facturas POS e informe de inventario.
import { authenticatedFetch } from './api';
import logger from '../utils/logger';

const BASE = '/api/history-2025';

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

const call = async (name, url, options, timeout) => {
  try {
    return await handle(await authenticatedFetch(url, options, timeout));
  } catch (e) { logger.error(`${name}:`, e); throw e; }
};

export const getHistoryStatus = () => call('getHistoryStatus', `${BASE}/status`);
// La carga de una tanda puede tardar hasta ~2,5 min en el servidor
export const syncHistory = (maxDays = 31) => call('syncHistory', `${BASE}/sync`, json('POST', { max_days: maxDays }), 240000);
export const saveVoidOverride = (payload) => call('saveVoidOverride', `${BASE}/override`, json('PUT', payload));
export const getInventoryReport = () => call('getInventoryReport', `${BASE}/inventory`, undefined, 180000);

export const downloadInventoryExcel = async (store) => {
  const res = await authenticatedFetch(`${BASE}/inventory.xlsx`, {}, 180000);
  if (!res.ok) throw new Error('No se pudo generar el Excel');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ajuste_inventario_2025_${store || 'tienda'}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

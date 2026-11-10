// Cuentas → Corrección de cierres (solo admin, 2026-11-09; reglas en
// app/services/closing_corrections.py del backend). Pasa por authenticatedFetch (X-Store).
import { authenticatedFetch } from './api';
import logger from '../utils/logger';

async function handle(res) {
  const ct = res.headers.get('content-type');
  if (!ct || !ct.includes('application/json'))
    throw new Error('Error de comunicación con el servidor');
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión expirada. Inicie sesión nuevamente.');
    if (res.status === 403) throw new Error(data.message || 'No tiene permisos para esta acción.');
    throw new Error(data.message || 'Error en la operación');
  }
  return data;
}

const call = async (name, url, options) => {
  try {
    return await handle(await authenticatedFetch(url, options));
  } catch (e) { logger.error(`${name}:`, e); throw e; }
};

// { pending: [...], corrected: [...] }
export const getClosingCorrections = () => call('getClosingCorrections', '/api/closing-corrections');

// payload: { efectivo, qr, nequi, daviplata, datafono, excedentes: {efectivo, qr, nequi, daviplata, datafono}, note }
export const correctClosing = (date, payload) => call('correctClosing', `/api/closing-corrections/${date}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
});

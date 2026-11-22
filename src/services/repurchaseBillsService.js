// Facturas de recompra (Cuentas Recompras → "Facturas por pagar"): facturas de
// proveedor pendientes en Alegra con sus prendas, pago en Alegra y registro.
// Backend: app/routes/repurchase_bills.py (por tienda, X-Store vía authenticatedFetch).
import { authenticatedFetch } from './api';
import logger from '../utils/logger';

const BASE = '/api/repurchase-bills';

async function handle(res) {
  const ct = res.headers.get('content-type');
  if (!ct || !ct.includes('application/json'))
    throw new Error('Error de comunicación con el servidor');
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión expirada. Inicie sesión nuevamente.');
    throw new Error(data.message || 'Error en la operación');
  }
  return data;
}

const json = (method, payload) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

export const getOpenBills = async ({ start, end } = {}) => {
  try {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    const q = params.toString() ? `?${params}` : '';
    return await handle(await authenticatedFetch(`${BASE}/open${q}`));
  } catch (e) { logger.error('getOpenBills:', e); throw e; }
};

// Paga en Alegra las facturas que se vieron (un egreso por factura). La
// respuesta trae el lote aunque alguna haya fallado (success=false).
export const payBills = async ({ billIds, start, end, countedUnits, notes }) => {
  try {
    return await handle(await authenticatedFetch(`${BASE}/pay`, json('POST', {
      bill_ids: billIds, start, end,
      counted_units: countedUnits === '' || countedUnits == null ? null : Number(countedUnits),
      notes,
    })));
  } catch (e) { logger.error('payBills:', e); throw e; }
};

export const getBillBatches = async ({ year, month } = {}) => {
  try {
    const params = new URLSearchParams();
    if (year) params.set('year', year);
    if (month) params.set('month', month);
    const q = params.toString() ? `?${params}` : '';
    return await handle(await authenticatedFetch(`${BASE}/batches${q}`));
  } catch (e) { logger.error('getBillBatches:', e); throw e; }
};

export const updateBillBatch = async (id, payload) => {
  try {
    return await handle(await authenticatedFetch(`${BASE}/batches/${id}`, json('PUT', payload)));
  } catch (e) { logger.error('updateBillBatch:', e); throw e; }
};

// Solicitudes de ajuste de inventario (docs/PLAN_AJUSTES_INVENTARIO.md del backend):
// las vendedoras piden y el admin acepta; solo al aceptar se crea el ajuste en Alegra.
import { authenticatedFetch } from './api';

const BASE = '/api/inventory-requests';

// Buscar un código lee la lista de ítems de Alegra (~55 páginas cuando la caché de
// 5 min venció) y aceptar crea el ajuste: más tiempo que el normal.
const ITEMS_TIMEOUT = 90000;
const APPROVE_TIMEOUT = 90000;
const APPROVE_ALL_TIMEOUT = 300000;

const request = async (url, options = {}, fallback = 'No se pudo completar la operación', timeout = null) => {
  const res = await authenticatedFetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }, timeout);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || fallback);
    err.data = data;
    throw err;
  }
  return data;
};

const post = (url, payload, fallback, timeout = null) =>
  request(url, { method: 'POST', body: JSON.stringify(payload || {}) }, fallback, timeout);

/** Prenda de un código: { item_id, code, name, available, is_gift_card } */
export const lookupCode = async (code) =>
  (await request(`${BASE}/lookup?code=${encodeURIComponent(code)}`, { method: 'GET' }, 'No se encontró el código', ITEMS_TIMEOUT)).item;

/** status: 'open' (pendientes) | 'all' (historial) */
export const getInventoryRequests = (status = 'open') =>
  request(`${BASE}?status=${status}`, { method: 'GET' }, 'No se pudieron cargar las solicitudes');

export const createInventoryRequest = (payload) => post(BASE, payload, 'No se pudo enviar la solicitud', ITEMS_TIMEOUT);
export const cancelInventoryRequest = (id) => post(`${BASE}/${id}/cancel`, {}, 'No se pudo quitar la solicitud');
export const checkInventoryRequest = (id) =>
  request(`${BASE}/${id}/check`, { method: 'GET' }, 'No se pudo revisar en Alegra');
export const approveInventoryRequest = (id) => post(`${BASE}/${id}/approve`, {}, 'No se pudo aceptar', APPROVE_TIMEOUT);
export const approveAllInventoryRequests = () => post(`${BASE}/approve-all`, {}, 'No se pudieron aceptar', APPROVE_ALL_TIMEOUT);
export const rejectInventoryRequest = (id, reason) => post(`${BASE}/${id}/reject`, { reason }, 'No se pudo rechazar');

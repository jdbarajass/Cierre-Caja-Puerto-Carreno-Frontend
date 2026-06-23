import { authenticatedFetch } from './api';
import logger from '../utils/logger';

const BASE = '/api/notes-tasks';

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

// ─── Resurtido / Por Pedir ────────────────────────────────────────────────

export const getRestockItems = () =>
  authenticatedFetch(`${BASE}/restock`).then(handle).catch(e => { logger.error('getRestockItems:', e); throw e; });

export const createRestockItem = (payload) =>
  authenticatedFetch(`${BASE}/restock`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  }).then(handle).catch(e => { logger.error('createRestockItem:', e); throw e; });

export const updateRestockItem = (id, payload) =>
  authenticatedFetch(`${BASE}/restock/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  }).then(handle).catch(e => { logger.error('updateRestockItem:', e); throw e; });

export const deleteRestockItem = (id) =>
  authenticatedFetch(`${BASE}/restock/${id}`, { method: 'DELETE' }).then(handle).catch(e => { logger.error('deleteRestockItem:', e); throw e; });

// ─── Tareas Operativas ─────────────────────────────────────────────────────

export const getOperationalTasks = () =>
  authenticatedFetch(`${BASE}/operational`).then(handle).catch(e => { logger.error('getOperationalTasks:', e); throw e; });

export const createOperationalTask = (payload) =>
  authenticatedFetch(`${BASE}/operational`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  }).then(handle).catch(e => { logger.error('createOperationalTask:', e); throw e; });

export const updateOperationalTask = (id, payload) =>
  authenticatedFetch(`${BASE}/operational/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  }).then(handle).catch(e => { logger.error('updateOperationalTask:', e); throw e; });

export const deleteOperationalTask = (id) =>
  authenticatedFetch(`${BASE}/operational/${id}`, { method: 'DELETE' }).then(handle).catch(e => { logger.error('deleteOperationalTask:', e); throw e; });

import { authenticatedFetch } from './api';
import logger from '../utils/logger';

const BASE = '/api/employee-records';

async function handleResponse(res) {
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

// Filtro opcional por nombre (texto libre)
function buildQuery(nombre) {
  return nombre ? `?nombre_empleada=${encodeURIComponent(nombre)}` : '';
}

export const getClothing = (nombre) =>
  authenticatedFetch(`${BASE}/clothing${buildQuery(nombre)}`).then(handleResponse).catch(e => { logger.error('getClothing:', e); throw e; });

export const createClothing = (p) =>
  authenticatedFetch(`${BASE}/clothing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(handleResponse).catch(e => { logger.error('createClothing:', e); throw e; });

export const updateClothing = (id, p) =>
  authenticatedFetch(`${BASE}/clothing/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(handleResponse).catch(e => { logger.error('updateClothing:', e); throw e; });

export const deleteClothing = (id) =>
  authenticatedFetch(`${BASE}/clothing/${id}`, { method: 'DELETE' }).then(handleResponse).catch(e => { logger.error('deleteClothing:', e); throw e; });

export const getLoans = (nombre) =>
  authenticatedFetch(`${BASE}/loans${buildQuery(nombre)}`).then(handleResponse).catch(e => { logger.error('getLoans:', e); throw e; });

export const createLoan = (p) =>
  authenticatedFetch(`${BASE}/loans`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(handleResponse).catch(e => { logger.error('createLoan:', e); throw e; });

export const updateLoan = (id, p) =>
  authenticatedFetch(`${BASE}/loans/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(handleResponse).catch(e => { logger.error('updateLoan:', e); throw e; });

export const deleteLoan = (id) =>
  authenticatedFetch(`${BASE}/loans/${id}`, { method: 'DELETE' }).then(handleResponse).catch(e => { logger.error('deleteLoan:', e); throw e; });

export const getPermissions = (nombre) =>
  authenticatedFetch(`${BASE}/permissions${buildQuery(nombre)}`).then(handleResponse).catch(e => { logger.error('getPermissions:', e); throw e; });

export const createPermission = (p) =>
  authenticatedFetch(`${BASE}/permissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(handleResponse).catch(e => { logger.error('createPermission:', e); throw e; });

export const updatePermission = (id, p) =>
  authenticatedFetch(`${BASE}/permissions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(handleResponse).catch(e => { logger.error('updatePermission:', e); throw e; });

export const deletePermission = (id) =>
  authenticatedFetch(`${BASE}/permissions/${id}`, { method: 'DELETE' }).then(handleResponse).catch(e => { logger.error('deletePermission:', e); throw e; });

export const getVacations = (nombre) =>
  authenticatedFetch(`${BASE}/vacations${buildQuery(nombre)}`).then(handleResponse).catch(e => { logger.error('getVacations:', e); throw e; });

export const createVacation = (p) =>
  authenticatedFetch(`${BASE}/vacations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(handleResponse).catch(e => { logger.error('createVacation:', e); throw e; });

export const updateVacation = (id, p) =>
  authenticatedFetch(`${BASE}/vacations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(handleResponse).catch(e => { logger.error('updateVacation:', e); throw e; });

export const deleteVacation = (id) =>
  authenticatedFetch(`${BASE}/vacations/${id}`, { method: 'DELETE' }).then(handleResponse).catch(e => { logger.error('deleteVacation:', e); throw e; });

export const getPayments = (nombre) =>
  authenticatedFetch(`${BASE}/payments${buildQuery(nombre)}`).then(handleResponse).catch(e => { logger.error('getPayments:', e); throw e; });

export const createPayment = (p) =>
  authenticatedFetch(`${BASE}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(handleResponse).catch(e => { logger.error('createPayment:', e); throw e; });

export const updatePayment = (id, p) =>
  authenticatedFetch(`${BASE}/payments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(handleResponse).catch(e => { logger.error('updatePayment:', e); throw e; });

export const deletePayment = (id) =>
  authenticatedFetch(`${BASE}/payments/${id}`, { method: 'DELETE' }).then(handleResponse).catch(e => { logger.error('deletePayment:', e); throw e; });

export const getEmployeesSummary = () =>
  authenticatedFetch(`${BASE}/summary`).then(handleResponse).catch(e => { logger.error('getEmployeesSummary:', e); throw e; });

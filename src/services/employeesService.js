import { authenticatedFetch } from './api';
import logger from '../utils/logger';

const BASE = '/api/employee-records';

async function handleResponse(response) {
  const ct = response.headers.get('content-type');
  if (!ct || !ct.includes('application/json')) {
    throw new Error('Error de comunicación con el servidor');
  }
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) throw new Error('Sesión expirada. Inicie sesión nuevamente.');
    if (response.status === 403) throw new Error('No tiene permisos para esta acción.');
    throw new Error(data.message || 'Error en la operación');
  }
  return data;
}

// ─── ROPA ───────────────────────────────────────────────────────────────────

export const getClothing = async (employeeId = null) => {
  try {
    const params = employeeId ? `?employee_id=${employeeId}` : '';
    const res = await authenticatedFetch(`${BASE}/clothing${params}`);
    return await handleResponse(res);
  } catch (e) { logger.error('getClothing:', e); throw e; }
};

export const createClothing = async (payload) => {
  try {
    const res = await authenticatedFetch(`${BASE}/clothing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await handleResponse(res);
  } catch (e) { logger.error('createClothing:', e); throw e; }
};

export const updateClothing = async (id, payload) => {
  try {
    const res = await authenticatedFetch(`${BASE}/clothing/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await handleResponse(res);
  } catch (e) { logger.error('updateClothing:', e); throw e; }
};

export const deleteClothing = async (id) => {
  try {
    const res = await authenticatedFetch(`${BASE}/clothing/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  } catch (e) { logger.error('deleteClothing:', e); throw e; }
};

// ─── PRÉSTAMOS ───────────────────────────────────────────────────────────────

export const getLoans = async (employeeId = null) => {
  try {
    const params = employeeId ? `?employee_id=${employeeId}` : '';
    const res = await authenticatedFetch(`${BASE}/loans${params}`);
    return await handleResponse(res);
  } catch (e) { logger.error('getLoans:', e); throw e; }
};

export const createLoan = async (payload) => {
  try {
    const res = await authenticatedFetch(`${BASE}/loans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await handleResponse(res);
  } catch (e) { logger.error('createLoan:', e); throw e; }
};

export const updateLoan = async (id, payload) => {
  try {
    const res = await authenticatedFetch(`${BASE}/loans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await handleResponse(res);
  } catch (e) { logger.error('updateLoan:', e); throw e; }
};

export const deleteLoan = async (id) => {
  try {
    const res = await authenticatedFetch(`${BASE}/loans/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  } catch (e) { logger.error('deleteLoan:', e); throw e; }
};

// ─── PERMISOS / INCAPACIDADES ────────────────────────────────────────────────

export const getPermissions = async (employeeId = null) => {
  try {
    const params = employeeId ? `?employee_id=${employeeId}` : '';
    const res = await authenticatedFetch(`${BASE}/permissions${params}`);
    return await handleResponse(res);
  } catch (e) { logger.error('getPermissions:', e); throw e; }
};

export const createPermission = async (payload) => {
  try {
    const res = await authenticatedFetch(`${BASE}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await handleResponse(res);
  } catch (e) { logger.error('createPermission:', e); throw e; }
};

export const updatePermission = async (id, payload) => {
  try {
    const res = await authenticatedFetch(`${BASE}/permissions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await handleResponse(res);
  } catch (e) { logger.error('updatePermission:', e); throw e; }
};

export const deletePermission = async (id) => {
  try {
    const res = await authenticatedFetch(`${BASE}/permissions/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  } catch (e) { logger.error('deletePermission:', e); throw e; }
};

// ─── VACACIONES ──────────────────────────────────────────────────────────────

export const getVacations = async (employeeId = null) => {
  try {
    const params = employeeId ? `?employee_id=${employeeId}` : '';
    const res = await authenticatedFetch(`${BASE}/vacations${params}`);
    return await handleResponse(res);
  } catch (e) { logger.error('getVacations:', e); throw e; }
};

export const createVacation = async (payload) => {
  try {
    const res = await authenticatedFetch(`${BASE}/vacations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await handleResponse(res);
  } catch (e) { logger.error('createVacation:', e); throw e; }
};

export const updateVacation = async (id, payload) => {
  try {
    const res = await authenticatedFetch(`${BASE}/vacations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await handleResponse(res);
  } catch (e) { logger.error('updateVacation:', e); throw e; }
};

export const deleteVacation = async (id) => {
  try {
    const res = await authenticatedFetch(`${BASE}/vacations/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  } catch (e) { logger.error('deleteVacation:', e); throw e; }
};

// ─── PAGOS ───────────────────────────────────────────────────────────────────

export const getPayments = async (employeeId = null) => {
  try {
    const params = employeeId ? `?employee_id=${employeeId}` : '';
    const res = await authenticatedFetch(`${BASE}/payments${params}`);
    return await handleResponse(res);
  } catch (e) { logger.error('getPayments:', e); throw e; }
};

export const createPayment = async (payload) => {
  try {
    const res = await authenticatedFetch(`${BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await handleResponse(res);
  } catch (e) { logger.error('createPayment:', e); throw e; }
};

export const updatePayment = async (id, payload) => {
  try {
    const res = await authenticatedFetch(`${BASE}/payments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await handleResponse(res);
  } catch (e) { logger.error('updatePayment:', e); throw e; }
};

export const deletePayment = async (id) => {
  try {
    const res = await authenticatedFetch(`${BASE}/payments/${id}`, { method: 'DELETE' });
    return await handleResponse(res);
  } catch (e) { logger.error('deletePayment:', e); throw e; }
};

// ─── RESUMEN (admin) ─────────────────────────────────────────────────────────

export const getEmployeesSummary = async () => {
  try {
    const res = await authenticatedFetch(`${BASE}/summary`);
    return await handleResponse(res);
  } catch (e) { logger.error('getEmployeesSummary:', e); throw e; }
};

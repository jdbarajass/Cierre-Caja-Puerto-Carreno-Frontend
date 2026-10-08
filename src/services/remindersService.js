// Recordatorios del administrador (app/services/reminders.py del backend).
import { authenticatedFetch } from './api';
import logger from '../utils/logger';

const BASE = '/api/reminders';

const post = async (url, payload) => {
  const res = await authenticatedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'No se pudo guardar');
  }
};

/** Recordatorios activos de la tienda. Si algo falla, lista vacía (nunca rompe la página). */
export const getReminders = async () => {
  try {
    const res = await authenticatedFetch(BASE, { method: 'GET' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.reminders || [];
  } catch (e) {
    logger.warn('Recordatorios:', e);
    return [];
  }
};

export const snoozeReminder = (key, days = 1) => post(`${BASE}/${encodeURIComponent(key)}/snooze`, { days });
export const markReminderDone = (key) => post(`${BASE}/${encodeURIComponent(key)}/done`);

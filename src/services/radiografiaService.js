// Radiografía financiera (docs/PLAN_RADIOGRAFIA.md del backend). Solo lee.
import { authenticatedFetch } from './api';
import logger from '../utils/logger';

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

const call = async (name, url) => {
  try {
    return await handle(await authenticatedFetch(url));
  } catch (e) { logger.error(`${name}:`, e); throw e; }
};

// Fase 1 (Mes). target = utilidad que se quiere sacar (opcional, no se guarda)
export const getRadiografiaMonth = ({ year, month, target }) =>
  call('getRadiografiaMonth', `/api/radiografia/month?year=${year}&month=${month}${target ? `&target=${target}` : ''}`);

// Fase 2 (Año): por mes, total y promedio; cuadra con Cuentas → Año
export const getRadiografiaYear = ({ year }) =>
  call('getRadiografiaYear', `/api/radiografia/year?year=${year}`);

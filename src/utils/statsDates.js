/** Fechas de los filtros de Estadísticas (Clientes, Prendas). */

// ── Fechas (strings YYYY-MM-DD, aritmética en UTC para no correrse de día) ──
export const toUTC = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const toStr = (date) => date.toISOString().slice(0, 10);
export const addDays = (s, n) => { const d = toUTC(s); d.setUTCDate(d.getUTCDate() + n); return toStr(d); };
export const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 86400000) + 1;
export const longDate = (s) =>
  toUTC(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const buildPresets = (today) => {
  const firstOfMonth = `${today.slice(0, 8)}01`;
  const lastMonthEnd = addDays(firstOfMonth, -1);
  return [
    { id: 'this-year', label: 'Este año', start: `${today.slice(0, 4)}-01-01`, end: today },
    { id: 'this-month', label: 'Este mes', start: firstOfMonth, end: today },
    { id: 'last-month', label: 'Mes anterior', start: `${lastMonthEnd.slice(0, 8)}01`, end: lastMonthEnd },
    { id: 'last-90', label: 'Últimos 90 días', start: addDays(today, -89), end: today },
  ];
};

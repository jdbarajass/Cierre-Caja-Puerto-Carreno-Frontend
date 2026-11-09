// Formatos comunes de Cuentas → Radiografía.
export const fmt = (v) => (v == null ? '—'
  : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.round(v)));
export const pct = (v, digits = 1) => (v == null ? '—' : `${(v * 100).toLocaleString('es-CO', { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`);
export const num = (v, digits = 0) => (v == null ? '—' : Number(v).toLocaleString('es-CO', { maximumFractionDigits: digits }));
export const fmtDate = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

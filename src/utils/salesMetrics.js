/**
 * Cálculos puros sobre facturas de Alegra (/api/v1/invoices) para Estadísticas.
 * Sin React ni red: se prueban con `npm test` (node --test).
 */

// Mismas categorías que el Cierre de Caja (backend: formatters.normalize_payment_method)
const PAYMENT_LABELS = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  'credit-card': 'Tarjeta crédito',
  'debit-card': 'Tarjeta débito',
  other: 'Otro',
};

export const normalizePaymentMethod = (raw) => {
  const pm = String(raw || '').toLowerCase();
  if (!pm) return 'other';
  if (pm.includes('credit') || pm.includes('crédito')) return 'credit-card';
  // Antes que "debit": la factura declara DEBIT_TRANSFER para transferencias
  if (pm.includes('transfer')) return 'transfer';
  if (pm.includes('debit') || pm.includes('débito')) return 'debit-card';
  if (pm.includes('cash') || pm.includes('efectivo')) return 'cash';
  return 'other';
};

export const paymentMethodLabel = (raw) => PAYMENT_LABELS[normalizePaymentMethod(raw)];

/**
 * Dinero recibido por medio de pago. Usa los pagos reales (`payments[]`, que
 * pueden ser mixtos: $100 efectivo + $90.000 transferencia); si la factura no
 * trae pagos, usa el medio declarado en la factura por su total.
 * `count` = facturas en las que aparece ese medio.
 */
export const paymentsByMethod = (documents) => {
  const acc = {};
  const add = (raw, amount, seen) => {
    const label = paymentMethodLabel(raw);
    if (!acc[label]) acc[label] = { metodo: label, total: 0, count: 0 };
    acc[label].total += amount;
    if (!seen.has(label)) {
      acc[label].count += 1;
      seen.add(label);
    }
  };
  documents.forEach((doc) => {
    const seen = new Set();
    const payments = Array.isArray(doc.payments) ? doc.payments : [];
    if (payments.length > 0) {
      payments.forEach((p) => add(p.paymentMethod, Number(p.amount) || 0, seen));
    } else {
      add(doc.paymentMethod, Number(doc.total) || 0, seen);
    }
  });
  const grand = Object.values(acc).reduce((s, m) => s + m.total, 0);
  return Object.values(acc)
    .map((m) => ({ ...m, porcentaje: grand > 0 ? (m.total / grand) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);
};

/** Valor vendido de un ítem: `total` de Alegra ya trae el descuento (que viene en %). */
export const itemRevenue = (item) => {
  if (item.total != null && !Number.isNaN(Number(item.total))) return Number(item.total);
  const gross = (Number(item.quantity) || 0) * (Number(item.price) || 0);
  const pct = Number(item.discount) || 0;
  return gross * (1 - pct / 100);
};

/**
 * Hora (0-23) de una factura sin pasar por new Date(): "YYYY-MM-DD HH:MM:SS"
 * es inválido en Safari/iPhone, y `date` sola ("YYYY-MM-DD") se corre a las 19 h
 * por la zona horaria. Devuelve null si no hay hora.
 */
export const invoiceHour = (doc) => {
  const match = /(?:^|[ T])(\d{1,2}):\d{2}/.exec(String(doc?.datetime || ''));
  if (!match) return null;
  const hour = Number(match[1]);
  return hour >= 0 && hour < 24 ? hour : null;
};

/** "YYYY-MM-DD" del día 1 del mes de una fecha "YYYY-MM-DD" (sin toISOString, que usa UTC). */
export const firstDayOfMonth = (ymd) => `${String(ymd).slice(0, 7)}-01`;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "30 sep 2026 · 15:47" a partir del texto de Alegra (sin new Date: Safari y zona horaria). */
export const formatInvoiceDateTime = (doc) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(String(doc?.datetime || doc?.date || ''));
  if (!match) return '-';
  const [, y, m, d, hh, mm] = match;
  const fecha = `${Number(d)} ${MESES[Number(m) - 1]} ${y}`;
  return hh != null ? `${fecha} · ${hh.padStart(2, '0')}:${mm}` : fecha;
};

/** Número impreso de la factura (ej. "KPC4446"); Alegra lo manda en `numberTemplate`. */
export const invoiceNumber = (doc) =>
  doc?.numberTemplate?.fullNumber || doc?.numberTemplate?.number || doc?.id || '-';

// Pruebas de src/utils/salesMetrics.js: `npm test` (node --test, sin dependencias).
// Facturas con la forma real de /api/v1/invoices (30-sep-2026, leídas con el conector de Alegra).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePaymentMethod, paymentMethodLabel, paymentsByMethod, itemRevenue,
  invoiceHour, firstDayOfMonth, formatInvoiceDateTime, invoiceNumber,
} from './salesMetrics.js';

const kpc4435 = { // pago mixto: $100 efectivo + $90.000 transferencia; declarada DEBIT_TRANSFER
  id: '12934', total: 90100, paymentMethod: 'DEBIT_TRANSFER', datetime: '2026-09-30 15:47:01',
  numberTemplate: { prefix: 'KPC', number: '4435', fullNumber: 'KPC4435' },
  payments: [{ amount: 100, paymentMethod: 'cash' }, { amount: 90000, paymentMethod: 'transfer' }],
};
const kpc4433 = { // 45 % de descuento
  id: '12932', total: 27445, paymentMethod: 'CASH', datetime: '2026-09-30 10:11:21',
  payments: [{ amount: 27445, paymentMethod: 'cash' }],
  items: [{ name: 'CAMISETA HOMBRE 49900 / 1051499002', price: 49900, discount: 45, quantity: 1, total: 27445 }],
};
const sinPagos = { id: '1', total: 50000, paymentMethod: 'DEBIT_CARD', date: '2026-09-29', payments: [] };

test('medios de pago con las categorías del Cierre de Caja', () => {
  assert.equal(normalizePaymentMethod('DEBIT_TRANSFER'), 'transfer');
  assert.equal(normalizePaymentMethod('DEBIT_CARD'), 'debit-card');
  assert.equal(normalizePaymentMethod('CREDIT_CARD'), 'credit-card');
  assert.equal(normalizePaymentMethod('cash'), 'cash');
  assert.equal(paymentMethodLabel('transfer'), 'Transferencia');
  assert.equal(paymentMethodLabel(''), 'Otro');
});

test('pagos reales: el pago mixto se reparte y sin pagos usa lo declarado', () => {
  const rows = paymentsByMethod([kpc4435, kpc4433, sinPagos]);
  const by = Object.fromEntries(rows.map((r) => [r.metodo, r]));
  assert.equal(by.Transferencia.total, 90000);
  assert.equal(by.Efectivo.total, 100 + 27445);
  assert.equal(by.Efectivo.count, 2); // facturas con efectivo
  assert.equal(by['Tarjeta débito'].total, 50000);
  const suma = rows.reduce((s, r) => s + r.total, 0);
  assert.equal(suma, 90100 + 27445 + 50000); // = total de las facturas
  assert.equal(Math.round(rows.reduce((s, r) => s + r.porcentaje, 0)), 100);
});

test('ingreso del ítem con descuento', () => {
  assert.equal(itemRevenue(kpc4433.items[0]), 27445); // antes: 49.900
  assert.equal(itemRevenue({ price: 10000, quantity: 2, discount: 10 }), 18000); // sin total
});

test('hora sin new Date (Safari) y sin corrimiento a las 19 h', () => {
  assert.equal(invoiceHour(kpc4435), 15);
  assert.equal(invoiceHour({ datetime: '2026-09-30 09:05:00' }), 9);
  assert.equal(invoiceHour({ date: '2026-09-30' }), null);
});

test('primer día del mes sin toISOString', () => {
  assert.equal(firstDayOfMonth('2026-10-02'), '2026-10-01');
  assert.equal(firstDayOfMonth('2026-01-31'), '2026-01-01');
});

test('fecha y número de la factura para Documentos', () => {
  assert.equal(formatInvoiceDateTime(kpc4435), '30 sep 2026 · 15:47');
  assert.equal(formatInvoiceDateTime(sinPagos), '29 sep 2026');
  assert.equal(invoiceNumber(kpc4435), 'KPC4435');
  assert.equal(invoiceNumber({ id: '9' }), '9');
});

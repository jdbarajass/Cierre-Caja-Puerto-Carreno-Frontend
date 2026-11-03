// Pruebas de src/utils/tableFilters.js: `npm test` (node --test, sin dependencias).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchable, textMatches, inDateRange, anyFilter } from './tableFilters.js';

test('searchable quita tildes y mayúsculas', () => {
  assert.equal(searchable('Herrajería de CARREÑO'), 'herrajeria de carreno');
  assert.equal(searchable(null), '');
  assert.equal(searchable(1054399004), '1054399004');
});

test('textMatches busca todas las palabras en cualquier campo y orden', () => {
  const fields = ['Herrajería de Carreño (una parte)', 'En el Excel: $353.923', null];
  assert.ok(textMatches('', fields));
  assert.ok(textMatches('  ', fields));
  assert.ok(textMatches('carreño herrajeria', fields));
  assert.ok(textMatches('EXCEL', fields));
  assert.ok(!textMatches('herrajeria arriendo', fields));
  assert.ok(textMatches('yesica', ['Arriendo', 'Yesica']));
});

test('inDateRange incluye los extremos y acepta límites vacíos', () => {
  assert.ok(inDateRange('2026-10-05', '', ''));
  assert.ok(inDateRange('2026-10-05', '2026-10-05', '2026-10-05'));
  assert.ok(inDateRange('2026-10-05T14:00:00Z', '2026-10-01', '2026-10-05'));
  assert.ok(!inDateRange('2026-10-06', '', '2026-10-05'));
  assert.ok(!inDateRange('2026-09-30', '2026-10-01', ''));
  assert.ok(!inDateRange(null, '2026-10-01', ''));
});

test('anyFilter', () => {
  assert.ok(!anyFilter({ text: '', method: '' }));
  assert.ok(anyFilter({ text: '', method: 'qr' }));
});

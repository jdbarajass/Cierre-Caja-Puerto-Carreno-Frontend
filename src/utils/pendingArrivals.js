// Datáfono y Addi por llegar y lo que ya llegó: grupos y sumas compartidas por
// Cuentas → Mes y Cuentas → Resumen (los componentes están en
// components/accounts/PendingArrivals.jsx).

// Tarjetas: llegan a la misma cuenta (la de Cristhian, …6018) pero con comisión y
// día de llegada distintos. Datáfono = débito (ahorro) + crédito + Bold (Bold se
// maneja igual que el datáfono desde 2026-10-15).
export const CARD_GROUPS = [
  { key: 'datafono', label: 'Datáfono', detail: 'débito + crédito', medios: ['ahorro', 'credito', 'bold'], fee: '3,8 %', when: 'siguiente día hábil' },
  { key: 'addi', label: 'Addi', detail: '', medios: ['addi'], fee: '7,735 %', when: '30 días después' },
];
export const TRANSIT_LABEL = { ahorro: 'Datáfono débito', credito: 'Datáfono crédito', bold: 'Bold', addi: 'Addi' };

const sumOf = (items, key) => items.reduce((a, i) => a + i[key], 0);

// Suma por grupo (datáfono / Addi) de la plata por llegar (`tr`), de las
// comisiones del mes (`comm`, opcional: Resumen no lo usa) y de lo que ya
// llegó en el mes (`arr`, opcional: Mes no lo usa)
export const cardGroups = (tr, comm, arr) => CARD_GROUPS.map(g => {
  const items = (tr?.items || []).filter(i => g.medios.includes(i.medio));
  const arrivedItems = (arr?.items || []).filter(i => g.medios.includes(i.medio));
  const byMedio = comm?.by_medio || {};
  return {
    ...g,
    gross: sumOf(items, 'gross'),
    net: sumOf(items, 'net'),
    next: items.map(i => i.arrival_date).sort()[0] || null,
    sales: g.medios.reduce((a, m) => a + (byMedio[m]?.sales || 0), 0),
    commission: g.medios.reduce((a, m) => a + (byMedio[m]?.fee || 0), 0),
    arrivedGross: sumOf(arrivedItems, 'gross'),
    arrivedNet: sumOf(arrivedItems, 'net'),
    last: arrivedItems.map(i => i.arrival_date).sort().slice(-1)[0] || null,
  };
});

// Una fila por día de venta (como el reporte de pagos de Addi) de los ítems
// de un grupo, de `transit` o de `arrived` (mismo formato)
export const saleRows = (data, group) => (data?.items || [])
  .filter(i => group.medios.includes(i.medio))
  .flatMap(i => (i.by_sale || [{ date: i.sales_dates[0], gross: i.gross, net: i.net }])
    .map(s => ({ ...s, medio: i.medio, arrival_date: i.arrival_date })));

// Fechas "AAAA-MM-DD" sin new Date(texto) (Safari/iPhone y zona horaria)
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const weekday = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
};
// "2026-10-05" -> "lun 5"
export const dayLabel = (iso) => `${weekday(iso)} ${Number(iso.slice(8, 10))}`;
// "2026-10-05" -> "lun 5 oct"
export const dateLong = (iso) => `${dayLabel(iso)} ${MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]}`;
// "2026-10-01" -> "octubre"
export const monthName = (iso) => MONTHS_LONG[Number(iso.slice(5, 7)) - 1];

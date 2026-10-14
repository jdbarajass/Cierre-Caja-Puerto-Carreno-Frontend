// Datáfono y Addi por llegar: grupos y sumas compartidas por Cuentas → Mes y
// Cuentas → Resumen (los componentes están en components/accounts/PendingArrivals.jsx).

// Tarjetas: llegan a la misma cuenta (Bancolombia …6018) pero con comisión y
// día de llegada distintos. Datáfono = débito (ahorro) + crédito.
export const CARD_GROUPS = [
  { key: 'datafono', label: 'Datáfono', detail: 'débito + crédito', medios: ['ahorro', 'credito'], fee: '3,8 %', when: 'siguiente día hábil' },
  { key: 'addi', label: 'Addi', detail: '', medios: ['addi'], fee: '7,735 %', when: '30 días después' },
];
export const TRANSIT_LABEL = { ahorro: 'Datáfono débito', credito: 'Datáfono crédito', addi: 'Addi' };

// Suma por grupo (datáfono / Addi) de la plata por llegar y de las comisiones
// del mes (`comm` es opcional: Resumen no lo usa)
export const cardGroups = (tr, comm) => CARD_GROUPS.map(g => {
  const items = (tr?.items || []).filter(i => g.medios.includes(i.medio));
  const byMedio = comm?.by_medio || {};
  return {
    ...g,
    gross: items.reduce((a, i) => a + i.gross, 0),
    net: items.reduce((a, i) => a + i.net, 0),
    next: items.map(i => i.arrival_date).sort()[0] || null,
    sales: g.medios.reduce((a, m) => a + (byMedio[m]?.sales || 0), 0),
    commission: g.medios.reduce((a, m) => a + (byMedio[m]?.fee || 0), 0),
  };
});

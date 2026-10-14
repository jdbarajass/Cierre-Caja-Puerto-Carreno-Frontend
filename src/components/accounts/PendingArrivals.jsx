// Plata del datáfono y de Addi que todavía no llega a la cuenta de Cristhian
// (…6018). Lo usan Cuentas → Mes (tarjeta "Por llegar") y Cuentas → Resumen
// (tarjeta ADDI + DATÁFONO), con el mismo `transit` de /api/month-sheet: la
// fecha de llegada la calcula el backend (payment_facts.arrival_date, con los
// festivos de Colombia), aquí solo se agrupa y se muestra.
import React from 'react';
import { Hourglass, X } from 'lucide-react';
import useDialog from '../../hooks/useDialog';
import { TRANSIT_LABEL, cardGroups } from '../../utils/pendingArrivals';

const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.round(v || 0));

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dayLabel = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${d}`;
};
const dateLong = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS_SHORT[m - 1]}`;
};

// Una línea clickeable por grupo: "Addi · próxima lun 19 ......... $ 2.988.491"
export const PendingGroupRows = ({ groups, onOpen, hoverClass = 'hover:bg-sky-100' }) => (
  <div className="space-y-0.5 text-[11px] text-gray-700">
    {groups.map(g => (
      <button key={g.key} type="button" onClick={() => onOpen(g.key)} disabled={!g.gross}
        title={g.gross ? `Ver qué falta que llegue de ${g.label}` : undefined}
        className={`w-full flex justify-between gap-2 text-left rounded px-1 -mx-1 ${hoverClass} disabled:hover:bg-transparent disabled:cursor-default`}>
        <span>
          <span className={g.gross ? 'underline decoration-dotted underline-offset-2' : ''}>{g.label}</span>
          {g.next && <span className="text-gray-500"> · {g.key === 'addi' ? 'próxima' : 'llega'} {dayLabel(g.next)}</span>}
        </span>
        <span className="font-semibold whitespace-nowrap">{fmt(g.net)}</span>
      </button>
    ))}
  </div>
);

// Detalle de lo que falta por llegar de un grupo ('datafono' | 'addi')
export const PendingArrivalsDialog = ({ groupKey, transit: tr, onClose }) => {
  const ref = useDialog(true, onClose);
  const g = cardGroups(tr).find(x => x.key === groupKey);
  // Una fila por día de venta (como el reporte de pagos de Addi), la más próxima arriba
  const items = tr.items.filter(i => g.medios.includes(i.medio)).flatMap(i =>
    (i.by_sale || [{ date: i.sales_dates[0], gross: i.gross, net: i.net }]).map(s => ({ ...s, medio: i.medio, arrival_date: i.arrival_date })));
  const first = items[0]?.arrival_date;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end sm:items-center justify-center min-h-full sm:p-4">
        <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-[2px]" onClick={onClose} />
        <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dlg-pending" tabIndex={-1}
          className="relative w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl sm:max-w-2xl max-h-[92dvh] overflow-y-auto overscroll-contain">
          <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
            <div>
              <h3 id="dlg-pending" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Hourglass className="w-5 h-5 text-sky-600" /> {g.label}: lo que falta que llegue
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {g.key === 'addi'
                  ? 'Ventas con Addi (de este mes y de meses pasados) que Addi todavía no ha consignado. Paga 30 días después de la venta (o el siguiente día hábil), menos 7,735 % (6,5 % + IVA).'
                  : 'Ventas con tarjeta débito y crédito que todavía no llegan. Llegan el siguiente día hábil (sin sábados, domingos ni festivos de Colombia: lo del viernes llega el lunes), menos 3,8 %.'}
                {' '}Llega a la cuenta de Cristhian (…6018). Calculado al {tr.cutoff}.
              </p>
            </div>
            <button aria-label="Cerrar" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-sky-50 text-center">
            <div><p className="text-[11px] text-gray-500 uppercase">Vendido</p><p className="font-semibold text-gray-800">{fmt(g.gross)}</p></div>
            <div><p className="text-[11px] text-gray-500 uppercase">Comisión</p><p className="font-semibold text-orange-700">−{fmt(g.gross - g.net)}</p></div>
            <div><p className="text-[11px] text-gray-500 uppercase">Te llega</p><p className="text-lg font-bold text-sky-800">{fmt(g.net)}</p></div>
          </div>
          <ul className="divide-y divide-gray-100">
            {items.map((i, idx) => (
              <li key={`${i.arrival_date}-${i.medio}-${i.date}-${idx}`} className="px-5 py-2.5 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    Llega {dateLong(i.arrival_date)}
                    {i.arrival_date === first && <span className="ml-2 normal-case px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[11px] font-semibold">Próximo</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {g.key === 'datafono' && `${TRANSIT_LABEL[i.medio]} · `}Venta del {dateLong(i.date)} · vendido {fmt(i.gross)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sky-800 whitespace-nowrap">{fmt(i.net)}</p>
                  <p className="text-[11px] text-orange-700 whitespace-nowrap">−{fmt(i.gross - i.net)}</p>
                </div>
              </li>
            ))}
          </ul>
          {g.key === 'addi' && (
            <p className="px-5 py-3 text-[11px] text-gray-600 bg-gray-50 border-t border-gray-100">
              Para revisar: en el <b>Reporte de pagos</b> de Addi, cada pago "Pendiente de pago" debe tener la misma fecha y el mismo "Total a pagar" que aquí.
              Si una venta de aquí no aparece en Addi, probablemente se pasó por datáfono: corrígela con el lápiz ✎ de ese día en Cuentas → Mes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Plata del datáfono y de Addi: lo que todavía no llega a la cuenta de Cristhian
// (…6018) y lo que ya llegó en el mes. Lo usan Cuentas → Mes (tarjeta "Por
// llegar") y Cuentas → Resumen (tarjeta ADDI + DATÁFONO), con `transit` y
// `arrived` de /api/month-sheet: la fecha de llegada la calcula el backend
// (payment_facts.arrival_date, con los festivos de Colombia y los pagos que
// Addi corrió), aquí solo se agrupa y se muestra.
import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Hourglass, X } from 'lucide-react';
import useDialog from '../../hooks/useDialog';
import { getMonthSheet } from '../../services/monthSheetService';
import { MONTHS_LONG, TRANSIT_LABEL, cardGroups, dateLong, dayLabel, saleRows } from '../../utils/pendingArrivals';

const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.round(v || 0));

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

// Marco común de las dos ventanas: encabezado, resumen y una fila por día de venta
const ArrivalsDialogFrame = ({ onClose, icon, title, nav, intro, summary, rows, badge, empty, footer }) => {
  const ref = useDialog(true, onClose);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end sm:items-center justify-center min-h-full sm:p-4">
        <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-[2px]" onClick={onClose} />
        <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dlg-arrivals" tabIndex={-1}
          className="relative w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl sm:max-w-2xl max-h-[92dvh] overflow-y-auto overscroll-contain">
          <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
            <div>
              <h3 id="dlg-arrivals" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {icon} {title}
              </h3>
              {nav}
              <p className="text-xs text-gray-500 mt-0.5">{intro}</p>
            </div>
            <button aria-label="Cerrar" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          {summary}
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500 text-center">{empty}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((i, idx) => (
                <li key={`${i.arrival_date}-${i.medio}-${i.date}-${idx}`} className="px-5 py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">
                      Llega{badge ? '' : 'ó'} {dateLong(i.arrival_date)}
                      {badge && i.arrival_date === rows[0].arrival_date && <span className="ml-2 normal-case px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[11px] font-semibold">{badge}</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {i.medio !== 'addi' && `${TRANSIT_LABEL[i.medio]} · `}Venta del {dateLong(i.date)} · vendido {fmt(i.gross)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sky-800 whitespace-nowrap">{fmt(i.net)}</p>
                    <p className="text-[11px] text-orange-700 whitespace-nowrap">−{fmt(i.gross - i.net)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {footer}
        </div>
      </div>
    </div>
  );
};

const Summary = ({ gross, net, netLabel }) => (
  <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-sky-50 text-center">
    <div><p className="text-[11px] text-gray-500 uppercase">Vendido</p><p className="font-semibold text-gray-800">{fmt(gross)}</p></div>
    <div><p className="text-[11px] text-gray-500 uppercase">Comisión</p><p className="font-semibold text-orange-700">−{fmt(gross - net)}</p></div>
    <div><p className="text-[11px] text-gray-500 uppercase">{netLabel}</p><p className="text-lg font-bold text-sky-800">{fmt(net)}</p></div>
  </div>
);

const RULE = {
  addi: 'Addi paga 30 días después de la venta (o el siguiente día hábil), menos 7,735 % (6,5 % + IVA).',
  datafono: 'Datáfono (débito, crédito y Bold): llega el siguiente día hábil (sin sábados, domingos ni festivos de Colombia: lo del viernes llega el lunes), menos 3,8 %.',
};

// Detalle de lo que falta por llegar de un grupo ('datafono' | 'addi')
export const PendingArrivalsDialog = ({ groupKey, transit: tr, onClose }) => {
  const g = cardGroups(tr).find(x => x.key === groupKey);
  return (
    <ArrivalsDialogFrame
      onClose={onClose} icon={<Hourglass className="w-5 h-5 text-sky-600" />}
      title={`${g.label}: lo que falta que llegue`}
      intro={<>
        {g.key === 'addi'
          ? 'Ventas con Addi (de este mes y de meses pasados) que Addi todavía no ha consignado. '
          : 'Ventas con datáfono que todavía no llegan. '}
        {RULE[g.key]} Llega a la cuenta de Cristhian (…6018). Calculado al {tr.cutoff}.
      </>}
      summary={<Summary gross={g.gross} net={g.net} netLabel="Te llega" />}
      rows={saleRows(tr, g)} badge="Próximo" empty="No falta nada por llegar."
      footer={g.key === 'addi' && (
        <p className="px-5 py-3 text-[11px] text-gray-600 bg-gray-50 border-t border-gray-100">
          Para revisar: en el <b>Reporte de pagos</b> de Addi, cada pago "Pendiente de pago" debe tener la misma fecha y el mismo "Total a pagar" que aquí.
          Si una venta de aquí no aparece en Addi, probablemente se pasó por datáfono: corrígela con el lápiz ✎ de ese día en Cuentas → Mes.
          (Addi publica el reporte de cada pago pocos días antes de pagarlo.)
        </p>
      )}
    />
  );
};

// Detalle de lo que ya llegó de un grupo en un mes, con flechas para ver los
// meses anteriores (el mes de `arrived` es el más reciente que se puede ver)
export const ArrivedDialog = ({ groupKey, arrived: initial, onClose }) => {
  const [data, setData] = useState(initial);
  const [status, setStatus] = useState('ready');
  const [ym, setYm] = useState(() => ({ y: Number(initial.start.slice(0, 4)), m: Number(initial.start.slice(5, 7)) }));
  const latest = initial.start.slice(0, 7);
  const current = `${ym.y}-${String(ym.m).padStart(2, '0')}`;

  useEffect(() => {
    if (current === latest) { setData(initial); setStatus('ready'); return undefined; }
    let alive = true;
    setStatus('loading');
    getMonthSheet({ year: ym.y, month: ym.m })
      .then(sheet => { if (alive) { setData(sheet.arrived || { start: `${current}-01`, items: [] }); setStatus('ready'); } })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [current, latest, initial, ym.y, ym.m]);

  const move = (delta) => setYm(({ y, m }) => {
    const t = y * 12 + (m - 1) + delta;
    return { y: Math.floor(t / 12), m: (t % 12) + 1 };
  });

  const g = cardGroups(null, null, data).find(x => x.key === groupKey);
  const rows = status === 'ready' ? saleRows(data, g).reverse() : [];   // lo más reciente arriba
  const label = `${MONTHS_LONG[ym.m - 1]} ${ym.y}`;

  return (
    <ArrivalsDialogFrame
      onClose={onClose} icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
      title={`${g.label}: lo que llegó`}
      nav={
        <div className="flex items-center gap-1 mt-1">
          <button type="button" onClick={() => move(-1)} aria-label="Mes anterior" className="p-1 rounded hover:bg-gray-100 text-gray-600"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-gray-800 capitalize min-w-[8.5rem] text-center">{label}</span>
          <button type="button" onClick={() => move(1)} disabled={current >= latest} aria-label="Mes siguiente" className="p-1 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"><ChevronRight className="w-4 h-4" /></button>
        </div>
      }
      intro={<>
        Pagos que llegaron a la cuenta de Cristhian (…6018) en {label}, ya sin comisión, uno por día de venta. {RULE[g.key]}
        {' '}Lo vendido a fin de mes que llega el mes siguiente cuenta en el mes en que llega.
        {current === latest && data.cutoff && ` Calculado al ${data.cutoff}.`}
      </>}
      summary={status === 'ready' && <Summary gross={g.arrivedGross} net={g.arrivedNet} netLabel="Llegó" />}
      rows={rows}
      empty={status === 'loading' ? 'Cargando…' : status === 'error' ? 'No se pudo cargar ese mes.' : `No llegó nada de ${g.label} en ${label}.`}
      footer={status === 'ready' && (g.key === 'addi' || current < '2026-10') && (
        <p className="px-5 py-3 text-[11px] text-gray-600 bg-gray-50 border-t border-gray-100">
          {g.key === 'addi' && 'Para revisar: en el Reporte de pagos de Addi, cada pago en estado "Pago" debe tener la misma fecha y el mismo "Total a pagar" que aquí. '}
          {current < '2026-10' && 'Ojo: la plataforma tiene las ventas por medio de pago desde el 1-sep-2026, así que aquí faltan los pagos de ventas de agosto.'}
        </p>
      )}
    />
  );
};

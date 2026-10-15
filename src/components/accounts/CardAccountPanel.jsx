// Tarjeta ADDI + DATÁFONO de Cuentas → Resumen (2026-10-15). Va sola, a todo
// el ancho, debajo de Notas importantes, para no descuadrar la cuadrícula de
// las demás cuentas.
//
// Izquierda: el saldo de la cuenta (lo que suma al total de Cuentas), "Contempla
// saldo hasta", el formulario "Igualar al banco" (desaparece al usarlo) y la
// nota. Derecha: tres columnas que se leen como tabla, Datáfono | Addi |
// Datáfono + Addi, cada una con "Vendido en <mes>" (la venta real, para
// comparar con el Excel, lo que de eso llega a la cuenta y la comisión que se
// queda el datáfono o Addi),
// "Llegó en <mes>" y "Por llegar"; las dos primeras abren el detalle
// (ArrivedDialog / PendingArrivalsDialog). Lo vendido sale de
// `commissions.by_medio` de la hoja del mes (ventas del mes con correcciones).
//
// Con `cardSince` (plata real del banco activo) el saldo es lo que ya llegó y
// lo que falta por llegar va aparte. Sin activar, el saldo todavía incluye lo
// vendido que no ha llegado. "Llegó en <mes>" se calcula desde las ventas
// (month_sheet.arrived) y no tiene que sumar igual al saldo: el banco también
// tiene lo que había al empezar el mes y de ahí sale plata (gastos, envíos).
import React, { useState } from 'react';
import { cardGroups, dayLabel, monthName } from '../../utils/pendingArrivals';

const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.round(v || 0));

// Una fila de una columna: etiqueta, monto y fecha, siempre en tres líneas
// para que los montos de las tres columnas queden a la misma altura. Con
// `onClick` es un botón que abre el detalle.
const Figure = ({ label, meta, fee, amount, tone, onClick, disabled, title }) => {
  const body = (
    <>
      <span className={`block text-xs text-gray-600 truncate ${onClick && !disabled ? 'underline decoration-dotted underline-offset-2' : ''}`}>{label}</span>
      <span className={`block text-lg font-bold tabular-nums leading-tight mt-0.5 ${tone}`}>{fmt(amount)}</span>
      <span className="block text-[11px] text-gray-500 truncate">{meta || ' '}</span>
      {fee !== undefined && <span className="block text-[11px] text-orange-700 truncate">Comisión: −{fmt(fee)}</span>}
    </>
  );
  if (!onClick) return <div className="px-2 py-1.5">{body}</div>;
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className="w-full text-left rounded-md px-2 py-1.5 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-default disabled:hover:bg-transparent">
      {body}
    </button>
  );
};

const Column = ({ title, caption, children, highlight }) => (
  <div className={`p-2 ${highlight ? 'bg-sky-50' : 'bg-gray-50/60'}`}>
    <div className="px-2 pt-1 pb-2 sm:min-h-[3.25rem]">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-[11px] text-gray-500 leading-snug">{caption}</p>
    </div>
    <div className="space-y-1">{children}</div>
  </div>
);

const CardAccountPanel = ({
  account, dotClass, transit, arrived, commissions, cardSince, onOpenArrived, onOpenPending, onStart,
  contemplatedField, noteField, renderMoneyInput,
}) => {
  const [real, setReal] = useState('');
  const [saving, setSaving] = useState(false);
  const balance = Number(account.balance) || 0;
  const hasData = !!transit;
  const groups = cardGroups(transit, commissions, arrived);
  const month = arrived ? monthName(arrived.start) : 'el mes';
  const arrivedTotal = groups.reduce((a, g) => a + g.arrivedNet, 0);
  const soldTotal = groups.reduce((a, g) => a + g.sales, 0);
  const soldNetTotal = groups.reduce((a, g) => a + g.sales - g.commission, 0);

  const start = async (e) => {
    e.preventDefault();
    const value = Number(real);
    if (!real) return;
    if (!window.confirm(`La cuenta queda en ${fmt(value)} (lo que hay hoy en el banco). Desde mañana el datáfono y Addi entran solos el día que llegan, ya sin comisión, y el cierre ya no los suma el día de la venta. ¿Continuar?`)) return;
    setSaving(true);
    const ok = await onStart(value);
    setSaving(false);
    if (ok) setReal('');
  };

  return (
    <section aria-label={account.name} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className={`grid gap-5 ${hasData ? 'lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]' : ''}`}>
        {/* Saldo de la cuenta */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
            <h3 className="text-sm font-semibold text-gray-700">{account.name}</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmt(balance)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {cardSince ? 'Disponible: lo que ya llegó al banco (neto)' : 'Todavía incluye lo vendido que no ha llegado'}
          </p>
          <div className="mt-2 flex items-center gap-1.5">{contemplatedField}</div>

          {hasData && cardSince && (
            <p className="mt-3 text-xs text-gray-600 flex justify-between gap-2">
              <span>Banco + por llegar</span>
              <span className="font-semibold text-gray-800 tabular-nums">{fmt(balance + transit.net)}</span>
            </p>
          )}
          {hasData && !cardSince && (
            <form onSubmit={start} className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5 space-y-2">
              <p className="text-[11px] leading-snug text-amber-900">
                Escribe lo que hay hoy en el banco para que el saldo sea solo plata disponible.
                Hazlo al final del día, cuando ya hayan entrado los pagos de hoy.
              </p>
              {renderMoneyInput({ placeholder: 'Saldo hoy en el banco', value: real, onChange: setReal })}
              <button type="submit" disabled={saving || !real}
                className="w-full px-3 py-2 text-xs font-medium bg-sky-700 text-white rounded-lg hover:bg-sky-800 disabled:opacity-50">
                {saving ? 'Guardando…' : 'Igualar al banco'}
              </button>
            </form>
          )}
        </div>

        {/* Datáfono | Addi | las dos */}
        {hasData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 rounded-lg border border-gray-200 overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-gray-200 self-start">
            {groups.map(g => (
              <Column key={g.key} title={g.label}
                caption={`${g.key === 'datafono' ? 'Débito, crédito y Bold · siguiente día hábil' : '30 días después de la venta'} · −${g.fee}`}>
                <Figure label={`Vendido en ${month}`} meta={`A la cuenta: ${fmt(g.sales - g.commission)}`}
                  fee={g.commission} amount={g.sales} tone="text-gray-900" />
                <Figure label={`Llegó en ${month}`} meta={g.last && `Último: ${dayLabel(g.last)}`}
                  amount={g.arrivedNet} tone="text-emerald-700"
                  onClick={() => onOpenArrived(g.key)} title={`Ver los pagos de ${g.label} que llegaron en ${month}`} />
                <Figure label="Por llegar" meta={g.next && `${g.key === 'addi' ? 'Próximo pago' : 'Llega'}: ${dayLabel(g.next)}`}
                  amount={g.net} tone="text-sky-800"
                  onClick={() => onOpenPending(g.key)} disabled={!g.gross}
                  title={g.gross ? `Ver qué falta que llegue de ${g.label}` : undefined} />
              </Column>
            ))}
            <Column title="Datáfono + Addi" caption="Lo que suman las dos, ya sin comisión" highlight>
              <Figure label={`Vendido en ${month}`} meta={`A la cuenta: ${fmt(soldNetTotal)}`} fee={soldTotal - soldNetTotal} amount={soldTotal} tone="text-gray-900" />
              <Figure label={`Llegó en ${month}`} amount={arrivedTotal} tone="text-emerald-800" />
              <Figure label="Por llegar"
                meta={`de ${fmt(transit.gross)} vendidos`} amount={transit.net} tone="text-sky-900" />
            </Column>
          </div>
        )}
      </div>
      {noteField}
    </section>
  );
};

export default CardAccountPanel;

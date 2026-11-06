// Tarjeta de la deuda entre tiendas en Cuentas → Resumen (Radiografía Fase 0b,
// docs/PLAN_RADIOGRAFIA.md del backend). Carreño ve "Primavera nos debe" y
// Primavera "Le debemos a Carreño": el mismo saldo, que arranca en el saldo de
// partida y baja con cada abono registrado en Gastos. Al darle clic se abre el
// detalle: partida, préstamos y abonos con el saldo después de cada uno, y el
// historial de cambios del saldo de partida. El admin de solo lectura lo ve
// todo pero no puede cambiar el saldo de partida.
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { getInterStoreDebt, updateInterStoreDebtOpening } from '../../services/expensesService';
import useDialog from '../../hooks/useDialog';
import { isReadOnly } from '../../utils/auth';

const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);
const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
const KIND = {
  prestamo: { label: 'Préstamo', sign: '+', cls: 'text-red-700' },
  abono: { label: 'Abono', sign: '−', cls: 'text-emerald-700' },
  devolucion: { label: 'Devolución', sign: '−', cls: 'text-emerald-700' },
};
const METHOD_LABEL = { efectivo: 'Efectivo', datafono: 'Datáfono/Addi', qr: 'QR', nequi: 'Nequi', daviplata: 'Daviplata', bbva: 'BBVA', ahorro: 'Ahorro' };

const title = (d) => (d.perspective === 'lender' ? `${d.borrower_name} nos debe`
  : d.perspective === 'borrower' ? `Le debemos a ${d.lender_name}` : `${d.borrower_name} le debe a ${d.lender_name}`);

const DebtDialog = ({ debt, onClose, onSaved, onGoToGastos }) => {
  const ref = useDialog(true, onClose);
  const readOnly = isReadOnly();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ opening_balance: String(debt.opening_balance), opening_date: debt.opening_date, note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateInterStoreDebtOpening({ ...form, opening_balance: Number(form.opening_balance) });
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex items-end sm:items-center justify-center h-full sm:p-6">
        <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-[2px]" onClick={onClose} />
        <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dlg-debt-title"
          className="relative w-full sm:max-w-2xl max-h-[88dvh] flex flex-col bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl">
          <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between gap-3">
            <h3 id="dlg-debt-title" className="text-base font-semibold text-gray-900">{title(debt)}</h3>
            <button type="button" aria-label="Cerrar" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-[11px] text-gray-500">Saldo de partida ({fmtDate(debt.opening_date)})</p><p className="font-bold text-gray-900">{fmt(debt.opening_balance)}</p></div>
              <div className="rounded-xl bg-red-50 p-3"><p className="text-[11px] text-gray-500">Préstamos nuevos</p><p className="font-bold text-red-700">+{fmt(debt.lent_since)}</p></div>
              <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[11px] text-gray-500">Abonado</p><p className="font-bold text-emerald-700">−{fmt(debt.paid_since)}</p></div>
              <div className="rounded-xl bg-indigo-50 p-3"><p className="text-[11px] text-gray-500">Saldo hoy</p><p className="font-bold text-indigo-900">{fmt(debt.balance)}</p></div>
            </div>
            <p className="text-[11px] text-gray-500">
              Saldo hoy = partida + préstamos de {debt.lender_name} a {debt.borrower_name} − abonos, desde el {fmtDate(debt.opening_date)}.
              No es gasto ni ingreso de ninguna tienda. Lo anterior a esa fecha queda solo como historial ({debt.history_before?.count || 0} registros).
            </p>

            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">Pagos y préstamos</p>
              {debt.movements.length === 0 ? (
                <p className="text-sm text-gray-500">Todavía no hay abonos ni préstamos nuevos.</p>
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                  {debt.movements.slice().reverse().map(m => (
                    <li key={`${m.store_code}-${m.id}`} className="px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-800">{fmtDate(m.date)} · {KIND[m.kind].label}</span>
                        <span className={`font-bold whitespace-nowrap ${KIND[m.kind].cls}`}>{KIND[m.kind].sign}{fmt(m.amount)}</span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {[m.concept, m.purpose_label,
                          Object.keys(m.methods || {}).map(k => METHOD_LABEL[k] || k).join(' + '),
                          m.account_mode === 'caja' ? 'De la caja del día' : m.account_mode === 'sin_mover' ? 'Sin mover cuentas' : null,
                          m.notes].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-[11px] text-gray-600">Saldo después: {fmt(m.balance_after)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {(debt.opening_history || []).length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Cambios del saldo de partida</p>
                <ul className="text-[11px] text-gray-600 space-y-1">
                  {debt.opening_history.slice().reverse().map((c, i) => (
                    <li key={i}>{fmtDate(c.at)} · {c.by}: {fmt(c.old_balance)} ({fmtDate(c.old_date)}) → {fmt(c.new_balance)} ({fmtDate(c.new_date)}) · {c.note}</li>
                  ))}
                </ul>
              </div>
            )}

            {!readOnly && editing && (
              <form onSubmit={save} className="border border-amber-200 bg-amber-50 rounded-xl p-3 space-y-2">
                <p className="text-xs text-amber-900">Cambiar el saldo de partida queda en el historial con tu nota.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="text-xs text-gray-600">Saldo de partida
                    <input type="number" min="0" required value={form.opening_balance} onChange={e => setForm(f => ({ ...f, opening_balance: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
                  </label>
                  <label className="text-xs text-gray-600">Fecha de partida
                    <input type="date" required value={form.opening_date} onChange={e => setForm(f => ({ ...f, opening_date: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
                  </label>
                </div>
                <label className="block text-xs text-gray-600">¿Por qué se cambia? *
                  <input type="text" required maxLength={300} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
                </label>
                {error && <p className="text-xs text-red-700">{error}</p>}
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white">Cancelar</button>
                  <button type="submit" disabled={saving} className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
                </div>
              </form>
            )}
          </div>
          {!readOnly && (
            <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
              {!editing && <button type="button" onClick={() => setEditing(true)} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg">Ajustar saldo de partida</button>}
              <button type="button" onClick={() => { onClose(); onGoToGastos?.(); }} className="px-3 py-1.5 text-xs bg-indigo-700 text-white rounded-lg">
                {debt.perspective === 'borrower' ? 'Registrar abono en Gastos' : 'Registrar préstamo en Gastos'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InterStoreDebtCard = ({ refreshKey, onGoToGastos }) => {
  const [debt, setDebt] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    getInterStoreDebt().then(d => { setDebt(d.debt); setError(''); }).catch(e => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Deuda entre tiendas: {error}</div>;
  if (!debt) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="w-full text-left bg-white rounded-xl border border-indigo-200 shadow-sm p-5 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2 text-sm font-bold text-indigo-900 tracking-wide">
            <ArrowLeftRight className="w-4 h-4" aria-hidden="true" /> {title(debt).toUpperCase()}
          </span>
          <span className="text-2xl font-bold text-indigo-900">{fmt(debt.balance)}</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          Partida {fmt(debt.opening_balance)} el {fmtDate(debt.opening_date)}
          {debt.paid_since ? ` · abonado ${fmt(debt.paid_since)}` : ''}
          {debt.lent_since ? ` · préstamos nuevos ${fmt(debt.lent_since)}` : ''}
          {' · '}<span className="text-indigo-700 underline">ver detalle</span>
        </p>
      </button>
      {open && <DebtDialog debt={debt} onClose={() => setOpen(false)} onSaved={load} onGoToGastos={onGoToGastos} />}
    </>
  );
};

export default InterStoreDebtCard;

// Tarjetas de los préstamos de la tienda en Cuentas → Resumen (Radiografía
// Fase 0c, docs/PLAN_RADIOGRAFIA.md del backend). Carreño: mamá de Angie;
// Primavera: don Miguel (BBVA) con sus 3 préstamos en una sola tarjeta.
// Al darle clic: lo prestado, lo pagado, el saldo y cada pago con su interés y
// capital; editar plazo, tasa y cuota (se recalcula lo demás), ajustar el saldo
// al del banco y registrar un pago. El pago con plata se guarda como un gasto
// de Cuentas → Gastos (cuota de crédito ligada al préstamo): un solo registro
// que baja la cuenta y la deuda. El admin de solo lectura lo ve sin botones.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Landmark, Trash2, X } from 'lucide-react';
import { addLoanPayment, createExpense, deleteLoanPayment, getLoans, updateLoan } from '../../services/expensesService';
import useDialog from '../../hooks/useDialog';
import { isReadOnly } from '../../utils/auth';
import { getColombiaDate } from '../../utils/dateUtils';

const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.round(v || 0));
const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
const todayStr = () => {
  const d = getColombiaDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const pct = (v) => (v == null ? '—' : `${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`);

// De dónde salió la plata del pago
const SOURCES = [
  { value: 'efectivo', label: 'Efectivo (de las cuentas)' },
  { value: 'caja', label: 'Efectivo de la caja del día' },
  { value: 'qr', label: 'QR' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'bbva', label: 'BBVA' },
  { value: 'datafono', label: 'Datáfono/Addi' },
  { value: 'ahorro', label: 'Ahorro' },
  { value: 'descontado', label: 'Descontada del mismo préstamo (no sale plata)' },
];
const KIND_LABEL = { pago: 'Pago', descontado: 'Descontada del préstamo', ajuste: 'Ajuste de saldo' };
const inputCls = 'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white';

const PaymentForm = ({ group, onDone }) => {
  const first = group.loans.find(l => l.active) || group.loans[0];
  const [form, setForm] = useState({ loanId: String(first.id), date: todayStr(), amount: first.installment ? String(Math.round(first.installment)) : '', source: 'efectivo', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const loan = group.loans.find(l => String(l.id) === form.loanId);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const amount = Number(form.amount);
      if (!(amount > 0)) throw new Error('Escribe el valor del pago');
      if (form.source === 'descontado') {
        await addLoanPayment(loan.id, { kind: 'descontado', amount, date: form.date, note: form.note || 'Cuota descontada del mismo préstamo' });
      } else {
        const method = form.source === 'caja' ? 'efectivo' : form.source;
        await createExpense({
          direction: 'out', date: form.date, period: form.date.slice(0, 7),
          concept: `Cuota ${group.group_name} · ${loan.name}`, category: 'cuota_credito', subcategory: 'cuota_banco',
          account_mode: form.source === 'caja' ? 'caja' : 'cuentas', apply_fee: true,
          loan_id: loan.id, notes: form.note, [method]: amount,
        });
      }
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="border border-indigo-200 bg-indigo-50 rounded-xl p-3 space-y-2">
      <p className="text-sm font-semibold text-indigo-900">Registrar pago</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {group.loans.length > 1 && (
          <label className="text-xs text-gray-600 sm:col-span-2">¿A qué préstamo? *
            <select required value={form.loanId} onChange={e => { const l = group.loans.find(x => String(x.id) === e.target.value); setForm(f => ({ ...f, loanId: e.target.value, amount: l?.installment ? String(Math.round(l.installment)) : f.amount })); }} className={inputCls}>
              {group.loans.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        )}
        <label className="text-xs text-gray-600">Fecha *
          <input type="date" required value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
        </label>
        <label className="text-xs text-gray-600">Valor *
          <input type="number" min="1" required value={form.amount} onChange={e => set('amount', e.target.value)} className={inputCls} />
        </label>
        <label className="text-xs text-gray-600 sm:col-span-2">¿De dónde salió? *
          <select value={form.source} onChange={e => set('source', e.target.value)} className={inputCls}>
            {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-600 sm:col-span-2">Nota
          <input type="text" maxLength={250} value={form.note} onChange={e => set('note', e.target.value)} className={inputCls} placeholder="Ej.: cuota 1 de 24" />
        </label>
      </div>
      <p className="text-[11px] text-gray-600">
        {form.source === 'descontado' ? 'Baja la deuda sin mover las cuentas ni contar como gasto del mes.'
          : 'Queda como gasto en Cuentas → Gastos (cuota de crédito): baja la cuenta y la deuda una sola vez.'}
      </p>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="px-3 py-1.5 text-xs bg-indigo-700 text-white rounded-lg disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar pago'}</button>
      </div>
    </form>
  );
};

const LoanEditor = ({ loan, onDone, onCancel }) => {
  const [form, setForm] = useState({
    principal: String(loan.principal), term_months: loan.term_months ?? '', monthly_rate_pct: loan.monthly_rate_pct ?? '',
    installment: loan.installment != null ? String(Math.round(loan.installment)) : '', due_day: String(loan.due_day), change_note: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    // Solo se manda lo que cambió: así el backend sabe qué recalcular
    const payload = { change_note: form.change_note };
    const num = (v) => (v === '' ? null : Number(v));
    if (num(form.principal) !== loan.principal) payload.principal = num(form.principal);
    if (num(form.term_months) !== loan.term_months) payload.term_months = num(form.term_months);
    if (num(form.monthly_rate_pct) !== loan.monthly_rate_pct) payload.monthly_rate_pct = num(form.monthly_rate_pct);
    if (num(form.installment) !== (loan.installment != null ? Math.round(loan.installment) : null)) payload.installment = num(form.installment);
    if (num(form.due_day) !== loan.due_day) payload.due_day = num(form.due_day);
    try {
      await updateLoan(loan.id, payload);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="border border-amber-200 bg-amber-50 rounded-xl p-3 space-y-2 mt-2">
      <p className="text-[11px] text-amber-900">Si cambias el plazo o la tasa se recalcula la cuota; si cambias la cuota se recalcula la tasa. Todo queda en el historial.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <label className="text-xs text-gray-600">Valor prestado<input type="number" min="0" required value={form.principal} onChange={e => set('principal', e.target.value)} className={inputCls} /></label>
        <label className="text-xs text-gray-600">Plazo (meses)<input type="number" min="1" value={form.term_months} onChange={e => set('term_months', e.target.value)} className={inputCls} /></label>
        <label className="text-xs text-gray-600">Interés mensual %<input type="number" min="0" step="0.0001" value={form.monthly_rate_pct} onChange={e => set('monthly_rate_pct', e.target.value)} className={inputCls} /></label>
        <label className="text-xs text-gray-600">Cuota<input type="number" min="0" value={form.installment} onChange={e => set('installment', e.target.value)} className={inputCls} /></label>
        <label className="text-xs text-gray-600">Aviso desde el día<input type="number" min="1" max="31" value={form.due_day} onChange={e => set('due_day', e.target.value)} className={inputCls} /></label>
        <label className="text-xs text-gray-600 col-span-2 sm:col-span-3">¿Por qué el cambio?<input type="text" maxLength={300} value={form.change_note} onChange={e => set('change_note', e.target.value)} className={inputCls} placeholder="Ej.: el banco confirmó la tasa" /></label>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white">Cancelar</button>
        <button type="submit" disabled={saving} className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
};

const BalanceAdjust = ({ loan, onDone, onCancel }) => {
  const [form, setForm] = useState({ new_balance: String(Math.round(loan.balance)), note: '', date: todayStr() });
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await addLoanPayment(loan.id, { kind: 'ajuste', new_balance: Number(form.new_balance), note: form.note, date: form.date });
      onDone();
    } catch (err) { setError(err.message); }
  };
  return (
    <form onSubmit={submit} className="border border-amber-200 bg-amber-50 rounded-xl p-3 space-y-2 mt-2">
      <p className="text-[11px] text-amber-900">Para igualar con lo que diga el banco o la persona. No es pago ni gasto.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-600">Saldo real<input type="number" min="0" required value={form.new_balance} onChange={e => setForm(f => ({ ...f, new_balance: e.target.value }))} className={inputCls} /></label>
        <label className="text-xs text-gray-600">Fecha<input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} /></label>
        <label className="text-xs text-gray-600 col-span-2">¿Por qué? *<input type="text" required maxLength={300} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className={inputCls} placeholder="Ej.: extracto BBVA de noviembre" /></label>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white">Cancelar</button>
        <button type="submit" className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg">Ajustar</button>
      </div>
    </form>
  );
};

const LoanDetail = ({ loan, readOnly, onChanged }) => {
  const [mode, setMode] = useState(null); // null | 'edit' | 'adjust'
  const done = () => { setMode(null); onChanged(); };
  const remove = async (p) => {
    if (!window.confirm(`¿Borrar "${KIND_LABEL[p.kind]}" de ${fmt(p.amount)} del ${fmtDate(p.date)}?`)) return;
    await deleteLoanPayment(p.id);
    onChanged();
  };
  return (
    <div className="border border-gray-200 rounded-xl p-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="font-semibold text-gray-900">{loan.name}</p>
          <p className="text-[11px] text-gray-500">
            Prestado {fmt(loan.principal)} · {loan.term_months ? `${loan.term_months} meses` : 'sin plazo'} ·
            interés {pct(loan.monthly_rate_pct)}{loan.monthly_rate_pct != null && loan.rate_estimated && <b className="text-amber-700"> ESTIMADO</b>} ·
            cuota {loan.installment ? fmt(loan.installment) : 'libre'} · aviso desde el {loan.due_day}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-500">Falta</p>
          <p className="font-bold text-indigo-900">{fmt(loan.balance)}</p>
          {loan.installments_left != null && <p className="text-[11px] text-gray-500">{loan.installments_left} cuota{loan.installments_left === 1 ? '' : 's'} (estimado)</p>}
        </div>
      </div>
      <p className="text-[11px] text-gray-500 mt-1">
        Pagado {fmt(loan.paid_total)}{loan.interest_total ? ` · de eso, intereses ${fmt(loan.interest_total)} (saldo × tasa, una vez por mes${loan.rate_estimated ? ', ESTIMADO' : ''})` : ''}.
        {!loan.monthly_rate_pct && ' Sin tasa: todo el pago baja la deuda.'}
      </p>
      {loan.payments.length > 0 && (
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs min-w-[520px]">
            <thead><tr className="text-gray-500 text-left"><th className="py-1">Fecha</th><th>Tipo</th><th className="text-right">Valor</th><th className="text-right">Interés</th><th className="text-right">Baja la deuda</th><th className="text-right">Saldo después</th><th /></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {loan.payments.slice().reverse().map(p => (
                <tr key={p.id}>
                  <td className="py-1 whitespace-nowrap">{fmtDate(p.date)}</td>
                  <td title={p.note || ''}>{KIND_LABEL[p.kind]}{p.note ? ` · ${p.note}` : ''}</td>
                  <td className="text-right whitespace-nowrap">{fmt(p.amount)}</td>
                  <td className="text-right whitespace-nowrap">{p.interest ? fmt(p.interest) : '—'}</td>
                  <td className="text-right whitespace-nowrap">{fmt(p.capital)}</td>
                  <td className="text-right whitespace-nowrap font-medium">{fmt(p.balance_after)}</td>
                  <td className="text-right">{!readOnly && !p.expense_id && (
                    <button aria-label="Borrar" onClick={() => remove(p)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-gray-400 mt-1">Los pagos que salieron de las cuentas se editan o borran en Cuentas → Gastos.</p>
        </div>
      )}
      {loan.history.length > 0 && (
        <details className="mt-2 text-[11px] text-gray-600">
          <summary className="cursor-pointer">Cambios ({loan.history.length})</summary>
          <ul className="mt-1 space-y-0.5">
            {loan.history.slice().reverse().map((c, i) => (
              <li key={i}>{fmtDate(c.at)} · {c.by}: {Object.entries(c.changes).map(([k, [a, b]]) => `${k} ${a ?? '—'} → ${b ?? '—'}`).join(', ')}{c.note ? ` · ${c.note}` : ''}</li>
            ))}
          </ul>
        </details>
      )}
      {!readOnly && mode === null && (
        <div className="flex gap-2 mt-2">
          <button type="button" onClick={() => setMode('edit')} className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg">Editar plazo, tasa o cuota</button>
          <button type="button" onClick={() => setMode('adjust')} className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg">Ajustar saldo</button>
        </div>
      )}
      {mode === 'edit' && <LoanEditor loan={loan} onDone={done} onCancel={() => setMode(null)} />}
      {mode === 'adjust' && <BalanceAdjust loan={loan} onDone={done} onCancel={() => setMode(null)} />}
    </div>
  );
};

const GroupDialog = ({ group, onClose, onChanged }) => {
  const ref = useDialog(true, onClose);
  const readOnly = isReadOnly();
  const [paying, setPaying] = useState(false);
  return (
    <div className="fixed inset-0 z-50">
      <div className="flex items-end sm:items-center justify-center h-full sm:p-6">
        <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-[2px]" onClick={onClose} />
        <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dlg-loan-title"
          className="relative w-full sm:max-w-3xl max-h-[90dvh] flex flex-col bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl">
          <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between gap-3">
            <h3 id="dlg-loan-title" className="text-base font-semibold text-gray-900">{group.group_name}</h3>
            <button type="button" aria-label="Cerrar" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
          </div>
          <div className="overflow-y-auto px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-[11px] text-gray-500">Prestado</p><p className="font-bold">{fmt(group.principal)}</p></div>
              <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[11px] text-gray-500">Pagado</p><p className="font-bold text-emerald-700">{fmt(group.paid_total)}</p></div>
              <div className="rounded-xl bg-amber-50 p-3"><p className="text-[11px] text-gray-500">De eso, intereses</p><p className="font-bold text-amber-800">{fmt(group.interest_total)}</p></div>
              <div className="rounded-xl bg-indigo-50 p-3"><p className="text-[11px] text-gray-500">Falta</p><p className="font-bold text-indigo-900">{fmt(group.balance)}</p></div>
            </div>
            {group.pending_this_month.length > 0 && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Aviso (no se resta nada solo): falta registrar la cuota de este mes de {group.pending_this_month.join(', ')}.
              </p>
            )}
            {!readOnly && (paying
              ? <PaymentForm group={group} onDone={() => { setPaying(false); onChanged(); }} />
              : <button type="button" onClick={() => setPaying(true)} className="px-3 py-1.5 text-xs bg-indigo-700 text-white rounded-lg">Registrar pago</button>)}
            {group.loans.map(l => <LoanDetail key={l.id} loan={l} readOnly={readOnly} onChanged={onChanged} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

const LoansCards = ({ refreshKey, onChanged }) => {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');
  const [openName, setOpenName] = useState(null);

  const load = useCallback(() => {
    getLoans().then(d => { setGroups(d.groups || []); setError(''); }).catch(e => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);
  const open = useMemo(() => (groups || []).find(g => g.group_name === openName), [groups, openName]);

  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Préstamos: {error}</div>;
  if (!groups || groups.length === 0) return null;
  return (
    <>
      {groups.map(g => (
        <button key={g.group_name} type="button" onClick={() => setOpenName(g.group_name)}
          className="w-full text-left bg-white rounded-xl border border-gray-300 shadow-sm p-5 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2 text-sm font-bold text-gray-900 tracking-wide">
              <Landmark className="w-4 h-4" aria-hidden="true" /> LO QUE DEBE LA TIENDA · {g.group_name.toUpperCase()}
            </span>
            <span className="text-2xl font-bold text-gray-900">{fmt(g.balance)}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Prestado {fmt(g.principal)} · pagado {fmt(g.paid_total)}
            {g.installment ? ` · cuota ${fmt(g.installment)}` : ' · cuota libre'}
            {g.loans.length > 1 ? ` · ${g.loans.length} préstamos` : ''}
            {' · '}<span className="text-indigo-700 underline">ver detalle</span>
          </p>
          {g.pending_this_month.length > 0 && (
            <p className="text-[11px] text-amber-800 mt-1">Falta la cuota de este mes ({g.pending_this_month.length}); el aviso sale desde el {g.due_day}.</p>
          )}
        </button>
      ))}
      {open && <GroupDialog group={open} onClose={() => setOpenName(null)} onChanged={() => { load(); onChanged?.(); }} />}
    </>
  );
};

export default LoansCards;

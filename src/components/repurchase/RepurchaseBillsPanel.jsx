// Facturas de recompra (dentro de Cuentas Recompras): con un clic se revisan las
// facturas de proveedor pendientes en Alegra (la ropa comprada en Bogotá), se
// ven las prendas y el valor de cada una y de todas (lo que debe llegar a la
// tienda) y se pagan en Alegra (un egreso por factura desde la cuenta de
// efectivo de la tienda: quedan en $0 en "Cuentas por pagar"). Cada pago queda
// en el registro con las prendas que contó la tienda.
// No mueve las cuentas de la plataforma ni el saldo de Jhonatan (el total de
// estas facturas está al precio de venta). Backend: app/services/repurchase_bills.py.
import React, { useCallback, useEffect, useState } from 'react';
import {
  FileText, Search, ChevronDown, ChevronRight, AlertCircle, Check, Loader2, Pencil, X,
} from 'lucide-react';
import { getOpenBills, payBills, getBillBatches, updateBillBatch } from '../../services/repurchaseBillsService';
import { isReadOnly } from '../../utils/auth';

const money = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);
const num = (v) => new Intl.NumberFormat('es-CO').format(v || 0);
// 'YYYY-MM-DD' -> 'DD/MM/YYYY' sin new Date (zona horaria / Safari)
const day = (s) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '');

const pad = (n) => String(n).padStart(2, '0');
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const BATCH_STATUS = {
  pagado:  { label: 'Pagado',   className: 'bg-emerald-100 text-emerald-700' },
  parcial: { label: 'Parcial',  className: 'bg-amber-100 text-amber-700' },
  fallido: { label: 'Fallido',  className: 'bg-red-100 text-red-700' },
  pagando: { label: 'Pagando…', className: 'bg-gray-100 text-gray-700' },
};
const BILL_STATUS = {
  pagada: 'Pagada', ya_pagada: 'Ya estaba pagada', error: 'No se pagó', pendiente: 'Sin pagar',
};

const inputCls = 'border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';

const Diff = ({ value }) => {
  if (value == null) return <span className="text-gray-400">—</span>;
  if (value === 0) return <span className="text-emerald-700 font-medium">Cuadra</span>;
  return (
    <span className="text-red-600 font-medium">
      {value > 0 ? `+${num(value)} de más` : `${num(-value)} faltan`}
    </span>
  );
};

const CountedEditor = ({ batch, onSaved, readOnly }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(batch.counted_units ?? '');
  const [saving, setSaving] = useState(false);
  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {batch.counted_units == null ? <span className="text-gray-400">Sin contar</span> : num(batch.counted_units)}
        {!readOnly && (
          <button onClick={() => { setValue(batch.counted_units ?? ''); setEditing(true); }}
            className="p-1 text-gray-400 hover:text-gray-700" title="Escribir lo que contó la tienda">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </span>
    );
  }
  const save = async () => {
    setSaving(true);
    try {
      const res = await updateBillBatch(batch.id, { counted_units: value === '' ? null : Number(value) });
      onSaved(res.batch);
      setEditing(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <span className="inline-flex items-center gap-1">
      <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)}
        className={`${inputCls} w-20 py-1`} autoFocus />
      <button onClick={save} disabled={saving} className="p-1 text-emerald-700 hover:text-emerald-900"><Check className="w-4 h-4" /></button>
      <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
    </span>
  );
};

const RepurchaseBillsPanel = () => {
  const readOnly = isReadOnly();
  const today = localToday();
  const [start, setStart] = useState(`${today.slice(0, 8)}01`);
  const [end, setEnd] = useState(today);

  const [data, setData] = useState(null);        // respuesta de /open
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState(null);    // lote recién pagado

  const [batches, setBatches] = useState([]);
  const [openBatch, setOpenBatch] = useState(null);

  const loadBatches = useCallback(async () => {
    try {
      const res = await getBillBatches();
      setBatches(res.batches || []);
    } catch {
      /* el registro es secundario: si falla, no se bloquea el panel */
    }
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  const review = async () => {
    setLoading(true); setError(''); setResult(null); setConfirming(false);
    try {
      setData(await getOpenBills({ start, end }));
      setExpanded({});
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const pay = async () => {
    if (!data?.bills?.length) return;
    setPaying(true); setError('');
    try {
      const res = await payBills({
        billIds: data.bills.map((b) => b.id), start: data.period.start, end: data.period.end,
        countedUnits: counted, notes,
      });
      setResult(res.batch);
      setCounted(''); setNotes(''); setConfirming(false);
      await loadBatches();
      setData(await getOpenBills({ start: data.period.start, end: data.period.end }));
    } catch (e) {
      setError(e.message);
      setConfirming(false);
    } finally {
      setPaying(false);
    }
  };

  const bills = data?.bills || [];
  const totals = data?.totals;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-700">Facturas de recompra por pagar (Alegra)</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Prendas y valor de las facturas subidas: es lo que debe llegar a la tienda. Al pagarlas quedan en $0 en Cuentas por pagar.
          </p>
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <label className="text-xs text-gray-500">Desde
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={`${inputCls} block mt-0.5`} />
          </label>
          <label className="text-xs text-gray-500">Hasta
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={`${inputCls} block mt-0.5`} />
          </label>
          <button onClick={review} disabled={loading || paying}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Revisar facturas por pagar
          </button>
        </div>
      </div>

      {error && (
        <div className="m-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className={`m-4 p-3 rounded-lg border text-sm ${result.status === 'pagado'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <div className="font-medium">
            {result.status === 'pagado'
              ? `Listo: ${result.paid_bills} facturas pagadas en Alegra desde ${result.bank_account_name}.`
              : `Se pagaron ${result.paid_bills} de ${result.bills.length} facturas. Revisa las que no se pagaron.`}
          </div>
          <div className="mt-1">{num(result.total_units)} prendas · {money(result.total_amount)}</div>
          {result.bills.filter((b) => b.status !== 'pagada').map((b) => (
            <div key={b.id} className="mt-1 text-xs">Factura {b.number}: {BILL_STATUS[b.status]}{b.error ? ` — ${b.error}` : ''}</div>
          ))}
        </div>
      )}

      {data && (
        <div className="p-4 space-y-4">
          {bills.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No hay facturas por pagar entre el {day(data.period.start)} y el {day(data.period.end)}.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[['Facturas', num(totals.bills)], ['Prendas', num(totals.units)], ['Valor total', money(totals.amount)]].map(([label, value]) => (
                  <div key={label} className="border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="text-lg font-bold text-gray-900 tabular-nums">{value}</div>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Factura</th>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Proveedor</th>
                      <th className="px-3 py-2 text-right">Prendas</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Por pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((b) => (
                      <React.Fragment key={b.id}>
                        <tr className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpanded((x) => ({ ...x, [b.id]: !x[b.id] }))}>
                          <td className="px-3 py-2 font-medium text-gray-900">
                            <span className="inline-flex items-center gap-1">
                              {expanded[b.id] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              {b.number}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{day(b.date)}</td>
                          <td className="px-3 py-2 text-gray-600">{b.provider_name}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{num(b.units)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{money(b.total)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{money(b.balance)}</td>
                        </tr>
                        {expanded[b.id] && b.items.map((it, i) => (
                          <tr key={i} className="bg-gray-50 text-xs text-gray-600">
                            <td colSpan={3} className="pl-9 pr-3 py-1">{it.name}</td>
                            <td className="px-3 py-1 text-right tabular-nums">{num(it.quantity)}</td>
                            <td className="px-3 py-1 text-right tabular-nums">{money(it.total)}</td>
                            <td />
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 font-semibold">
                    <tr>
                      <td colSpan={3} className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 text-right tabular-nums">{num(totals.units)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(totals.amount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(totals.balance)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {!readOnly && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex flex-wrap gap-3 items-end">
                    <label className="text-xs text-gray-500">Prendas que contó la tienda (opcional)
                      <input type="number" min="0" value={counted} onChange={(e) => setCounted(e.target.value)}
                        className={`${inputCls} block mt-0.5 w-40`} />
                    </label>
                    <label className="text-xs text-gray-500 flex-1 min-w-[200px]">Nota (opcional)
                      <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                        className={`${inputCls} block mt-0.5 w-full`} placeholder="Ej: llegó completo" />
                    </label>
                  </div>
                  {counted !== '' && Number(counted) !== totals.units && (
                    <div className="text-sm"><Diff value={Number(counted) - totals.units} /> respecto a las facturas</div>
                  )}
                  {!confirming ? (
                    <button onClick={() => setConfirming(true)} disabled={paying}
                      className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-50">
                      Pagar {totals.bills} {totals.bills === 1 ? 'factura' : 'facturas'} en Alegra
                    </button>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 space-y-2">
                      <div>
                        Se van a crear <b>{totals.bills} pagos</b> en Alegra (uno por factura) desde la cuenta
                        <b> {data.payment_account}</b>, por <b>{money(totals.balance)}</b>. Las facturas quedarán en $0.
                      </div>
                      <div className="flex gap-2">
                        <button onClick={pay} disabled={paying}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-50">
                          {paying && <Loader2 className="w-4 h-4 animate-spin" />} Sí, pagar
                        </button>
                        <button onClick={() => setConfirming(false)} disabled={paying}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {batches.length > 0 && (
        <div className="border-t border-gray-100">
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Registro de pagos</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Pagado</th>
                  <th className="px-3 py-2 text-right">Facturas</th>
                  <th className="px-3 py-2 text-right">Prendas</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-left">Contó la tienda</th>
                  <th className="px-3 py-2 text-left">Diferencia</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((bt) => {
                  const st = BATCH_STATUS[bt.status] || BATCH_STATUS.pagando;
                  return (
                    <React.Fragment key={bt.id}>
                      <tr className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <button onClick={() => setOpenBatch(openBatch === bt.id ? null : bt.id)}
                            className="inline-flex items-center gap-1 text-gray-900 hover:underline">
                            {openBatch === bt.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            {day(bt.payment_date)}
                          </button>
                          {bt.created_by_name && <div className="text-xs text-gray-400 pl-5">{bt.created_by_name}</div>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(bt.paid_bills)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(bt.total_units)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(bt.total_amount)}</td>
                        <td className="px-3 py-2">
                          <CountedEditor batch={bt} readOnly={readOnly}
                            onSaved={(nb) => setBatches((list) => list.map((x) => (x.id === nb.id ? nb : x)))} />
                        </td>
                        <td className="px-3 py-2"><Diff value={bt.units_difference} /></td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${st.className}`}>{st.label}</span></td>
                      </tr>
                      {openBatch === bt.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-8 py-2 text-xs text-gray-600 space-y-0.5">
                            {bt.bills.map((b) => (
                              <div key={b.id}>
                                Factura {b.number} ({day(b.date)}, {b.provider_name}): {num(b.units)} prendas, {money(b.total)} —{' '}
                                {BILL_STATUS[b.status] || b.status}
                                {b.payment_number ? ` (pago ${b.payment_number})` : ''}
                                {b.error ? ` — ${b.error}` : ''}
                              </div>
                            ))}
                            {bt.notes && <div className="pt-1 italic">Nota: {bt.notes}</div>}
                            <div className="pt-1 text-gray-400">Cuenta: {bt.bank_account_name}</div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepurchaseBillsPanel;

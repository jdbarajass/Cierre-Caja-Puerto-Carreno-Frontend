// Cuentas → Corrección de cierres (solo admin, 2026-11-09). Un cierre que no salió
// exitoso por un error que no se arregla en Alegra (ej. una venta en efectivo que quedó
// como transferencia) se corrige con lo que pasó de verdad. Regla: la venta del día
// debe sumar lo mismo que Alegra; los excedentes van aparte. Al guardar pasa a Cuentas,
// el reparto del día se corrige en Mes y Año y queda el rastro (backend:
// app/services/closing_corrections.py).
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import LiveMoneyInput from '../components/common/LiveMoneyInput';
import { correctClosing, getClosingCorrections } from '../services/closingCorrectionsService';
import { formatDateStringToColombiaDate } from '../utils/dateUtils';

const fmt = (v) => (v == null ? '—'
  : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.round(v)));
const MEDIOS = [['efectivo', 'Efectivo'], ['qr', 'QR / Bancolombia'], ['nequi', 'Nequi'], ['daviplata', 'Daviplata'], ['datafono', 'Datáfono / Addi']];
const num = (s) => Number(s || 0);
const inputCls = 'w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right';

const CorrectionForm = ({ item, onDone }) => {
  const a = item.alegra;
  const cur = item.current;
  // Empieza con lo de Alegra (venta) y los excedentes que envió la vendedora
  const [venta, setVenta] = useState(() => Object.fromEntries(MEDIOS.map(([k]) => [k, String(Math.round(a[k] || 0))])));
  const [exc, setExc] = useState(() => Object.fromEntries(MEDIOS.map(([k]) => [k, String(Math.round(cur.excedentes[k] || 0))])));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const total = MEDIOS.reduce((s, [k]) => s + num(venta[k]), 0) + (a.otros || 0);
  const diff = total - a.total;
  const consignar = num(venta.efectivo) + num(exc.efectivo) - item.caja_gastos;
  const ok = a.loaded && Math.abs(diff) <= 1 && note.trim().length >= 5 && consignar >= 0;

  const save = async () => {
    const changes = MEDIOS.filter(([k]) => num(venta[k]) !== Math.round(a[k] || 0))
      .map(([k, label]) => `${label}: ${fmt(a[k])} → ${fmt(num(venta[k]))}`).join('\n');
    if (!window.confirm(`¿Corregir el cierre del ${formatDateStringToColombiaDate(item.date)} y pasarlo a Cuentas?\n\n${changes || 'Sin cambios de medio frente a Alegra.'}\n\nEfectivo a consignar: ${fmt(consignar)}`)) return;
    setBusy(true);
    setError('');
    try {
      await correctClosing(item.date, {
        ...Object.fromEntries(MEDIOS.map(([k]) => [k, num(venta[k])])),
        excedentes: Object.fromEntries(MEDIOS.map(([k]) => [k, num(exc[k])])),
        note: note.trim(),
      });
      onDone(`Cierre del ${formatDateStringToColombiaDate(item.date)} corregido y sumado a las cuentas.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-red-200 bg-white">
      <div className="px-4 py-3 border-b border-red-100 bg-red-50 rounded-t-xl">
        <h3 className="font-semibold text-red-900">Cierre del {formatDateStringToColombiaDate(item.date)}: no salió exitoso</h3>
        {item.message && <p className="text-xs text-red-800 mt-0.5">{item.message}</p>}
      </div>
      <div className="p-4 space-y-3">
        {!a.loaded && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Todavía no están cargadas las ventas de Alegra de ese día. Ve a Cuentas → Mes y toca "Traer ventas de Alegra", o espera al cron de las 9 pm.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-[11px] text-gray-500 uppercase tracking-wide">
                <th scope="col" className="text-left px-2 py-2 min-w-[130px]">Medio</th>
                <th scope="col" className="text-right px-2 py-2 whitespace-nowrap">Según Alegra</th>
                <th scope="col" className="text-right px-2 py-2 whitespace-nowrap">Envió la vendedora</th>
                <th scope="col" className="text-right px-2 py-2 min-w-[130px]">Venta real</th>
                <th scope="col" className="text-right px-2 py-2 min-w-[120px]">Excedente (no es venta)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MEDIOS.map(([k, label]) => (
                <tr key={k}>
                  <th scope="row" className="text-left px-2 py-1.5 font-normal text-gray-800">{label}</th>
                  <td className="text-right px-2 py-1.5 whitespace-nowrap">{fmt(a[k])}</td>
                  <td className="text-right px-2 py-1.5 whitespace-nowrap text-gray-500">{fmt(k === 'efectivo' ? cur.efectivo_consignar : cur[k])}{k === 'efectivo' && <span className="block text-[10px]">a consignar</span>}</td>
                  <td className="px-2 py-1.5"><LiveMoneyInput value={venta[k]} onChange={v => setVenta(s => ({ ...s, [k]: v }))} className={inputCls} /></td>
                  <td className="px-2 py-1.5"><LiveMoneyInput value={exc[k]} onChange={v => setExc(s => ({ ...s, [k]: v }))} className={inputCls} /></td>
                </tr>
              ))}
              {a.otros > 0 && (
                <tr><th scope="row" className="text-left px-2 py-1.5 font-normal text-gray-500">Otros (BBVA, SisteCrédito)</th>
                  <td className="text-right px-2 py-1.5">{fmt(a.otros)}</td><td /><td className="text-right px-2 py-1.5 text-gray-500">{fmt(a.otros)}</td><td /></tr>
              )}
              <tr className="font-semibold">
                <th scope="row" className="text-left px-2 py-2">Total de ventas</th>
                <td className="text-right px-2 py-2">{fmt(a.total)}</td>
                <td />
                <td className={`text-right px-2 py-2 ${Math.abs(diff) > 1 ? 'text-red-700' : 'text-emerald-700'}`}>{fmt(total)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <p className={`text-sm ${Math.abs(diff) > 1 ? 'text-red-700' : 'text-emerald-700'}`}>
          {Math.abs(diff) > 1
            ? `La venta real debe sumar lo mismo que Alegra: faltan o sobran ${fmt(diff)}.`
            : '✓ El total cuadra con Alegra. Solo cambia el reparto por medio de pago.'}
        </p>
        <p className="text-sm text-gray-700">
          Efectivo a consignar: <b>{fmt(consignar)}</b>
          <span className="text-xs text-gray-500"> = venta en efectivo + excedente en efectivo{item.caja_gastos ? ` − ${fmt(item.caja_gastos)} de gastos de la caja` : ''}. Si salió plata de la caja como préstamo, regístralo en Gastos.</span>
        </p>
        <label className="block text-sm text-gray-700">Qué pasó (queda en el rastro)
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Ej.: la factura KPC4868 se pagó en efectivo y quedó como transferencia en Alegra" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="button" onClick={save} disabled={!ok || busy}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold disabled:opacity-40">
          {busy ? 'Guardando…' : 'Corregir y pasar a Cuentas'}
        </button>
      </div>
    </section>
  );
};

const CuentasCorrecciones = ({ onEntriesChanged }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getClosingCorrections());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const done = (msg) => {
    setSuccess(msg);
    load();
    onEntriesChanged?.();
    window.dispatchEvent(new Event('cash-closing-success'));   // el aviso de Cierre de Caja se actualiza
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Corrección de cierres</h2>
          <p className="text-xs text-gray-500 max-w-2xl">
            Para cierres que no salieron exitosos por un error que se queda en Alegra (por ejemplo, una venta en efectivo registrada como transferencia).
            La venta del día debe sumar lo mismo que Alegra; aquí se deja el reparto como pasó de verdad. Solo el administrador.
          </p>
        </div>
        <button type="button" aria-label="Actualizar" onClick={load} className="p-2 rounded-lg border border-gray-300"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="w-4 h-4 shrink-0" />{success}</div>}
      {loading && !data && <p className="text-sm text-gray-500">Cargando…</p>}

      {data && (
        <>
          {data.pending.length === 0
            ? <p className="text-sm text-gray-600 rounded-lg border border-gray-200 bg-white px-4 py-3">No hay cierres pendientes de corregir.</p>
            : data.pending.map(item => <CorrectionForm key={item.date} item={item} onDone={done} />)}

          {data.corrected.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white">
              <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Corregidos (últimos 90 días)</h3></div>
              <ul className="divide-y divide-gray-100">
                {data.corrected.map(c => (
                  <li key={c.date} className="px-4 py-3 text-sm">
                    <p className="font-medium text-gray-900">Cierre del {formatDateStringToColombiaDate(c.date)}</p>
                    {c.history.map((hst, i) => (
                      <div key={i} className="text-xs text-gray-600 mt-1">
                        <p>{hst.by} · {new Date(hst.at).toLocaleString('es-CO')}: {hst.note}</p>
                        <p>Efectivo a consignar {fmt(hst.before.efectivo_consignar)} → {fmt(hst.after.efectivo_consignar)} · QR {fmt(hst.before.qr)} → {fmt(hst.after.qr)} · Datáfono {fmt(hst.before.datafono)} → {fmt(hst.after.datafono)}</p>
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default CuentasCorrecciones;

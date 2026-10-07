// Estadísticas → Reconstrucción 2025 (docs/PLAN_RECONSTRUCCION_2025.md del backend).
// Las facturas POS de 2025 se anularon de forma masiva por impuestos (oct-2026):
// fueron ventas reales y sus prendas volvieron al inventario de Alegra. Aquí se
// carga 2025 en la copia, se revisa qué anuladas fueron de la anulación masiva,
// y se calcula el inventario antes de ella (con Excel para el contador).
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, AlertCircle, Check, DownloadCloud, History, Boxes, ListChecks, Info, Square, ShieldCheck,
} from 'lucide-react';
import {
  getHistoryStatus, syncHistory, saveVoidOverride, getInventoryReport, downloadInventoryExcel,
  createInventoryAdjustment,
} from '../services/history2025Service';
import { getActiveStoreCode } from '../utils/activeStore';
import useDocumentTitle from '../hooks/useDocumentTitle';

const fmt = (v) =>
  v == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.round(v));
const num = (v) => (v == null ? '—' : Math.round(v).toLocaleString('es-CO'));
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const Card = ({ title, children, className = '' }) => (
  <div className={`rounded-xl p-4 border shadow-sm ${className || 'bg-white border-gray-200'}`}>
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
    {children}
  </div>
);

const History2025 = () => {
  useDocumentTitle('Reconstrucción 2025');
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mark, setMark] = useState({ number: '', counts_as_sale: 'true', note: '' });
  const stopRef = useRef(false);
  const [approve, setApprove] = useState({ accountant: false, text: '' });

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getHistoryStatus());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadAll = async () => {
    setBusy('sync');
    setError('');
    stopRef.current = false;
    try {
      let complete = data?.coverage?.complete;
      while (!complete && !stopRef.current) {
        const r = await syncHistory(31);
        complete = r.coverage.complete;
        setData(d => ({ ...(d || {}), coverage: r.coverage }));
        if (r.synced_days.length === 0 && !r.stopped_by_time) break;
      }
      flash(complete ? '2025 quedó cargado completo' : 'Carga detenida; puedes seguir después');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
      await load();
    }
  };

  const setOverride = async (payload, msg) => {
    setBusy('mark');
    setError('');
    try {
      await saveVoidOverride(payload);
      flash(msg);
      setReport(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const calcInventory = async () => {
    setBusy('inv');
    setError('');
    try {
      setReport(await getInventoryReport());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const downloadExcel = async () => {
    setBusy('xlsx');
    setError('');
    try {
      await downloadInventoryExcel(getActiveStoreCode());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const runAdjustment = async () => {
    setBusy('adj');
    setError('');
    try {
      const r = await createInventoryAdjustment({
        confirm: approve.text, accountant_ok: approve.accountant,
        expected_units: report ? report.units_to_remove : undefined,
      });
      flash(`Ajuste creado en Alegra: ${r.adjustment.units} unidades en ${r.adjustment.parts} ajuste(s)`);
      setApprove({ accountant: false, text: '' });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
      await load();
    }
  };

  const cov = data?.coverage;
  const adj = data?.adjustment;
  const adjPending = adj && !adj.completed;
  const canAdjust = approve.accountant && approve.text.trim().toUpperCase() === 'AJUSTAR' && !busy
    && (adjPending || (report && cov?.complete && report.units_to_remove > 0));
  const s = data?.summary;
  const pct = cov ? Math.round((cov.loaded_days / cov.total_days) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><History className="w-6 h-6" /> Reconstrucción 2025</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">
            Las facturas POS de 2025 se anularon de forma masiva por impuestos. Fueron ventas reales: aquí se recuperan desde Alegra (las anuladas conservan todo su detalle), se revisa cuáles fueron de la anulación masiva y se calcula cuánto inventario sobra.
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}
      {success && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700"><Check className="w-4 h-4" /> {success}</div>}

      {/* ── Paso 1: cargar 2025 ───────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-3">
        <p className="font-semibold text-gray-800">1. Traer las facturas de 2025 de Alegra</p>
        {cov && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{cov.loaded_days} de {cov.total_days} días</span>
            </div>
            {cov.complete
              ? <p className="text-sm text-emerald-700 font-medium">✓ 2025 está completo.</p>
              : (
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={loadAll} disabled={!!busy}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                    <DownloadCloud className="w-4 h-4" /> {busy === 'sync' ? 'Trayendo… (no cierres esta página)' : 'Traer todo 2025'}
                  </button>
                  {busy === 'sync' && (
                    <button onClick={() => { stopRef.current = true; }} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <Square className="w-3.5 h-3.5" /> Detener al terminar esta tanda
                    </button>
                  )}
                  <span className="text-xs text-gray-500">Va de a 31 días (unos 2 minutos cada tanda). Se puede detener y seguir después.</span>
                </div>
              )}
          </>
        )}
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /></div>
      ) : s && (
        <>
          {/* ── Paso 2: revisión ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card title="Anulación masiva (ventas reales)" className="bg-indigo-50 border-indigo-200">
              <p className="text-2xl font-bold text-indigo-800">{num(s.masiva_count)} facturas</p>
              <p className="text-xs text-gray-600">{fmt(s.masiva_total)}</p>
            </Card>
            <Card title="Anulaciones reales (se quedan así)">
              <p className="text-2xl font-bold text-gray-900">{num(s.real_count)}</p>
              <p className="text-xs text-gray-600">{fmt(s.real_total)} · revísalas abajo</p>
            </Card>
            <Card title="Venta 2025 que hoy muestra Alegra">
              <p className="text-2xl font-bold text-gray-900">{fmt(s.active_total)}</p>
              <p className="text-xs text-gray-600">{num(s.active_count)} facturas vigentes{cov && !cov.complete ? ' (de lo cargado)' : ''}</p>
            </Card>
            <Card title="Venta real 2025" className="bg-emerald-50 border-emerald-200">
              <p className="text-2xl font-bold text-emerald-800">{fmt(s.real_sales_total)}</p>
              <p className="text-xs text-gray-600">Vigentes + anulación masiva{cov && !cov.complete ? ' (de lo cargado)' : ''}</p>
            </Card>
          </div>

          {s.by_month.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="text-left px-4 py-2">Mes</th>
                    <th className="text-right px-3 py-2">Anulación masiva</th>
                    <th className="text-right px-3 py-2">Valor</th>
                    <th className="text-right px-3 py-2">Anulaciones reales</th>
                    <th className="text-right px-4 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {s.by_month.map(m => (
                    <tr key={m.month}>
                      <td className="px-4 py-2 font-medium">{MONTHS[Number(m.month.slice(5)) - 1]} {m.month.slice(0, 4)}</td>
                      <td className="px-3 py-2 text-right">{num(m.masiva_count)}</td>
                      <td className="px-3 py-2 text-right">{fmt(m.masiva_total)}</td>
                      <td className="px-3 py-2 text-right">{num(m.real_count)}</td>
                      <td className="px-4 py-2 text-right">{fmt(m.real_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="font-semibold text-gray-800 flex items-center gap-2"><ListChecks className="w-4 h-4 text-indigo-500" /> 2. Revisar las anulaciones reales</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Se toman como anulación real (no se cuentan como venta): las electrónicas anuladas y las POS que se volvieron a facturar con las mismas prendas y el mismo total hasta 60 minutos después. Si alguna sí fue de la anulación masiva, márcala.
              </p>
            </div>
            {s.real_voids.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 text-center">No hay anulaciones reales en lo cargado.</p>
            ) : (
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-xs uppercase tracking-wide text-gray-500">
                      <th className="text-left px-4 py-2">Factura</th>
                      <th className="text-left px-3 py-2">Fecha y hora</th>
                      <th className="text-right px-3 py-2">Total</th>
                      <th className="text-left px-3 py-2">Por qué</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {s.real_voids.map(r => (
                      <tr key={r.alegra_id}>
                        <td className="px-4 py-2 font-medium whitespace-nowrap">{r.number}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-600">{r.issued_at || r.date}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{fmt(r.total)}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{r.reason}</td>
                        <td className="px-3 py-2 text-right">
                          {r.manual
                            ? <button disabled={!!busy} onClick={() => setOverride({ number: r.number, counts_as_sale: null }, `Factura ${r.number}: vuelve a la regla automática`)} className="text-xs text-gray-600 underline whitespace-nowrap">Quitar marca</button>
                            : <button disabled={!!busy} onClick={() => setOverride({ number: r.number, counts_as_sale: true }, `Factura ${r.number}: cuenta como venta (anulación masiva)`)} className="px-2.5 py-1 text-xs font-medium border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 whitespace-nowrap">Fue de la anulación masiva</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <form onSubmit={e => { e.preventDefault(); setOverride({ number: mark.number.trim(), counts_as_sale: mark.counts_as_sale === 'true', note: mark.note }, `Factura ${mark.number} marcada`); }}
              className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-end gap-2 flex-wrap">
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">Marcar otra factura por número</label>
                <input aria-label="Número de factura" required value={mark.number} onChange={e => setMark(m => ({ ...m, number: e.target.value }))} placeholder="Ej. 8420"
                  className="w-32 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm" />
              </div>
              <select aria-label="Tipo" value={mark.counts_as_sale} onChange={e => setMark(m => ({ ...m, counts_as_sale: e.target.value }))} className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white">
                <option value="true">Fue de la anulación masiva (venta real)</option>
                <option value="false">Anulación real (no cuenta)</option>
              </select>
              <input aria-label="Nota" value={mark.note} onChange={e => setMark(m => ({ ...m, note: e.target.value }))} placeholder="Nota (opcional)"
                className="flex-1 min-w-[160px] border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm" />
              <button type="submit" disabled={!!busy} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-50">Guardar</button>
            </form>
          </div>

          {/* ── Paso 3: inventario ───────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-gray-800 flex items-center gap-2"><Boxes className="w-4 h-4 text-indigo-500" /> 3. Inventario antes de la anulación masiva</p>
                <p className="text-xs text-gray-500 mt-0.5 max-w-3xl">
                  Por prenda: existencia de hoy en Alegra menos las unidades que devolvió la anulación masiva. Las ventas hechas después ya están descontadas. Descarga el Excel y revísalo con tu contador antes de ajustar Alegra.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={calcInventory} disabled={!!busy || !cov?.loaded_days}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  <Boxes className="w-4 h-4" /> {busy === 'inv' ? 'Calculando… (puede tardar)' : 'Calcular'}
                </button>
                <button onClick={downloadExcel} disabled={!!busy || !report}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                  <DownloadCloud className="w-4 h-4" /> {busy === 'xlsx' ? 'Generando…' : 'Descargar Excel'}
                </button>
              </div>
            </div>
            {adj?.completed && (
              <p className="text-xs text-emerald-900 bg-emerald-50 rounded-lg px-3 py-2">
                El ajuste ya se hizo en Alegra el {adj.date}. Si vuelves a calcular, estas cifras ya no sirven: la existencia de hoy ya está ajustada.
              </p>
            )}
            {cov && !cov.complete && (
              <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">Todavía falta cargar parte de 2025: el informe solo tendrá en cuenta los días ya cargados.</p>
            )}
            {report && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card title="Inventario hoy en Alegra (a costo)"><p className="text-2xl font-bold text-gray-900">{fmt(report.value_now)}</p></Card>
                  <Card title="A retirar (ajuste de salida)" className="bg-red-50 border-red-200">
                    <p className="text-2xl font-bold text-red-700">{fmt(report.value_to_remove)}</p>
                    <p className="text-xs text-gray-600">{num(report.units_to_remove)} unidades en {num(report.items_count)} prendas</p>
                  </Card>
                  <Card title="Inventario antes de la anulación" className="bg-emerald-50 border-emerald-200">
                    <p className="text-2xl font-bold text-emerald-800">{fmt(report.value_before)}</p>
                    <p className="text-xs text-gray-600">Recordabas entre $160 y $175 millones</p>
                  </Card>
                </div>
                {report.flagged > 0 && (
                  <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 flex items-start gap-1.5">
                    <Info className="w-4 h-4 flex-shrink-0" /> {report.flagged} prenda(s) marcadas para revisar (dan negativo o ya no están activas en Alegra). Están en la columna "Revisar" del Excel.
                  </p>
                )}
                <div className="overflow-x-auto max-h-[480px] border border-gray-100 rounded-lg">
                  <table className="w-full text-sm min-w-[820px]">
                    <thead className="sticky top-0 bg-gray-800 text-white text-xs uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-3 py-2">Prenda</th>
                        <th className="text-right px-3 py-2">Devueltas</th>
                        <th className="text-right px-3 py-2">Existencia hoy</th>
                        <th className="text-right px-3 py-2">Antes</th>
                        <th className="text-right px-3 py-2">A retirar</th>
                        <th className="text-right px-3 py-2">Valor</th>
                        <th className="text-left px-3 py-2">Revisar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.rows.slice(0, 200).map(r => (
                        <tr key={r.item_id || r.name} className={r.flag ? 'bg-amber-50/60' : ''}>
                          <td className="px-3 py-1.5">{r.name}</td>
                          <td className="px-3 py-1.5 text-right">{num(r.units_returned)}</td>
                          <td className="px-3 py-1.5 text-right">{num(r.stock_now)}</td>
                          <td className="px-3 py-1.5 text-right">{num(r.stock_before)}</td>
                          <td className="px-3 py-1.5 text-right font-semibold">{num(r.units_to_remove)}</td>
                          <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmt(r.value_to_remove)}</td>
                          <td className="px-3 py-1.5 text-xs text-amber-800">{r.flag || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {report.rows.length > 200 && <p className="text-xs text-gray-500">Se muestran las 200 de mayor valor; el Excel tiene las {num(report.rows.length)}.</p>}
              </>
            )}
          </div>

          {/* ── Paso 4: ajuste en Alegra ─────────────────────────────── */}
          <div className={`rounded-xl shadow-sm p-5 space-y-3 border ${adj?.completed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-red-200'}`}>
            <p className="font-semibold text-gray-800 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-red-600" /> 4. Crear el ajuste de inventario en Alegra</p>
            {adj?.completed ? (
              <div className="text-sm text-emerald-900 space-y-1">
                <p className="font-semibold">✓ Ajuste creado en Alegra el {adj.date}: {num(adj.units)} unidades retiradas ({fmt(adj.value)} a costo), en {adj.parts} ajuste(s).</p>
                <p className="text-xs">Números de ajuste en Alegra: {adj.done.map(d => d.number || d.alegra_id).join(', ')}. Si algo quedó mal, se corrige en Alegra (Inventario → Ajustes de inventario).</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-600 max-w-3xl">
                  Esto <b>sí cambia Alegra</b>: crea un ajuste de <b>salida</b> en la bodega Principal con las unidades del paso 3 (por partes de 200 prendas). Hazlo solo cuando tu contador haya revisado y aprobado el Excel. Se crea una sola vez.
                </p>
                {adjPending && (
                  <p className="text-xs text-amber-900 bg-amber-50 rounded-lg px-3 py-2">
                    El ajuste quedó a medias: se crearon {adj.done.length} de {adj.parts} partes ({adj.done.map(d => d.number || d.alegra_id).join(', ') || 'ninguna'}). Confirma otra vez para seguir con lo que falta (se usa la misma lista aprobada, sin duplicar).
                  </p>
                )}
                {!adjPending && !report && <p className="text-xs text-gray-500">Primero toca "Calcular" en el paso 3 y revisa el Excel.</p>}
                {!adjPending && report && !cov?.complete && <p className="text-xs text-amber-800">Falta traer todo 2025 (paso 1): el ajuste solo se crea con el año completo.</p>}
                {(adjPending || report) && (
                  <div className="flex items-end gap-3 flex-wrap">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={approve.accountant} onChange={e => setApprove(a => ({ ...a, accountant: e.target.checked }))} />
                      Mi contador revisó y aprobó el Excel
                    </label>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-0.5">Escribe AJUSTAR para confirmar</label>
                      <input aria-label="Confirmación" value={approve.text} onChange={e => setApprove(a => ({ ...a, text: e.target.value }))}
                        className="w-36 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm" />
                    </div>
                    <button onClick={runAdjustment} disabled={!canAdjust}
                      className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 disabled:opacity-40">
                      {busy === 'adj' ? 'Creando en Alegra…' : adjPending ? 'Seguir con lo que falta' : `Crear ajuste (${num(report?.units_to_remove)} unidades)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default History2025;

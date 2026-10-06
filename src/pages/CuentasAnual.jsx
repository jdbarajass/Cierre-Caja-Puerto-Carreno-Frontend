// Cuentas → Año (Fase 3 del plan docs/PLAN_CUENTAS_DIARIAS.md del backend).
// Lo que eran las hojas CierreGeneral2026 y DATOS_ANUALES_2026 del Excel:
// por mes, ventas, recompras, gastos, ganancias, inventario al cierre del mes
// y cuánto subió/bajó; ventas por medio de pago; inversiones, retiros y lo
// que tiene Jhonatan. Cada dato se puede escribir a mano (con nota).
import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Check, Pencil, X, Boxes, Table2, Wallet, Info,
} from 'lucide-react';
import { getMonthlySummary, saveSummaryOverride, loadInventory } from '../services/monthlySummaryService';
import LiveMoneyInput from '../components/common/LiveMoneyInput';
import { getColombiaDate } from '../utils/dateUtils';

const fmt = (v) =>
  v == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.round(v));
const pct = (v) => (v == null ? '—' : `${(v * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`);
const signed = (v) => (v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v))}`);

const MEDIOS = [
  ['efectivo', 'Efectivo'], ['qr', 'QR'], ['ahorro', 'Ahorro'], ['credito', 'Crédito'], ['nequi', 'Nequi'],
  ['addi', 'Addi'], ['bbva', 'BBVA'], ['daviplata', 'Daviplata'], ['sistecredito', 'SisteCrédito'], ['bold', 'Bold'],
];

const FIELD_LABELS = {
  ventas: 'Ventas',
  recompras: 'Recompras',
  gastos_operativos: 'Gastos operativos',
  inventario: 'Inventario al cierre del mes',
  inversiones: 'Inversiones',
  retiros: 'Retiros de socios',
  prestamos: 'Préstamos',
  fletes: 'Fletes',
};

// Colores validados (dataviz: CVD ΔE 24.7, contraste ≥ 3:1 sobre blanco)
const SERIES = [
  { key: 'ventas', label: 'Ventas', color: '#2a78d6' },
  { key: 'ganancia_real', label: 'Ganancia real', color: '#eb6834' },
];

const EditedMark = ({ info }) => (info ? (
  <span title={`Escrito a mano${info.note ? `: ${info.note}` : ''}. Calculado: ${fmt(info.computed)}`} className="ml-1 text-amber-600 cursor-help">✎</span>
) : null);

// Barras agrupadas por mes, un solo eje (ventas y ganancia real son pesos).
const MonthlyChart = ({ months }) => {
  const [hover, setHover] = useState(null);
  if (months.length === 0) return null;
  const values = months.flatMap(m => SERIES.map(s => m[s.key] || 0));
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const H = 180;
  const zeroY = (max / span) * H;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="text-sm font-semibold text-gray-700">Ventas y ganancia real por mes</p>
        <div className="flex items-center gap-4 text-xs text-gray-600">
          {SERIES.map(s => (
            <span key={s.key} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />{s.label}</span>
          ))}
        </div>
      </div>
      <div className="relative" style={{ height: H + 28 }}>
        <div className="absolute left-0 right-0 border-t border-gray-300" style={{ top: zeroY }} />
        <div className="absolute inset-0 flex items-stretch justify-around gap-2" style={{ height: H }}>
          {months.map(m => (
            <div key={m.period} className="flex-1 max-w-[120px] relative flex justify-center gap-[2px]"
              onMouseEnter={() => setHover(m.period)} onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(m.period)} onBlur={() => setHover(null)} tabIndex={0}
              aria-label={`${m.label}: ventas ${fmt(m.ventas)}, ganancia real ${fmt(m.ganancia_real)}`}>
              {SERIES.map(s => {
                const v = m[s.key] || 0;
                const h = Math.max((Math.abs(v) / span) * H, v ? 2 : 0);
                const style = v >= 0
                  ? { top: zeroY - h, height: h, borderRadius: '4px 4px 0 0' }
                  : { top: zeroY, height: h, borderRadius: '0 0 4px 4px' };
                return <div key={s.key} className="relative w-1/2 max-w-[28px]"><div className="absolute left-0 right-0" style={{ ...style, background: s.color }} /></div>;
              })}
              {hover === m.period && (
                <div className="absolute z-10 -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                  <p className="font-semibold">{m.label}</p>
                  <p>Ventas {fmt(m.ventas)}</p>
                  <p>Ganancia real {fmt(m.ganancia_real)} ({pct(m.porcentaje)})</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="absolute left-0 right-0 flex justify-around gap-2 text-[11px] text-gray-500" style={{ top: H + 8 }}>
          {months.map(m => <span key={m.period} className="flex-1 max-w-[120px] text-center">{m.label.slice(0, 3)}</span>)}
        </div>
      </div>
    </div>
  );
};

const CuentasAnual = () => {
  const [year, setYear] = useState(getColombiaDate().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEarly, setShowEarly] = useState(false);
  const [editing, setEditing] = useState(null); // { period, label, fields: {f: {value, note}} }

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getMonthlySummary(year));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const handleInventory = async (payload, label) => {
    setBusy(label);
    setError('');
    try {
      const r = await loadInventory(payload);
      flash(r.loaded.length ? `Inventario traído de Alegra: ${r.loaded.map(l => l.period).join(', ')}` : 'El inventario ya estaba al día');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
      await load();
    }
  };

  const openEdit = (m) => {
    setEditing({
      period: m.period,
      label: `${m.label} ${year}`,
      fields: Object.fromEntries(Object.keys(FIELD_LABELS).map(f => [f, {
        value: m[f] != null ? String(Math.round(Math.max(m[f], 0))) : '',
        note: m.edited?.[f]?.note || '',
        computed: m.computed?.[f],
        edited: !!m.edited?.[f],
        original: m[f],
      }])),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setField = (f, key, value) => setEditing(e => ({ ...e, fields: { ...e.fields, [f]: { ...e.fields[f], [key]: value } } }));

  const saveEdit = async () => {
    setBusy('edit');
    setError('');
    try {
      for (const [f, st] of Object.entries(editing.fields)) {
        const num = st.value === '' ? null : Number(st.value);
        const changed = num !== (st.original != null ? Math.round(Math.max(st.original, 0)) : null) || (st.edited && st.note !== (data.months.find(m => m.period === editing.period)?.edited?.[f]?.note || ''));
        if (changed && num != null) {
          await saveSummaryOverride({ period: editing.period, field: f, value: num, note: st.note });
        }
      }
      setEditing(null);
      flash('Datos del mes guardados');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const clearField = async (f) => {
    setBusy('edit');
    try {
      await saveSummaryOverride({ period: editing.period, field: f, value: null });
      setEditing(null);
      flash(`${FIELD_LABELS[f]} vuelve al valor calculado`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const months = (data?.months || []).filter(m => !m.future);
  const shown = months.filter(m => showEarly || !m.before_start);
  const counted = months.filter(m => !m.before_start);
  const lastInv = [...months].reverse().find(m => m.inventario != null);
  const t = data?.totals;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resumen del año</h2>
          <p className="text-sm text-gray-500 mt-1">Cierre general mes a mes, ganancias, inventario y ventas por medio de pago</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button onClick={() => handleInventory({}, 'inv')} disabled={!!busy}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            <Boxes className="w-4 h-4" /> {busy === 'inv' ? 'Trayendo…' : 'Traer inventario de Alegra'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <Check className="w-4 h-4" /> {success}
        </div>
      )}

      {/* ── Editar un mes ─────────────────────────────────────────────── */}
      {editing && (
        <div className="bg-white border border-amber-300 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Escribir a mano: {editing.label}</h3>
            <button onClick={() => setEditing(null)} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-gray-500">Lo que escribas aquí manda sobre lo que calcula el sistema (útil para septiembre, cuyos gastos están en el Excel, o para corregir). Deja una nota de dónde salió el valor.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(FIELD_LABELS).map(([f, label]) => {
              const st = editing.fields[f];
              return (
                <div key={f} className={`rounded-lg border p-3 ${st.edited ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'}`}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <LiveMoneyInput value={st.value} onChange={v => setField(f, 'value', v)} placeholder="Sin dato"
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white" />
                  <input aria-label={`Nota de ${label}`} value={st.note} onChange={e => setField(f, 'note', e.target.value)} placeholder="Nota (opcional)"
                    className="mt-1.5 w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  <p className="text-[11px] text-gray-500 mt-1">Calculado: {fmt(st.computed)}</p>
                  {st.edited && (
                    <button onClick={() => clearField(f)} className="text-[11px] text-amber-700 underline">Volver al calculado</button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={!!busy} className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-50">
              <Check className="w-4 h-4" /> {busy === 'edit' ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── Año + tarjetas ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <button onClick={() => setYear(y => y - 1)} aria-label="Año anterior" className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{year}</p>
            <p className="text-xs text-gray-500 mt-0.5">{data ? `${data.months_counted} mes(es) desde ${data.summary_start.slice(0, 7)}` : ''}</p>
          </div>
          <button onClick={() => setYear(y => y + 1)} aria-label="Año siguiente" className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ventas</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(t?.ventas)}</p>
          <p className="text-[11px] text-gray-500">Promedio mensual {fmt(data?.averages?.ventas)}</p>
        </div>
        <div className={`rounded-xl p-4 border ${t && t.ganancia_real < 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ganancia real</p>
          <p className={`text-2xl font-bold ${t && t.ganancia_real < 0 ? 'text-red-700' : 'text-emerald-800'}`}>{fmt(t?.ganancia_real)}</p>
          <p className="text-[11px] text-gray-600">{pct(t?.porcentaje)} de las ventas · promedio {fmt(data?.averages?.ganancia_real)} al mes</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inventario</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(lastInv?.inventario)}</p>
          <p className="text-[11px] text-gray-500">
            {lastInv ? `${lastInv.label}${lastInv.inventory_as_of ? ` (al ${lastInv.inventory_as_of})` : ''}` : 'Toca "Traer inventario de Alegra"'}
            {lastInv?.inventario_cambio != null && <> · {lastInv.inventario_cambio >= 0 ? 'subió' : 'bajó'} {fmt(Math.abs(lastInv.inventario_cambio))}</>}
          </p>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /></div>
      ) : data && (
        <>
          <MonthlyChart months={counted} />

          {/* ── Cierre general ─────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Table2 className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-gray-700">Cierre general mes a mes</span>
              </div>
              {months.some(m => m.before_start) && (
                <button onClick={() => setShowEarly(v => !v)} className="text-xs text-indigo-700 underline">
                  {showEarly ? 'Ocultar' : 'Ver'} enero a agosto (para comparar con el Excel)
                </button>
              )}
            </div>
            <ul className="md:hidden divide-y divide-gray-100">
              {shown.map(m => (
                <li key={m.period} className={`px-4 py-3 ${m.before_start ? 'bg-gray-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">{m.label}{m.in_progress && <span className="ml-1 text-[11px] text-sky-700">(en curso)</span>}</span>
                    <button onClick={() => openEdit(m)} className="flex items-center gap-1 text-xs text-gray-600 border border-gray-300 rounded-lg px-2 py-1"><Pencil className="w-3 h-3" /> Editar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5 text-xs">
                    <span className="text-gray-500">Ventas</span><span className="text-right">{fmt(m.ventas)}<EditedMark info={m.edited.ventas} /></span>
                    <span className="text-gray-500">Recompras</span><span className="text-right">{fmt(m.recompras)}<EditedMark info={m.edited.recompras} /></span>
                    <span className="text-gray-500">Gastos operativos</span><span className="text-right">{m.has_expenses ? fmt(m.gastos_operativos) : 'Sin registrar'}<EditedMark info={m.edited.gastos_operativos} /></span>
                    <span className="text-gray-500">Ganancia real</span><span className={`text-right font-bold ${m.ganancia_real < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{fmt(m.ganancia_real)} ({pct(m.porcentaje)})</span>
                    <span className="text-gray-500">Inventario</span><span className="text-right">{fmt(m.inventario)}</span>
                    <span className="text-gray-500">Subió / bajó</span><span className="text-right">{signed(m.inventario_cambio)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead>
                  <tr className="bg-gray-800 text-white text-xs uppercase tracking-wide">
                    <th className="text-left px-3 py-2.5">Mes</th>
                    <th className="text-right px-3 py-2.5">Ventas</th>
                    <th className="text-right px-3 py-2.5">Recompras</th>
                    <th className="text-right px-3 py-2.5">Gastos operativos</th>
                    <th className="text-right px-3 py-2.5" title="Ventas − recompras">G. bruta</th>
                    <th className="text-right px-3 py-2.5" title="Ventas − gastos operativos (como el Excel)">G. neta</th>
                    <th className="text-right px-3 py-2.5 bg-emerald-800" title="Ventas − recompras − gastos operativos">G. real</th>
                    <th className="text-right px-3 py-2.5 bg-emerald-800">%</th>
                    <th className="text-right px-3 py-2.5">Inventario</th>
                    <th className="text-right px-3 py-2.5">Subió / bajó</th>
                    <th className="text-right px-3 py-2.5" title="Ganancia real + lo que subió el inventario">G. real + inventario</th>
                    <th className="px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shown.map(m => (
                    <tr key={m.period} className={m.before_start ? 'bg-gray-50 text-gray-500' : 'hover:bg-indigo-50/40'}>
                      <td className="px-3 py-2 whitespace-nowrap font-medium">
                        {m.label}{m.in_progress && <span className="ml-1 text-[11px] text-sky-700">(en curso)</span>}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{fmt(m.ventas)}<EditedMark info={m.edited.ventas} /></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{fmt(m.recompras)}<EditedMark info={m.edited.recompras} /></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {m.has_expenses ? fmt(m.gastos_operativos) : <span className="text-gray-400" title="No hay gastos registrados para este mes: escríbelos a mano con Editar">Sin registrar</span>}
                        <EditedMark info={m.edited.gastos_operativos} />
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{fmt(m.ganancia_bruta)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{fmt(m.ganancia_neta)}</td>
                      <td className={`px-3 py-2 text-right whitespace-nowrap font-bold ${m.ganancia_real < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{fmt(m.ganancia_real)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{pct(m.porcentaje)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {m.inventario != null ? fmt(m.inventario) : (
                          <button onClick={() => handleInventory({ year: m.year, month: m.month }, m.period)} disabled={!!busy} className="text-xs text-indigo-700 underline">
                            {busy === m.period ? 'Trayendo…' : 'Traer'}
                          </button>
                        )}
                        <EditedMark info={m.edited.inventario} />
                      </td>
                      <td className={`px-3 py-2 text-right whitespace-nowrap ${m.inventario_cambio < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{signed(m.inventario_cambio)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{fmt(m.ganancia_con_inventario)}</td>
                      <td className="px-2 py-2">
                        <button aria-label={`Editar ${m.label}`} onClick={() => openEdit(m)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-800 text-white font-bold">
                    <td className="px-3 py-2.5">Total {data.months_counted ? `(${data.months_counted} meses)` : ''}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">{fmt(t.ventas)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">{fmt(t.recompras)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">{fmt(t.gastos_operativos)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">{fmt(t.ganancia_bruta)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">{fmt(t.ganancia_neta)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap bg-emerald-900">{fmt(t.ganancia_real)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap bg-emerald-900">{pct(t.porcentaje)}</td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Ventas por medio de pago ───────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-gray-700">Ventas por medio de pago (lo que se movió en el año)</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">De los recibos de pago de Alegra, desde {data.payments_start}.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-sky-600 text-white text-xs uppercase tracking-wide">
                    <th className="text-left px-3 py-2.5">Mes</th>
                    {MEDIOS.map(([k, l]) => <th key={k} className="text-right px-3 py-2.5">{l}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {counted.filter(m => m.has_payments_data).map(m => (
                    <tr key={m.period}>
                      <td className="px-3 py-2 font-medium">{m.label}</td>
                      {MEDIOS.map(([k]) => <td key={k} className="px-3 py-2 text-right whitespace-nowrap text-gray-700">{m.ventas_por_medio[k] ? fmt(m.ventas_por_medio[k]) : ''}</td>)}
                    </tr>
                  ))}
                  {!counted.some(m => m.has_payments_data) && (
                    <tr><td colSpan={MEDIOS.length + 1} className="px-3 py-6 text-center text-gray-500">Aún no hay ventas por medio. Se traen en Cuentas → Mes (“Traer ventas de Alegra”) o solas cada noche.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-800 text-white font-bold">
                    <td className="px-3 py-2.5">Total {year}</td>
                    {MEDIOS.map(([k]) => <td key={k} className="px-3 py-2.5 text-right whitespace-nowrap">{data.ventas_por_medio_year[k] ? fmt(data.ventas_por_medio_year[k]) : ''}</td>)}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Otras salidas ──────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-700">Plata que salió y no es gasto del mes</span>
              <p className="text-[11px] text-gray-500 mt-0.5">No restan de la ganancia (se recuperan, son activos o son reparto de ganancia), pero sí salieron de las cuentas. Los fletes ya están dentro de los gastos operativos.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="text-left px-3 py-2">Mes</th>
                    <th className="text-right px-3 py-2">Inversiones</th>
                    <th className="text-right px-3 py-2">Retiros de socios</th>
                    <th className="text-right px-3 py-2">Préstamos</th>
                    <th className="text-right px-3 py-2">Fletes</th>
                    <th className="text-right px-3 py-2">Jhonatan al cierre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {counted.map(m => (
                    <tr key={m.period}>
                      <td className="px-3 py-2 font-medium">{m.label}</td>
                      <td className="px-3 py-2 text-right">{fmt(m.inversiones)}<EditedMark info={m.edited.inversiones} /></td>
                      <td className="px-3 py-2 text-right">{fmt(m.retiros)}<EditedMark info={m.edited.retiros} /></td>
                      <td className="px-3 py-2 text-right">{fmt(m.prestamos)}<EditedMark info={m.edited.prestamos} /></td>
                      <td className="px-3 py-2 text-right">{fmt(m.fletes)}<EditedMark info={m.edited.fletes} /></td>
                      <td className="px-3 py-2 text-right">{fmt(m.jhonatan)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-gray-50">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{fmt(t.inversiones)}</td>
                    <td className="px-3 py-2 text-right">{fmt(t.retiros)}</td>
                    <td className="px-3 py-2 text-right">{fmt(t.prestamos)}</td>
                    <td className="px-3 py-2 text-right">{fmt(t.fletes)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex items-start gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p><b>Ganancia bruta</b> = ventas − recompras. <b>Ganancia neta</b> = ventas − gastos operativos (como el Excel). <b>Ganancia real</b> = ventas − recompras − gastos operativos.</p>
              <p><b>Gastos operativos</b>: los que corresponden al mes (arriendo, sueldos, servicios, fletes, cuotas, 4x1000 de gastos y de recompras). Inversiones, préstamos y retiros de socios van aparte.</p>
              <p><b>G. real + inventario</b>: si el inventario subió, esa plata no se perdió, está en la tienda en ropa. Antes de usarla, compara el inventario de julio que trae Alegra con el del Excel ($174.013.437) para confirmar que Alegra lo da al mismo precio.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CuentasAnual;

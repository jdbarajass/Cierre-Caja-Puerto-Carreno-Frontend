// Gestión → Cuentas → Radiografía (docs/PLAN_RADIOGRAFIA.md del backend).
// Fase 1: el mes de la tienda activa — estado de resultados con la fórmula de
// cada línea, indicadores, comparaciones, punto de equilibrio y salidas por
// clase. Solo lee (admin y viewer). Todo lo que depende del costo dice
// ESTIMADO: en Alegra el costo es igual al precio de venta, así que el costo
// sale del precio de lista × (1 − margen KOAJ).
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getRadiografiaMonth } from '../services/radiografiaService';
import { getColombiaDate } from '../utils/dateUtils';

const fmt = (v) => (v == null ? '—'
  : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.round(v)));
const pct = (v, digits = 1) => (v == null ? '—' : `${(v * 100).toLocaleString('es-CO', { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`);
const num = (v, digits = 0) => (v == null ? '—' : Number(v).toLocaleString('es-CO', { maximumFractionDigits: digits }));
const fmtDate = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const Est = () => <span className="ml-1 text-[10px] font-bold text-amber-700 align-middle">ESTIMADO</span>;

// Variación con flecha y texto (nunca solo color)
const Change = ({ c, invert = false }) => {
  if (!c || c.change_pct == null) return <span className="text-gray-400">sin datos</span>;
  const up = c.change_pct >= 0;
  const good = invert ? !up : up;
  return <span className={good ? 'text-emerald-700' : 'text-red-700'}>{up ? '▲' : '▼'} {pct(Math.abs(c.change_pct))}</span>;
};

const Tile = ({ label, value, sub, estimated, tone = 'default' }) => (
  <div className={`rounded-xl border p-4 ${tone === 'good' ? 'bg-emerald-50 border-emerald-200' : tone === 'bad' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}{estimated && <Est />}</p>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    {sub && <div className="text-[11px] text-gray-600 mt-1">{sub}</div>}
  </div>
);

// Líneas del estado de resultados: clave, nombre, fórmula, estimado, nivel (0 = total)
const STATEMENT = [
  ['ventas', 'Ventas netas', 'Facturas de Alegra no anuladas (igual que Cuentas → Año)', false, 0],
  ['precio_lista', 'Precio de lista vendido', 'Cantidad × precio de lista, sin bolsa ni tarjetas regalo', false, 1],
  ['descuentos', 'Descuentos', 'Precio de lista vendido − ventas netas', false, 1],
  ['costo_estimado', 'Costo de la ropa', 'Precio de lista vendido × (1 − margen KOAJ)', true, 1],
  ['fletes', 'Fletes y moto carro', 'Salidas de flete del mes (con 4x1000)', false, 1],
  ['costo_vendido', 'Costo de lo vendido', 'Costo de la ropa + fletes', true, 1],
  ['utilidad_bruta', 'Utilidad bruta', 'Ventas netas − costo de lo vendido', true, 0],
  ['gastos_operativos', 'Gastos operativos', 'Operativo + sueldos + otro, del mes al que corresponden', false, 1],
  ['utilidad_operacional', 'Utilidad operacional', 'Utilidad bruta − gastos operativos', true, 0],
  ['gastos_financieros', 'Gastos financieros', '4x1000 (gastos y recompras) + intereses de las cuotas + comisiones', false, 1],
  ['utilidad_neta', 'Utilidad neta (antes de impuestos)', 'Utilidad operacional − gastos financieros', true, 0],
];
const AFTER = [
  ['cuotas', 'Cuotas de crédito (capital)', 'No baja la utilidad (es devolver un préstamo), pero la plata sale'],
  ['recompras', 'Recompras enviadas', 'Lo enviado a Jhonatan en el mes'],
  ['lo_que_quedo', 'Lo que quedó', 'Ventas − recompras − gastos − cuotas (= ganancia real de Cuentas → Año; solo lo registrado)'],
];

const CuentasRadiografia = () => {
  const now = getColombiaDate();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [target, setTarget] = useState('');
  const [targetSales, setTargetSales] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getRadiografiaMonth({ year, month });
      setData(res.month);
      setTargetSales(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [year, month]);
  useEffect(() => { load(); }, [load]);

  const isFirst = year === 2026 && month === 1;
  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
  const prev = () => { if (isFirst) return; if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (isCurrent) return; if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // "Si quiero sacar X, ¿cuánto hay que vender?": se calcula en el backend con
  // la misma fórmula; el valor no se guarda.
  const calcTarget = async (e) => {
    e.preventDefault();
    const t = Number(target);
    if (!(t > 0)) { setTargetSales(null); return; }
    try {
      const res = await getRadiografiaMonth({ year, month, target: t });
      setTargetSales(res.month.break_even.sales_for_target);
    } catch (err) { setError(err.message); }
  };

  const s = data?.statement;
  const be = data?.break_even;
  const ind = data?.indicators;
  const cmp = data?.comparisons;
  const closed = cmp?.previous_month_closed;
  const noExp = data && !data.has_expenses;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Radiografía del mes</h2>
          <p className="text-xs text-gray-500">
            Costo de la ropa = precio de lista × (1 − {data?.margin_pct ?? 35} %): <b className="text-amber-700">ESTIMADO</b> hasta que Alegra tenga los costos reales.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Mes anterior" onClick={prev} disabled={isFirst} className="p-2 rounded-lg border border-gray-300 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="min-w-[130px] text-center font-semibold text-gray-800">{MONTHS[month - 1]} {year}</span>
          <button type="button" aria-label="Mes siguiente" onClick={next} disabled={isCurrent} className="p-2 rounded-lg border border-gray-300 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          <button type="button" aria-label="Actualizar" onClick={load} className="p-2 rounded-lg border border-gray-300"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && !data && <p className="text-sm text-gray-500">Cargando…</p>}

      {data && !data.future && (
        <>
          {data.warnings.length > 0 && (
            <ul className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 space-y-1">
              {data.warnings.map((w, i) => <li key={i} className="flex gap-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />{w}</li>)}
            </ul>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile label="Ventas netas" value={fmt(s.ventas)}
              sub={<>
                {data.in_progress ? `Del 1 al ${fmtDate(data.data_until)} · ` : ''}
                vs. mes anterior{data.in_progress ? ' (mismos días)' : ''}: <Change c={cmp.previous_month.ventas} />
              </>} />
            <Tile label="Utilidad bruta" estimated value={fmt(s.utilidad_bruta)} sub={`${pct(s.margen_bruto_pct)} de las ventas`} />
            <Tile label="Utilidad neta" estimated value={noExp ? '—' : fmt(s.utilidad_neta)}
              tone={noExp ? 'default' : s.utilidad_neta >= 0 ? 'good' : 'bad'}
              sub={noExp ? 'Faltan los gastos del mes' : `${pct(s.margen_neto_pct)} de las ventas`} />
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Punto de equilibrio<Est /></p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(be.month)}</p>
              <p className="text-[11px] text-gray-600">{fmt(be.day)} al día · {data.days_in_month} días</p>
              {be.progress_pct != null && (
                <div className="mt-2" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(be.progress_pct, 1) * 100)} aria-label="Avance hacia el punto de equilibrio">
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gray-800" style={{ width: `${Math.min(be.progress_pct, 1) * 100}%` }} />
                  </div>
                  <p className="text-[11px] text-gray-700 mt-1">{pct(be.progress_pct, 0)} cubierto{be.progress_pct >= 1 ? ' ✓' : ''}</p>
                </div>
              )}
            </div>
          </div>

          {/* Estado de resultados */}
          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Estado de resultados</h3>
              <p className="text-[11px] text-gray-500">Cada cifra con su fórmula. {closed ? 'Comparado con el mes anterior completo.' : 'La comparación de gastos y utilidad solo se hace entre meses cerrados con gastos.'}</p>
            </div>
            <ul className="divide-y divide-gray-100">
              {STATEMENT.map(([key, label, formula, est, level]) => {
                const missing = noExp && ['gastos_operativos', 'utilidad_operacional', 'gastos_financieros', 'utilidad_neta'].includes(key);
                return (
                  <li key={key} className={`px-4 py-2 grid grid-cols-[1fr_auto] gap-x-3 ${level === 0 ? 'bg-gray-50' : ''}`}>
                    <div className="min-w-0">
                      <p className={`text-sm ${level === 0 ? 'font-semibold text-gray-900' : 'text-gray-700 pl-3'}`}>{label}{est && <Est />}</p>
                      <p className="text-[11px] text-gray-500 pl-3">{formula}{key === 'gastos_financieros' && s.comisiones_calculadas > 0 && !s.comisiones_registradas
                        ? ` · incluye ${fmt(s.comisiones_calculadas)} de comisiones calculadas (no registradas en Gastos)` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm whitespace-nowrap ${level === 0 ? 'font-bold' : ''} ${(s[key] < 0 && level === 0) ? 'text-red-700' : 'text-gray-900'}`}>{missing ? 'Sin gastos' : fmt(s[key])}</p>
                      <p className="text-[11px] text-gray-500 whitespace-nowrap">
                        {key !== 'ventas' && key !== 'precio_lista' && !missing && data.pct_of_sales[key] !== undefined ? pct(data.pct_of_sales[key]) : ''}
                        {key === 'descuentos' ? pct(ind.descuentos_pct) + ' del precio de lista' : ''}
                        {closed && closed[key] && <> · <Change c={closed[key]} invert={key.startsWith('gastos')} /></>}
                      </p>
                    </div>
                  </li>
                );
              })}
              {AFTER.map(([key, label, formula]) => (
                <li key={key} className={`px-4 py-2 grid grid-cols-[1fr_auto] gap-x-3 ${key === 'lo_que_quedo' ? 'bg-emerald-50' : ''}`}>
                  <div className="min-w-0">
                    <p className={`text-sm ${key === 'lo_que_quedo' ? 'font-semibold text-gray-900' : 'text-gray-700 pl-3'}`}>{label}</p>
                    <p className="text-[11px] text-gray-500 pl-3">{formula}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm whitespace-nowrap ${key === 'lo_que_quedo' ? 'font-bold' : ''} ${s[key] < 0 ? 'text-red-700' : 'text-gray-900'}`}>{fmt(s[key])}</p>
                    {key === 'lo_que_quedo' && <p className="text-[11px] text-gray-500">{pct(data.pct_of_sales.lo_que_quedo)}{closed?.lo_que_quedo && <> · <Change c={closed.lo_que_quedo} /></>}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Indicadores y comparaciones */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="font-semibold text-gray-900 mb-1">Indicadores</h3>
            <p className="text-[11px] text-gray-500 mb-3">
              Mes anterior: del {fmtDate(cmp.previous_month.range[0])} al {fmtDate(cmp.previous_month.range[1])} · mismo mes de {year - 1}: del {fmtDate(cmp.last_year.range[0])} al {fmtDate(cmp.last_year.range[1])}.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {[
                ['Transacciones', num(ind.transacciones), 'Facturas no anuladas', cmp.previous_month.transacciones, cmp.last_year.transacciones],
                ['Ticket promedio', fmt(ind.ticket), 'Ventas ÷ transacciones', cmp.previous_month.ticket, cmp.last_year.ticket],
                ['Unidades', num(ind.unidades), 'Prendas vendidas (sin bolsa)', cmp.previous_month.unidades, null],
                ['Prendas por factura', num(ind.prendas_por_factura, 2), 'Unidades ÷ transacciones', null, null],
                ['Descuentos', pct(ind.descuentos_pct), 'Descuentos ÷ precio de lista', null, null],
                ['Gastos / ventas', pct(ind.gastos_ventas_pct), '(Operativos + financieros) ÷ ventas', null, null],
                ['Nómina / ventas', pct(ind.nomina_ventas_pct), 'Sueldos ÷ ventas', null, null],
                ['Ventas vs. año pasado', fmt(cmp.last_year.ventas.value), `Mismo mes de ${year - 1} (venta real)`, null, cmp.last_year.ventas],
              ].map(([label, value, formula, vsPrev, vsLy]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-[11px] text-gray-500">{label}</p>
                  <p className="font-bold text-gray-900">{value}</p>
                  <p className="text-[10px] text-gray-500">{formula}</p>
                  {(vsPrev || vsLy) && (
                    <p className="text-[11px] mt-1">
                      {vsPrev && <>Mes ant.: <Change c={vsPrev} /> </>}
                      {vsLy && <>{vsPrev ? '· ' : ''}Año ant.: <Change c={vsLy} /></>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ¿Cuánto hay que vender? */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">¿Cuánto hay que vender?<Est /></h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[11px] text-gray-500">Gastos fijos del mes</p>
                <p className="font-bold">{fmt(be.fixed_costs)}</p>
                <p className="text-[10px] text-gray-500">Los que restan utilidad; de cada uno, el mayor entre su valor y lo pagado. Sin retiros de socios ni cuotas.</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[11px] text-gray-500">Margen de contribución</p>
                <p className="font-bold">{pct(be.contribution_pct)}</p>
                <p className="text-[10px] text-gray-500">(Ventas − costo de la ropa − fletes − comisiones) ÷ ventas</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[11px] text-gray-500">Punto de equilibrio</p>
                <p className="font-bold">{fmt(be.month)} <span className="font-normal text-gray-600">· {fmt(be.day)}/día</span></p>
                <p className="text-[10px] text-gray-500">Gastos fijos ÷ margen de contribución (utilidad neta = 0)</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[11px] text-gray-500">Para cubrir también las cuotas</p>
                <p className="font-bold">{fmt(be.month_with_cuotas)} <span className="font-normal text-gray-600">· {fmt(be.day_with_cuotas)}/día</span></p>
                <p className="text-[10px] text-gray-500">(Gastos fijos + cuotas de crédito {fmt(be.fixed_cuotas)}) ÷ margen de contribución</p>
              </div>
            </div>
            {data.in_progress && be.pace_month != null && (
              <p className="text-sm text-gray-700">
                A este ritmo el mes cerraría en <b>{fmt(be.pace_month)}</b> <Est />
                <span className="text-[11px] text-gray-500"> (ventas a hoy ÷ {data.days_elapsed} días × {data.days_in_month} días)</span>
                {be.month != null && <> · {be.pace_month >= be.month ? 'alcanza' : 'no alcanza'} el punto de equilibrio.</>}
              </p>
            )}
            <form onSubmit={calcTarget} className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-gray-600">Si quiero sacar (utilidad)
                <input type="number" min="0" value={target} onChange={e => setTarget(e.target.value)} placeholder="Ej.: 3000000"
                  className="mt-1 block w-44 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </label>
              <button type="submit" className="px-3 py-2 text-xs bg-gray-900 text-white rounded-lg">Calcular</button>
              {targetSales != null && (
                <p className="text-sm text-gray-800">hay que vender <b>{fmt(targetSales)}</b> en el mes <span className="text-[11px] text-gray-500">((gastos fijos + {fmt(Number(target))}) ÷ margen de contribución; no se guarda)</span></p>
              )}
            </form>
            {be.fixed_items.length > 0 && (
              <details className="text-xs text-gray-600">
                <summary className="cursor-pointer">Ver los gastos fijos ({be.fixed_items.length})</summary>
                <ul className="mt-1 space-y-0.5">
                  {be.fixed_items.map(f => <li key={f.id}>{f.name}: {fmt(f.value)}{f.paid ? ` (pagado ${fmt(f.paid)})` : ''}</li>)}
                </ul>
              </details>
            )}
          </section>

          {/* Salidas del mes por clase */}
          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Salidas del mes</h3>
              <p className="text-[11px] text-gray-500">Por mes al que corresponden. Solo lo operativo, los fletes y lo financiero bajan la utilidad.</p>
            </div>
            {data.outflows.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500">No hay salidas registradas en este mes.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.outflows.map(o => (
                  <li key={o.class} className="px-4 py-2">
                    <details>
                      <summary className="cursor-pointer grid grid-cols-[1fr_auto] gap-x-3 list-none">
                        <span className="text-sm text-gray-800">{o.label}
                          <span className="block text-[11px] text-gray-500">
                            {o.reduces_utility ? 'Baja la utilidad' : 'No baja la utilidad'} · {o.reduces_what_is_left ? 'se resta en lo que quedó' : 'no se resta en lo que quedó'} · {o.items.length} movimiento{o.items.length === 1 ? '' : 's'}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{fmt(o.total)}</span>
                      </summary>
                      <ul className="mt-1 pl-3 text-[11px] text-gray-600 space-y-0.5">
                        {o.items.map(it => <li key={it.id}>{fmtDate(it.date)} · {it.concept}: {fmt(it.amount)}{it.interest ? ` (interés ${fmt(it.interest)})` : ''}</li>)}
                        {o.class === 'financiero' && s.recompras_fee > 0 && <li>4x1000 de las recompras: {fmt(s.recompras_fee)}</li>}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default CuentasRadiografia;

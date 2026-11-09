// Cuentas → Radiografía → Inventario (Fase 3 de docs/PLAN_RADIOGRAFIA.md del backend).
// Cuánta plata hay en ropa (a precio de venta y a costo ESTIMADO), cuántos días
// alcanza, rotación, prendas quietas con su plata parada y qué rota por tipo
// de prenda y departamento. Necesita el stock de Alegra (la primera vez tarda).
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getRadiografiaInventory } from '../../services/radiografiaService';
import { Est, Tile, Warnings } from './RadiografiaUI';
import { fmt, fmtDate, num, pct } from '../../utils/radiografiaFormat';

const days = (v) => (v == null ? 'sin ventas' : `${num(v)} días`);

const TypeTable = ({ rows, title, note }) => (
  <section className="rounded-xl border border-gray-200 bg-white">
    <div className="px-4 py-3 border-b border-gray-100">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {note && <p className="text-[11px] text-gray-500">{note}</p>}
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-[11px] text-gray-500 uppercase tracking-wide">
            <th scope="col" className="sticky left-0 z-10 bg-white text-left px-3 py-2 min-w-[160px]">Prenda</th>
            <th scope="col" className="text-right px-3 py-2">Vendidas</th>
            <th scope="col" className="text-right px-3 py-2">Ventas</th>
            <th scope="col" className="text-right px-3 py-2">Descuento</th>
            <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Utilidad<Est /></th>
            <th scope="col" className="text-right px-3 py-2">Stock</th>
            <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Valor a costo<Est /></th>
            <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Días de inventario</th>
            <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Plata parada<Est /></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(r => (
            <tr key={r.name}>
              <th scope="row" className="sticky left-0 z-10 bg-white text-left px-3 py-2 font-normal text-gray-800">{r.name}</th>
              <td className="text-right px-3 py-2">{num(r.units)}</td>
              <td className="text-right px-3 py-2 whitespace-nowrap">{fmt(r.ventas)}</td>
              <td className="text-right px-3 py-2">{pct(r.descuento_pct)}</td>
              <td className={`text-right px-3 py-2 whitespace-nowrap ${r.utilidad_estimada < 0 ? 'text-red-700' : ''}`}>{fmt(r.utilidad_estimada)}</td>
              <td className="text-right px-3 py-2">{num(r.stock)}</td>
              <td className="text-right px-3 py-2 whitespace-nowrap">{fmt(r.valor_costo)}</td>
              <td className="text-right px-3 py-2 whitespace-nowrap">{r.stock > 0 ? days(r.dias_inventario) : 'agotado'}</td>
              <td className="text-right px-3 py-2 whitespace-nowrap">{r.plata_parada ? fmt(r.plata_parada) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const RankList = ({ title, rows, note }) => (
  <section className="rounded-xl border border-gray-200 bg-white p-4">
    <h3 className="font-semibold text-gray-900">{title}</h3>
    <p className="text-[11px] text-gray-500 mb-2">{note}</p>
    {rows.length === 0 ? <p className="text-sm text-gray-500">Nada por ahora.</p> : (
      <ol className="space-y-1 text-sm">
        {rows.map((r, i) => (
          <li key={r.name} className="grid grid-cols-[1.5rem_1fr_auto] gap-2">
            <span className="text-gray-400">{i + 1}.</span>
            <span className="text-gray-800 min-w-0 truncate" title={r.name}>{r.name}</span>
            <span className="text-gray-700 whitespace-nowrap">{days(r.dias_inventario)} · {num(r.stock)} und.</span>
          </li>
        ))}
      </ol>
    )}
  </section>
);

const RadiografiaInventario = () => {
  const [quiet, setQuiet] = useState(90);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getRadiografiaInventory({ quiet });
      setData(res.inventory);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [quiet]);
  useEffect(() => { load(); }, [load]);

  const t = data?.totals;
  const quietRows = data ? (showAll ? data.quiet : data.quiet.slice(0, 25)) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Radiografía del inventario</h2>
          <p className="text-xs text-gray-500">
            Stock de hoy en Alegra × precio de lista. A costo = × (1 − {data?.margin_pct ?? 35} %): <b className="text-amber-700">ESTIMADO</b>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 flex items-center gap-2">Quieta si no se vende ni llega en
            <select value={quiet} onChange={e => setQuiet(Number(e.target.value))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              {(data?.quiet_options || [60, 90, 180]).map(o => <option key={o} value={o}>{o} días</option>)}
            </select>
          </label>
          <button type="button" aria-label="Actualizar" onClick={load} className="p-2 rounded-lg border border-gray-300"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && !data && <p className="text-sm text-gray-500">Trayendo el stock de Alegra… la primera vez puede tardar un minuto.</p>}

      {data && (
        <>
          <Warnings items={data.warnings} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile label="Inventario a costo" estimated value={fmt(t.valor_costo)}
              sub={<>A precio de venta {fmt(t.valor_venta)} · {num(t.unidades)} prendas{data.alegra_snapshot ? <> · reporte de Alegra al {fmtDate(data.alegra_snapshot.as_of)}: {fmt(data.alegra_snapshot.value)}</> : ''}</>} />
            <Tile label="Días de inventario" value={t.dias_inventario == null ? '—' : num(t.dias_inventario)}
              sub={`Inventario ÷ lo que se vende al día (${fmt(t.vendido_lista_dia)} a precio de lista, últimos ${data.sales_window.loaded_days} días)`} />
            <Tile label="Rotación al año" estimated value={t.rotacion_anual == null ? '—' : `${num(t.rotacion_anual, 1)} veces`}
              sub={`Lo vendido en ${t.rotation_days_used} días, llevado a 12 meses, ÷ inventario de hoy`} />
            <Tile label="Plata parada" estimated value={fmt(t.plata_parada)} tone={t.plata_parada > 0 ? 'bad' : 'default'}
              sub={`${num(t.quiet_count)} referencias · ${num(t.quiet_units)} prendas sin venderse ni llegar en ${data.quiet_days} días · ${pct(t.plata_parada_pct)} del inventario a costo`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <RankList title="Las que más rotan" rows={data.fastest} note="Tipos de prenda que se acaban más rápido al ritmo de los últimos 90 días (posible reposición)." />
            <RankList title="Las que menos rotan" rows={data.slowest} note="Con stock y sin ventas, o con más días de inventario." />
          </div>

          <TypeTable rows={data.by_department} title="Por departamento" note={`Ventas de los últimos ${data.sales_window.loaded_days} días; stock y valor de hoy.`} />
          <TypeTable rows={data.by_type} title="Por tipo de prenda" note="Con un margen igual para todo, la utilidad por prenda solo cambia por los descuentos: la real necesita los costos reales en Alegra." />

          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Prendas quietas ({num(t.quiet_count)})</h3>
              <p className="text-[11px] text-gray-500">Con stock, sin venta y sin llegada en {data.quiet_days} días. Ordenadas por plata parada (stock × precio de lista × {100 - data.margin_pct} %).</p>
            </div>
            {data.quiet.length === 0 ? <p className="px-4 py-3 text-sm text-gray-500">No hay prendas quietas.</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-gray-500 uppercase tracking-wide">
                      <th scope="col" className="text-left px-3 py-2 min-w-[220px]">Prenda (talla)</th>
                      <th scope="col" className="text-right px-3 py-2">Stock</th>
                      <th scope="col" className="text-right px-3 py-2">Precio</th>
                      <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Plata parada<Est /></th>
                      <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Última venta</th>
                      <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Última llegada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {quietRows.map(q => (
                      <tr key={q.item_id}>
                        <td className="px-3 py-2 text-gray-800">{q.name}</td>
                        <td className="text-right px-3 py-2">{num(q.stock)}</td>
                        <td className="text-right px-3 py-2 whitespace-nowrap">{fmt(q.price)}</td>
                        <td className="text-right px-3 py-2 whitespace-nowrap font-semibold">{fmt(q.plata_parada)}</td>
                        <td className="text-right px-3 py-2 whitespace-nowrap">{q.last_sale ? `${fmtDate(q.last_sale)}/${q.last_sale.slice(0, 4)}` : 'sin ventas en 2026'}</td>
                        <td className="text-right px-3 py-2 whitespace-nowrap">{q.last_arrival ? `${fmtDate(q.last_arrival)}/${q.last_arrival.slice(0, 4)}` : 'sin registro'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.quiet.length > 25 && (
              <div className="px-4 py-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowAll(v => !v)} className="text-xs font-semibold text-gray-800 underline">
                  {showAll ? 'Ver solo las 25 primeras' : `Ver las ${data.quiet.length}${data.quiet_truncated ? ' con más plata parada' : ''}`}
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default RadiografiaInventario;

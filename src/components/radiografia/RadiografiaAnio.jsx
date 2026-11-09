// Cuentas → Radiografía → Año (Fase 2 de docs/PLAN_RADIOGRAFIA.md del backend).
// Por mes de la tienda activa: estado de resultados, recompras, lo que quedó
// (= ganancia real de Cuentas → Año, con las cifras escritas a mano) e
// inventario de fin de mes; total y promedio. Solo lee.
import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getRadiografiaYear } from '../../services/radiografiaService';
import { getColombiaDate } from '../../utils/dateUtils';
import { Change, Est, Tile, Warnings } from './RadiografiaUI';
import { fmt, num, pct } from '../../utils/radiografiaFormat';
import ExportButtons from './ExportButtons';

// [clave, nombre, ESTIMADO, tipo, nivel (0 = total), fórmula]
const ROWS = [
  ['ventas', 'Ventas netas', false, 'money', 0, 'Facturas no anuladas (igual que Cuentas → Año)'],
  ['ventas_vs_anio_anterior', 'vs. mismo mes del año pasado', false, 'change', 1, 'Venta real del año pasado; mes en curso: mismos días'],
  ['precio_lista', 'Precio de lista vendido', false, 'money', 1, 'Ropa + tarjetas regalo, sin bolsas'],
  ['descuentos', 'Descuentos', false, 'money', 1, 'Precio de lista + bolsas − ventas'],
  ['costo_estimado', 'Costo de la ropa', true, 'money', 1, 'Precio de lista × (1 − margen)'],
  ['fletes', 'Fletes y moto carro', false, 'money', 1, ''],
  ['utilidad_bruta', 'Utilidad bruta', true, 'money', 0, 'Ventas − costo de la ropa − fletes'],
  ['margen_bruto_pct', 'Margen bruto', true, 'pct', 1, 'Utilidad bruta ÷ ventas'],
  ['gastos_operativos', 'Gastos operativos', false, 'money', 1, 'Operativo + sueldos + otro'],
  ['gastos_financieros', 'Gastos financieros', false, 'money', 1, '4x1000 + intereses + comisiones'],
  ['utilidad_neta', 'Utilidad neta', true, 'money', 0, 'Bruta − operativos − financieros (antes de impuestos)'],
  ['margen_neto_pct', 'Margen neto', true, 'pct', 1, 'Utilidad neta ÷ ventas'],
  ['cuotas', 'Cuotas de crédito (capital)', false, 'money', 1, 'No bajan la utilidad, pero la plata sale'],
  ['recompras', 'Recompras enviadas', false, 'money', 1, 'Lo enviado a Jhonatan'],
  ['lo_que_quedo', 'Lo que quedó', false, 'money', 0, 'Ventas − recompras − gastos − cuotas (= ganancia real de Año)'],
  ['transacciones', 'Transacciones', false, 'num', 1, ''],
  ['ticket', 'Ticket promedio', false, 'money', 1, 'Ventas ÷ transacciones'],
  ['unidades', 'Unidades', false, 'num', 1, 'Prendas vendidas (sin bolsa ni tarjetas)'],
  ['inventario', 'Inventario fin de mes', false, 'money', 1, 'Alegra, a precio de venta'],
  ['inventario_costo', 'Inventario a costo', true, 'money', 1, 'Inventario × (1 − margen)'],
  ['inventario_cambio', 'Cambio del inventario', false, 'money', 1, 'Fin de mes − fin del mes anterior'],
  ['inventario_cambio_sin_ajuste', 'Cambio sin el ajuste de 2025', false, 'money', 1, 'Quitando el ajuste de salida de la reconstrucción de 2025 (no es venta); ver el aviso de arriba'],
];
const EXPENSE_KEYS = ['gastos_operativos', 'gastos_financieros', 'utilidad_neta', 'margen_neto_pct', 'fletes', 'cuotas'];
const INVENTORY_KEYS = ['inventario', 'inventario_costo', 'inventario_cambio', 'inventario_cambio_sin_ajuste'];

const cell = (type, v) => {
  if (type === 'pct') return pct(v);
  if (type === 'num') return num(v);
  if (type === 'change') return <Change c={{ change_pct: v }} />;
  return fmt(v);
};

const RadiografiaAnio = () => {
  const thisYear = getColombiaDate().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getRadiografiaYear({ year });
      setData(res.year);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [year]);
  useEffect(() => { load(); }, [load]);

  const months = data ? data.months.filter(m => m.has_data) : [];
  const t = data?.totals;
  const avg = data?.averages;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Radiografía del año</h2>
          <p className="text-xs text-gray-500">
            Mes por mes. Costo = precio de lista × (1 − {data?.margin_pct ?? 35} %): <b className="text-amber-700">ESTIMADO</b>. Lo que quedó cuadra con Cuentas → Año.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" aria-label="Año anterior" onClick={() => setYear(y => y - 1)} disabled={year <= 2026} className="p-2 rounded-lg border border-gray-300 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="min-w-[70px] text-center font-semibold text-gray-800">{year}</span>
          <button type="button" aria-label="Año siguiente" onClick={() => setYear(y => y + 1)} disabled={year >= thisYear} className="p-2 rounded-lg border border-gray-300 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          <button type="button" aria-label="Actualizar" onClick={load} className="p-2 rounded-lg border border-gray-300"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <ExportButtons url={`/api/radiografia/year?year=${year}`} view="anio" period={String(year)} />
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && !data && <p className="text-sm text-gray-500">Cargando…</p>}

      {data && months.length === 0 && <p className="text-sm text-gray-500">Todavía no hay ventas cargadas de {year} en esta tienda.</p>}

      {data && months.length > 0 && (
        <>
          <Warnings items={data.warnings} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile label="Ventas del año" value={fmt(t.ventas)}
              sub={`${data.months_with_data} mes${data.months_with_data === 1 ? '' : 'es'} · promedio ${fmt(avg.ventas)} por mes cerrado`} />
            <Tile label="Utilidad bruta" estimated value={fmt(t.utilidad_bruta)} sub={`${pct(t.margen_bruto_pct)} de las ventas`} />
            <Tile label="Utilidad neta" estimated value={fmt(t.utilidad_neta)}
              tone={t.utilidad_neta == null ? 'default' : t.utilidad_neta >= 0 ? 'good' : 'bad'}
              sub={t.utilidad_neta == null ? 'Ningún mes tiene gastos registrados'
                : `${data.months_with_expenses} mes${data.months_with_expenses === 1 ? '' : 'es'} con gastos · ${pct(t.margen_neto_pct)} de sus ventas`} />
            <Tile label="Lo que quedó" value={fmt(t.lo_que_quedo)}
              sub={`Igual que la ganancia real de Cuentas → Año${avg.lo_que_quedo != null ? ` · promedio ${fmt(avg.lo_que_quedo)}` : ''}`} />
          </div>

          {(data.best_month || data.worst_month) && (
            <p className="text-sm text-gray-700">
              {data.best_month && <>Mejor mes en ventas: <b>{data.best_month.label}</b> ({fmt(data.best_month.ventas)})</>}
              {data.worst_month && <> · más flojo: <b>{data.worst_month.label}</b> ({fmt(data.worst_month.ventas)})</>}
              <span className="text-[11px] text-gray-500"> (solo meses cerrados)</span>
            </p>
          )}

          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Mes por mes</h3>
              <p className="text-[11px] text-gray-500">
                «—» = no hay con qué calcularlo (mes sin gastos o sin foto del inventario). El total de utilidad neta y gastos suma solo los meses con gastos; el promedio, solo los meses cerrados.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-gray-500 uppercase tracking-wide">
                    <th scope="col" className="sticky left-0 z-10 bg-white text-left px-3 py-2 min-w-[170px]">Concepto</th>
                    {months.map(m => (
                      <th key={m.period} scope="col" className="text-right px-3 py-2 whitespace-nowrap font-semibold">
                        {m.label}
                        {m.in_progress && <span className="block normal-case font-normal text-amber-700">en curso</span>}
                        {m.gastos_a_mano && <span className="block normal-case font-normal text-gray-500">gastos a mano</span>}
                        {!m.has_expenses && <span className="block normal-case font-normal text-gray-500">sin gastos</span>}
                      </th>
                    ))}
                    <th scope="col" className="text-right px-3 py-2 whitespace-nowrap bg-gray-50">Total</th>
                    <th scope="col" className="text-right px-3 py-2 whitespace-nowrap bg-gray-50">Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ROWS.filter(([key]) => key !== 'inventario_cambio_sin_ajuste' || months.some(m => m.inventario_cambio_sin_ajuste != null)).map(([key, label, est, type, level, formula]) => {
                    const total = INVENTORY_KEYS.includes(key) || key === 'ventas_vs_anio_anterior' ? null : t[key];
                    const average = avg[key];
                    const strong = level === 0;
                    return (
                      <tr key={key} className={key === 'lo_que_quedo' ? 'bg-emerald-50' : strong ? 'bg-gray-50' : ''}>
                        <th scope="row" className={`sticky left-0 z-10 text-left px-3 py-2 font-normal ${key === 'lo_que_quedo' ? 'bg-emerald-50' : strong ? 'bg-gray-50' : 'bg-white'}`}>
                          <span className={strong ? 'font-semibold text-gray-900' : 'text-gray-700'}>{label}</span>{est && <Est />}
                          {formula && <span className="block text-[10px] text-gray-500 max-w-[220px]">{formula}</span>}
                        </th>
                        {months.map(m => {
                          const v = m[key];
                          // Sin gastos registrados: «—» (no es que haya sido $0)
                          const missing = EXPENSE_KEYS.includes(key) && !m.has_expenses;
                          return (
                            <td key={m.period} title={missing ? 'Sin gastos registrados' : (key === 'inventario_cambio' && m.inventario_nota) || undefined}
                              className={`text-right px-3 py-2 whitespace-nowrap ${strong ? 'font-semibold' : ''} ${typeof v === 'number' && v < 0 && type === 'money' ? 'text-red-700' : 'text-gray-900'}`}>
                              {missing ? '—' : cell(type, v)}{key === 'inventario_cambio' && m.inventario_nota && <span className="text-amber-700" aria-label="Tiene una nota"> *</span>}
                            </td>
                          );
                        })}
                        <td className={`text-right px-3 py-2 whitespace-nowrap bg-gray-50 ${strong ? 'font-bold' : ''} ${typeof total === 'number' && total < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                          {total === undefined ? '' : cell(type, total)}
                        </td>
                        <td className="text-right px-3 py-2 whitespace-nowrap bg-gray-50 text-gray-700">
                          {average === undefined ? '' : cell(type, average)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default RadiografiaAnio;

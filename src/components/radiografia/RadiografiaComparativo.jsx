// Cuentas → Radiografía → Comparativo (Fase 5 de docs/PLAN_RADIOGRAFIA.md del backend).
// Las tiendas lado a lado con las mismas cifras de Mes y Flujo de caja, y "Las dos"
// sumadas: el préstamo entre las tiendas no aparece (se cancela). Solo para quien ve
// las dos tiendas (la pestaña se oculta si no).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getRadiografiaCompare } from '../../services/radiografiaService';
import { Est, Warnings } from './RadiografiaUI';
import { fmt, fmtDate, MONTHS, num, pct } from '../../utils/radiografiaFormat';

const get = (obj, path) => path.reduce((v, k) => (v == null ? v : v[k]), obj);

// [etiqueta, ruta, formato, estimado, nota]
const SECTIONS = [
  ['Resultado del mes', [
    ['Ventas netas', ['statement', 'ventas'], 'money'],
    ['Costo estimado de lo vendido', ['statement', 'costo_estimado'], 'money', true],
    ['Fletes', ['statement', 'fletes'], 'money'],
    ['Utilidad bruta', ['statement', 'utilidad_bruta'], 'money', true],
    ['Margen bruto', ['pct', 'utilidad_bruta'], 'pct', true],
    ['Gastos operativos', ['statement', 'gastos_operativos'], 'money', false, 'exp'],
    ['Gastos financieros', ['statement', 'gastos_financieros'], 'money', false, 'exp'],
    ['Utilidad neta', ['statement', 'utilidad_neta'], 'money', true, 'exp', true],
    ['Margen neto', ['pct', 'utilidad_neta'], 'pct', true, 'exp'],
    ['Cuotas de crédito (capital)', ['statement', 'cuotas'], 'money', false, 'exp'],
    ['Recompras', ['statement', 'recompras'], 'money'],
    ['Lo que quedó (como Cuentas → Año)', ['statement', 'lo_que_quedo'], 'money', false, 'exp', true],
  ]],
  ['Indicadores', [
    ['Transacciones', ['indicators', 'transacciones'], 'num'],
    ['Ticket promedio', ['indicators', 'ticket'], 'money'],
    ['Prendas vendidas', ['indicators', 'unidades'], 'num'],
    ['Descuentos', ['indicators', 'descuentos_pct'], 'pct'],
    ['Gastos ÷ ventas', ['indicators', 'gastos_ventas_pct'], 'pct', false, 'exp'],
    ['Nómina ÷ ventas', ['indicators', 'nomina_ventas_pct'], 'pct', false, 'exp'],
    ['Punto de equilibrio del mes', ['break_even', 'month'], 'money', true],
    ['Avance contra el punto de equilibrio', ['break_even', 'progress_pct'], 'pct', true],
  ]],
  ['La plata del mes (cuentas)', [
    ['Saldo al empezar', ['flow', 'initial'], 'money'],
    ['Entró', ['flow', 'entradas_total'], 'money'],
    ['Salió', ['flow', 'salidas_total'], 'money'],
    ['Saldo al terminar / hoy', ['flow', 'final'], 'money', false, null, true],
  ]],
  ['Hoy', [
    ['Plata en las cuentas', ['today', 'plata'], 'money', false, null, true],
    ['Lo que le deben (sin la otra tienda)', ['today', 'receivable_total'], 'money'],
    ['Lo que debe (sin la otra tienda)', ['today', 'payable_total'], 'money'],
    ['Avisos del mes (no se restan solos)', ['today', 'avisos_total'], 'money', true],
    ['Quedarían si se pagara todo', ['today', 'quedarian'], 'money', true, null, true],
  ]],
  ['Inventario (foto de fin de mes de Alegra)', [
    ['A precio de venta', ['inventory', 'valor_venta'], 'money'],
    ['A costo', ['inventory', 'valor_costo'], 'money', true],
  ]],
];

// Vista "Hoy" de una tienda sin la deuda entre tiendas, para que se lea igual que "Las dos"
const storeToday = (t) => {
  const avisos = t.withdraw.avisos.filter(a => a.key !== 'otra_tienda').reduce((s, a) => s + a.value, 0);
  return {
    plata: t.plata,
    receivable_total: t.receivable.filter(x => x.key !== 'otra_tienda').reduce((s, x) => s + x.value, 0),
    payable_total: t.payable.filter(x => x.key !== 'otra_tienda').reduce((s, x) => s + x.value, 0),
    avisos_total: avisos,
    quedarian: t.plata - avisos,
  };
};

const show = (col, [, path, kind, , needs]) => {
  if (col.future && path[0] !== 'today' && path[0] !== 'inventory') return '—';
  if (needs === 'exp' && !col.has_expenses) return 'sin gastos';
  const v = get(col, path);
  if (kind === 'pct') return pct(v);
  if (kind === 'num') return num(v);
  return fmt(v);
};

const RadiografiaComparativo = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lastRequest = useRef(0);
  const load = useCallback(async () => {
    const id = ++lastRequest.current;
    setLoading(true);
    setError('');
    try {
      const res = await getRadiografiaCompare({ year, month });
      if (id === lastRequest.current) setData(res.compare);
    } catch (e) {
      if (id === lastRequest.current) setError(e.message);
    } finally {
      if (id === lastRequest.current) setLoading(false);
    }
  }, [year, month]);
  useEffect(() => { load(); }, [load]);

  const isFirst = year === 2026 && month === 1;
  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
  const prev = () => { if (isFirst) return; if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (isCurrent) return; if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cols = data ? [
    ...data.stores.map(s => ({ ...s, today: storeToday(s.today) })),
    { ...data.consolidated, consolidated: true },
  ] : [];
  const warnings = data ? [...new Set(data.stores.flatMap(s => (s.warnings || [])
    .filter(w => !/caja del día/.test(w)).map(w => `${s.name}: ${w}`)))] : [];
  const debt = data?.consolidated?.today?.inter_store_debt;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Comparativo de las tiendas</h2>
          <p className="text-xs text-gray-500">Las mismas cifras de Mes y Flujo de caja, una tienda al lado de la otra, y las dos sumadas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Mes anterior" onClick={prev} disabled={isFirst} className="p-2 rounded-lg border border-gray-300 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="min-w-[130px] text-center font-semibold text-gray-800">{MONTHS[month - 1]} {year}</span>
          <button type="button" aria-label="Mes siguiente" onClick={next} disabled={isCurrent} className="p-2 rounded-lg border border-gray-300 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          <button type="button" aria-label="Actualizar" onClick={load} className="p-2 rounded-lg border border-gray-300"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && !data && <p className="text-sm text-gray-500">Cargando las dos tiendas…</p>}

      {data && (
        <>
          <Warnings items={warnings} />
          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-gray-500 uppercase tracking-wide">
                    <th scope="col" className="sticky left-0 z-10 bg-white text-left px-3 py-2 min-w-[170px]">{MONTHS[month - 1]} {year}</th>
                    {cols.map(c => (
                      <th key={c.store || 'both'} scope="col" className={`text-right px-3 py-2 min-w-[120px] ${c.consolidated ? 'bg-gray-50 text-gray-800' : ''}`}>{c.name.replace('KOAJ ', '')}</th>
                    ))}
                  </tr>
                </thead>
                {SECTIONS.map(([title, rows]) => (
                  <tbody key={title} className="divide-y divide-gray-100 border-t border-gray-200">
                    <tr>
                      <th scope="colgroup" colSpan={cols.length + 1} className="sticky left-0 bg-white text-left px-3 pt-3 pb-1 text-[11px] font-bold text-gray-700 uppercase tracking-wide">{title}</th>
                    </tr>
                    {rows.map(row => {
                      const [label, , , estimated, , strong] = row;
                      return (
                        <tr key={label}>
                          <th scope="row" className={`sticky left-0 z-10 bg-white text-left px-3 py-2 font-normal ${strong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {label}{estimated && <Est />}
                          </th>
                          {cols.map(c => {
                            const v = get(c, row[1]);
                            return (
                              <td key={c.store || 'both'} className={`text-right px-3 py-2 whitespace-nowrap ${c.consolidated ? 'bg-gray-50' : ''} ${strong ? 'font-semibold' : ''} ${typeof v === 'number' && v < 0 && row[2] === 'money' ? 'text-red-700' : ''}`}>
                                {show(c, row)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
          </section>
          <ul className="text-[11px] text-gray-500 space-y-0.5">
            {debt > 0 && <li>Préstamo entre las tiendas hoy: {fmt(debt)}. No aparece en "Las dos" ni en lo que le deben o debe cada una arriba (se ve en Flujo de caja de cada tienda).</li>}
            {data.consolidated.inventory && <li>Inventario: foto de Alegra al {fmtDate(data.consolidated.inventory.as_of)}/{data.consolidated.inventory.as_of.slice(0, 4)} o la más reciente de cada tienda; el detalle por prenda está en Inventario.</li>}
            {data.notes.filter(n => !/Inventario/.test(n)).map(n => <li key={n}>{n}</li>)}
          </ul>
        </>
      )}
    </div>
  );
};

export default RadiografiaComparativo;

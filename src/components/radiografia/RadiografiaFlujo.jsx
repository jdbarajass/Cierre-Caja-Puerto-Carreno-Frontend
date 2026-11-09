// Cuentas → Radiografía → Flujo de caja (Fase 4 de docs/PLAN_RADIOGRAFIA.md del backend).
// Hoy: cuánto se puede retirar (la plata de hoy; los avisos van aparte y NO se restan
// solos), lo que le deben a la tienda y lo que debe. Del mes elegido: cómo se movió
// la plata en las cuentas y en qué se diferencia de la utilidad.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getRadiografiaCashFlow } from '../../services/radiografiaService';
import { Est, Tile, Warnings } from './RadiografiaUI';
import { fmt, fmtDate, MONTHS } from '../../utils/radiografiaFormat';
import ExportButtons from './ExportButtons';

const MEDIO = { ahorro: 'Datáfono débito', credito: 'Datáfono crédito', addi: 'Addi', bold: 'Bold' };

const Line = ({ label, value, strong, note, tone }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5">
    <div className="min-w-0">
      <span className={`text-sm ${strong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{label}</span>
      {note && <p className="text-[11px] text-gray-500">{note}</p>}
    </div>
    <span className={`text-sm whitespace-nowrap ${strong ? 'font-bold text-gray-900' : ''} ${tone === 'bad' ? 'text-red-700' : tone === 'good' ? 'text-emerald-700' : ''}`}>{value}</span>
  </div>
);

// Línea con detalle desplegable (nativo: teclado y lector de pantalla sin trabajo extra)
const Expandable = ({ label, value, note, children, estimated }) => (
  <details className="group border-b border-gray-100 last:border-0">
    <summary className="flex items-baseline justify-between gap-3 py-2 cursor-pointer list-none">
      <div className="min-w-0">
        <span className="text-sm text-gray-800"><span className="inline-block w-3 text-gray-400 group-open:rotate-90 transition-transform">›</span> {label}{estimated && <Est />}</span>
        {note && <p className="text-[11px] text-gray-500 pl-3">{note}</p>}
      </div>
      <span className="text-sm font-semibold whitespace-nowrap">{value}</span>
    </summary>
    <div className="pl-4 pb-2 text-xs text-gray-600 space-y-0.5">{children}</div>
  </details>
);

const Row = ({ left, right }) => (
  <div className="flex justify-between gap-3"><span className="min-w-0 truncate" title={typeof left === 'string' ? left : undefined}>{left}</span><span className="whitespace-nowrap">{right}</span></div>
);

const AvisoItems = ({ a }) => {
  if (a.key === 'fijos') return a.items.map(f => <Row key={f.id} left={`${f.name} (día ${f.due_day})`} right={fmt(f.value)} />);
  if (a.key === 'cuotas') return a.items.map((c, i) => (
    <Row key={i} left={`${c.group} · ${c.name} (desde el ${c.due_day})`} right={c.value ? fmt(c.value) : 'cuota libre, sin valor'} />));
  if (a.formula) return <p>{a.formula}.</p>;
  return <p>Saldo de la deuda hoy.</p>;
};

const DebtList = ({ title, rows, total, empty }) => {
  const shown = rows.filter(r => r.value >= 1);
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="font-bold text-gray-900">{fmt(total)}</span>
      </div>
      {shown.length === 0 ? <p className="text-sm text-gray-500">{empty}</p> : shown.map(r => (
        r.items?.length ? (
          <Expandable key={r.key} label={r.label} value={fmt(r.value)} note={r.note}>
            {r.items.map((i, k) => (
              <Row key={k}
                left={i.date ? `Llega el ${fmtDate(i.date)} · ${MEDIO[i.medio] || i.medio}` : i.name}
                right={fmt(i.value ?? i.balance)} />
            ))}
          </Expandable>
        ) : <Line key={r.key} label={r.label} value={fmt(r.value)} note={r.note} />
      ))}
    </section>
  );
};

const RadiografiaFlujo = () => {
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
      const res = await getRadiografiaCashFlow({ year, month });
      if (id === lastRequest.current) setData(res.cash_flow);
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

  const t = data?.today;
  const w = t?.withdraw;
  const f = data?.flow;
  const b = data?.bridge;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Flujo de caja</h2>
          <p className="text-xs text-gray-500">La plata real de las cuentas. Solo se resta lo que se registró a mano.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap"><ExportButtons url={`/api/radiografia/cash-flow?year=${year}&month=${month}`} view="flujo" period={`${year}-${String(month).padStart(2, '0')}`} /><button type="button" aria-label="Actualizar" onClick={load} className="p-2 rounded-lg border border-gray-300"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && !data && <p className="text-sm text-gray-500">Cargando…</p>}

      {t && (
        <>
          {/* ── Hoy: cuánto se puede retirar ── */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h3 className="font-semibold text-gray-900">¿Cuánto se puede retirar hoy?<Est /></h3>
              <span className="text-[11px] text-gray-500">Al {fmtDate(t.date)}/{t.date.slice(0, 4)}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Plata en las cuentas hoy</p>
                <p className="text-3xl font-bold text-gray-900">{fmt(w.plata_hoy)}</p>
                <Expandable label="Por cuenta" value={`${t.accounts.length} cuentas`}>
                  {t.accounts.map(a => <Row key={a.account_id} left={a.note ? `${a.name} (${a.note.toLowerCase()})` : a.name} right={fmt(a.available)} />)}
                </Expandable>
                {w.retiros_mes > 0 && <p className="text-xs text-gray-600 mt-2">Ganancias de socios ya sacadas este mes: <b>{fmt(w.retiros_mes)}</b></p>}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Avisos: lo que falta pagar este mes (no se resta solo)</p>
                {w.avisos.length === 0 ? <p className="text-sm text-gray-500 py-2">Nada pendiente.</p> : w.avisos.map(a => (
                  <Expandable key={a.key} label={a.label} estimated={a.estimated}
                    value={a.value < 1 && a.items?.length ? 'sin valor fijo' : fmt(a.value)}>
                    <AvisoItems a={a} />
                  </Expandable>
                ))}
                <div className="mt-3 rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-amber-900">Quedarían si se pagara todo</span>
                    <span className={`text-xl font-bold ${w.quedarian < 0 ? 'text-red-700' : 'text-amber-900'}`}>{fmt(w.quedarian)}</span>
                  </div>
                  <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Valor aproximado, de referencia</p>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-3">{w.formula}</p>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <DebtList title="Lo que le deben a la tienda" rows={t.receivable} total={t.receivable_total} empty="Nadie le debe a la tienda." />
            <DebtList title="Lo que debe la tienda" rows={t.payable} total={t.payable_total} empty="La tienda no tiene deudas registradas." />
          </div>

          {/* ── La plata del mes ── */}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
            <h3 className="text-lg font-bold text-gray-900">La plata del mes</h3>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Mes anterior" onClick={prev} disabled={isFirst} className="p-2 rounded-lg border border-gray-300 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <span className="min-w-[130px] text-center font-semibold text-gray-800">{MONTHS[month - 1]} {year}</span>
              <button type="button" aria-label="Mes siguiente" onClick={next} disabled={isCurrent} className="p-2 rounded-lg border border-gray-300 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          {data.future ? <p className="text-sm text-gray-500">Ese mes todavía no empieza.</p> : (
            <>
              <Warnings items={data.warnings} />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Tile label="Saldo al empezar" value={fmt(f.initial)} />
                <Tile label="Entró" value={fmt(f.entradas_total)} />
                <Tile label="Salió" value={fmt(f.salidas_total)} />
                <Tile label={data.in_progress ? 'Saldo hoy' : 'Saldo al terminar'} value={fmt(f.final)}
                  tone={f.change < 0 ? 'bad' : 'default'} sub={`Cambio en el mes: ${fmt(f.change)}`} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Lo que entró</h3>
                  {f.entradas.length === 0 ? <p className="text-sm text-gray-500">Nada.</p>
                    : f.entradas.map(e => <Line key={e.key} label={e.label} value={fmt(e.total)} />)}
                  <Line label="Total" value={fmt(f.entradas_total)} strong />
                  {(f.ajustes !== 0 || f.traslados.bruto > 0) && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      {f.ajustes !== 0 && <Line label="Ajustes a mano (igualar al banco)" value={fmt(f.ajustes)} />}
                      {f.traslados.bruto > 0 && <Line label="Traslados entre cuentas propias" value={fmt(f.traslados.bruto)}
                        note="No cuentan: la plata solo cambió de cuenta." />}
                    </div>
                  )}
                </section>
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Lo que salió</h3>
                  {f.salidas.length === 0 ? <p className="text-sm text-gray-500">Nada.</p> : f.salidas.map(s => (
                    <Expandable key={s.key} label={s.label} value={fmt(s.total)}
                      note={s.reduces_utility ? 'Baja la utilidad' : 'No baja la utilidad'}>
                      {s.items.length === 0 ? <p>{s.key === 'recompras' ? 'Envíos de Cuentas Recompras (con su 4x1000).' : 'Sin detalle.'}</p> : s.items.map(i => (
                        <Row key={`${i.id}-${i.caja}`} left={`${fmtDate(i.date)} · ${i.concept}${i.caja ? ' (caja del día)' : ''}${i.interest ? ` (sin el interés de ${fmt(i.interest)})` : ''}`} right={fmt(i.amount)} />
                      ))}
                    </Expandable>
                  ))}
                  <Line label="Total" value={fmt(f.salidas_total)} strong />
                </section>
              </div>

              <section className="rounded-xl border border-gray-200 bg-white">
                <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Por cuenta</h3></div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-[11px] text-gray-500 uppercase tracking-wide">
                        <th scope="col" className="sticky left-0 z-10 bg-white text-left px-3 py-2 min-w-[140px]">Cuenta</th>
                        <th scope="col" className="text-right px-3 py-2">Al empezar</th>
                        <th scope="col" className="text-right px-3 py-2">{data.in_progress ? 'Hoy' : 'Al terminar'}</th>
                        <th scope="col" className="text-right px-3 py-2">Cambio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {f.accounts.map(a => (
                        <tr key={a.account_id}>
                          <th scope="row" className="sticky left-0 z-10 bg-white text-left px-3 py-2 font-normal text-gray-800">{a.name}</th>
                          <td className="text-right px-3 py-2 whitespace-nowrap">{fmt(a.initial)}</td>
                          <td className="text-right px-3 py-2 whitespace-nowrap">{fmt(a.final)}</td>
                          <td className={`text-right px-3 py-2 whitespace-nowrap ${a.change < 0 ? 'text-red-700' : ''}`}>{fmt(a.change)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="font-semibold text-gray-900">Utilidad contra plata</h3>
                {!b ? <p className="text-sm text-gray-500 mt-1">Sin gastos registrados en este mes: no hay utilidad con qué comparar.</p> : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
                      <Tile label="Utilidad neta del mes" estimated value={fmt(b.utilidad_neta)} tone={b.utilidad_neta < 0 ? 'bad' : 'default'}
                        sub="Ventas − costo estimado − gastos del mes (pestaña Mes)" />
                      <Tile label="Cambio en la plata de las cuentas" value={fmt(b.cambio_plata)} tone={b.cambio_plata < 0 ? 'bad' : 'default'}
                        sub="Saldo al terminar − saldo al empezar" />
                    </div>
                    <p className="text-[11px] text-gray-500 mb-1">Por qué no son iguales (cada línea suma o resta a la utilidad hasta llegar a la plata):</p>
                    <Line label="Utilidad neta" value={fmt(b.utilidad_neta)} strong />
                    {b.lines.map(l => <Line key={l.key} label={l.label} value={`${l.value >= 0 ? '+' : ''}${fmt(l.value)}`} />)}
                    <Line label="= Cambio en la plata" value={fmt(b.cambio_plata)} strong />
                  </>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default RadiografiaFlujo;

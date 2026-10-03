import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useAuth } from '../contexts/AuthContext';
import { getSalesPatterns } from '../services/salesPatternsService';
import { getColombiaTodayString } from '../utils/dateUtils';
import { storeDisplayName } from '../utils/activeStore';
import { addDays, buildPresets, daysBetween, longDate } from '../utils/statsDates';
import { Card, Notice, PeriodFilter, StatTile } from '../components/stats/StatsUI';
import InvoiceFactsPanel from '../components/customers/InvoiceFactsPanel';

/**
 * Estadísticas → Día y hora (solo admin, por tienda). Fase D2 de
 * docs/PLAN_ESTADISTICAS.md del backend: venta promedio por día de la semana,
 * por hora y mapa de calor día × hora, total o de una vendedora. Solo días
 * cerrados (hoy va a medias y bajaría los promedios).
 *
 * Mapa de calor: un solo tono (tinta), 5 pasos de claro a oscuro validados
 * con el validador de dataviz (--ordinal, light: todos pasan). Celdas sin
 * ventas en gris. El valor exacto sale al pasar el mouse o con el teclado.
 */
const RAMP = ['#9EA9F0', '#6F7DE4', '#4A58D6', '#2A34A0', '#222A66'];
const EMPTY = '#F3F4F6';
const BAR = '#4A58D6';
const MAX_DAYS = 366;

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
const formatInt = (value) => (value || 0).toLocaleString('es-CO');
const formatDec = (value) => (value || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 });
const formatPct = (value) => `${(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
const titleCase = (name) => (name || '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const hourLabel = (h) => (h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`);

const SalesPatterns = () => {
  useDocumentTitle('Día y hora');
  const { activeStore } = useAuth();
  const storeName = storeDisplayName(activeStore);

  const today = getColombiaTodayString();
  const yesterday = addDays(today, -1);
  // Solo días cerrados: los periodos rápidos terminan ayer
  // (el día 1 del mes "Este mes" quedaría vacío: se oculta)
  const presets = useMemo(() => buildPresets(today)
    .map((p) => ({ ...p, end: p.end === today ? yesterday : p.end }))
    .filter((p) => p.start <= p.end), [today, yesterday]);
  const defaultPreset = presets.find((p) => p.id === 'last-90');
  const [range, setRange] = useState({ start: defaultPreset.start, end: defaultPreset.end, preset: 'last-90' });
  const [draft, setDraft] = useState({ start: defaultPreset.start, end: defaultPreset.end });
  const [sellerId, setSellerId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const requestId = useRef(0);
  const load = useCallback(async (start, end, seller) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getSalesPatterns(start, end, seller);
      if (id === requestId.current) setResult(data);
    } catch (e) {
      if (id === requestId.current) setError(e);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(range.start, range.end, sellerId); }, [range, sellerId, load]);

  const draftDays = draft.start && draft.end ? daysBetween(draft.start, draft.end) : 0;
  const draftError = !draft.start || !draft.end
    ? 'Elige ambas fechas'
    : draftDays < 1 ? 'La fecha inicial debe ser anterior a la final'
      : draftDays > MAX_DAYS ? 'Máximo 1 año' : null;

  const data = result?.data;
  const best = data && data.total_sales > 0
    ? [...data.weekdays].sort((a, b) => b.avg_sales_per_day - a.avg_sales_per_day)[0] : null;
  const bestHour = data && data.hours.length ? [...data.hours].sort((a, b) => b.sales - a.sales)[0] : null;
  const avgDay = data && data.coverage.loaded_days ? Math.round(data.total_sales / data.coverage.loaded_days) : 0;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-gray-500">Estadísticas</p>
        <h1 className="mt-1 text-[2rem] sm:text-4xl font-bold text-gray-900 leading-[1.05]">Día y hora</h1>
        <p className="mt-2 text-sm text-gray-600 max-w-2xl">
          Qué días y a qué horas vende más KOAJ {storeName}, en promedio. Sirve para organizar turnos y
          descansos. Cuenta solo días ya cerrados (hasta ayer).
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <PeriodFilter
          presets={presets} range={range} setRange={setRange}
          draft={draft} setDraft={setDraft} draftError={draftError} loading={loading} today={yesterday}
        />
        <label className="text-xs text-gray-500">
          <span className="block mb-1">Vendedora</span>
          <select value={sellerId} onChange={(e) => setSellerId(e.target.value)}
            className="h-10 px-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white">
            <option value="">Toda la tienda</option>
            {(data?.sellers || []).map((s) => <option key={s.id} value={s.id}>{titleCase(s.name)}</option>)}
          </select>
        </label>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> {error.message}
        </div>
      )}

      {!result && loading && (
        <div className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-gray-900/5 px-5 py-10 text-sm text-gray-600" role="status">
          <Loader2 className="w-5 h-5 animate-spin" /> Calculando…
        </div>
      )}

      {data && (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`} aria-busy={loading}>
          <p className="text-sm text-gray-500">
            Periodo: <span className="font-medium text-gray-800">{longDate(data.date_range.start)} – {longDate(data.date_range.end)}</span>
            {' '}· {formatInt(data.coverage.loaded_days)} días con datos
          </p>

          {!data.coverage.complete && (
            <Notice>
              {formatInt(data.coverage.missing_days)} días del periodo todavía no tienen la hora de sus facturas (desde el{' '}
              {longDate(data.coverage.first_missing_day)}) y no se cuentan: los promedios usan solo los días listos. Se completan
              solos cada noche o con los botones de "Prendas guardadas", abajo.
            </Notice>
          )}

          {data.coverage.loaded_days === 0 ? (
            <Notice>Todavía no hay días con hora en este periodo.</Notice>
          ) : (<>
            <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
              <StatTile label="Venta promedio por día" value={formatCOP(avgDay)} detail={`${formatInt(data.total_invoices)} facturas en el periodo`} />
              <StatTile label="Mejor día" value={best ? best.name : '—'} detail={best ? `${formatCOP(best.avg_sales_per_day)} en promedio` : ''} />
              <StatTile label="Mejor hora" value={bestHour ? hourLabel(bestHour.hour) : '—'} detail={bestHour ? `${formatPct(bestHour.share_pct)} de la venta` : ''} />
              <StatTile label="Facturas por día" value={formatDec(data.total_invoices / data.coverage.loaded_days)} detail="Promedio" />
            </div>

            <Card title="Mapa de calor: día × hora"
              subtitle="Venta promedio de cada día de la semana en cada hora. Más oscuro = más venta. Pasa el mouse (o usa el teclado) para ver la cifra.">
              <Heatmap heatmap={data.heatmap} />
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Por día de la semana" subtitle="Promedio por día: cada día de la semana se divide por cuántas veces apareció en el periodo.">
                <WeekdayTable weekdays={data.weekdays} />
              </Card>
              <Card title="Por hora" subtitle="Parte de la venta del periodo que se hizo en cada hora.">
                <HourBars hours={data.hours} />
              </Card>
            </div>

            {data.without_hour.invoices > 0 && (
              <p className="text-xs text-gray-500">
                {formatInt(data.without_hour.invoices)} facturas ({formatCOP(data.without_hour.sales)}) no traen hora en Alegra: cuentan
                por día de la semana, pero no en el mapa ni por hora.
              </p>
            )}
          </>)}
        </div>
      )}

      <InvoiceFactsPanel variant="prendas" />
    </div>
  );
};

const binOf = (value, max) => {
  if (!value || !max) return -1;
  return Math.min(RAMP.length - 1, Math.floor((value / max) * RAMP.length));
};

const Heatmap = ({ heatmap }) => {
  const [hovered, setHovered] = useState(null);
  const hours = heatmap[0]?.cells.map((c) => c.hour) || [];
  const max = Math.max(0, ...heatmap.flatMap((row) => row.cells.map((c) => c.avg_sales)));
  if (!hours.length) return <p className="text-sm text-gray-500">No hay ventas con hora en este periodo.</p>;

  return (
    <div>
      <p className="min-h-[1.5rem] text-sm text-gray-800 mb-2" aria-live="polite">
        {hovered
          ? <><span className="font-semibold">{hovered.day}, {hourLabel(hovered.hour)}</span>: {formatCOP(hovered.avg_sales)} en promedio · {formatDec(hovered.avg_invoices)} facturas</>
          : <span className="text-gray-500">Elige una celda para ver la cifra.</span>}
      </p>
      <div className="overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: 2 }}>
          <caption className="sr-only">Venta promedio por día de la semana y hora</caption>
          <thead>
            <tr>
              <th scope="col" className="sr-only">Día</th>
              {hours.map((h) => (
                <th key={h} scope="col" className="px-0.5 pb-1 text-[11px] font-medium text-gray-500 whitespace-nowrap">{hourLabel(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.map((row) => (
              <tr key={row.weekday}>
                <th scope="row" className="pr-2 text-left text-xs font-medium text-gray-700 whitespace-nowrap">{row.name.slice(0, 3)}</th>
                {row.cells.map((c) => {
                  const bin = binOf(c.avg_sales, max);
                  const label = `${row.name}, ${hourLabel(c.hour)}: ${formatCOP(c.avg_sales)} en promedio`;
                  const info = { day: row.name, ...c };
                  return (
                    <td key={c.hour} className="p-0">
                      <button type="button" aria-label={label} title={label}
                        onMouseEnter={() => setHovered(info)} onFocus={() => setHovered(info)}
                        onMouseLeave={() => setHovered(null)} onBlur={() => setHovered(null)}
                        className="block w-9 h-8 sm:w-11 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-1"
                        style={{ backgroundColor: bin < 0 ? EMPTY : RAMP[bin] }} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-600" aria-hidden="true">
        <span>Sin ventas</span>
        <span className="w-4 h-3 rounded-[3px]" style={{ backgroundColor: EMPTY }} />
        <span className="ml-2">Menos</span>
        {RAMP.map((c) => <span key={c} className="w-4 h-3 rounded-[3px]" style={{ backgroundColor: c }} />)}
        <span>Más ({formatCOP(max)})</span>
      </div>
    </div>
  );
};

const Th = ({ children, right }) => (
  <th scope="col" className={`py-2 px-2 text-xs font-medium uppercase tracking-wider text-gray-500 ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);
const Td = ({ children, right, strong }) => (
  <td className={`py-2 px-2 tabular-nums ${right ? 'text-right' : ''} ${strong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{children}</td>
);

const WeekdayTable = ({ weekdays }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">
      <thead className="border-b border-gray-200">
        <tr><Th>Día</Th><Th right>Días</Th><Th right>Venta promedio</Th><Th right>Facturas promedio</Th></tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {weekdays.map((d) => (
          <tr key={d.weekday}>
            <Td strong>{d.name}</Td>
            <Td right>{formatInt(d.days)}</Td>
            <Td right strong>{formatCOP(d.avg_sales_per_day)}</Td>
            <Td right>{formatDec(d.avg_invoices_per_day)}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const HourBars = ({ hours }) => {
  if (!hours.length) return <p className="text-sm text-gray-500">No hay ventas con hora en este periodo.</p>;
  const max = Math.max(...hours.map((h) => h.share_pct), 1);
  return (
    <ul className="space-y-1.5">
      {hours.map((h) => (
        <li key={h.hour} className="grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-2 text-sm"
          title={`${hourLabel(h.hour)}: ${formatCOP(h.sales)} · ${formatInt(h.invoices)} facturas`}>
          <span className="text-gray-700">{hourLabel(h.hour)}</span>
          <span className="relative h-2.5 rounded-[4px] bg-gray-100" role="img"
            aria-label={`${hourLabel(h.hour)}: ${formatPct(h.share_pct)} de la venta`}>
            <span className="absolute inset-y-0 left-0 rounded-[4px]" style={{ width: `${(h.share_pct * 100) / max}%`, backgroundColor: BAR }} />
          </span>
          <span className="text-right text-xs text-gray-700 tabular-nums">{formatPct(h.share_pct)}</span>
        </li>
      ))}
    </ul>
  );
};

export default SalesPatterns;

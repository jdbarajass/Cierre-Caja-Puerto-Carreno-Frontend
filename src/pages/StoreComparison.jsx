import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Table2, LineChart } from 'lucide-react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { getStoreComparison } from '../services/storesService';
import { getColombiaTodayString } from '../utils/dateUtils';
import { storeDisplayName } from '../utils/activeStore';

/**
 * Comparativo de tiendas (multi-tienda, solo admin): ventas de Alegra y
 * operación de KOAJ Carreño vs KOAJ Primavera en el mismo rango.
 *
 * Colores categóricos fijos POR TIENDA (nunca por ranking), validados con el
 * validador de paletas (CVD ΔE ≥ 28, contraste ≥ 3:1 sobre la superficie):
 * tinta-500 para Carreño, naranja-600 para Primavera.
 */
const STORE_COLORS = { carreno: '#4A58D6', primavera: '#C2410C' };
const FALLBACK_COLORS = ['#4A58D6', '#C2410C'];
const MAX_DAYS = 92; // mismo límite que el backend

const PAYMENT_ORDER = ['cash', 'transfer', 'debit-card', 'credit-card'];

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);

// Formato compacto para ejes: $1,2 M / $850 mil
const formatCompact = (value) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000).toLocaleString('es-CO')} mil`;
  return `$${value}`;
};

// ── Fechas (strings YYYY-MM-DD, aritmética en UTC para no correrse de día) ──
const toUTC = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const toStr = (date) => date.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = toUTC(s); d.setUTCDate(d.getUTCDate() + n); return toStr(d); };
const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 86400000) + 1;
const daysLabel = (n) => `${n} ${n === 1 ? 'día' : 'días'}`;
const shortDate = (s) => { const [, m, d] = s.split('-'); return `${d}/${m}`; };
const longDate = (s) =>
  toUTC(s).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

const buildPresets = (today) => {
  const firstOfMonth = `${today.slice(0, 8)}01`;
  const lastMonthEnd = addDays(firstOfMonth, -1);
  return [
    { id: 'this-month', label: 'Este mes', start: firstOfMonth, end: today },
    { id: 'last-month', label: 'Mes anterior', start: `${lastMonthEnd.slice(0, 8)}01`, end: lastMonthEnd },
    { id: 'last-7', label: 'Últimos 7 días', start: addDays(today, -6), end: today },
    { id: 'last-30', label: 'Últimos 30 días', start: addDays(today, -29), end: today },
  ];
};

// Paso "limpio" del eje Y (1, 2, 5 × 10^n) para 4 divisiones: los ticks
// quedan en números redondos ($0, $1 M, $2 M...).
const Y_DIVISIONS = 4;
const niceStep = (maxValue) => {
  const raw = maxValue / Y_DIVISIONS;
  if (raw <= 0) return 1;
  const base = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].find((s) => s * base >= raw) * base;
};

const colorFor = (store, index) => STORE_COLORS[store.code] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];

// ─────────────────────────────────────────────────────────────────────────────

const StoreComparison = () => {
  useDocumentTitle('Comparativo de Tiendas');

  const today = getColombiaTodayString();
  const presets = useMemo(() => buildPresets(today), [today]);
  const [range, setRange] = useState({ start: presets[0].start, end: presets[0].end, preset: 'this-month' });
  const [draft, setDraft] = useState({ start: presets[0].start, end: presets[0].end });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (start, end) => {
    setLoading(true);
    setError(null);
    try {
      setData(await getStoreComparison(start, end));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range.start, range.end); }, [range, load]);

  const draftDays = draft.start && draft.end ? daysBetween(draft.start, draft.end) : 0;
  const draftError = !draft.start || !draft.end
    ? 'Elige ambas fechas'
    : draftDays < 1 ? 'La fecha inicial debe ser anterior a la final'
      : draftDays > MAX_DAYS ? `Máximo ${MAX_DAYS} días` : null;

  const stores = useMemo(
    () => (data?.stores || []).map((s, i) => ({ ...s, color: colorFor(s, i), label: storeDisplayName(s) })),
    [data]
  );
  const salesStores = stores.filter((s) => s.sales.available);
  const totalAll = salesStores.reduce((sum, s) => sum + s.sales.total, 0);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-gray-500">Estadísticas</p>
        <h1 className="mt-1 text-[2rem] sm:text-4xl font-bold text-gray-900 leading-[1.05]">Comparativo de tiendas</h1>
        <p className="mt-2 text-sm text-gray-600 max-w-2xl">
          Ventas (Alegra) y operación de cada tienda en el mismo periodo. Cada tienda conserva siempre su color.
        </p>
      </header>

      {/* Filtros: una sola fila, arriba de todo lo que afectan */}
      <section aria-label="Periodo" className="flex flex-wrap items-end gap-2">
        <div role="group" aria-label="Periodos rápidos" className="flex flex-wrap gap-1.5">
          {presets.map((p) => {
            const active = range.preset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => { setRange({ start: p.start, end: p.end, preset: p.id }); setDraft({ start: p.start, end: p.end }); }}
                aria-pressed={active}
                className={`h-10 px-3.5 rounded-full text-sm font-medium transition-colors ${
                  active ? 'bg-gray-900 text-white' : 'bg-white ring-1 ring-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <form
          className="flex flex-wrap items-end gap-2 sm:ml-2"
          onSubmit={(e) => { e.preventDefault(); if (!draftError) setRange({ ...draft, preset: null }); }}
        >
          <label className="text-xs text-gray-500">
            <span className="block mb-1">Desde</span>
            <input type="date" value={draft.start} max={today}
              onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
              className="h-10 px-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white" />
          </label>
          <label className="text-xs text-gray-500">
            <span className="block mb-1">Hasta</span>
            <input type="date" value={draft.end} max={today}
              onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
              className="h-10 px-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white" />
          </label>
          <button type="submit" disabled={!!draftError || loading}
            className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Consultar
          </button>
          {draftError && <p className="w-full text-xs text-red-700" role="alert">{draftError}</p>}
        </form>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {!data && loading && (
        <div className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-gray-900/5 px-5 py-10 text-sm text-gray-600" role="status">
          <Loader2 className="w-5 h-5 animate-spin" />
          Consultando las ventas de cada tienda en Alegra… puede tardar un poco en rangos largos.
        </div>
      )}

      {data && (
        // Al recargar se mantiene el render anterior atenuado (sin saltos)
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`} aria-busy={loading}>
          <p className="text-sm text-gray-500">
            Periodo: <span className="font-medium text-gray-800">{longDate(data.date_range.start)} – {longDate(data.date_range.end)}</span>
            {' '}<span data-testid="periodo-dias">({daysLabel(daysBetween(data.date_range.start, data.date_range.end))})</span>
          </p>

          {/* Tarjetas por tienda */}
          <div className="grid gap-4 md:grid-cols-2">
            {stores.map((store) => (
              <StoreSummaryCard key={store.code} store={store} share={totalAll ? store.sales.total / totalAll : null} />
            ))}
          </div>

          {salesStores.length > 0 && (
            <Card title="Ventas por día" subtitle="Total facturado en Alegra cada día (sin anuladas)">
              <DailySalesChart stores={salesStores} />
            </Card>
          )}

          {salesStores.length > 0 && (
            <Card title="Medios de pago" subtitle="Cómo pagaron los clientes en el periodo">
              <PaymentMethodsChart stores={salesStores} />
            </Card>
          )}

          <Card title="Operación" subtitle="Datos registrados en este sistema (no dependen de Alegra)">
            <OperationsTable stores={stores} />
          </Card>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const Card = ({ title, subtitle, children }) => (
  <section className="rounded-2xl bg-white ring-1 ring-gray-900/5 shadow-sm p-4 sm:p-6">
    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
    {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
    {children}
  </section>
);

const SeriesKey = ({ color, kind = 'line' }) => (
  <span
    aria-hidden="true"
    className={kind === 'line' ? 'inline-block w-4 h-[2px] rounded-full' : 'inline-block w-3 h-3 rounded-[3px]'}
    style={{ backgroundColor: color }}
  />
);

const StoreSummaryCard = ({ store, share }) => {
  const { sales } = store;
  return (
    <section className="rounded-2xl bg-white ring-1 ring-gray-900/5 shadow-sm p-5" aria-label={`Resumen KOAJ ${store.label}`}>
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="w-1 h-6 rounded-full" style={{ backgroundColor: store.color }} />
        <h2 className="text-base font-bold text-gray-900">KOAJ {store.label}</h2>
      </div>
      {sales.available ? (
        <>
          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-gray-500">Ventas del periodo</p>
          <p className="mt-1 text-3xl sm:text-4xl font-bold text-gray-900 tabular-nums">{formatCOP(sales.total)}</p>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Facturas</dt>
              <dd className="font-semibold text-gray-900 tabular-nums">{sales.invoices.toLocaleString('es-CO')}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Ticket promedio</dt>
              <dd className="font-semibold text-gray-900 tabular-nums">{formatCOP(sales.average_ticket)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Participación</dt>
              <dd className="font-semibold text-gray-900 tabular-nums">
                {share === null ? '—' : `${(share * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`}
              </dd>
            </div>
          </dl>
          {sales.voided_invoices > 0 && (
            <p className="mt-3 text-xs text-gray-500">{sales.voided_invoices} factura(s) anulada(s) no se cuentan.</p>
          )}
          {sales.failed_days?.length > 0 && (
            <p role="alert" className="mt-3 flex items-start gap-1.5 text-xs text-amber-900">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
              Incompleto: Alegra no entregó {sales.failed_days.length === 1 ? '1 día' : `${sales.failed_days.length} días`} ({sales.failed_days.join(', ')}).
            </p>
          )}
        </>
      ) : (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3 text-sm text-amber-900">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <p>Ventas no disponibles: {sales.error}</p>
        </div>
      )}
    </section>
  );
};

// ── Ventas por día: líneas (2 px) + crosshair, tooltip, teclado y tabla ─────

const CHART_HEIGHT = 260;
// En pantallas angostas no hay etiquetas directas al final de las líneas (la
// leyenda de arriba ya identifica cada tienda), así la gráfica usa todo el ancho.
const NARROW_WIDTH = 480;
const marginFor = (width) => ({ top: 12, right: width < NARROW_WIDTH ? 12 : 96, bottom: 28, left: 64 });

const DailySalesChart = ({ stores }) => {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [showTable]); // el contenedor se vuelve a crear al regresar de la vista de tabla

  const MARGIN = marginFor(width);
  const showEndLabels = width >= NARROW_WIDTH;

  const dates = stores[0].sales.daily.map((d) => d.date);
  const n = dates.length;
  const yStep = niceStep(Math.max(...stores.flatMap((s) => s.sales.daily.map((d) => d.total)), 0));
  const yMax = yStep * Y_DIVISIONS;
  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (i) => MARGIN.left + (n === 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const y = (v) => MARGIN.top + plotH - (v / yMax) * plotH;
  const yTicks = Array.from({ length: Y_DIVISIONS + 1 }, (_, i) => i * yStep);
  const xLabelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 70))));

  // Etiquetas directas al final de cada línea, separadas si se pisan
  const endLabels = stores
    .map((s) => ({ code: s.code, label: s.label, y: y(s.sales.daily[n - 1].total) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < endLabels.length; i += 1) {
    if (endLabels[i].y - endLabels[i - 1].y < 16) endLabels[i].y = endLabels[i - 1].y + 16;
  }

  const indexFromPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left - MARGIN.left;
    return Math.min(n - 1, Math.max(0, Math.round(n === 1 ? 0 : (px / plotW) * (n - 1))));
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setHover((h) => Math.min(n - 1, (h ?? -1) + 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setHover((h) => Math.max(0, (h ?? n) - 1)); }
    if (e.key === 'Escape') setHover(null);
  };

  const tooltipLeft = hover === null ? 0 : Math.min(Math.max(x(hover) + 12, 8), width - 232);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <ul className="flex flex-wrap gap-4 text-sm text-gray-700" aria-label="Leyenda">
          {stores.map((s) => (
            <li key={s.code} className="flex items-center gap-2"><SeriesKey color={s.color} /> KOAJ {s.label}</li>
          ))}
        </ul>
        <button
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          className="h-9 px-3 rounded-full text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 inline-flex items-center gap-1.5"
        >
          {showTable ? <><LineChart className="w-4 h-4" /> Ver gráfico</> : <><Table2 className="w-4 h-4" /> Ver tabla</>}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">Día</th>
                {stores.map((s) => <th key={s.code} className="py-2 pr-4 font-medium text-right">KOAJ {s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {dates.map((d, i) => (
                <tr key={d} className="border-b border-gray-100">
                  <td className="py-1.5 pr-4 text-gray-700">{longDate(d)}</td>
                  {stores.map((s) => (
                    <td key={s.code} className="py-1.5 pr-4 text-right tabular-nums text-gray-900">{formatCOP(s.sales.daily[i].total)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={containerRef} className="relative">
          <svg width={width} height={CHART_HEIGHT} role="img"
            aria-label={`Ventas diarias por tienda del ${longDate(dates[0])} al ${longDate(dates[n - 1])}. Use la vista de tabla para ver todos los valores.`}>
            {/* Grilla y eje Y recesivos */}
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} stroke="#EFEFF1" strokeWidth="1" />
                <text x={MARGIN.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-gray-500" fontSize="11">
                  {formatCompact(t)}
                </text>
              </g>
            ))}
            {dates.map((d, i) => ((i % xLabelEvery === 0 && n - 1 - i >= xLabelEvery / 2) || i === n - 1) && (
              <text key={d} x={x(i)} y={CHART_HEIGHT - 8} className="fill-gray-500" fontSize="11"
                textAnchor={n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'}>
                {shortDate(d)}
              </text>
            ))}

            {hover !== null && (
              <line x1={x(hover)} x2={x(hover)} y1={MARGIN.top} y2={MARGIN.top + plotH} stroke="#9A9DA6" strokeWidth="1" />
            )}

            {stores.map((s) => (
              <path
                key={s.code}
                d={s.sales.daily.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.total)}`).join(' ')}
                fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              />
            ))}

            {/* Con pocos días una línea casi no se ve: se marcan todos los puntos */}
            {n <= 7 && stores.map((s) => s.sales.daily.map((p, i) => (
              <circle key={`${s.code}-${p.date}`} cx={x(i)} cy={y(p.total)} r="4"
                fill={s.color} stroke="#FFFFFF" strokeWidth="2" />
            )))}

            {/* Marcadores (8 px con anillo de 2 px) solo en el día señalado */}
            {hover !== null && stores.map((s) => (
              <circle key={s.code} cx={x(hover)} cy={y(s.sales.daily[hover].total)} r="5"
                fill={s.color} stroke="#FFFFFF" strokeWidth="2" />
            ))}

            {showEndLabels && endLabels.map((l) => (
              <text key={l.code} x={width - MARGIN.right + 8} y={l.y} dy="0.32em" fontSize="12" className="fill-gray-700 font-medium">
                {l.label}
              </text>
            ))}

            {/* Capa de interacción: el crosshair busca el día más cercano */}
            <rect
              x={MARGIN.left - 12} y={MARGIN.top} width={plotW + 24} height={plotH} fill="transparent"
              tabIndex={0}
              aria-label="Recorrer los días con las flechas izquierda y derecha"
              className="outline-none focus-visible:outline-none"
              onPointerMove={(e) => setHover(indexFromPointer(e))}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover((h) => h ?? n - 1)}
              onBlur={() => setHover(null)}
              onKeyDown={onKeyDown}
            />
          </svg>

          {hover !== null && (
            <div
              role="status"
              className="pointer-events-none absolute top-2 z-10 w-[224px] rounded-xl bg-white shadow-lg ring-1 ring-gray-900/10 px-3 py-2.5 text-sm"
              style={{ left: tooltipLeft }}
            >
              <p className="text-xs text-gray-500 mb-1.5">{longDate(dates[hover])}</p>
              {stores.map((s) => (
                <p key={s.code} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500"><SeriesKey color={s.color} />{s.label}</span>
                  <span className="font-semibold text-gray-900 tabular-nums">{formatCOP(s.sales.daily[hover].total)}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Medios de pago: barras horizontales agrupadas, valor junto a cada barra ─

const PaymentMethodsChart = ({ stores }) => {
  const methods = PAYMENT_ORDER.filter((key) => stores.some((s) => s.sales.payment_methods[key]));
  const max = Math.max(1, ...stores.flatMap((s) => methods.map((m) => s.sales.payment_methods[m]?.total || 0)));
  const [hovered, setHovered] = useState(null);

  return (
    <div>
      <ul className="flex flex-wrap gap-4 text-sm text-gray-700 mb-4" aria-label="Leyenda">
        {stores.map((s) => (
          <li key={s.code} className="flex items-center gap-2"><SeriesKey color={s.color} kind="box" /> KOAJ {s.label}</li>
        ))}
      </ul>
      <div className="space-y-4">
        {methods.map((m) => (
          <div key={m}>
            <p className="text-sm font-medium text-gray-800 mb-1.5">
              {stores[0].sales.payment_methods[m]?.label || m}
            </p>
            <div className="space-y-[2px]">
              {stores.map((s) => {
                const value = s.sales.payment_methods[m]?.total || 0;
                const key = `${m}-${s.code}`;
                const share = s.sales.total ? value / s.sales.total : 0;
                return (
                  <div
                    key={s.code}
                    className="flex items-center gap-2 h-5"
                    tabIndex={0}
                    aria-label={`${stores[0].sales.payment_methods[m]?.label || m}, KOAJ ${s.label}: ${formatCOP(value)}`}
                    onPointerEnter={() => setHovered(key)}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => setHovered(key)}
                    onBlur={() => setHovered(null)}
                  >
                    {/* La barra escala sobre el ancho menos el espacio de su etiqueta,
                        y el valor va pegado a su final */}
                    <div
                      className="h-3 flex-shrink-0 rounded-r-[4px] transition-opacity"
                      style={{
                        width: `calc((100% - 10.5rem) * ${value / max})`,
                        minWidth: value ? 2 : 0,
                        backgroundColor: s.color,
                        opacity: hovered && hovered !== key ? 0.45 : 1,
                      }}
                    />
                    <span className="whitespace-nowrap text-sm tabular-nums text-gray-900">
                      {formatCOP(value)}
                      <span className="ml-1.5 text-xs text-gray-500">
                        {(share * 100).toLocaleString('es-CO', { maximumFractionDigits: 0 })}%
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-500">El porcentaje es sobre las ventas de cada tienda.</p>
    </div>
  );
};

// ── Operación: tabla (tiendas en columnas) ──────────────────────────────────

const OPERATION_ROWS = [
  {
    label: 'Cierres registrados',
    value: (o) => `${o.closings_registered} de ${daysLabel(o.period_days)}`,
  },
  {
    label: 'Cierres con diferencia vs Alegra',
    value: (o) => `${o.closings_with_difference}`,
  },
  {
    label: 'Diferencia acumulada vs Alegra',
    value: (o) => formatCOP(o.alegra_difference_total),
  },
  {
    label: 'Enviado a recompras',
    value: (o) => formatCOP(o.repurchase_sent),
  },
  {
    label: 'Compras del socio (recompras)',
    value: (o) => formatCOP(o.repurchase_purchases),
  },
  {
    label: 'Saldo disponible en cuentas (hoy)',
    value: (o) => formatCOP(o.accounts_balance),
  },
];

const OperationsTable = ({ stores }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2 pr-4 font-medium">Indicador</th>
          {stores.map((s) => (
            <th key={s.code} className="py-2 pr-4 font-medium text-right">
              <span className="inline-flex items-center gap-2"><SeriesKey color={s.color} kind="box" /> {s.short_name}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {OPERATION_ROWS.map((row) => (
          <tr key={row.label} className="border-b border-gray-100">
            <td className="py-2.5 pr-4 text-gray-700">{row.label}</td>
            {stores.map((s) => (
              <td key={s.code} className="py-2.5 pr-4 text-right tabular-nums font-medium text-gray-900">
                {row.value(s.operations)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default StoreComparison;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, Clock, Loader2, MinusCircle, PackageX, TrendingDown } from 'lucide-react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useAuth } from '../contexts/AuthContext';
import { getGarmentsSummary, getGarmentsStock } from '../services/garmentsService';
import { getColombiaTodayString } from '../utils/dateUtils';
import { storeDisplayName } from '../utils/activeStore';
import { buildPresets, daysBetween, longDate } from '../utils/statsDates';
import { Card, Notice, PeriodFilter, StatTile } from '../components/stats/StatsUI';
import InvoiceFactsPanel from '../components/customers/InvoiceFactsPanel';

/**
 * Estadísticas → Prendas (solo admin, por tienda). Fase C de
 * docs/PLAN_ESTADISTICAS.md del backend:
 *   - Prendas por factura y precio promedio por prenda (total y por vendedora).
 *   - Más vendidos que están agotados o por agotarse.
 *   - Curva de tallas: % vendido vs. % en stock por talla.
 *   - Rotación: días de inventario por tipo de prenda.
 * La BOLSA PAPEL no cuenta en nada (decisión del usuario).
 *
 * Colores (validados con el validador de dataviz, light): vendido = tinta
 * #4A58D6, stock = #0E8A6E. Cada barra lleva su % escrito (codificación
 * secundaria: la separación tritán está en el mínimo).
 */
const SOLD = '#4A58D6';
const STOCK = '#0E8A6E';
const MAX_DAYS = 366; // mismo límite que el backend

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
const formatInt = (value) => (value || 0).toLocaleString('es-CO');
const formatDec = (value) => (value || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });
const formatPct = (value) => `${(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
const titleCase = (name) => (name || '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const Garments = () => {
  useDocumentTitle('Prendas');
  const { activeStore } = useAuth();
  const storeName = storeDisplayName(activeStore);

  const today = getColombiaTodayString();
  const presets = useMemo(() => buildPresets(today), [today]);
  const monthPreset = presets.find((p) => p.id === 'this-month');
  const [range, setRange] = useState({ start: monthPreset.start, end: monthPreset.end, preset: 'this-month' });
  const [draft, setDraft] = useState({ start: monthPreset.start, end: monthPreset.end });
  const [summary, setSummary] = useState(null);
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stockError, setStockError] = useState(null);

  // Solo la consulta más reciente escribe: la de stock tarda (la primera vez
  // ~1 min) y, si se cambia el periodo mientras tanto, no debe pisar la nueva.
  const requestId = useRef(0);
  const load = useCallback(async (start, end) => {
    const id = ++requestId.current;
    const isCurrent = () => id === requestId.current;
    setLoading(true);
    setStockLoading(true);
    setError(null);
    setStockError(null);
    try {
      const result = await getGarmentsSummary(start, end);
      if (isCurrent()) setSummary(result);
    } catch (e) {
      if (isCurrent()) setError(e);
    } finally {
      if (isCurrent()) setLoading(false);
    }
    try {
      const result = await getGarmentsStock(start, end);
      if (isCurrent()) setStock(result);
    } catch (e) {
      if (isCurrent()) setStockError(e);
    } finally {
      if (isCurrent()) setStockLoading(false);
    }
  }, []);

  useEffect(() => { load(range.start, range.end); }, [range, load]);

  const draftDays = draft.start && draft.end ? daysBetween(draft.start, draft.end) : 0;
  const draftError = !draft.start || !draft.end
    ? 'Elige ambas fechas'
    : draftDays < 1 ? 'La fecha inicial debe ser anterior a la final'
      : draftDays > MAX_DAYS ? 'Máximo 1 año' : null;

  const notConfigured = error?.code === 'alegra_not_configured';
  const data = summary?.data;
  const coverage = data?.coverage;
  const stockData = stock?.data;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-gray-500">Estadísticas</p>
        <h1 className="mt-1 text-[2rem] sm:text-4xl font-bold text-gray-900 leading-[1.05]">Prendas</h1>
        <p className="mt-2 text-sm text-gray-600 max-w-2xl">
          Qué se vende en KOAJ {storeName}, cuántas prendas lleva cada cliente, qué se está agotando y qué
          tallas faltan. No cuenta la bolsa de papel.
        </p>
      </header>

      {notConfigured ? (
        <Notice>{error.message}. Cuando se configure, este panel funciona igual que en las demás tiendas.</Notice>
      ) : (
        <>
          <PeriodFilter
            presets={presets} range={range} setRange={setRange}
            draft={draft} setDraft={setDraft} draftError={draftError} loading={loading} today={today}
          />

          {error && (
            <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> {error.message}
            </div>
          )}

          {!summary && loading && (
            <div className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-gray-900/5 px-5 py-10 text-sm text-gray-600" role="status">
              <Loader2 className="w-5 h-5 animate-spin" /> Calculando…
            </div>
          )}

          {data && (
            <div className={`space-y-6 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`} aria-busy={loading}>
              <p className="text-sm text-gray-500">
                Periodo: <span className="font-medium text-gray-800">{longDate(data.date_range.start)} – {longDate(data.date_range.end)}</span>
              </p>

              {coverage && !coverage.complete && (
                <Notice>
                  Faltan las prendas de {formatInt(coverage.missing_days)} de {formatInt(coverage.days)} días
                  (desde el {longDate(coverage.first_missing_day)}): las cifras cubren solo los días cargados y se
                  quedan cortas. Se completan solas cada noche o con el botón de abajo ("Prendas guardadas").
                </Notice>
              )}

              <Basket totals={data.totals} />

              <div className="grid gap-6 xl:grid-cols-2">
                <Card title="Por vendedora" subtitle="Prendas por factura y precio promedio de cada prenda vendida.">
                  <SellersTable sellers={data.sellers} />
                </Card>
                <Card title="Lo más vendido" subtitle="Tipos de prenda con más unidades en el periodo.">
                  <TopProducts products={data.top_products} />
                </Card>
              </div>

              <StockSection data={stockData} loading={stockLoading} error={stockError} />
            </div>
          )}

          <InvoiceFactsPanel variant="prendas" />
        </>
      )}
    </div>
  );
};

// ── C2: canasta ─────────────────────────────────────────────────────────────

const Basket = ({ totals }) => (
  <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
    <StatTile label="Prendas vendidas" value={formatInt(totals.units)} detail={`en ${formatInt(totals.invoices)} facturas`} />
    <StatTile label="Prendas por factura" value={formatDec(totals.units_per_invoice)} detail="Cuántas lleva cada cliente en promedio" />
    <StatTile label="Precio promedio por prenda" value={formatCOP(totals.avg_price_per_unit)} detail="Ya con descuentos" />
    <StatTile label="Venta en prendas" value={formatCOP(totals.revenue)} detail="Sin la bolsa de papel" />
  </div>
);

const Th = ({ children, right }) => (
  <th scope="col" className={`py-2 px-2 text-xs font-medium uppercase tracking-wider text-gray-500 ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);
const Td = ({ children, right, strong }) => (
  <td className={`py-2 px-2 tabular-nums ${right ? 'text-right' : ''} ${strong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{children}</td>
);

const SellersTable = ({ sellers }) => {
  if (!sellers.length) return <p className="text-sm text-gray-500">No hay prendas vendidas en este periodo.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-gray-200">
          <tr><Th>Vendedora</Th><Th right>Facturas</Th><Th right>Prendas</Th><Th right>Por factura</Th><Th right>Precio prom.</Th><Th right>Venta</Th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sellers.map((s) => (
            <tr key={s.id || 'sin'}>
              <Td strong>{titleCase(s.name)}</Td>
              <Td right>{formatInt(s.invoices)}</Td>
              <Td right>{formatInt(s.units)}</Td>
              <Td right strong>{formatDec(s.units_per_invoice)}</Td>
              <Td right>{formatCOP(s.avg_price_per_unit)}</Td>
              <Td right>{formatCOP(s.revenue)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TopProducts = ({ products }) => {
  if (!products.length) return <p className="text-sm text-gray-500">No hay prendas vendidas en este periodo.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-gray-200"><tr><Th>Prenda</Th><Th right>Unidades</Th><Th right>Venta</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {products.map((p) => (
            <tr key={p.product}><Td strong>{titleCase(p.product)}</Td><Td right>{formatInt(p.units)}</Td><Td right>{formatCOP(p.revenue)}</Td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── C3 y C4: cruce con el stock ─────────────────────────────────────────────

const StockSection = ({ data, loading, error }) => {
  if (loading && !data) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-white ring-1 ring-gray-900/5 px-5 py-8 text-sm text-gray-600" role="status">
        <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
        <p>Consultando el stock actual en Alegra para agotados, tallas y rotación… la primera vez puede tardar hasta 2 minutos.</p>
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> Agotados, tallas y rotación: {error.message}
      </div>
    );
  }
  if (!data) return null;
  return (
    <div className={`space-y-6 ${loading ? 'opacity-50' : ''}`}>
      <p className="text-sm text-gray-500">
        Stock actual en Alegra: {formatInt(data.stock_units)} prendas en {formatInt(data.stock_variants)} referencias (prenda + talla).
      </p>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Más vendidos agotados" subtitle="Lo que más se vendió en el periodo y hoy tiene 0 unidades: para pedir.">
          <VariantList rows={data.best_sellers.out_of_stock} empty="Ninguno de los más vendidos está agotado." />
        </Card>
        <Card title="Por agotarse" subtitle={`Más vendidos con ${data.best_sellers.low_stock_units} unidades o menos.`}>
          <VariantList rows={data.best_sellers.low_stock} empty="Ninguno de los más vendidos está por agotarse." />
        </Card>
      </div>
      <Card title="Curva de tallas: venta vs. stock"
        subtitle="De cada 100 prendas vendidas, cuántas fueron de cada talla, comparado con cómo está repartido el stock. Si una talla se vende más de lo que pesa en el stock, se acaba primero.">
        <SizeCurve groups={data.size_curve} />
      </Card>
      <Card title="Rotación por tipo de prenda"
        subtitle={`Días de inventario = stock actual ÷ venta diaria del periodo. Más de ${data.thresholds.slow_days} días: rotación lenta; menos de ${data.thresholds.fast_days}: se agota pronto.`}>
        <RotationTable rows={data.rotation} />
      </Card>
    </div>
  );
};

const VariantList = ({ rows, empty }) => {
  if (!rows.length) return <p className="text-sm text-gray-500">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-gray-200"><tr><Th>Prenda</Th><Th>Talla</Th><Th right>Vendidas</Th><Th right>Stock</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.item_id} title={r.name}>
              <Td strong>{titleCase(r.product)}</Td><Td>{r.size}</Td>
              <Td right>{formatInt(r.units)}</Td><Td right strong>{formatInt(r.stock)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Legend = () => (
  <ul className="flex flex-wrap gap-4 text-sm text-gray-700 mb-4" aria-label="Leyenda">
    <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: SOLD }} /> Vendido (% de las prendas vendidas)</li>
    <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: STOCK }} /> En stock (% del stock)</li>
  </ul>
);

const Bar = ({ pct, max, color, label }) => (
  <div className="flex items-center gap-2" title={label}>
    <div className="relative h-2.5 flex-1 rounded-[4px] bg-gray-100" role="img" aria-label={label}>
      <div className="absolute inset-y-0 left-0 rounded-[4px]" style={{ width: `${max ? (pct * 100) / max : 0}%`, backgroundColor: color }} />
    </div>
    <span className="w-14 text-right text-xs text-gray-700 tabular-nums">{formatPct(pct)}</span>
  </div>
);

const SizeCurve = ({ groups }) => {
  if (!groups.length) return <p className="text-sm text-gray-500">No hay prendas con talla vendidas en este periodo.</p>;
  return (
    <div>
      <Legend />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => {
          const max = Math.max(...g.sizes.flatMap((s) => [s.sold_pct, s.stock_pct]), 1);
          return (
            <section key={`${g.department}-${g.family}`} aria-label={`${titleCase(g.department)}, tallas en ${g.family.toLowerCase()}`}>
              <h3 className="text-sm font-semibold text-gray-900">{titleCase(g.department)} · {g.family.toLowerCase()}</h3>
              <p className="text-xs text-gray-500 mb-2">{formatInt(g.sold_units)} vendidas · {formatInt(g.stock_units)} en stock</p>
              <ul className="space-y-2">
                {g.sizes.map((s) => (
                  <li key={s.size} className="grid grid-cols-[2.5rem_1fr] items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{s.size}</span>
                    <div className="space-y-1">
                      <Bar pct={s.sold_pct} max={max} color={SOLD}
                        label={`Talla ${s.size}: ${formatPct(s.sold_pct)} de lo vendido (${formatInt(s.sold_units)} prendas)`} />
                      <Bar pct={s.stock_pct} max={max} color={STOCK}
                        label={`Talla ${s.size}: ${formatPct(s.stock_pct)} del stock (${formatInt(s.stock_units)} prendas)`} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
};

const STATUS = {
  agotado: { label: 'Agotado', icon: PackageX, className: 'bg-red-50 text-red-800 ring-red-200' },
  'se agota pronto': { label: 'Se agota pronto', icon: AlertTriangle, className: 'bg-amber-50 text-amber-900 ring-amber-200' },
  lenta: { label: 'Rotación lenta', icon: TrendingDown, className: 'bg-gray-100 text-gray-800 ring-gray-200' },
  'sin ventas': { label: 'Sin ventas', icon: MinusCircle, className: 'bg-gray-100 text-gray-800 ring-gray-200' },
  normal: { label: 'Normal', icon: Clock, className: 'bg-white text-gray-700 ring-gray-200' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS[status] || STATUS.normal;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${s.className}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {s.label}
    </span>
  );
};

const RotationTable = ({ rows }) => {
  if (!rows.length) return <p className="text-sm text-gray-500">No hay datos de rotación para este periodo.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-gray-200">
          <tr><Th>Prenda</Th><Th right>Vendidas</Th><Th right>Por día</Th><Th right>Stock</Th><Th right>Días de inventario</Th><Th>Estado</Th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.product}>
              <Td strong>{titleCase(r.product)}</Td>
              <Td right>{formatInt(r.sold_units)}</Td>
              <Td right>{formatDec(r.daily_units)}</Td>
              <Td right>{formatInt(r.stock_units)}</Td>
              <Td right strong>{r.days_of_inventory === null ? '—' : formatInt(r.days_of_inventory)}</Td>
              <td className="py-2 px-2"><StatusBadge status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Garments;

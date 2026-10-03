import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, Loader2, RefreshCw, Truck } from 'lucide-react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useAuth } from '../contexts/AuthContext';
import { getArrivals, syncArrivals } from '../services/arrivalsService';
import { getColombiaTodayString } from '../utils/dateUtils';
import { storeDisplayName } from '../utils/activeStore';
import { buildPresets, daysBetween, longDate } from '../utils/statsDates';
import { Card, Notice, PeriodFilter, StatTile } from '../components/stats/StatsUI';
import InvoiceFactsPanel from '../components/customers/InvoiceFactsPanel';

/**
 * Estadísticas → Llegadas (solo admin, por tienda). Fase D1 de
 * docs/PLAN_ESTADISTICAS.md del backend: cada llegada de mercancía (compras
 * de Alegra del mismo día y proveedor) con cuántas prendas se vendieron desde
 * entonces y qué llegó y no se mueve. Las ventas salen de las prendas
 * guardadas (días cerrados: hasta ayer). No cuentan la bolsa ni las tarjetas
 * de regalo.
 */
const MAX_DAYS = 366; // mismo límite que el backend
const SOLD = '#4A58D6'; // mismo "vendido" de Prendas

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
const formatInt = (value) => (value || 0).toLocaleString('es-CO');
const formatPct = (value) => `${(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
const titleCase = (name) => (name || '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const Arrivals = () => {
  useDocumentTitle('Llegadas');
  const { activeStore } = useAuth();
  const storeName = storeDisplayName(activeStore);

  const today = getColombiaTodayString();
  const presets = useMemo(() => buildPresets(today), [today]);
  const defaultPreset = presets.find((p) => p.id === 'last-90');
  const [range, setRange] = useState({ start: defaultPreset.start, end: defaultPreset.end, preset: 'last-90' });
  const [draft, setDraft] = useState({ start: defaultPreset.start, end: defaultPreset.end });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  const requestId = useRef(0);
  const load = useCallback(async (start, end) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getArrivals(start, end);
      if (id === requestId.current) setResult(data);
    } catch (e) {
      if (id === requestId.current) setError(e);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(range.start, range.end); }, [range, load]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncArrivals();
      setSyncMessage({ ok: true, text: `Compras actualizadas: ${formatInt(res.result.bills)} facturas de compra desde el 1 de enero.` });
      load(range.start, range.end);
    } catch (e) {
      setSyncMessage({ ok: false, text: e.message });
    } finally {
      setSyncing(false);
    }
  };

  const draftDays = draft.start && draft.end ? daysBetween(draft.start, draft.end) : 0;
  const draftError = !draft.start || !draft.end
    ? 'Elige ambas fechas'
    : draftDays < 1 ? 'La fecha inicial debe ser anterior a la final'
      : draftDays > MAX_DAYS ? 'Máximo 1 año' : null;

  const data = result?.data;
  const status = data?.status;
  const neverLoaded = status && !status.last_synced_at;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-gray-500">Estadísticas</p>
        <h1 className="mt-1 text-[2rem] sm:text-4xl font-bold text-gray-900 leading-[1.05]">Llegadas</h1>
        <p className="mt-2 text-sm text-gray-600 max-w-2xl">
          La mercancía que llegó a KOAJ {storeName} (compras en Alegra) y cuánto se ha vendido de cada llegada.
          Sirve para ver qué se mueve rápido y qué llegó y sigue quieto.
        </p>
      </header>

      <PeriodFilter
        presets={presets} range={range} setRange={setRange}
        draft={draft} setDraft={setDraft} draftError={draftError} loading={loading} today={today}
      />

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
            Llegadas del <span className="font-medium text-gray-800">{longDate(data.date_range.start)} – {longDate(data.date_range.end)}</span>
            {' '}· ventas contadas hasta el {longDate(data.sales_until)}
          </p>

          {neverLoaded && (
            <Notice>
              Todavía no se han cargado las compras de esta tienda. Se cargan solas cada noche; para verlas ya, usa
              "Actualizar compras" abajo.
            </Notice>
          )}

          {!data.coverage.complete && (
            <Notice>
              Faltan las prendas vendidas de {formatInt(data.coverage.missing_days)} días del periodo (desde el{' '}
              {longDate(data.coverage.first_missing_day)}): lo vendido se queda corto hasta que se carguen ("Prendas guardadas", abajo).
            </Notice>
          )}

          <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
            <StatTile label="Llegadas" value={formatInt(data.totals.arrivals)} detail="Compras del mismo día y proveedor" />
            <StatTile label="Prendas que llegaron" value={formatInt(data.totals.units)} detail={`${formatCOP(data.totals.value)} a precio de venta`} />
            <StatTile label="Vendidas desde que llegaron" value={formatInt(data.totals.sold_units)} />
            <StatTile label="% vendido" value={formatPct(data.totals.sell_through_pct)} detail="De lo que llegó en el periodo" />
          </div>

          <Card title="Cada llegada" subtitle="De la más reciente a la más antigua. Toca una para ver sus prendas y tallas.">
            <ArrivalList arrivals={data.arrivals} />
          </Card>

          <Card title="Llegó y no se mueve"
            subtitle={`Prendas (con talla) de llegadas de hace ${data.stale_days} días o más que no han vendido ninguna unidad desde que llegaron.`}>
            <StaleTable rows={data.stale} />
          </Card>

          <p className="text-xs text-gray-500 max-w-3xl">
            Cómo se cuenta: las ventas de cada referencia se asignan primero a la llegada más antigua del periodo
            consultado. Es aproximado: no se sabe cuántas unidades ya había antes de cada llegada. El valor es a precio de
            venta porque así se registran las compras en Alegra.
          </p>
        </div>
      )}

      <section className="rounded-2xl bg-white ring-1 ring-gray-900/5 shadow-sm p-4 sm:p-6 space-y-3" aria-label="Compras guardadas">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Truck className="w-5 h-5" aria-hidden="true" /> Compras guardadas</h2>
            <p className="text-sm text-gray-500">
              {status?.last_synced_at
                ? `${formatInt(status.bills)} compras desde el 1 de enero; la más reciente del ${longDate(status.last_purchase_date)}. Se actualizan cada noche.`
                : 'Copia de las compras de Alegra desde el 1 de enero. Se actualiza cada noche.'}
            </p>
          </div>
          <button type="button" onClick={handleSync} disabled={syncing}
            className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" /> {syncing ? 'Actualizando…' : 'Actualizar compras'}
          </button>
        </div>
        {syncMessage && (
          <p role="status" className={`text-sm ${syncMessage.ok ? 'text-emerald-700' : 'text-red-700'}`}>{syncMessage.text}</p>
        )}
      </section>

      <InvoiceFactsPanel variant="prendas" />
    </div>
  );
};

const Th = ({ children, right }) => (
  <th scope="col" className={`py-2 px-2 text-xs font-medium uppercase tracking-wider text-gray-500 ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);
const Td = ({ children, right, strong }) => (
  <td className={`py-2 px-2 tabular-nums ${right ? 'text-right' : ''} ${strong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{children}</td>
);

const Progress = ({ pct, label }) => (
  <div className="flex items-center gap-2 min-w-[8rem]">
    <div className="relative h-2.5 flex-1 rounded-[4px] bg-gray-100" role="img" aria-label={label}>
      <div className="absolute inset-y-0 left-0 rounded-[4px]" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: SOLD }} />
    </div>
    <span className="w-14 text-right text-xs text-gray-700 tabular-nums">{formatPct(pct)}</span>
  </div>
);

const ArrivalList = ({ arrivals }) => {
  if (!arrivals.length) return <p className="text-sm text-gray-500">No hay llegadas de mercancía en este periodo.</p>;
  return (
    <ul className="divide-y divide-gray-100">
      {arrivals.map((a) => (
        <li key={`${a.date}-${a.provider}`}>
          <details className="group py-3">
            <summary className="flex flex-wrap items-center gap-x-4 gap-y-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <ChevronDown className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" aria-hidden="true" />
              <div className="min-w-[10rem]">
                <p className="text-sm font-semibold text-gray-900">{longDate(a.date)} · {titleCase(a.provider)}</p>
                <p className="text-xs text-gray-500">
                  Hace {formatInt(a.days_since_arrival)} días · {a.bills.length === 1 ? 'compra' : 'compras'} {a.bills.join(', ')}
                </p>
              </div>
              <p className="text-sm text-gray-700 tabular-nums">
                {formatInt(a.sold_units)} de {formatInt(a.units)} vendidas
                {a.unsold_references > 0 && <span className="text-gray-500"> · {formatInt(a.unsold_references)} sin ninguna venta</span>}
              </p>
              <div className="flex-1 min-w-[10rem] max-w-xs">
                <Progress pct={a.sell_through_pct} label={`${formatPct(a.sell_through_pct)} vendido`} />
              </div>
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr><Th>Prenda</Th><Th>Tallas (vendidas / llegaron)</Th><Th right>Llegaron</Th><Th right>Vendidas</Th><Th right>% vendido</Th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {a.products.map((p) => (
                    <tr key={p.product}>
                      <Td strong>{titleCase(p.product)}</Td>
                      <td className="py-2 px-2 text-xs text-gray-600">
                        {p.sizes.map((s) => `${s.size} ${s.sold_units}/${s.units}`).join(' · ')}
                      </td>
                      <Td right>{formatInt(p.units)}</Td>
                      <Td right>{formatInt(p.sold_units)}</Td>
                      <Td right strong>{formatPct(p.sell_through_pct)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
};

const StaleTable = ({ rows }) => {
  if (!rows.length) return <p className="text-sm text-gray-500">Todo lo que llegó hace más de un mes ha vendido al menos una unidad.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-gray-200">
          <tr><Th>Prenda</Th><Th>Talla</Th><Th>Llegó</Th><Th right>Unidades</Th><Th right>Días</Th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={`${r.item_id || r.name}-${r.arrival_date}-${i}`} title={r.name}>
              <Td strong>{titleCase(r.product)}</Td>
              <Td>{r.size}</Td>
              <Td>{longDate(r.arrival_date)}</Td>
              <Td right>{formatInt(r.units)}</Td>
              <Td right>{formatInt(r.days_since_arrival)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Arrivals;

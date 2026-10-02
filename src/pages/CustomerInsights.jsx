import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, MessageCircle, RefreshCw } from 'lucide-react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useAuth } from '../contexts/AuthContext';
import { getCustomersSummary, getInactiveCustomers } from '../services/customerInsightsService';
import { getColombiaTodayString } from '../utils/dateUtils';
import { storeDisplayName } from '../utils/activeStore';

/**
 * Dashboard de clientes de la tienda activa (solo admin), con los reportes
 * agregados de Alegra: % de venta con cliente identificado (meta para las
 * vendedoras), mejores clientes, compras del equipo, nuevos vs recurrentes
 * y clientas que dejaron de venir (con WhatsApp).
 *
 * Un solo tono para magnitudes (tinta-500, el mismo del comparativo de
 * tiendas) y gris neutro para "Consumidor final" (lo que falta identificar).
 */
const INK = '#4A58D6';
const NEUTRAL = '#D4D5DA';
const MAX_DAYS = 3 * 366; // mismo límite que el backend
const INACTIVE_OPTIONS = [60, 90, 120, 180];

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
const formatInt = (value) => (value || 0).toLocaleString('es-CO');
const formatPct = (value) =>
  value === null || value === undefined ? '—' : `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;

// ── Fechas (strings YYYY-MM-DD, aritmética en UTC para no correrse de día) ──
const toUTC = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const toStr = (date) => date.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = toUTC(s); d.setUTCDate(d.getUTCDate() + n); return toStr(d); };
const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 86400000) + 1;
const longDate = (s) =>
  toUTC(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const buildPresets = (today) => {
  const firstOfMonth = `${today.slice(0, 8)}01`;
  const lastMonthEnd = addDays(firstOfMonth, -1);
  return [
    { id: 'this-year', label: 'Este año', start: `${today.slice(0, 4)}-01-01`, end: today },
    { id: 'this-month', label: 'Este mes', start: firstOfMonth, end: today },
    { id: 'last-month', label: 'Mes anterior', start: `${lastMonthEnd.slice(0, 8)}01`, end: lastMonthEnd },
    { id: 'last-90', label: 'Últimos 90 días', start: addDays(today, -89), end: today },
  ];
};

// "MONICA  ALEJANDRA VARGAS" -> "Monica Alejandra Vargas"
const titleCase = (name) =>
  (name || '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const whatsappLink = (number, name, store) => {
  const text = `Hola ${titleCase(name)}, te saludamos de KOAJ ${store}. ¡Te extrañamos! `
    + 'Tenemos colección nueva y nos encantaría mostrártela. ¿Cuándo te esperamos?';
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
};

// ─────────────────────────────────────────────────────────────────────────────

const CustomerInsights = () => {
  useDocumentTitle('Clientes');
  const { activeStore } = useAuth();
  const storeName = storeDisplayName(activeStore);

  const today = getColombiaTodayString();
  const presets = useMemo(() => buildPresets(today), [today]);
  const [range, setRange] = useState({ start: presets[0].start, end: presets[0].end, preset: 'this-year' });
  const [draft, setDraft] = useState({ start: presets[0].start, end: presets[0].end });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (start, end) => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await getCustomersSummary(start, end));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range.start, range.end); }, [range, load]);

  const draftDays = draft.start && draft.end ? daysBetween(draft.start, draft.end) : 0;
  const draftError = !draft.start || !draft.end
    ? 'Elige ambas fechas'
    : draftDays < 1 ? 'La fecha inicial debe ser anterior a la final'
      : draftDays > MAX_DAYS ? 'Máximo 3 años' : null;

  const notConfigured = error?.code === 'alegra_not_configured';
  const data = summary?.data;
  // Por facturas, no por monto: si Alegra cambiara el nombre de un campo y
  // los montos llegaran en 0, se ven los ceros en vez de "no hay ventas".
  const hasSales = data && (data.kpis.total_documents > 0 || data.kpis.total_sales > 0);
  const sellersWithPct = data?.sellers.some((s) => s.identified_available);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-gray-500">Estadísticas</p>
        <h1 className="mt-1 text-[2rem] sm:text-4xl font-bold text-gray-900 leading-[1.05]">Clientes</h1>
        <p className="mt-2 text-sm text-gray-600 max-w-2xl">
          Quién le compra a KOAJ {storeName}, según Alegra. La meta es que cada venta quede con su cliente:
          así sabemos quién vuelve y a quién escribirle.
        </p>
      </header>

      {notConfigured ? (
        <Notice>
          {error.message}. Cuando se configure, este panel funciona igual que en las demás tiendas.
        </Notice>
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
              <Loader2 className="w-5 h-5 animate-spin" />
              Consultando los clientes en Alegra… la primera vez puede tardar un poco.
            </div>
          )}

          {data && (
            <div className={`space-y-6 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`} aria-busy={loading}>
              <p className="text-sm text-gray-500">
                Periodo: <span className="font-medium text-gray-800">
                  {longDate(summary.date_range.start)} – {longDate(summary.date_range.end)}
                </span>
              </p>

              {hasSales ? (
                <>
                  <KpiRow data={data} />
                  <Card
                    title={sellersWithPct ? 'Venta con cliente identificado, por vendedora' : 'Ventas por vendedora'}
                    subtitle={sellersWithPct
                      ? 'Qué parte de lo que vendió cada una quedó con el nombre y la cédula del cliente (el resto queda como Consumidor final).'
                      : 'Cuánto vendió cada una en el periodo y qué parte de la venta de la tienda representa.'}
                  >
                    <SellersIdentified sellers={data.sellers} unassigned={data.unassigned_sales} />
                  </Card>
                  <Card title="Mejores clientes" subtitle="Sin Consumidor final. Las vendedoras que compran aparecen marcadas como Equipo.">
                    <TopClients data={data} discounts={data.discounts_available} />
                  </Card>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card title="Compras del equipo" subtitle="Vendedoras que también compran como clientas (siguen en el ranking).">
                      <EmployeesTable employees={data.employees} discounts={data.discounts_available} />
                    </Card>
                    <Card title="Clientes nuevos y recurrentes" subtitle={`Nuevo: su primera compra registrada en Alegra fue en este periodo.`}>
                      <NewVsReturning info={data.new_vs_returning} />
                    </Card>
                  </div>
                </>
              ) : (
                <Notice tone="neutral">
                  Todavía no hay ventas registradas en Alegra para KOAJ {storeName} en este periodo.
                </Notice>
              )}
            </div>
          )}

          <Card
            title="Clientas que dejaron de venir"
            subtitle="Compraron en el último año pero no han vuelto. Para escribirles por WhatsApp, de la que más ha comprado a la que menos."
          >
            <InactiveClients storeName={storeName} />
          </Card>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const Card = ({ title, subtitle, children }) => (
  <section className="min-w-0 rounded-2xl bg-white ring-1 ring-gray-900/5 shadow-sm p-4 sm:p-6">
    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
    {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
    {children}
  </section>
);

const Notice = ({ children, tone = 'warning' }) => (
  <div className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm ${
    tone === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-gray-50 border-gray-200 text-gray-700'
  }`}>
    <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${tone === 'warning' ? 'text-amber-600' : 'text-gray-500'}`} />
    <p>{children}</p>
  </div>
);

const EmployeeBadge = ({ employee }) => employee && (
  <span
    className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 align-middle"
    title={`Vendedora: ${employee.seller_name}`}
  >
    Equipo
  </span>
);

const PeriodFilter = ({ presets, range, setRange, draft, setDraft, draftError, loading, today }) => (
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
);

// ── Indicadores ─────────────────────────────────────────────────────────────

const KpiRow = ({ data }) => {
  const { kpis, anonymous, employees } = data;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <section className="rounded-2xl bg-white ring-1 ring-gray-900/5 shadow-sm p-5 md:col-span-2" aria-label="Venta con cliente identificado">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Venta con cliente identificado</p>
        <p className="mt-1 text-4xl font-bold text-gray-900 tabular-nums">{formatPct(kpis.identified_pct)}</p>
        <p className="mt-1 text-sm text-gray-600">
          {formatCOP(kpis.identified_sales)} de {formatCOP(kpis.total_sales)} · {formatPct(kpis.identified_documents_pct)} de las facturas
        </p>
        {/* Parte-todo: identificado (tinta) vs Consumidor final (gris), con 2 px de separación */}
        <div className="mt-4 flex h-3 gap-[2px]" role="img"
          aria-label={`Identificado ${formatPct(kpis.identified_pct)}, Consumidor final el resto`}>
          <div className="rounded-l-[4px]" style={{ width: `${kpis.identified_pct || 0}%`, backgroundColor: INK }} />
          <div className="flex-1 rounded-r-[4px]" style={{ backgroundColor: NEUTRAL }} />
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600" aria-label="Leyenda">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block w-3 h-3 rounded-[3px]" style={{ backgroundColor: INK }} />
            Con cliente: {formatCOP(kpis.identified_sales)}
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block w-3 h-3 rounded-[3px]" style={{ backgroundColor: NEUTRAL }} />
            Consumidor final: {formatCOP(anonymous.total)} ({formatInt(anonymous.documents)} facturas)
          </li>
        </ul>
      </section>
      <StatTile label="Clientes identificados" value={formatInt(kpis.unique_clients)}
        detail={`Compra promedio por cliente: ${formatCOP(kpis.average_per_client)}`} />
      {data.discounts_available ? (
        <StatTile label="Descuentos del periodo" value={formatCOP(kpis.total_discount)}
          detail={`Del equipo: ${formatCOP(employees.discount)} (${formatPct(employees.share_of_discount_pct)})`} />
      ) : (
        // El reporte de Alegra que usa la plataforma no trae descuentos:
        // mostrar $0 parecería un dato real.
        <StatTile label="Facturas del periodo" value={formatInt(kpis.total_documents)}
          detail={`${formatInt(kpis.identified_documents)} con cliente identificado`} />
      )}
    </div>
  );
};

const StatTile = ({ label, value, detail }) => (
  <section className="rounded-2xl bg-white ring-1 ring-gray-900/5 shadow-sm p-5" aria-label={label}>
    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
    <p className="mt-1 text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
    {detail && <p className="mt-1 text-sm text-gray-600">{detail}</p>}
  </section>
);

// ── Por vendedora: barra de % identificado sobre 0-100 ──────────────────────

const SellersIdentified = ({ sellers, unassigned }) => {
  if (!sellers.length) return <p className="text-sm text-gray-500">No hay ventas con vendedora en este periodo.</p>;
  if (!sellers.some((s) => s.identified_available)) return <SellersShare sellers={sellers} unassigned={unassigned} />;
  return (
    <div>
      <ul className="space-y-4">
        {sellers.map((s) => (
          <li key={s.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-sm font-medium text-gray-900">{titleCase(s.name)}</span>
              <span className="text-xs text-gray-500 tabular-nums">
                Vendió {formatCOP(s.total)} en {formatInt(s.documents)} facturas
              </span>
            </div>
            {s.identified_available ? (
              <div className="mt-1.5 flex items-center gap-3"
                title={`${formatCOP(s.identified_sales)} con cliente · ${formatInt(s.identified_documents)} de ${formatInt(s.documents)} facturas`}>
                <div className="relative h-3 flex-1 rounded-[4px] bg-gray-100" role="img"
                  aria-label={`${titleCase(s.name)}: ${formatPct(s.identified_pct)} de su venta con cliente identificado`}>
                  <div className="absolute inset-y-0 left-0 rounded-[4px]"
                    style={{ width: `${s.identified_pct || 0}%`, backgroundColor: INK }} />
                </div>
                <span className="w-16 text-right text-sm font-semibold text-gray-900 tabular-nums">{formatPct(s.identified_pct)}</span>
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-500">No se pudo calcular el % identificado de esta vendedora.</p>
            )}
          </li>
        ))}
      </ul>
      {unassigned > 0 && (
        <p className="mt-4 text-xs text-gray-500">{formatCOP(unassigned)} se vendieron sin vendedora asignada.</p>
      )}
    </div>
  );
};

// Sin % identificado (el reporte de Alegra no separa clientes por vendedora):
// barra de participación de cada vendedora en la venta de la tienda.
const SellersShare = ({ sellers, unassigned }) => {
  const storeTotal = sellers.reduce((sum, s) => sum + s.total, 0) + (unassigned || 0);
  return (
    <div>
      <ul className="space-y-4">
        {sellers.map((s) => {
          const share = storeTotal ? Math.round((s.total * 1000) / storeTotal) / 10 : 0;
          return (
            <li key={s.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-medium text-gray-900">{titleCase(s.name)}</span>
                <span className="text-xs text-gray-500 tabular-nums">
                  {formatCOP(s.total)} en {formatInt(s.documents)} facturas
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="relative h-3 flex-1 rounded-[4px] bg-gray-100" role="img"
                  aria-label={`${titleCase(s.name)}: ${formatPct(share)} de la venta de la tienda`}>
                  <div className="absolute inset-y-0 left-0 rounded-[4px]" style={{ width: `${share}%`, backgroundColor: INK }} />
                </div>
                <span className="w-16 text-right text-sm font-semibold text-gray-900 tabular-nums">{formatPct(share)}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {unassigned > 0 && (
        <p className="mt-4 text-xs text-gray-500">{formatCOP(unassigned)} se vendieron sin vendedora asignada.</p>
      )}
      <p className="mt-4 text-xs text-gray-500">
        El % de venta con cliente identificado de cada vendedora necesita el detalle de las facturas
        (el reporte de Alegra que usa la plataforma no lo separa por vendedora). Llega en la siguiente fase.
      </p>
    </div>
  );
};

// ── Ranking de clientes ─────────────────────────────────────────────────────

const RANKINGS = [
  { id: 'amount', label: 'Por monto', key: 'top_by_amount' },
  { id: 'frequency', label: 'Por número de compras', key: 'top_by_frequency' },
  { id: 'discount', label: 'Por descuento', key: 'top_by_discount' },
];

const TopClients = ({ data, discounts }) => {
  const [ranking, setRanking] = useState('amount');
  const rankings = discounts ? RANKINGS : RANKINGS.filter((r) => r.id !== 'discount');
  const rows = data[rankings.find((r) => r.id === ranking).key];
  return (
    <div>
      <div role="group" aria-label="Ordenar por" className="flex flex-wrap gap-1.5 mb-4">
        {rankings.map((r) => (
          <button key={r.id} onClick={() => setRanking(r.id)} aria-pressed={ranking === r.id}
            className={`h-9 px-3 rounded-full text-sm font-medium transition-colors ${
              ranking === r.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            {r.label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No hay clientes para mostrar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-3 font-medium w-8">#</th>
                <th className="py-2 pr-4 font-medium">Cliente</th>
                <th className="py-2 pr-4 font-medium text-right">Compras</th>
                <th className="py-2 pr-4 font-medium text-right">Total</th>
                <th className="hidden sm:table-cell py-2 pr-4 font-medium text-right">Ticket promedio</th>
                {discounts && <th className="hidden sm:table-cell py-2 pr-4 font-medium text-right">Descuento</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={c.id} className="border-b border-gray-100">
                  <td className="py-2 pr-3 text-gray-500 tabular-nums">{i + 1}</td>
                  <td className="py-2 pr-4 text-gray-900">
                    {titleCase(c.name)}<EmployeeBadge employee={c.employee} />
                    {c.identification && <span className="block text-xs text-gray-500">CC {c.identification}</span>}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-gray-900">{formatInt(c.documents)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums font-medium text-gray-900 whitespace-nowrap">{formatCOP(c.total)}</td>
                  <td className="hidden sm:table-cell py-2 pr-4 text-right tabular-nums text-gray-700">{formatCOP(c.average_ticket)}</td>
                  {discounts && (
                    <td className="hidden sm:table-cell py-2 pr-4 text-right tabular-nums text-gray-700">
                      {c.discount ? <>{formatCOP(c.discount)} <span className="text-xs text-gray-500">({formatPct(c.discount_pct)})</span></> : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Equipo ──────────────────────────────────────────────────────────────────

const EmployeesTable = ({ employees, discounts }) => {
  if (!employees.clients.length) {
    return <p className="text-sm text-gray-500">Ninguna vendedora aparece como clienta en este periodo.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2 pr-4 font-medium">Vendedora</th>
            <th className="py-2 pr-4 font-medium text-right">Compras</th>
            <th className="py-2 pr-4 font-medium text-right">Total</th>
            {discounts && <th className="py-2 pr-4 font-medium text-right">Descuento</th>}
          </tr>
        </thead>
        <tbody>
          {employees.clients.map((c) => (
            <tr key={c.id} className="border-b border-gray-100">
              <td className="py-2 pr-4 text-gray-900">
                {titleCase(c.employee.seller_name)}
                <span className="block text-xs text-gray-500">Como cliente: {titleCase(c.name)}</span>
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{formatInt(c.documents)}</td>
              <td className="py-2 pr-4 text-right tabular-nums font-medium text-gray-900">{formatCOP(c.total)}</td>
              {discounts && (
                <td className="py-2 pr-4 text-right tabular-nums text-gray-700">
                  {formatCOP(c.discount)} <span className="text-xs text-gray-500">({formatPct(c.discount_pct)})</span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="text-gray-900 font-semibold">
            <td className="py-2 pr-4">Total equipo</td>
            <td className="py-2 pr-4 text-right tabular-nums">{formatInt(employees.documents)}</td>
            <td className="py-2 pr-4 text-right tabular-nums">{formatCOP(employees.total)}</td>
            {discounts && <td className="py-2 pr-4 text-right tabular-nums">{formatCOP(employees.discount)}</td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ── Nuevos vs recurrentes ───────────────────────────────────────────────────

const NewVsReturning = ({ info }) => {
  if (!info) return <p className="text-sm text-gray-500">No se pudo consultar la historia de compras en Alegra.</p>;
  const total = info.new_clients + info.returning_clients;
  return (
    <div>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Nuevos</dt>
          <dd className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{formatInt(info.new_clients)}</dd>
          <dd className="text-sm text-gray-600 tabular-nums">{formatCOP(info.new_sales)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Recurrentes</dt>
          <dd className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{formatInt(info.returning_clients)}</dd>
          <dd className="text-sm text-gray-600 tabular-nums">{formatCOP(info.returning_sales)}</dd>
        </div>
      </dl>
      {total > 0 && (
        <p className="mt-3 text-sm text-gray-600">
          {formatPct(Math.round((info.returning_clients * 1000) / total) / 10)} de los clientes del periodo ya habían comprado antes.
        </p>
      )}
      {info.top_new.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-sm font-semibold text-gray-900">Nuevos que más compraron</h3>
          <ul className="divide-y divide-gray-100 text-sm">
            {info.top_new.map((c) => (
              <li key={c.id} className="flex justify-between gap-3 py-1.5">
                <span className="text-gray-800">{titleCase(c.name)}<EmployeeBadge employee={c.employee} /></span>
                <span className="tabular-nums text-gray-900">{formatCOP(c.total)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

// ── Clientas inactivas (carga aparte: trae teléfonos de Alegra) ─────────────

const InactiveClients = ({ storeName }) => {
  const [days, setDays] = useState(90);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getInactiveCustomers(days)
      .then((r) => { if (!cancelled) setResult(r.data); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  return (
    <div>
      <div role="group" aria-label="Días sin comprar" className="flex flex-wrap items-center gap-1.5 mb-4">
        <span className="text-sm text-gray-600 mr-1">Sin comprar hace más de</span>
        {INACTIVE_OPTIONS.map((d) => (
          <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} disabled={loading}
            className={`h-9 px-3 rounded-full text-sm font-medium transition-colors disabled:opacity-60 ${
              days === d ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            {d} días
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {loading && !result && (
        <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
          <Loader2 className="w-4 h-4 animate-spin" /> Buscando clientas y sus teléfonos en Alegra…
        </p>
      )}

      {result && (
        <div className={`transition-opacity ${loading ? 'opacity-50' : ''}`} aria-busy={loading}>
          <p className="text-sm text-gray-700 mb-3">
            <span className="font-semibold">{formatInt(result.inactive_count)}</span> clientas compraron entre el{' '}
            {longDate(result.periods.before.start)} y el {longDate(result.periods.before.end)}
            {' '}({formatCOP(result.inactive_sales)}) y no han vuelto en los últimos {result.days} días.
            {result.inactive_count > result.clients.length && ` Se muestran las ${result.clients.length} que más compraron.`}
          </p>
          {result.clients.length === 0 ? (
            <p className="text-sm text-gray-500">No hay clientas inactivas en este periodo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-2 pr-4 font-medium">Clienta</th>
                    <th className="py-2 pr-4 font-medium text-right">Compró</th>
                    <th className="hidden sm:table-cell py-2 pr-4 font-medium">Última compra</th>
                    <th className="hidden sm:table-cell py-2 pr-4 font-medium">Teléfono</th>
                    <th className="py-2 font-medium"><span className="sr-only">WhatsApp</span></th>
                  </tr>
                </thead>
                <tbody>
                  {result.clients.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-gray-900">
                        {titleCase(c.name)}<EmployeeBadge employee={c.employee} />
                        {/* En celular la última compra va aquí (su columna se oculta) */}
                        {c.last_purchase && (
                          <span className="block sm:hidden text-xs text-gray-500">
                            Última compra hace {c.days_since_last_purchase} días
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        <span className="font-medium text-gray-900 whitespace-nowrap">{formatCOP(c.total)}</span>
                        <span className="block text-xs text-gray-500">{formatInt(c.documents)} compras</span>
                      </td>
                      <td className="hidden sm:table-cell py-2 pr-4 text-gray-700 whitespace-nowrap">
                        {c.last_purchase ? (
                          <>{longDate(c.last_purchase)}<span className="block text-xs text-gray-500">hace {c.days_since_last_purchase} días</span></>
                        ) : '—'}
                      </td>
                      <td className="hidden sm:table-cell py-2 pr-4 text-gray-700 tabular-nums">{c.phone || '—'}</td>
                      <td className="py-2">
                        {c.whatsapp ? (
                          <a href={whatsappLink(c.whatsapp, c.name, storeName)} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800">
                            <MessageCircle className="w-4 h-4" /> WhatsApp
                          </a>
                        ) : (
                          <span className="text-xs text-gray-500">Sin celular</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerInsights;

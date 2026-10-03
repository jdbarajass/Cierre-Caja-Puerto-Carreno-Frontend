import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Pencil, RotateCcw, TrendingDown } from 'lucide-react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useAuth } from '../contexts/AuthContext';
import { getSellerGoals, saveSellerGoal } from '../services/sellerGoalsService';
import { getColombiaTodayString } from '../utils/dateUtils';
import { storeDisplayName } from '../utils/activeStore';
import { longDate } from '../utils/statsDates';
import { Card, Notice, StatTile } from '../components/stats/StatsUI';

/**
 * Estadísticas → Metas (solo admin, por tienda). Fase D3 de
 * docs/PLAN_ESTADISTICAS.md del backend: meta mensual de cada vendedora
 * (automática: mismo mes del año anterior +15 % repartido por la venta de
 * los 3 meses anteriores; el admin la puede ajustar) y su avance: venta,
 * proyección al cierre, cuánto necesita por día, prendas por factura y % de
 * la venta con cliente.
 */
const BAR = '#4A58D6';
const FIRST_MONTH = '2026-01';

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
const formatInt = (value) => (value || 0).toLocaleString('es-CO');
const formatPct = (value) => `${(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
const formatDec = (value) => (value || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });
const titleCase = (name) => (name || '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const nextMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};
const monthName = (month) => {
  const [y, m] = month.split('-').map(Number);
  const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const SellerGoals = () => {
  useDocumentTitle('Metas');
  const { activeStore } = useAuth();
  const storeName = storeDisplayName(activeStore);
  const currentMonth = getColombiaTodayString().slice(0, 7);
  const maxMonth = nextMonth(currentMonth);

  const [month, setMonth] = useState(currentMonth);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const requestId = useRef(0);
  const load = useCallback(async (m) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getSellerGoals(m);
      if (id === requestId.current) setResult(data);
    } catch (e) {
      if (id === requestId.current) setError(e);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  const data = result?.data;
  const pace = data?.pace;
  const notConfigured = error?.code === 'alegra_not_configured';

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-gray-500">Estadísticas</p>
        <h1 className="mt-1 text-[2rem] sm:text-4xl font-bold text-gray-900 leading-[1.05]">Metas</h1>
        <p className="mt-2 text-sm text-gray-600 max-w-2xl">
          Meta del mes de cada vendedora de KOAJ {storeName} y cómo va. La meta se calcula sola y puedes ajustarla.
        </p>
      </header>

      <label className="inline-block text-xs text-gray-500">
        <span className="block mb-1">Mes</span>
        <input type="month" value={month} min={FIRST_MONTH} max={maxMonth}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white" />
      </label>

      {error && (notConfigured
        ? <Notice>{error.message}. Cuando se configure, este panel funciona igual que en las demás tiendas.</Notice>
        : (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> {error.message}
          </div>
        ))}

      {!result && loading && (
        <div className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-gray-900/5 px-5 py-10 text-sm text-gray-600" role="status">
          <Loader2 className="w-5 h-5 animate-spin" /> Calculando… la primera vez del mes consulta Alegra y puede tardar.
        </div>
      )}

      {data && (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`} aria-busy={loading}>
          <p className="text-sm text-gray-500">
            {monthName(data.month)}
            {pace.is_current && <> · van {formatInt(pace.elapsed_days)} de {formatInt(pace.days_in_month)} días ({formatPct(pace.expected_pct)} del mes)</>}
          </p>

          {data.warnings.map((w) => <Notice key={w}>{w}</Notice>)}
          {!data.store_auto_goal && (
            <Notice>
              No hay venta del mismo mes del año anterior para calcular la meta automática. Escribe la meta de cada vendedora.
            </Notice>
          )}
          {data.source === 'report' && (
            <Notice tone="info">
              Al mes le faltan días en las facturas guardadas: la venta sale del reporte de Alegra y no se muestran prendas por
              factura ni % con cliente hasta que se carguen.
            </Notice>
          )}

          <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
            <StatTile label="Meta de la tienda" value={data.store.goal ? formatCOP(data.store.goal) : '—'}
              detail={data.last_year.total ? `${monthName(data.last_year.start.slice(0, 7))}: ${formatCOP(data.last_year.total)} + ${data.growth_pct} %` : 'Suma de las metas de las vendedoras'} />
            <StatTile label="Vendido" value={formatCOP(data.store.sales)}
              detail={data.store.goal ? `${formatPct(data.store.progress_pct)} de la meta` : null} />
            <StatTile label="Proyección al cierre" value={data.store.projection != null ? formatCOP(data.store.projection) : '—'}
              detail={pace.is_current ? 'Si se sigue vendiendo al ritmo actual' : 'Solo para el mes en curso'} />
            <StatTile label="Necesario por día" value={data.store.needed_per_day != null ? formatCOP(data.store.needed_per_day) : '—'}
              detail={pace.is_current ? `Para llegar a la meta en ${formatInt(pace.remaining_days + 1)} días (con hoy)` : null} />
          </div>

          <Card title="Por vendedora"
            subtitle={`La barra muestra el avance; la línea, dónde debería ir según los días que han pasado. Meta automática: se reparte según lo que vendió cada una del ${longDate(data.history_range.start)} al ${longDate(data.history_range.end)}.`}>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.sellers.map((s) => (
                <SellerCard key={s.id} seller={s} pace={pace} month={data.month} onSaved={() => load(month)} />
              ))}
            </div>
            {data.store.unassigned_sales > 0 && (
              <p className="mt-4 text-xs text-gray-500">{formatCOP(data.store.unassigned_sales)} en facturas sin vendedora (cuentan en la tienda, no en ninguna vendedora).</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

const ProgressBar = ({ pct, expected, label }) => (
  <div className="relative h-3 rounded-[4px] bg-gray-100" role="img" aria-label={label}>
    <div className="absolute inset-y-0 left-0 rounded-[4px]" style={{ width: `${Math.min(pct || 0, 100)}%`, backgroundColor: BAR }} />
    {expected > 0 && expected < 100 && (
      <div className="absolute -inset-y-1 w-0.5 bg-gray-900" style={{ left: `${expected}%` }} aria-hidden="true" />
    )}
  </div>
);

const SellerCard = ({ seller: s, pace, month, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const startEdit = () => { setValue(s.goal ? String(s.goal) : ''); setSaveError(null); setEditing(true); };
  const save = async (amount) => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveSellerGoal({ month, sellerId: s.id, sellerName: s.name, amount });
      setEditing(false);
      onSaved();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    const amount = Number(String(value).replace(/\D/g, ''));
    if (!amount) { setSaveError('Escribe una meta mayor que $0'); return; }
    save(amount);
  };

  const status = s.on_track === true
    ? { icon: CheckCircle2, text: pace.is_current ? 'Va bien: al ritmo actual llega a la meta' : 'Cumplió la meta', className: 'text-emerald-700' }
    : s.on_track === false
      ? { icon: TrendingDown, text: pace.is_current ? 'Al ritmo actual no llega' : 'No llegó a la meta', className: 'text-amber-800' }
      : null;

  return (
    <section className="rounded-2xl ring-1 ring-gray-200 p-4 space-y-3" aria-label={titleCase(s.name)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {titleCase(s.name)}{!s.active && <span className="ml-2 text-xs font-medium text-gray-500">(inactiva)</span>}
          </h3>
          <p className="text-xs text-gray-500">
            Meta {s.goal ? formatCOP(s.goal) : 'sin definir'}
            {s.adjusted ? ' · ajustada' : s.auto_goal ? ' · automática' : ''}
            {s.adjusted && s.auto_goal ? ` (automática: ${formatCOP(s.auto_goal)})` : ''}
          </p>
        </div>
        {!editing && (
          <div className="flex gap-1">
            <button type="button" onClick={startEdit}
              className="h-9 px-3 rounded-xl ring-1 ring-gray-200 text-sm text-gray-700 inline-flex items-center gap-1.5 hover:bg-gray-50">
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Ajustar
            </button>
            {s.adjusted && (
              <button type="button" onClick={() => save(null)} disabled={saving}
                className="h-9 px-3 rounded-xl ring-1 ring-gray-200 text-sm text-gray-700 inline-flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-50"
                title="Volver a la meta automática">
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Automática
              </button>
            )}
          </div>
        )}
      </div>

      {editing && (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-500">
            <span className="block mb-1">Meta del mes ($)</span>
            <input type="text" inputMode="numeric" value={value} autoFocus
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
              className="h-10 w-40 px-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white tabular-nums" />
          </label>
          <button type="submit" disabled={saving}
            className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-medium disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="h-10 px-3 rounded-xl text-sm text-gray-700">Cancelar</button>
          {value && <p className="w-full text-xs text-gray-500">{formatCOP(Number(value))}</p>}
        </form>
      )}
      {saveError && <p role="alert" className="text-xs text-red-700">{saveError}</p>}

      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-gray-900 tabular-nums">{formatCOP(s.sales)}</span>
          {s.goal ? <span className="text-gray-700 tabular-nums">{formatPct(s.progress_pct)}</span> : null}
        </div>
        {s.goal ? (
          <ProgressBar pct={s.progress_pct} expected={pace.is_current ? pace.expected_pct : 0}
            label={`${formatPct(s.progress_pct)} de la meta${pace.is_current ? `; debería ir en ${formatPct(pace.expected_pct)}` : ''}`} />
        ) : null}
        {status && (
          <p className={`flex items-center gap-1.5 text-xs font-medium ${status.className}`}>
            <status.icon className="w-3.5 h-3.5" aria-hidden="true" /> {status.text}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {pace.is_current && s.goal ? (<>
          <dt className="text-gray-500">Proyección</dt><dd className="text-right tabular-nums text-gray-800">{formatCOP(s.projection)}</dd>
          <dt className="text-gray-500">Necesita por día</dt><dd className="text-right tabular-nums text-gray-800">{formatCOP(s.needed_per_day)}</dd>
        </>) : null}
        <dt className="text-gray-500">Facturas</dt><dd className="text-right tabular-nums text-gray-800">{formatInt(s.invoices)}</dd>
        <dt className="text-gray-500">Ticket promedio</dt><dd className="text-right tabular-nums text-gray-800">{formatCOP(s.average_ticket)}</dd>
        <dt className="text-gray-500">Prendas por factura</dt>
        <dd className="text-right tabular-nums text-gray-800">{s.units_per_invoice != null ? formatDec(s.units_per_invoice) : '—'}</dd>
        <dt className="text-gray-500">% de la venta con cliente</dt>
        <dd className="text-right tabular-nums text-gray-800">{s.identified_pct != null ? formatPct(s.identified_pct) : '—'}</dd>
      </dl>
    </section>
  );
};

export default SellerGoals;

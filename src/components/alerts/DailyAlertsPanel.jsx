import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, Info, RefreshCw, X } from 'lucide-react';
import { dismissAlert, generateAlerts, getAlerts } from '../../services/alertsService';
import { longDate } from '../../utils/statsDates';

/**
 * Alertas diarias para el admin (Fase D4 del plan de Estadísticas del
 * backend), arriba del Dashboard. Las calcula el cron de las 9 pm: día flojo,
 * más vendidos agotados, meta del mes atrasada (advertencias) y descuentos
 * altos (informativa). Cada alerta se puede abrir para ver el detalle y
 * descartar. Si no hay alertas, no ocupa espacio.
 */
const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
const titleCase = (name) => (name || '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const STYLES = {
  warning: { icon: AlertTriangle, box: 'border-amber-200 bg-amber-50', iconClass: 'text-amber-600', label: 'Advertencia' },
  info: { icon: Info, box: 'border-gray-200 bg-white', iconClass: 'text-gray-500', label: 'Para saber' },
};

const Detail = ({ alert }) => {
  const d = alert.data || {};
  if (alert.kind === 'best_sellers_out') {
    return (
      <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2 text-sm text-gray-800">
        {d.items.map((i) => (
          <li key={i.item_id} title={i.name}>
            {titleCase(i.product)} · talla {i.size} <span className="text-gray-500">({i.units_30d} vendidas en {d.days} días)</span>
            {i.new && <span className="ml-1.5 rounded-full bg-amber-200/70 px-1.5 text-[11px] font-medium text-amber-900">nueva</span>}
          </li>
        ))}
      </ul>
    );
  }
  if (alert.kind === 'high_discounts') {
    return (
      <ul className="mt-2 space-y-1 text-sm text-gray-800">
        {d.invoices.map((i) => (
          <li key={i.number}>
            {i.number} · {titleCase(i.client)}{i.seller ? ` · ${titleCase(i.seller)}` : ''}: {i.discount_pct} % ({formatCOP(i.discount)} de {formatCOP(i.subtotal)})
          </li>
        ))}
        {d.count > d.invoices.length && <li className="text-gray-500">y {d.count - d.invoices.length} más</li>}
      </ul>
    );
  }
  if (alert.kind === 'goal_pace' && d.sellers_behind?.length) {
    return (
      <ul className="mt-2 space-y-1 text-sm text-gray-800">
        {d.sellers_behind.map((s) => (
          <li key={s.name}>{titleCase(s.name)}: {s.progress_pct} % de su meta ({formatCOP(s.sales)} de {formatCOP(s.goal)})</li>
        ))}
      </ul>
    );
  }
  return null;
};

const AlertItem = ({ alert, onDismiss }) => {
  const style = STYLES[alert.severity] || STYLES.info;
  const Icon = style.icon;
  const hasDetail = ['best_sellers_out', 'high_discounts'].includes(alert.kind)
    || (alert.kind === 'goal_pace' && alert.data?.sellers_behind?.length > 0);
  return (
    <li className={`rounded-2xl border px-4 py-3 ${style.box}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.iconClass}`} aria-label={style.label} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
          <p className="text-sm text-gray-700">{alert.message} <span className="text-gray-500">· {longDate(alert.date)}</span></p>
          {hasDetail && (
            <details className="group mt-1">
              <summary className="inline-flex items-center gap-1 cursor-pointer text-sm font-medium text-gray-700 list-none [&::-webkit-details-marker]:hidden">
                Ver detalle <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <Detail alert={alert} />
            </details>
          )}
        </div>
        <button type="button" onClick={() => onDismiss(alert.id)}
          className="w-10 h-10 -mt-2 -mr-2 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-900/5"
          aria-label={`Descartar: ${alert.title}`}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
};

const DailyAlertsPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getAlerts();
      setAlerts(res.data);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDismiss = async (id) => {
    setAlerts((list) => list.filter((a) => a.id !== id)); // se quita de una vez; si falla, vuelve
    try {
      await dismissAlert(id);
    } catch (e) {
      setError(e.message);
      load();
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await generateAlerts();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  if (!alerts.length && !error) return null;

  return (
    <section aria-label="Alertas del día" className="mb-6 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Alertas ({alerts.length})</h2>
        <button type="button" onClick={handleRefresh} disabled={refreshing}
          className="h-9 px-3 rounded-xl text-sm text-gray-700 inline-flex items-center gap-1.5 hover:bg-gray-900/5 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {refreshing ? 'Calculando…' : 'Recalcular'}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <ul className="space-y-2">
        {alerts.map((a) => <AlertItem key={a.id} alert={a} onDismiss={handleDismiss} />)}
      </ul>
    </section>
  );
};

export default DailyAlertsPanel;

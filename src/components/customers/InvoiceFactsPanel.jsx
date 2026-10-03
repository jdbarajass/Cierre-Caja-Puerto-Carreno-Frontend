import React, { useCallback, useEffect, useState } from 'react';
import { Database, Loader2 } from 'lucide-react';
import { getInvoiceFactsStatus, syncInvoiceFacts } from '../../services/customerInsightsService';

/**
 * Carga del resumen de facturas de la tienda activa (fase 4 del dashboard de
 * clientes, solo admin). El cron de las 9 pm la completa solo (31 días por
 * noche); los botones sirven para la prueba controlada y para adelantarla.
 *
 * "Calidad de los datos" verifica que las facturas de Alegra traen
 * vendedora, cédula y descuento antes de usarlas en el dashboard (fase 4.3).
 *
 * La misma carga guarda las prendas de cada factura (Estadísticas → Prendas).
 * Los días cargados antes de existir las prendas se completan en las
 * siguientes tandas. `variant="prendas"` muestra el avance de las prendas.
 *
 * Igual con la hora de cada factura (Día y hora, Fase D2): los días cargados
 * antes se vuelven a cargar con los mismos botones. `variant="horas"` muestra
 * ese avance. Los botones siguen activos mientras falte cualquiera de los tres.
 */
const INK = '#4A58D6';

const formatInt = (value) => (value || 0).toLocaleString('es-CO');
const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
const daysLabel = (n) => `${formatInt(n)} ${n === 1 ? 'día' : 'días'}`;
const pctOf = (part, whole) =>
  (whole ? `${(Math.round((part * 1000) / whole) / 10).toLocaleString('es-CO')} %` : '—');
const longDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const InvoiceFactsPanel = ({ variant = 'clientes' }) => {
  const isGarments = variant === 'prendas';
  const isHours = variant === 'horas';
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null); // días de la tanda en curso
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      setStatus((await getInvoiceFactsStatus()).data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const run = async (maxDays) => {
    setRunning(maxDays);
    setResult(null);
    setError(null);
    try {
      const data = await syncInvoiceFacts(maxDays);
      setStatus(data.status);
      if (data.code === 'sync_in_progress') {
        // Otra carga de esta tienda sigue corriendo en el servidor (ej. se
        // salió de la página y se volvió a dar clic, o el cron de la noche).
        setError(data.message);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e.code === 'alegra_not_configured' ? `${e.message}.` : e.message);
    } finally {
      setRunning(null);
    }
  };

  const q = status?.quality;
  const items = status?.items;
  const hours = status?.hours;
  // Antes no miraba la hora: con facturas y prendas completas apagaba los
  // botones aunque faltara recargar los días para Día y hora.
  const done = status && status.missing_days === 0 && (items?.missing_days ?? 0) === 0
    && (hours?.missing_days ?? 0) === 0;
  const loaded = isHours ? (hours?.loaded_days ?? 0) : isGarments ? (items?.loaded_days ?? 0) : status?.loaded_days;
  const nextMissing = isHours ? hours?.next_missing_day : isGarments ? items?.next_missing_day : status?.next_missing_day;
  const progress = status?.total_days ? (loaded * 100) / status.total_days : 0;

  return (
    <section className="min-w-0 rounded-2xl bg-white ring-1 ring-gray-900/5 shadow-sm p-4 sm:p-6" aria-label="Facturas guardadas">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-gray-100"><Database className="w-5 h-5 text-gray-700" /></div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{isHours ? 'Horas guardadas' : isGarments ? 'Prendas guardadas' : 'Facturas guardadas'}</h2>
          <p className="text-sm text-gray-500">
            {isHours
              ? 'Hora de cada factura desde el 1 de enero. Los días guardados antes de esta pestaña se vuelven a cargar del más reciente hacia atrás; se completa sola cada noche (31 días) y aquí se puede adelantar.'
              : isGarments
              ? 'Copia de las prendas de cada factura desde el 1 de enero, para calcular estas cifras sin consultar Alegra día por día. Se carga del día más reciente hacia atrás; se completa sola cada noche (31 días) y aquí se puede adelantar.'
              : 'Copia del resumen de cada factura (cliente, cédula, vendedora, descuento) para calcular lo que el reporte de Alegra no trae. Se completa sola cada noche; aquí se puede adelantar.'}
          </p>
        </div>
      </div>

      {loading && !status && (
        <p className="mt-4 flex items-center gap-2 text-sm text-gray-600" role="status">
          <Loader2 className="w-4 h-4 animate-spin" /> Consultando…
        </p>
      )}

      {status && (
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-medium text-gray-900">
                {formatInt(loaded)} de {formatInt(status.total_days)} días {isHours ? 'con hora' : isGarments ? 'con prendas' : 'cargados'}
              </span>
              <span className="text-xs text-gray-500">
                {longDate(status.start)} – {longDate(status.end)} · {formatInt(status.invoices)} facturas
              </span>
            </div>
            <div className="mt-1.5 h-3 rounded-[4px] bg-gray-100" role="img"
              aria-label={`${Math.round(progress)} % de los días cargados`}>
              <div className="h-full rounded-[4px]" style={{ width: `${progress}%`, backgroundColor: INK }} />
            </div>
            {!done && nextMissing && (
              <p className="mt-1 text-xs text-gray-500">Siguiente día por cargar: {longDate(nextMissing)}</p>
            )}
            {!isHours && hours && hours.missing_days > 0 && status.missing_days === 0 && (items?.missing_days ?? 0) === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {isGarments ? 'Prendas completas' : 'Facturas completas'}. Falta la hora de {daysLabel(hours.missing_days)} (pestaña Día y hora): se cargan con los mismos botones.
              </p>
            )}
            {!isGarments && !isHours && items && items.missing_days > 0 && status.missing_days === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                Facturas completas. Faltan las prendas de {daysLabel(items.missing_days)} (pestaña Prendas): se cargan con los mismos botones.
              </p>
            )}
          </div>

          {!isGarments && !isHours && q && q.active_invoices > 0 && (
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">Con vendedora</dt>
                <dd className="font-semibold text-gray-900 tabular-nums">{pctOf(q.with_seller, q.active_invoices)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Con cédula</dt>
                <dd className="font-semibold text-gray-900 tabular-nums">{pctOf(q.with_identification, q.active_invoices)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Con descuento</dt>
                <dd className="font-semibold text-gray-900 tabular-nums">
                  {formatInt(q.with_discount)} <span className="text-xs font-normal text-gray-500">({formatCOP(q.discount)})</span>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Venta guardada</dt>
                <dd className="font-semibold text-gray-900 tabular-nums">
                  {formatCOP(q.total)}
                  {q.voided_invoices > 0 && <span className="block text-xs font-normal text-gray-500">{formatInt(q.voided_invoices)} anuladas aparte</span>}
                </dd>
              </div>
            </dl>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => run(1)} disabled={!!running || done}
              className="h-9 px-3 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50">
              Cargar 1 día (prueba)
            </button>
            <button onClick={() => run(31)} disabled={!!running || done}
              className="h-9 px-3 rounded-full text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50">
              Cargar siguiente tanda (31 días)
            </button>
            {running && (
              <span className="flex items-center gap-2 text-sm text-gray-600" role="status">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando {running === 1 ? '1 día' : `hasta ${running} días`}… puede tardar hasta 3 minutos.
                Si sales de la página la carga sigue en el servidor; al volver, espera a que termine.
              </span>
            )}
            {done && <span className="text-sm text-gray-600">Todo el periodo está cargado.</span>}
          </div>

          {result && (
            <p className={`text-sm ${result.success ? 'text-gray-700' : 'text-amber-800'}`} role="status">
              {result.backfill.synced_days.length
                ? `Se ${result.backfill.synced_days.length === 1 ? 'cargó' : 'cargaron'} ${daysLabel(result.backfill.synced_days.length)} (${formatInt(result.backfill.invoices)} facturas). `
                : 'No se cargó ningún día. '}
              {result.backfill.stopped_by_time && 'Se detuvo por tiempo; vuelve a darle para seguir. '}
              {!result.success && `Alegra falló en el ${longDate(result.backfill.failed_day || result.recent.failed_day)}: ${result.message}. Lo cargado se conserva; vuelve a intentar.`}
            </p>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
};

export default InvoiceFactsPanel;

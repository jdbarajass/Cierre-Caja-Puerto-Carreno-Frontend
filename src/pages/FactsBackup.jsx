// Estadísticas → Respaldo de facturas (docs/PLAN_BLINDAJE_COPIA.md del backend).
// La plataforma guarda su propia copia de las facturas desde el 1-ene-2026.
// Antes de una anulación masiva en Alegra (como la de las POS de 2025), el
// admin repasa y CONGELA la copia hasta una fecha: desde ahí la plataforma
// cuenta lo guardado y no lo que Alegra muestre anulado. También baja la copia
// en Excel.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck, RefreshCw, AlertCircle, Check, Download, Lock, ListChecks, Square, Info,
} from 'lucide-react';
import { getFreezeStatus, startReview, freezeCopy, downloadBackup } from '../services/factsFreezeService';
import { syncInvoiceFacts } from '../services/customerInsightsService';
import { getActiveStoreCode } from '../utils/activeStore';
import { getColombiaTodayString } from '../utils/dateUtils';
import useDocumentTitle from '../hooks/useDocumentTitle';

const fmt = (v) =>
  v == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.round(v));
const num = (v) => (v == null ? '—' : Math.round(v).toLocaleString('es-CO'));

const shiftDay = (iso, days) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
};
const longDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${d} de ${months[m - 1]} de ${y}`;
};

const FactsBackup = () => {
  useDocumentTitle('Respaldo de facturas');
  const today = getColombiaTodayString();
  const yesterday = shiftDay(today, -1);
  const [until, setUntil] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const stopRef = useRef(false);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 5000); };

  const load = useCallback(async (u) => {
    setLoading(true);
    setError('');
    try {
      const st = await getFreezeStatus(u);
      setData(st);
      if (!u) setUntil(st.until);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changeUntil = (v) => {
    const value = v > yesterday ? yesterday : v;
    setUntil(value);
    if (value) load(value);
  };

  // Repaso: marca los días y los vuelve a descargar por tandas hasta terminar
  const runReview = async (mark) => {
    setBusy('review');
    setError('');
    stopRef.current = false;
    try {
      let st = mark ? await startReview(until) : await getFreezeStatus(until);
      setData(st);
      while (st.pending_days > 0 && !stopRef.current) {
        const r = await syncInvoiceFacts(31);
        st = await getFreezeStatus(until);
        setData(st);
        if (r && r.success === false && r.message) throw new Error(`Alegra falló a mitad de la tanda: ${r.message}. Vuelve a intentarlo.`);
      }
      if (st.pending_days === 0) flash('Listo: todos los días hasta esa fecha quedaron guardados y repasados.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const handleFreeze = async () => {
    setBusy('freeze');
    setError('');
    try {
      const st = await freezeCopy(until, confirmText);
      setData(st);
      setConfirmText('');
      flash(`Copia congelada hasta el ${longDate(until)}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const handleBackup = async () => {
    setBusy('backup');
    setError('');
    try {
      await downloadBackup(year, getActiveStoreCode());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const frozen = data?.frozen;
  const loadedDays = data ? data.total_days - data.pending_days : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-emerald-600" /> Respaldo de facturas</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">
            La plataforma guarda su propia copia de todas las facturas desde el 1 de enero de 2026 (cada noche a las 9 pm).
            Si algún día se anulan facturas en Alegra de forma masiva, congela la copia <b>antes</b>: así las estadísticas,
            metas y cuentas siguen mostrando las ventas reales.
          </p>
        </div>
        <button onClick={() => load(until)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}
      {success && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700"><Check className="w-4 h-4" /> {success}</div>}

      {frozen ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
          <p className="font-semibold text-emerald-900 flex items-center gap-1.5"><Lock className="w-4 h-4" /> Copia congelada hasta el {longDate(frozen.until)}</p>
          <p className="text-emerald-900 mt-1">
            Congelada el {new Date(frozen.frozen_at).toLocaleString('es-CO')} con {num(frozen.invoices)} facturas ({fmt(frozen.active_total)} en ventas vigentes).
            Esos días ya no se vuelven a descargar de Alegra: si allá aparecen anuladas, la plataforma las sigue contando como venta.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 flex gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>La copia <b>no está congelada</b>: se sigue guardando cada noche y refleja las anulaciones normales (las del mismo día o de los 3 días siguientes). Congélala solo cuando sepas que viene una anulación masiva.</span>
        </div>
      )}

      {/* ── Qué hay guardado ─────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-700">Lo que tiene guardado la plataforma</p>
            <p className="text-[11px] text-gray-500">Del 1 de enero de 2026 hasta el día que elijas.</p>
          </div>
          <label className="text-xs text-gray-600">Hasta el día
            <input type="date" aria-label="Hasta el día" value={until} min="2026-01-01" max={yesterday}
              onChange={e => changeUntil(e.target.value)}
              className="block mt-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm" />
          </label>
        </div>
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-[11px] text-gray-500 uppercase">Días guardados</p>
              <p className="text-lg font-bold text-gray-900">{num(loadedDays)} <span className="text-sm font-normal text-gray-500">de {num(data.total_days)}</span></p>
              {data.pending_days > 0 && <p className="text-[11px] text-amber-700">Faltan {num(data.pending_days)} por cargar o repasar</p>}
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-[11px] text-gray-500 uppercase">Facturas</p>
              <p className="text-lg font-bold text-gray-900">{num(data.invoices)}</p>
              <p className="text-[11px] text-gray-500">{num(data.voided_invoices)} anuladas de verdad</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-[11px] text-gray-500 uppercase">Ventas vigentes</p>
              <p className="text-lg font-bold text-gray-900">{fmt(data.active_total)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-[11px] text-gray-500 uppercase">Prendas vendidas</p>
              <p className="text-lg font-bold text-gray-900">{num(data.items)}</p>
              <p className="text-[11px] text-gray-500">renglones guardados</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <select aria-label="Año del respaldo" value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm">
            {Array.from({ length: Number(today.slice(0, 4)) - 2024 }, (_, i) => 2025 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleBackup} disabled={!!busy}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Download className="w-4 h-4" /> {busy === 'backup' ? 'Generando…' : 'Descargar respaldo en Excel'}
          </button>
          <span className="text-[11px] text-gray-500">Facturas, prendas vendidas y prendas de anuladas del año. Guárdalo fuera de la plataforma.</span>
        </div>
      </div>

      {/* ── Proteger antes de la anulación masiva ─────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><ListChecks className="w-4 h-4 text-indigo-500" /> Proteger antes de una anulación masiva</p>
          <p className="text-[11px] text-gray-500">Hazlo unos días antes de que se anulen las facturas en Alegra, eligiendo arriba hasta qué día proteger (por ejemplo, el 31 de diciembre).</p>
        </div>

        <div className="border-l-2 border-indigo-200 pl-3 space-y-1.5">
          <p className="text-sm font-medium text-gray-800">1. Repasar todo (recomendado)</p>
          <p className="text-xs text-gray-600">
            Vuelve a descargar de Alegra cada día hasta esa fecha, una sola vez, para que la copia tenga también las anulaciones reales que se hicieron días después
            (cada noche solo se repasan los últimos 3 días). Va por tandas de 31 días: deja la página abierta; si la cierras, sigue sola cada noche.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => runReview(true)} disabled={!!busy || !until}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-700 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${busy === 'review' ? 'animate-spin' : ''}`} /> {busy === 'review' ? `Repasando… faltan ${num(data?.pending_days)} días` : 'Repasar todo hasta esa fecha'}
            </button>
            {busy !== 'review' && data?.pending_days > 0 && (
              <button onClick={() => runReview(false)} disabled={!!busy}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Seguir cargando lo que falta ({num(data.pending_days)} días)
              </button>
            )}
            {busy === 'review' && (
              <button onClick={() => { stopRef.current = true; }} className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">
                <Square className="w-3.5 h-3.5" /> Parar después de esta tanda
              </button>
            )}
            {data?.review && <span className="text-[11px] text-gray-500">Último repaso pedido el {new Date(data.review.started_at).toLocaleString('es-CO')} (hasta el {data.review.until}).</span>}
          </div>
        </div>

        <div className="border-l-2 border-emerald-200 pl-3 space-y-1.5">
          <p className="text-sm font-medium text-gray-800">2. Congelar la copia hasta el {longDate(until)}</p>
          <p className="text-xs text-gray-600">
            Desde ese momento esos días no se vuelven a descargar de Alegra. Las facturas que Alegra muestre anuladas después (la anulación masiva) seguirán contando como venta
            en Totales, Documentos, Analytics, Productos, Clientes, Prendas, Metas, Comparativo y Cuentas. Las que ya estaban anuladas en la copia siguen anuladas.
            No se puede deshacer, solo extender a una fecha posterior.
          </p>
          {data && !data.ready && (
            <p className="text-xs text-amber-800 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Primero tienen que estar guardados todos los días: faltan {num(data.pending_days)}.</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <input aria-label="Confirmación" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Escribe CONGELAR"
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm w-44" />
            <button onClick={handleFreeze}
              disabled={!!busy || !data?.ready || confirmText.trim().toUpperCase() !== 'CONGELAR' || (frozen && until <= frozen.until)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-50">
              <Lock className="w-4 h-4" /> {busy === 'freeze' ? 'Congelando…' : frozen ? 'Extender el congelamiento' : 'Congelar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FactsBackup;

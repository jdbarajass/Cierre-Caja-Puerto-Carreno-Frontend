// Cuentas → Mes (Fase 2 del plan docs/PLAN_CUENTAS_DIARIAS.md del backend).
// La "hoja del mes" del Excel en una sola pantalla: ventas diarias por los
// 10 medios de pago (traídas de Alegra), estado de cada cuenta (saldo inicial
// + ventas − recompras − gastos ± ajustes = saldo final) con el saldo real
// del banco, plata del datáfono/Addi que todavía no llega y cerrar el mes.
import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Check, DownloadCloud, Lock, Unlock,
  CalendarDays, Landmark, Hourglass, ChevronDown, AlertTriangle, Pencil, Trash2, ArrowRight, X,
} from 'lucide-react';
import {
  getMonthSheet, syncPayments, saveReconciliation, registerCommissions, closeMonth, reopenMonth,
  createCorrection, deleteCorrection,
} from '../services/monthSheetService';
import LiveMoneyInput from '../components/common/LiveMoneyInput';
import { getColombiaDate } from '../utils/dateUtils';
import useDialog from '../hooks/useDialog';

const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.round(v || 0));
const fmtCell = (v) => (Math.round(v || 0) ? fmt(v) : '');
const fmtSigned = (v) => (Math.round(v || 0) ? `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}` : '—');

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

// Los 10 medios de venta, en el orden de las columnas del Excel
const MEDIOS = [
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'qr', label: 'QR' },
  { key: 'ahorro', label: 'Ahorro', hint: 'Datáfono débito' },
  { key: 'credito', label: 'Crédito', hint: 'Datáfono crédito' },
  { key: 'nequi', label: 'Nequi' },
  { key: 'addi', label: 'Addi' },
  { key: 'bbva', label: 'BBVA' },
  { key: 'daviplata', label: 'Daviplata' },
  { key: 'sistecredito', label: 'SisteCrédito' },
  { key: 'bold', label: 'Bold' },
];
const MEDIO_LABEL = Object.fromEntries(MEDIOS.map(m => [m.key, m.label]));

// Tarjetas: llegan a la misma cuenta (Bancolombia …6018) pero con comisión y
// día de llegada distintos. Datáfono = débito (ahorro) + crédito.
const CARD_GROUPS = [
  { key: 'datafono', label: 'Datáfono', detail: 'débito + crédito', medios: ['ahorro', 'credito'], fee: '3,8 %', when: 'siguiente día hábil' },
  { key: 'addi', label: 'Addi', detail: '', medios: ['addi'], fee: '7,735 %', when: '30 días después' },
];
const TRANSIT_LABEL = { ahorro: 'Datáfono débito', credito: 'Datáfono crédito', addi: 'Addi' };

// Suma por grupo (datáfono / Addi) de la plata por llegar y de las comisiones
const cardGroups = (tr, comm) => CARD_GROUPS.map(g => {
  const items = (tr?.items || []).filter(i => g.medios.includes(i.medio));
  const byMedio = comm?.by_medio || {};
  return {
    ...g,
    gross: items.reduce((a, i) => a + i.gross, 0),
    net: items.reduce((a, i) => a + i.net, 0),
    next: items.map(i => i.arrival_date).sort()[0] || null,
    sales: g.medios.reduce((a, m) => a + (byMedio[m]?.sales || 0), 0),
    commission: g.medios.reduce((a, m) => a + (byMedio[m]?.fee || 0), 0),
  };
});

const RATINGS = {
  mala: { label: 'Venta mala', short: 'Mala', cls: 'bg-red-100 text-red-700', hint: 'hasta $680.000' },
  bajita: { label: 'Venta bajita', short: 'Bajita', cls: 'bg-amber-100 text-amber-800', hint: 'hasta $1.000.000' },
  buena: { label: 'Venta buena', short: 'Buena', cls: 'bg-emerald-100 text-emerald-800', hint: 'hasta $2.000.000' },
  alta: { label: 'Venta alta', short: 'Alta', cls: 'bg-indigo-100 text-indigo-800', hint: 'más de $2.000.000' },
};

const STATEMENT_COLS = [
  { key: 'ventas', label: 'Ventas (cierres)' },
  // Excedentes del cierre (cambios de prenda, tarjeta regalo, vueltas): no son venta
  { key: 'excedentes', label: 'Excedentes' },
  { key: 'recompras', label: 'Recompras' },
  { key: 'gastos', label: 'Gastos' },
  { key: 'entradas', label: 'Entradas' },
  { key: 'ajustes', label: 'Ajustes' },
  { key: 'transferencias', label: 'Transferencias' },
];

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dateLong = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS_SHORT[m - 1]}`;
};

const dayLabel = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${d}`;
};

const CuentasMes = ({ onEntriesChanged } = {}) => {
  const now = getColombiaDate();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [realDraft, setRealDraft] = useState({}); // account_id -> string de dígitos
  const [openAccount, setOpenAccount] = useState(null);
  const [openDay, setOpenDay] = useState(null);
  const [closeNotes, setCloseNotes] = useState('');
  // Corrección del medio de pago de un día: { date, from_medio, to_medio, amount, note }
  const [fix, setFix] = useState(null);
  // Detalle de la plata por llegar de un grupo ('datafono' | 'addi')
  const [pendingGroup, setPendingGroup] = useState(null);
  const pendingRef = useDialog(!!pendingGroup, () => setPendingGroup(null));

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMonthSheet({ year, month });
      setSheet(data);
      setRealDraft(Object.fromEntries((data.statement || []).map(r => [
        r.account_id, r.real_balance != null ? String(Math.round(Math.max(r.real_balance, 0))) : '',
      ])));
      setCloseNotes(data.closed?.notes || '');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const run = async (key, fn, okMsg) => {
    setBusy(key);
    setError('');
    try {
      const result = await fn();
      if (okMsg) flash(typeof okMsg === 'function' ? okMsg(result) : okMsg);
      await load();
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy('');
    }
  };

  const handleSync = () => run('sync', () => syncPayments(), r => `Ventas traídas de Alegra: ${r.payments} pagos desde ${r.since}`);
  const handleCommissions = () => run('comm', async () => {
    const r = await registerCommissions({ year, month });
    onEntriesChanged?.();
    return r;
  }, r => (r.total ? `Comisión de ${fmt(r.total)} registrada en Gastos y descontada de ADDI + DATÁFONO` : 'No hay comisiones este mes'));
  const handleClose = () => run('close', () => closeMonth({ year, month, notes: closeNotes }), 'Mes cerrado: quedó guardada la foto del mes');
  const handleReopen = () => {
    if (!window.confirm('¿Reabrir el mes? Se borra la foto guardada al cerrarlo.')) return;
    run('close', () => reopenMonth({ year, month }), 'Mes reabierto');
  };
  const startFix = (d) => {
    // Lo más común: una venta de tarjeta (datáfono/Addi/Bold) que al final fue en efectivo
    const from = ['ahorro', 'credito', 'addi', 'bold', 'qr', 'nequi', 'bbva', 'daviplata', 'sistecredito', 'efectivo']
      .find(k => d.medios[k] > 0) || 'efectivo';
    setFix({ date: d.date, from_medio: from, to_medio: from === 'efectivo' ? 'qr' : 'efectivo',
      amount: String(Math.round(d.medios[from] || 0)), note: '' });
  };
  const fixDay = fix && sheet?.sales?.days?.find(d => d.date === fix.date);
  const handleSaveFix = async (e) => {
    e.preventDefault();
    const r = await run('fix', () => createCorrection({ ...fix, amount: Number(fix.amount) || 0 }),
      `Corregido: ${fmt(fix.amount)} de ${MEDIO_LABEL[fix.from_medio]} a ${MEDIO_LABEL[fix.to_medio]}`);
    if (r) setFix(null);
  };
  const handleDeleteFix = (c) => {
    if (!window.confirm(`¿Quitar la corrección de ${fmt(c.amount)} (${MEDIO_LABEL[c.from_medio]} → ${MEDIO_LABEL[c.to_medio]})?`)) return;
    run('fix', () => deleteCorrection(c.id), 'Corrección quitada');
  };
  const corrections = sheet?.corrections || [];

  const handleSaveReal = (row) => run(`real-${row.account_id}`, () => saveReconciliation({
    period: sheet.period,
    account_id: row.account_id,
    real_balance: realDraft[row.account_id] === '' ? null : Number(realDraft[row.account_id]),
  }), 'Saldo real guardado');

  const sales = sheet?.sales;
  const comm = sheet?.commissions;
  const tr = sheet?.transit;
  const visibleMedios = MEDIOS.filter(m => sales && (sales.totals[m.key] || ['efectivo', 'qr', 'ahorro', 'credito', 'nequi', 'addi'].includes(m.key)));
  const reviewDays = (sales?.days || []).filter(d => d.needs_review > 0).length;
  const groups = cardGroups(tr, comm);

  return (
    <div className="space-y-5">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hoja del mes</h2>
          <p className="text-sm text-gray-500 mt-1">Ventas por medio de pago, saldo de cada cuenta, plata por llegar y cierre del mes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button onClick={handleSync} disabled={!!busy}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            <DownloadCloud className="w-4 h-4" /> {busy === 'sync' ? 'Trayendo de Alegra…' : 'Traer ventas de Alegra'}
          </button>
        </div>
      </div>
      {busy === 'sync' && (
        <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          Trayendo los pagos de Alegra. La primera vez puede tardar 1 a 2 minutos (trae todo desde el 1 de septiembre);
          después solo trae los últimos días y es rápido. No cierres esta página.
        </p>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <Check className="w-4 h-4" /> {success}
        </div>
      )}

      {/* ── Mes + resumen ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <button onClick={prevMonth} aria-label="Mes anterior" className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{MONTHS[month - 1]} {year}</p>
            {sheet?.closed
              ? <p className="text-xs text-emerald-700 font-semibold mt-0.5 flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> Cerrado</p>
              : <p className="text-xs text-gray-500 mt-0.5">Abierto</p>}
          </div>
          <button onClick={nextMonth} aria-label="Mes siguiente" className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Venta del mes (Alegra)</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(sales?.total)}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(RATINGS).map(([k, r]) => (
              <span key={k} title={`${r.label} (${r.hint})`} className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${r.cls}`}>
                {r.short} {sales?.ratings?.[k]?.count || 0}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Comisiones del mes</p>
          <p className="text-2xl font-bold text-orange-800">{fmt(comm?.total)}</p>
          <div className="mt-1 space-y-0.5 text-[11px] text-gray-700">
            {groups.map(g => (
              <p key={g.key} className="flex justify-between gap-2">
                <span>{g.label} {g.fee}{g.key === 'addi' && <span className="text-gray-500"> (6,5 % + IVA)</span>}</span>
                <span className="font-semibold whitespace-nowrap" title={`De ${fmt(g.sales)} vendidos`}>{fmt(g.commission)}</span>
              </p>
            ))}
          </div>
          {comm && comm.total > 0 && (
            comm.registered_amount === comm.total
              ? <p className="text-[11px] text-emerald-700 font-semibold mt-1">✓ Registradas en Gastos</p>
              : (
                <button onClick={handleCommissions} disabled={!!busy}
                  className="mt-1.5 px-2.5 py-1 text-xs font-medium bg-orange-700 text-white rounded-lg hover:bg-orange-800 disabled:opacity-50">
                  {comm.registered_amount ? 'Actualizar en Gastos' : 'Registrar en Gastos'}
                </button>
              )
          )}
        </div>
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Por llegar (datáfono y Addi)</p>
          <p className="text-2xl font-bold text-sky-800">{fmt(tr?.net)}</p>
          <p className="text-[11px] text-gray-600">Total datáfono + Addi, neto (de {fmt(tr?.gross)} vendidos)</p>
          <div className="mt-1 space-y-0.5 text-[11px] text-gray-700">
            {groups.map(g => (
              <button key={g.key} type="button" onClick={() => setPendingGroup(g.key)} disabled={!g.gross}
                title={g.gross ? `Ver qué falta que llegue de ${g.label}` : undefined}
                className="w-full flex justify-between gap-2 text-left rounded px-1 -mx-1 hover:bg-sky-100 disabled:hover:bg-transparent disabled:cursor-default">
                <span>
                  <span className={g.gross ? 'underline decoration-dotted underline-offset-2' : ''}>{g.label}</span>
                  {g.next && <span className="text-gray-500"> · {g.key === 'addi' ? 'próxima' : 'llega'} {dayLabel(g.next)}</span>}
                </span>
                <span className="font-semibold whitespace-nowrap">{fmt(g.net)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {sheet?.closed && (
        <div className="flex items-start justify-between gap-3 flex-wrap p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
          <div>
            <p className="font-semibold text-emerald-800 flex items-center gap-1.5"><Lock className="w-4 h-4" /> Mes cerrado {sheet.closed.closed_at && `el ${new Date(sheet.closed.closed_at).toLocaleString('es-CO')}`}</p>
            {sheet.closed.notes && <p className="text-emerald-900 mt-1">{sheet.closed.notes}</p>}
            {sheet.closed.changed_accounts.length > 0 && (
              <p className="text-amber-800 mt-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />
                Cambió después de cerrar: {sheet.closed.changed_accounts.join(', ')}. Si está bien, vuelve a cerrar el mes para actualizar la foto.
              </p>
            )}
          </div>
          <button onClick={handleReopen} disabled={!!busy} className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 text-emerald-800 rounded-lg hover:bg-emerald-100">
            <Unlock className="w-4 h-4" /> Reabrir
          </button>
        </div>
      )}

      {loading && !sheet ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : sheet && (
        <>
          {/* ── Ventas diarias ─────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-gray-700">Ventas diarias por medio de pago</span>
              </div>
              {reviewDays > 0 && (
                <span className="text-[11px] text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {reviewDays} día(s) con un pago en una cuenta rara de Alegra (se contó como QR): revísalo
                </span>
              )}
            </div>
            {sales.before_start ? (
              <p className="px-4 py-8 text-sm text-gray-500 text-center">Las ventas por medio se llevan desde el {sheet.payments_start}. Los meses anteriores siguen en el Excel.</p>
            ) : !sales.has_data ? (
              <p className="px-4 py-8 text-sm text-gray-500 text-center">
                Todavía no hay ventas traídas de Alegra para este mes. Toca <b>“Traer ventas de Alegra”</b> (también se cargan solas cada noche a las 9 pm).
              </p>
            ) : (
              <>
                <ul className="sm:hidden divide-y divide-gray-100">
                  {sales.days.map(d => (
                    <li key={d.date} className="px-4 py-2.5">
                      <button className="w-full flex items-center justify-between gap-2 text-left" onClick={() => setOpenDay(o => (o === d.date ? null : d.date))}>
                        <span className="text-sm text-gray-800 capitalize">
                          {dayLabel(d.date)}{d.corrected && <Pencil title="Corregido a mano" className="inline w-3 h-3 ml-1 text-indigo-500" />}
                        </span>
                        <span className="flex items-center gap-2">
                          {d.rating && <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${RATINGS[d.rating].cls}`}>{RATINGS[d.rating].short}</span>}
                          <span className="text-sm font-bold text-gray-900">{fmt(d.total)}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 ${openDay === d.date ? 'rotate-180' : ''}`} />
                        </span>
                      </button>
                      {openDay === d.date && (
                        <div className="mt-1.5 grid grid-cols-2 gap-x-4 text-xs text-gray-600">
                          {MEDIOS.filter(m => d.medios[m.key]).map(m => (
                            <span key={m.key} className="flex justify-between"><span>{m.label}</span><span>{fmt(d.medios[m.key])}</span></span>
                          ))}
                          {d.total > 0 && !sheet.closed && (
                            <button onClick={() => startFix(d)} className="col-span-2 mt-1.5 flex items-center gap-1 text-indigo-700 font-medium">
                              <Pencil className="w-3.5 h-3.5" /> Corregir medio de pago
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                  <li className="px-4 py-3 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total del mes por medio</p>
                    <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-700">
                      {MEDIOS.filter(m => sales.totals[m.key]).map(m => (
                        <span key={m.key} className="flex justify-between"><span>{m.label}</span><span className="font-semibold">{fmt(sales.totals[m.key])}</span></span>
                      ))}
                    </div>
                  </li>
                </ul>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-sky-600 text-white text-xs uppercase tracking-wide">
                        <th className="text-left px-3 py-2.5 sticky left-0 bg-sky-600">Día</th>
                        {visibleMedios.map(m => <th key={m.key} title={m.hint} className="text-right px-3 py-2.5 whitespace-nowrap">{m.label}</th>)}
                        {sales.totals.otro > 0 && <th className="text-right px-3 py-2.5">Otro</th>}
                        <th className="text-right px-3 py-2.5 bg-emerald-600">Total</th>
                        <th className="text-left px-3 py-2.5">Venta</th>
                        <th className="px-2 py-2.5"><span className="sr-only">Corregir</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sales.days.map((d, i) => (
                        <tr key={d.date} className={i % 2 ? 'bg-sky-50/50' : 'bg-white'}>
                          <td className={`px-3 py-1.5 whitespace-nowrap capitalize sticky left-0 ${i % 2 ? 'bg-sky-50' : 'bg-white'}`}>
                            {dayLabel(d.date)}{d.needs_review > 0 && <AlertTriangle title="Hay un pago en una cuenta rara de Alegra" className="inline w-3.5 h-3.5 ml-1 text-amber-600" />}
                            {d.corrected && <Pencil title="Corregido a mano (ver abajo)" className="inline w-3 h-3 ml-1 text-indigo-500" />}
                          </td>
                          {visibleMedios.map(m => <td key={m.key} className="px-3 py-1.5 text-right text-gray-700 whitespace-nowrap">{fmtCell(d.medios[m.key])}</td>)}
                          {sales.totals.otro > 0 && <td className="px-3 py-1.5 text-right text-gray-700">{fmtCell(d.medios.otro)}</td>}
                          <td className="px-3 py-1.5 text-right font-semibold text-gray-900 whitespace-nowrap">{fmtCell(d.total)}</td>
                          <td className="px-3 py-1.5">
                            {d.rating && <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${RATINGS[d.rating].cls}`}>{RATINGS[d.rating].label}</span>}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {d.total > 0 && !sheet.closed && (
                              <button onClick={() => startFix(d)} title="Corregir el medio de pago de este día"
                                aria-label={`Corregir medio de pago del ${dayLabel(d.date)}`}
                                className="p-1 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-700">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-800 text-white font-bold">
                        <td className="px-3 py-2.5 sticky left-0 bg-gray-800">Total</td>
                        {visibleMedios.map(m => <td key={m.key} className="px-3 py-2.5 text-right whitespace-nowrap">{fmtCell(sales.totals[m.key])}</td>)}
                        {sales.totals.otro > 0 && <td className="px-3 py-2.5 text-right">{fmtCell(sales.totals.otro)}</td>}
                        <td className="px-3 py-2.5 text-right bg-emerald-700 whitespace-nowrap">{fmt(sales.total)}</td>
                        <td />
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {fix && fixDay && (
                  <form onSubmit={handleSaveFix} className="border-t border-indigo-100 bg-indigo-50/60 px-4 py-3 space-y-2">
                    <p className="text-sm font-semibold text-indigo-900">Corregir medio de pago · <span className="capitalize">{dayLabel(fix.date)}</span></p>
                    <p className="text-[11px] text-gray-600">Para cuando en Alegra quedó un medio equivocado (ej. se pasó por datáfono y al final pagó en efectivo). Mueve el valor de un medio a otro; el total del día no cambia y Alegra no se toca.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">De</label>
                        <select aria-label="Medio de origen" value={fix.from_medio}
                          onChange={e => setFix(f => ({ ...f, from_medio: e.target.value, amount: String(Math.round(fixDay.medios[e.target.value] || 0)),
                            to_medio: f.to_medio === e.target.value ? (e.target.value === 'efectivo' ? 'qr' : 'efectivo') : f.to_medio }))}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white">
                          {MEDIOS.filter(m => fixDay.medios[m.key] > 0).map(m => (
                            <option key={m.key} value={m.key}>{m.label} ({fmt(fixDay.medios[m.key])})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">A</label>
                        <select aria-label="Medio correcto" value={fix.to_medio} onChange={e => setFix(f => ({ ...f, to_medio: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white">
                          {MEDIOS.filter(m => m.key !== fix.from_medio).map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Valor</label>
                        <LiveMoneyInput value={fix.amount} onChange={v => setFix(f => ({ ...f, amount: v }))} required
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Nota (opcional)</label>
                        <input value={fix.note} onChange={e => setFix(f => ({ ...f, note: e.target.value }))} placeholder="Ej. la tarjeta no pasó"
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white" />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={!!busy || !Number(fix.amount)}
                          className="px-3 py-1.5 bg-indigo-700 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
                          {busy === 'fix' ? 'Guardando…' : 'Guardar'}
                        </button>
                        <button type="button" onClick={() => setFix(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 bg-white">Cancelar</button>
                      </div>
                    </div>
                  </form>
                )}
                {corrections.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><Pencil className="w-3 h-3" /> Correcciones a mano del mes</p>
                    <ul className="space-y-1">
                      {corrections.map(c => (
                        <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-gray-700">
                            <span className="capitalize">{dayLabel(c.date)}</span>: {fmt(c.amount)} de <b>{MEDIO_LABEL[c.from_medio]}</b>
                            <ArrowRight className="inline w-3.5 h-3.5 mx-1 text-gray-400" /><b>{MEDIO_LABEL[c.to_medio]}</b>
                            {c.note && <span className="text-gray-500"> · {c.note}</span>}
                          </span>
                          {!sheet.closed && (
                            <button onClick={() => handleDeleteFix(c)} disabled={!!busy} aria-label="Quitar corrección"
                              className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Estado por cuenta ──────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-gray-700">Plata en cada cuenta en {MONTHS[month - 1].toLowerCase()}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Saldo inicial (lo que quedó del mes anterior) + ventas + excedentes − recompras − gastos ± ajustes = saldo final. Los excedentes (plata que entró en el cierre pero no es venta de Alegra) van aparte de las ventas. Escribe el “saldo real” que ves en el banco o en la caja para ver la diferencia (debe dar $0). Toca una cuenta para verla día por día.
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {sheet.statement.map(row => {
                const open = openAccount === row.account_id;
                const diff = row.difference;
                return (
                  <div key={row.account_id} className="px-4 py-3">
                    <button onClick={() => setOpenAccount(o => (o === row.account_id ? null : row.account_id))} className="w-full text-left">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="font-semibold text-gray-800">{row.name}</span>
                        <span className="flex items-center gap-3 text-sm">
                          <span className="text-gray-500 hidden sm:inline">Inicial {fmt(row.initial)}</span>
                          <span className={`font-bold ${row.final < 0 ? 'text-red-700' : 'text-gray-900'}`}>Final {fmt(row.final)}</span>
                          {diff != null && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${Math.abs(diff) < 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                              {Math.abs(diff) < 1 ? 'Cuadra' : `Diferencia ${fmtSigned(diff)}`}
                            </span>
                          )}
                          <ChevronDown className={`w-4 h-4 text-gray-400 ${open ? 'rotate-180' : ''}`} />
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-600">
                        <span className="sm:hidden">Inicial {fmt(row.initial)}</span>
                        {STATEMENT_COLS.filter(c => Math.round(row[c.key])).map(c => (
                          <span key={c.key}>{c.label} <b className={row[c.key] < 0 ? 'text-red-700' : 'text-emerald-700'}>{fmtSigned(row[c.key])}</b></span>
                        ))}
                        {Math.round(row.excedentes || 0) !== 0 && (
                          <span>Ventas + excedentes <b className="text-emerald-800">{fmtSigned(row.ingresos_cierres)}</b></span>
                        )}
                      </div>
                    </button>

                    {row.payment_key === 'addi_datafono' && (row.in_transit_gross > 0 || row.pending_commission > 0) && (
                      <p className="mt-1.5 text-xs text-sky-900 bg-sky-50 rounded-lg px-3 py-2">
                        De este saldo, {fmt(row.in_transit_gross)} son ventas de datáfono/Addi que <b>todavía no llegan</b>
                        {row.pending_commission > 0 && <> y faltan {fmt(row.pending_commission)} de comisiones por descontar</>}.
                        {' '}Disponible estimado hoy: <b>{fmt(row.estimated_available)}</b>.
                      </p>
                    )}

                    <div className="mt-2 flex items-end gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                      <div className="w-44">
                        <label className="block text-[11px] text-gray-500 mb-0.5">Saldo real (banco / caja)</label>
                        <LiveMoneyInput value={realDraft[row.account_id] ?? ''} placeholder="Sin escribir"
                          onChange={v => setRealDraft(d => ({ ...d, [row.account_id]: v }))}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                      </div>
                      <button onClick={() => handleSaveReal(row)} disabled={!!busy}
                        className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                        {busy === `real-${row.account_id}` ? 'Guardando…' : 'Guardar'}
                      </button>
                    </div>

                    {open && (
                      row.days.length === 0 ? (
                        <p className="mt-2 text-xs text-gray-500">Sin movimientos este mes.</p>
                      ) : (
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-xs min-w-[720px]">
                            <thead>
                              <tr className="text-gray-500 uppercase">
                                <th className="text-left py-1">Día</th>
                                {STATEMENT_COLS.map(c => <th key={c.key} className="text-right py-1">{c.label}</th>)}
                                <th className="text-right py-1">Saldo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {row.days.map(d => (
                                <tr key={d.date}>
                                  <td className="py-1 capitalize whitespace-nowrap">{dayLabel(d.date)}</td>
                                  {STATEMENT_COLS.map(c => (
                                    <td key={c.key} className={`py-1 text-right whitespace-nowrap ${d[c.key] < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                      {Math.round(d[c.key] || 0) ? fmtSigned(d[c.key]) : ''}
                                    </td>
                                  ))}
                                  <td className="py-1 text-right font-semibold whitespace-nowrap">{fmt(d.balance)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Plata en tránsito ──────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Hourglass className="w-4 h-4 text-sky-600" />
                <span className="text-sm font-semibold text-gray-700">Plata por llegar (datáfono y Addi)</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Datáfono: llega el siguiente día hábil menos 3,8 %. Addi: llega 30 días después (o el siguiente día hábil) menos 7,735 %. Las dos a la cuenta Bancolombia …6018.
              </p>
            </div>
            {tr.items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 text-center">No hay plata pendiente por llegar al {tr.cutoff}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <th className="text-left px-4 py-2">Llega</th>
                      <th className="text-left px-3 py-2">Medio</th>
                      <th className="text-left px-3 py-2">Ventas del</th>
                      <th className="text-right px-3 py-2">Vendido</th>
                      <th className="text-right px-4 py-2">Llega (neto)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tr.items.map(i => (
                      <tr key={`${i.arrival_date}-${i.medio}`}>
                        <td className="px-4 py-2 whitespace-nowrap capitalize">{dayLabel(i.arrival_date)} <span className="text-gray-400 text-xs">{i.arrival_date.slice(5)}</span></td>
                        <td className="px-3 py-2">{TRANSIT_LABEL[i.medio] || MEDIO_LABEL[i.medio]}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{i.sales_dates.map(s => s.slice(5)).join(', ')}</td>
                        <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{fmt(i.gross)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-sky-800 whitespace-nowrap">{fmt(i.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {groups.filter(g => g.gross > 0).map(g => (
                      <tr key={g.key} className="bg-gray-50 text-gray-700">
                        <td className="px-4 py-1.5" colSpan={3}>{g.label}{g.detail && ` (${g.detail})`} <span className="text-xs text-gray-500">· menos {g.fee}, llega {g.when}</span></td>
                        <td className="px-3 py-1.5 text-right">{fmt(g.gross)}</td>
                        <td className="px-4 py-1.5 text-right font-semibold text-sky-800">{fmt(g.net)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-gray-50 border-t border-gray-200">
                      <td className="px-4 py-2" colSpan={3}>Total por llegar (datáfono + Addi)</td>
                      <td className="px-3 py-2 text-right">{fmt(tr.gross)}</td>
                      <td className="px-4 py-2 text-right text-sky-800">{fmt(tr.net)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ── Cerrar el mes ──────────────────────────────────────────── */}
          {!sheet.closed && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-700">Cerrar {MONTHS[month - 1].toLowerCase()}</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Guarda una “foto” de cómo quedó el mes (saldos, ventas, comisiones). Todo se puede seguir editando; si algo cambia después, aquí te avisa. Se puede reabrir.
              </p>
              <textarea aria-label="Notas del cierre" rows={2} value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
                placeholder="Notas del cierre (opcional)…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              <button onClick={handleClose} disabled={!!busy}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                <Lock className="w-4 h-4" /> {busy === 'close' ? 'Cerrando…' : 'Cerrar el mes'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Detalle de lo que falta por llegar (datáfono o Addi) ─────────── */}
      {pendingGroup && tr && (() => {
        const g = groups.find(x => x.key === pendingGroup);
        // Una fila por día de venta (como el reporte de pagos de Addi), la más próxima arriba
        const items = tr.items.filter(i => g.medios.includes(i.medio)).flatMap(i =>
          (i.by_sale || [{ date: i.sales_dates[0], gross: i.gross, net: i.net }]).map(s => ({ ...s, medio: i.medio, arrival_date: i.arrival_date })));
        const first = items[0]?.arrival_date;
        return (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end sm:items-center justify-center min-h-full sm:p-4">
              <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-[2px]" onClick={() => setPendingGroup(null)} />
              <div ref={pendingRef} role="dialog" aria-modal="true" aria-labelledby="dlg-pending" tabIndex={-1}
                className="relative w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl sm:max-w-2xl max-h-[92dvh] overflow-y-auto overscroll-contain">
                <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
                  <div>
                    <h3 id="dlg-pending" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Hourglass className="w-5 h-5 text-sky-600" /> {g.label}: lo que falta que llegue
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {g.key === 'addi'
                        ? 'Ventas con Addi (de este mes y de meses pasados) que Addi todavía no ha consignado. Paga 30 días después de la venta (o el siguiente día hábil), menos 7,735 % (6,5 % + IVA).'
                        : 'Ventas con tarjeta débito y crédito que todavía no llegan. Llegan el siguiente día hábil, menos 3,8 %.'}
                      {' '}Llega a la cuenta Bancolombia …6018. Calculado al {tr.cutoff}.
                    </p>
                  </div>
                  <button aria-label="Cerrar" onClick={() => setPendingGroup(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-sky-50 text-center">
                  <div><p className="text-[11px] text-gray-500 uppercase">Vendido</p><p className="font-semibold text-gray-800">{fmt(g.gross)}</p></div>
                  <div><p className="text-[11px] text-gray-500 uppercase">Comisión</p><p className="font-semibold text-orange-700">−{fmt(g.gross - g.net)}</p></div>
                  <div><p className="text-[11px] text-gray-500 uppercase">Te llega</p><p className="text-lg font-bold text-sky-800">{fmt(g.net)}</p></div>
                </div>
                <ul className="divide-y divide-gray-100">
                  {items.map((i, idx) => (
                    <li key={`${i.arrival_date}-${i.medio}-${i.date}-${idx}`} className="px-5 py-2.5 flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">
                          Llega {dateLong(i.arrival_date)}
                          {i.arrival_date === first && <span className="ml-2 normal-case px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[11px] font-semibold">Próximo</span>}
                        </p>
                        <p className="text-xs text-gray-500">
                          {g.key === 'datafono' && `${TRANSIT_LABEL[i.medio]} · `}Venta del {dateLong(i.date)} · vendido {fmt(i.gross)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sky-800 whitespace-nowrap">{fmt(i.net)}</p>
                        <p className="text-[11px] text-orange-700 whitespace-nowrap">−{fmt(i.gross - i.net)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                {g.key === 'addi' && (
                  <p className="px-5 py-3 text-[11px] text-gray-600 bg-gray-50 border-t border-gray-100">
                    Para revisar: en el <b>Reporte de pagos</b> de Addi, cada pago "Pendiente de pago" debe tener la misma fecha y el mismo "Total a pagar" que aquí.
                    Si una venta de aquí no aparece en Addi, probablemente se pasó por datáfono: corrígela con el lápiz ✎ de ese día.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default CuentasMes;

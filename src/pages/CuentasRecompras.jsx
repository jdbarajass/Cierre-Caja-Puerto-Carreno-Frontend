import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import {
  RefreshCw, Plus, Trash2, Pencil, X, Check, AlertCircle,
  ChevronRight, TrendingUp, ChevronLeft, ShoppingBag, ArrowDownCircle, Fuel
} from 'lucide-react';
import {
  getEntries, createEntry, updateEntry, deleteEntry,
  getPurchases, createPurchase, updatePurchase, deletePurchase
} from '../services/repurchaseService';

const fmt = (v) =>
  v != null && v !== 0
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v)
    : '';

const fmtForce = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PAYMENT_COLS = [
  { key: 'efectivo',  label: 'EFECTIVO'  },
  { key: 'datafono',  label: 'DATAFONO'  },
  { key: 'qr',        label: 'QR'        },
  { key: 'daviplata', label: 'DAVIPLATA' },
  { key: 'nequi',     label: 'NEQUI'     },
  { key: 'bbva',      label: 'BBVA'      },
];

const today = () => new Date().toISOString().split('T')[0];

const EMPTY_ENTRY = {
  date: today(), descripcion: 'Recompra Jhonatan',
  efectivo: '', datafono: '', qr: '',
  daviplata: '', nequi: '', bbva: '', sobrante_mes_anterior: '',
  fecha_compra: '', notes: '', feeOverride: ''
};

const EMPTY_PURCHASE = { date: today(), store: '', amount: '', category: 'ropa', notes: '' };

const PURCHASE_CATEGORIES = [
  { value: 'ropa', label: 'Compra de ropa', hint: 'Se soporta con factura' },
  { value: 'operacional', label: 'Gasto operacional', hint: 'Gasolina, bolsas, cajas, etc.' },
];

const CATEGORY_BADGE = {
  ropa:        { label: 'Ropa',        className: 'bg-indigo-100 text-indigo-700' },
  operacional: { label: 'Operacional', className: 'bg-amber-100 text-amber-700' },
};

// ─── Input de dinero con separador de miles EN VIVO (mientras se escribe) ────
// `value` es el número plano (string de dígitos, ej. "400000"); `onChange`
// recibe ese mismo formato. Formatea con puntos en cada tecla, recalculando
// dónde debe quedar el cursor para que no salte al escribir en medio del número.
const formatMiles = (raw) => (raw ? Number(raw).toLocaleString('es-CO') : '');

const LiveMoneyInput = ({ value, onChange, className, placeholder = '0', id, required = false }) => {
  const inputRef = useRef(null);
  const pendingCursor = useRef(null);

  useLayoutEffect(() => {
    if (pendingCursor.current != null && inputRef.current) {
      inputRef.current.setSelectionRange(pendingCursor.current, pendingCursor.current);
      pendingCursor.current = null;
    }
  });

  const handleChange = (e) => {
    const rawInput = e.target.value;
    const cursorPos = e.target.selectionStart ?? rawInput.length;
    const digitsBeforeCursor = rawInput.slice(0, cursorPos).replace(/[^0-9]/g, '').length;
    const newDigits = rawInput.replace(/[^0-9]/g, '');
    const newFormatted = formatMiles(newDigits);

    let newCursor = 0;
    if (digitsBeforeCursor > 0) {
      let count = 0;
      for (newCursor = 0; newCursor < newFormatted.length; newCursor++) {
        if (/[0-9]/.test(newFormatted[newCursor])) {
          count++;
          if (count === digitsBeforeCursor) { newCursor++; break; }
        }
      }
    }
    pendingCursor.current = newCursor;
    onChange(newDigits);
  };

  return (
    <input
      ref={inputRef} id={id} required={required}
      type="text" inputMode="numeric" placeholder={placeholder}
      value={formatMiles(value)}
      onChange={handleChange}
      className={className || 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300'}
    />
  );
};

// ─── Campo numérico estable (definido FUERA del componente) ──────────────────
const NumberField = ({ label, fieldKey, value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    <LiveMoneyInput value={value} onChange={v => onChange(fieldKey, v)} />
  </div>
);
// ─────────────────────────────────────────────────────────────────────────────

const CuentasRecompras = ({ onEntriesChanged } = {}) => {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Entradas (dinero enviado)
  const [entries, setEntries]     = useState([]);
  const [totals,  setTotals]      = useState({});
  // Compras realizadas
  const [purchases, setPurchases]       = useState([]);
  const [totalCompras, setTotalCompras] = useState(0);
  const [totalRopa, setTotalRopa]               = useState(0);
  const [totalOperacional, setTotalOperacional] = useState(0);

  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  // Formulario entradas
  const [showEntryForm, setShowEntryForm]   = useState(false);
  const [entryForm, setEntryForm]           = useState(EMPTY_ENTRY);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [savingEntry, setSavingEntry]       = useState(false);

  // Formulario compras
  const [showPurchaseForm, setShowPurchaseForm]   = useState(false);
  const [purchaseForm, setPurchaseForm]           = useState(EMPTY_PURCHASE);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [savingPurchase, setSavingPurchase]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [entriesData, purchasesData] = await Promise.all([
        getEntries({ year, month }),
        getPurchases({ year, month })
      ]);
      setEntries(entriesData.entries || []);
      setTotals(entriesData.totals || {});
      setPurchases(purchasesData.purchases || []);
      setTotalCompras(purchasesData.total_compras || 0);
      setTotalRopa(purchasesData.total_ropa || 0);
      setTotalOperacional(purchasesData.total_operacional || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  };

  const toNum = (v) => parseFloat(v) || 0;

  // Handler estable para NumberField
  const handleEntryFieldChange = useCallback((key, value) => {
    setEntryForm(f => ({ ...f, [key]: value }));
  }, []);

  // Cálculos del formulario de entrada en tiempo real
  const formTotalEnviado = () => PAYMENT_COLS.reduce((s, { key }) => s + toNum(entryForm[key]), 0);
  const formSobrante     = () => toNum(entryForm.sobrante_mes_anterior);
  const formGrandTotal   = () => formTotalEnviado() + formSobrante();
  // Comisión automática: 4‰ sobre lo enviado (igual que el backend). Si el
  // usuario escribió un valor en feeOverride, ese manda.
  const formFeeAuto       = () => Math.round(formTotalEnviado() * 4 / 1000);
  const formFee            = () => entryForm.feeOverride !== '' ? toNum(entryForm.feeOverride) : formFeeAuto();
  const formNetValue      = () => formGrandTotal() - formFee();

  // Totales del mes (fee_4mil ya viene sumado por el backend respetando
  // las comisiones sobrescritas a mano en cada envío - no se recalcula aquí)
  const monthTotalRecibido = () => (totals.total_enviado || 0) + (totals.sobrante_acumulado || 0);
  const monthFee           = () => totals.fee_4mil || 0;
  const monthBalance       = () => monthTotalRecibido() - totalCompras;

  // ── Entradas: submit ──────────────────────────────────────────────────────
  const handleEntrySubmit = async (e) => {
    e.preventDefault(); setSavingEntry(true); setError('');
    try {
      const payload = {
        date: entryForm.date, descripcion: entryForm.descripcion || 'Recompra Jhonatan',
        efectivo:              toNum(entryForm.efectivo),
        datafono:              toNum(entryForm.datafono),
        qr:                    toNum(entryForm.qr),
        daviplata:             toNum(entryForm.daviplata),
        nequi:                 toNum(entryForm.nequi),
        bbva:                  toNum(entryForm.bbva),
        sobrante_mes_anterior: toNum(entryForm.sobrante_mes_anterior),
        fecha_compra:          entryForm.fecha_compra || null,
        notes:                 entryForm.notes,
        fee_override:          entryForm.feeOverride !== '' ? toNum(entryForm.feeOverride) : null,
      };
      if (editingEntryId) { await updateEntry(editingEntryId, payload); setSuccess('Entrada actualizada'); }
      else { await createEntry(payload); setSuccess('Entrada creada'); }
      setShowEntryForm(false); setEditingEntryId(null); setEntryForm(EMPTY_ENTRY);
      await load();
      onEntriesChanged?.(); // el envío ya descontó su cuenta en Resumen — refrescarla
    } catch (e) { setError(e.message); }
    finally { setSavingEntry(false); setTimeout(() => setSuccess(''), 3000); }
  };

  const handleEditEntry = (row) => {
    setEntryForm({
      date: row.date, descripcion: row.descripcion || 'Recompra Jhonatan',
      efectivo: String(row.efectivo || ''), datafono: String(row.datafono || ''),
      qr: String(row.qr || ''), daviplata: String(row.daviplata || ''),
      nequi: String(row.nequi || ''), bbva: String(row.bbva || ''),
      sobrante_mes_anterior: String(row.sobrante_mes_anterior || ''),
      fecha_compra: row.fecha_compra || '', notes: row.notes || '',
      feeOverride: row.fee_override != null ? String(row.fee_override) : '',
    });
    setEditingEntryId(row.id);
    setShowEntryForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('¿Eliminar esta entrada?')) return;
    try {
      await deleteEntry(id);
      await load();
      onEntriesChanged?.(); // si el envío estaba conectado a una cuenta, eliminarlo le repone el saldo
    } catch (e) { setError(e.message); }
  };

  // ── Compras: submit ───────────────────────────────────────────────────────
  const handlePurchaseSubmit = async (e) => {
    e.preventDefault(); setSavingPurchase(true); setError('');
    try {
      const payload = {
        date:     purchaseForm.date,
        store:    purchaseForm.store.trim(),
        amount:   parseFloat(purchaseForm.amount),
        category: purchaseForm.category,
        notes:    purchaseForm.notes,
      };
      if (editingPurchaseId) { await updatePurchase(editingPurchaseId, payload); setSuccess('Compra actualizada'); }
      else { await createPurchase(payload); setSuccess('Compra registrada'); }
      setShowPurchaseForm(false); setEditingPurchaseId(null); setPurchaseForm(EMPTY_PURCHASE);
      await load();
    } catch (e) { setError(e.message); }
    finally { setSavingPurchase(false); setTimeout(() => setSuccess(''), 3000); }
  };

  const handleEditPurchase = (p) => {
    setPurchaseForm({
      date: p.date, store: p.store, amount: String(p.amount),
      category: p.category || 'ropa', notes: p.notes || '',
    });
    setEditingPurchaseId(p.id);
    setShowPurchaseForm(true);
  };

  const handleDeletePurchase = async (id) => {
    if (!window.confirm('¿Eliminar esta compra?')) return;
    try { await deletePurchase(id); await load(); } catch (e) { setError(e.message); }
  };

  // total de cada fila de entrada
  const rowTotal = (row) => (row.total_enviado || 0) + (row.sobrante_mes_anterior || 0);

  // Color del balance
  const balanceColor = monthBalance() >= 0 ? 'text-emerald-700' : 'text-red-600';
  const balanceBg    = monthBalance() >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200';

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span>Sistema KOAJ</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">Cuentas Recompras</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cuentas Recompras</h1>
          <p className="text-sm text-gray-500 mt-1">Control de dinero enviado y compras realizadas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button
            onClick={() => { setShowEntryForm(v => !v); setEditingEntryId(null); setEntryForm(EMPTY_ENTRY); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            {showEntryForm && !editingEntryId ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showEntryForm && !editingEntryId ? 'Cancelar' : 'Agregar envío'}
          </button>
        </div>
      </div>

      {/* ── Alertas ────────────────────────────────────────────────────── */}
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

      {/* ── Formulario de envío ─────────────────────────────────────────── */}
      {showEntryForm && (
        <form onSubmit={handleEntrySubmit} className="bg-white border border-indigo-200 rounded-xl p-6 shadow-sm space-y-5">
          <h3 className="font-semibold text-gray-900 text-base">
            {editingEntryId ? 'Editar envío' : 'Nuevo envío de dinero'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
              <input type="text" placeholder="Recompra Jhonatan" value={entryForm.descripcion}
                onChange={e => setEntryForm(f => ({ ...f, descripcion: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
              <input type="date" required value={entryForm.date}
                onChange={e => setEntryForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha compra factura</label>
              <input type="date" value={entryForm.fecha_compra}
                onChange={e => setEntryForm(f => ({ ...f, fecha_compra: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberField label="Sobrante mes anterior" fieldKey="sobrante_mes_anterior" value={entryForm.sobrante_mes_anterior} onChange={handleEntryFieldChange} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Montos enviados por medio de pago</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {PAYMENT_COLS.map(({ key, label }) => (
                <NumberField key={key} label={label} fieldKey={key} value={entryForm[key]} onChange={handleEntryFieldChange} />
              ))}
            </div>
          </div>
          {/* Resumen en tiempo real */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="px-4 py-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-600 font-medium">Enviado (medios)</p>
              <p className="text-lg font-bold text-blue-800">{fmtForce(formTotalEnviado())}</p>
            </div>
            <div className="px-4 py-3 bg-violet-50 rounded-xl">
              <p className="text-xs text-violet-600 font-medium">+ Sobrante ant.</p>
              <p className="text-lg font-bold text-violet-800">{fmtForce(formSobrante())}</p>
            </div>
            <div className="px-4 py-3 bg-orange-50 rounded-xl">
              <label className="text-xs text-orange-600 font-medium block mb-1">
                Comisión {entryForm.feeOverride === '' ? '4‰ (automática)' : '(editada)'}
              </label>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-orange-800">$</span>
                <LiveMoneyInput
                  value={entryForm.feeOverride !== '' ? entryForm.feeOverride : String(formFeeAuto())}
                  onChange={v => setEntryForm(f => ({ ...f, feeOverride: v }))}
                  className="w-full bg-transparent text-lg font-bold text-orange-800 focus:outline-none"
                />
              </div>
              {entryForm.feeOverride !== '' && (
                <button type="button"
                  onClick={() => setEntryForm(f => ({ ...f, feeOverride: '' }))}
                  className="text-[11px] text-orange-600 underline hover:text-orange-800">
                  Volver a automático
                </button>
              )}
            </div>
            <div className="px-4 py-3 bg-green-50 rounded-xl border-2 border-green-200">
              <p className="text-xs text-green-600 font-medium">Valor neto</p>
              <p className="text-lg font-bold text-green-800">{fmtForce(formNetValue())}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea rows={2} placeholder="Observaciones..." value={entryForm.notes}
              onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={savingEntry}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <Check className="w-4 h-4" /> {savingEntry ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => { setShowEntryForm(false); setEditingEntryId(null); setEntryForm(EMPTY_ENTRY); }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </form>
      )}

      {/* ── Selector de mes + BALANCE PROMINENTE ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Navegación de mes */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{MONTHS[month - 1]} {year}</p>
            <p className="text-xs text-gray-500 mt-0.5">{entries.length} envío{entries.length !== 1 ? 's' : ''} · {purchases.length} compra{purchases.length !== 1 ? 's' : ''}</p>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs">
              <span className="text-indigo-600 font-medium">Recibido: {fmtForce(monthTotalRecibido())}</span>
              <span className="text-red-500 font-medium">Compras: {fmtForce(totalCompras)}</span>
            </div>
          </div>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Balance disponible */}
        <div className={`rounded-xl p-5 border-2 shadow-sm flex items-center gap-5 ${balanceBg}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${monthBalance() >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
            <TrendingUp className={`w-7 h-7 ${monthBalance() >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance disponible</p>
            <p className={`text-3xl font-bold leading-tight ${balanceColor}`}>
              {fmtForce(monthBalance())}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {fmtForce(monthTotalRecibido())} recibido − {fmtForce(totalCompras)} en compras
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabla de envíos ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 && purchases.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl text-center py-14 text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-medium">No hay registros para {MONTHS[month - 1]} {year}</p>
          <p className="text-sm mt-1">Usa "Agregar envío" para comenzar</p>
        </div>
      ) : (
        <>
          {entries.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-gray-700">Dinero enviado al socio</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1200px]">
                  <thead>
                    <tr className="bg-gray-900 text-white text-xs">
                      <th colSpan={2} className="px-3 py-2 text-center border-r border-gray-700">
                        RECOMPRA {MONTHS[month - 1].toUpperCase()} {year}
                      </th>
                      <th colSpan={6} className="px-3 py-2 text-center border-r border-gray-700 bg-gray-800">
                        MEDIOS DE PAGO ENVIADOS
                      </th>
                      <th className="px-3 py-2 text-center border-r border-gray-700 bg-violet-800 whitespace-nowrap">
                        SOBRANTE<br/>MES ANT.
                      </th>
                      <th className="px-3 py-2 text-center border-r border-gray-700 bg-indigo-800">TOTAL</th>
                      <th colSpan={3} className="px-3 py-2 text-center bg-orange-700">FACTURA RECOMPRA ROPA</th>
                      <th className="px-2 py-2 bg-gray-900" />
                    </tr>
                    <tr className="bg-gray-700 text-white text-xs uppercase tracking-wide">
                      <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Descripción</th>
                      <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Fecha</th>
                      {PAYMENT_COLS.map(({ key, label }) => (
                        <th key={key} className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">{label}</th>
                      ))}
                      <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap bg-violet-700">Sobrante</th>
                      <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap bg-indigo-700">TOTAL</th>
                      <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap bg-orange-700">Fecha compra</th>
                      <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap bg-orange-700">Comisión 4‰</th>
                      <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap bg-orange-700">Valor neto</th>
                      <th className="px-2 py-2.5 bg-gray-700" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entries.map((row, idx) => {
                      const total = rowTotal(row);
                      // fee_4mil/valor_sobrante ya vienen resueltos del backend
                      // (respetan fee_override si el envío lo tiene sobrescrito)
                      const fee   = row.fee_4mil;
                      return (
                        <tr key={row.id} className={`hover:bg-indigo-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-sky-50'}`}>
                          <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">{row.descripcion || 'Recompra Jhonatan'}</td>
                          <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{row.date}</td>
                          {PAYMENT_COLS.map(({ key }) => (
                            <td key={key} className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap">{fmt(row[key])}</td>
                          ))}
                          <td className="px-3 py-2.5 text-right font-semibold text-violet-700 bg-violet-50 whitespace-nowrap">{fmt(row.sobrante_mes_anterior)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-indigo-800 bg-indigo-50 whitespace-nowrap">{fmtForce(total)}</td>
                          <td className="px-3 py-2.5 text-center text-gray-600 text-xs bg-orange-50 whitespace-nowrap">{row.fecha_compra || '—'}</td>
                          <td className="px-3 py-2.5 text-right text-orange-700 bg-orange-50 whitespace-nowrap">
                            {row.total_enviado > 0 ? fmtForce(fee) : '—'}{row.fee_override != null && <span title="Comisión editada a mano" className="ml-1 text-orange-400">✎</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-green-700 bg-orange-50 whitespace-nowrap">{row.total_enviado > 0 ? fmtForce(row.valor_sobrante) : '—'}</td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button onClick={() => handleEditEntry(row)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteEntry(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-800 text-white font-bold text-sm">
                      <td className="px-3 py-3 uppercase tracking-wide" colSpan={2}>TOTAL ENVÍOS</td>
                      {PAYMENT_COLS.map(({ key }) => (
                        <td key={key} className="px-3 py-3 text-right whitespace-nowrap">{totals[key] ? fmtForce(totals[key]) : '—'}</td>
                      ))}
                      <td className="px-3 py-3 text-right whitespace-nowrap bg-violet-700">{(totals.sobrante_acumulado || 0) > 0 ? fmtForce(totals.sobrante_acumulado) : '—'}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap bg-indigo-700 text-base">{fmtForce(monthTotalRecibido())}</td>
                      <td className="px-3 py-3 text-center bg-orange-700 text-xs">Total Facturas</td>
                      <td className="px-3 py-3 text-right bg-orange-700 whitespace-nowrap">{monthTotalRecibido() > 0 ? fmtForce(monthFee()) : '—'}</td>
                      <td className="px-3 py-3 text-right bg-orange-700 whitespace-nowrap">{monthTotalRecibido() > 0 ? fmtForce(monthTotalRecibido() - monthFee()) : '—'}</td>
                      <td className="px-2 py-3 bg-gray-800" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── Sección de compras realizadas ──────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-rose-500" />
                <span className="text-sm font-semibold text-gray-700">Compras realizadas por el socio</span>
                {purchases.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                      Total: {fmtForce(totalCompras)}
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                      Ropa: {fmtForce(totalRopa)}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                      Operacional: {fmtForce(totalOperacional)}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => { setShowPurchaseForm(v => !v); setEditingPurchaseId(null); setPurchaseForm(EMPTY_PURCHASE); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors">
                {showPurchaseForm && !editingPurchaseId ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showPurchaseForm && !editingPurchaseId ? 'Cancelar' : 'Registrar compra'}
              </button>
            </div>

            {/* Formulario de compra */}
            {showPurchaseForm && (
              <form onSubmit={handlePurchaseSubmit} className="p-5 border-b border-gray-100 bg-rose-50 space-y-4">
                <h4 className="font-semibold text-gray-800 text-sm">{editingPurchaseId ? 'Editar compra' : 'Nueva compra'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fecha *</label>
                    <input type="date" required value={purchaseForm.date}
                      onChange={e => setPurchaseForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tienda / Proveedor *</label>
                    <input type="text" required placeholder="Nombre de la tienda" value={purchaseForm.store}
                      onChange={e => setPurchaseForm(f => ({ ...f, store: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Monto *</label>
                    <LiveMoneyInput
                      required
                      value={purchaseForm.amount}
                      onChange={v => setPurchaseForm(f => ({ ...f, amount: v }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Categoría *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PURCHASE_CATEGORIES.map(({ value, label, hint }) => (
                      <button
                        key={value} type="button"
                        onClick={() => setPurchaseForm(f => ({ ...f, category: value }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                          purchaseForm.category === value
                            ? 'border-rose-400 bg-rose-100'
                            : 'border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                      >
                        {value === 'ropa'
                          ? <ShoppingBag className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          : <Fuel className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                        <span>
                          <span className="block text-sm font-medium text-gray-800">{label}</span>
                          <span className="block text-xs text-gray-500">{hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                  <textarea rows={2} placeholder="Qué se compró, observaciones..." value={purchaseForm.notes}
                    onChange={e => setPurchaseForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white resize-none" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={savingPurchase}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors">
                    <Check className="w-4 h-4" /> {savingPurchase ? 'Guardando...' : 'Guardar compra'}
                  </button>
                  <button type="button"
                    onClick={() => { setShowPurchaseForm(false); setEditingPurchaseId(null); setPurchaseForm(EMPTY_PURCHASE); }}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors">
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Tabla de compras */}
            {purchases.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-25" />
                <p className="text-sm">No hay compras registradas este mes</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Tienda / Proveedor</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Categoría</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Monto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Notas</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchases.map(p => {
                    const badge = CATEGORY_BADGE[p.category] || CATEGORY_BADGE.ropa;
                    return (
                    <tr key={p.id} className="hover:bg-rose-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700">{p.date}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.store}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-700">{fmtForce(p.amount)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => handleEditPurchase(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeletePurchase(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-rose-700 text-white font-bold text-sm">
                    <td className="px-4 py-3 uppercase tracking-wide" colSpan={3}>TOTAL COMPRAS</td>
                    <td className="px-4 py-3 text-right text-base">{fmtForce(totalCompras)}</td>
                    <td colSpan={2} className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CuentasRecompras;

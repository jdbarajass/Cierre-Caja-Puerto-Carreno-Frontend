// Cuentas → Gastos (Fase 1 del plan docs/PLAN_CUENTAS_DIARIAS.md del backend).
// Gastos y otros movimientos de plata que no son ventas ni recompras: cada
// uno sale (o entra) de las cuentas de Resumen según "¿de dónde sale la
// plata?". Incluye los gastos fijos del mes y los préstamos entre tiendas.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw, Plus, Trash2, Pencil, X, Check, AlertCircle, ChevronLeft, ChevronRight,
  Receipt, ArrowDownCircle, ArrowUpCircle, CalendarClock, Store, ChevronDown,
} from 'lucide-react';
import {
  getExpenses, createExpense, updateExpense, deleteExpense,
  getFixedExpenses, createFixedExpense, updateFixedExpense, deleteFixedExpense, loadFixedTemplate,
  getInterStoreLoans,
} from '../services/expensesService';
import LiveMoneyInput from '../components/common/LiveMoneyInput';
import EmployeeSelect from '../components/employees/EmployeeSelect';
import { EMPLOYEE_NAMES } from '../utils/employeeGroups';
import { getColombiaDate } from '../utils/dateUtils';

const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.round(v || 0));

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Medio de pago -> cuenta de Resumen de donde sale/entra la plata
const METHODS = [
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'qr', label: 'QR (…5494)' },
  { key: 'datafono', label: 'Datáfono/Addi (…6018)' },
  { key: 'nequi', label: 'Nequi' },
  { key: 'daviplata', label: 'Daviplata' },
  { key: 'bbva', label: 'BBVA' },
  { key: 'ahorro', label: 'Ahorro (fondo)' },
];

const OUT_CATEGORIES = [
  { value: 'operativo', label: 'Gasto operativo', hint: 'Arriendo, servicios, aseo, bolsas, transporte', badge: 'bg-amber-100 text-amber-800' },
  { value: 'sueldo', label: 'Sueldo', hint: 'Con empleada: queda en Empleadas → Pagos', badge: 'bg-sky-100 text-sky-800' },
  { value: 'flete', label: 'Flete de mercancía', hint: 'Es parte del costo de la ropa', badge: 'bg-orange-100 text-orange-800' },
  { value: 'financiero', label: 'Gasto financiero', hint: '4x1000, cuota de manejo, intereses', badge: 'bg-gray-200 text-gray-800' },
  { value: 'cuota_credito', label: 'Cuota de crédito', hint: 'Scotiabank, Davivienda', badge: 'bg-gray-200 text-gray-800' },
  { value: 'inversion', label: 'Inversión / activo', hint: 'Equipos, herrajería, cámaras: no es gasto del mes', badge: 'bg-violet-100 text-violet-800' },
  { value: 'prestamo_empleada', label: 'Préstamo a empleada', hint: 'Queda en Empleadas → Préstamos', badge: 'bg-rose-100 text-rose-800' },
  { value: 'prestamo_tienda', label: 'Préstamo a otra tienda', hint: 'Ej.: lo que Carreño paga por Primavera', badge: 'bg-indigo-100 text-indigo-800' },
  { value: 'retiro_socio', label: 'Retiro de socio', hint: 'Ganancia que retira un socio: no es gasto', badge: 'bg-emerald-100 text-emerald-800' },
  { value: 'otro', label: 'Otro', hint: '', badge: 'bg-gray-100 text-gray-700' },
];
const IN_CATEGORIES = [
  { value: 'devolucion_prestamo', label: 'Devolución de préstamo', hint: 'Con empleada: abona a su préstamo en Empleadas', badge: 'bg-emerald-100 text-emerald-800' },
  { value: 'devolucion_prestamo_tienda', label: 'Devolución de otra tienda', hint: 'La otra tienda devuelve lo prestado', badge: 'bg-emerald-100 text-emerald-800' },
  { value: 'ingreso_extra', label: 'Ingreso extra', hint: 'Plata que entra y no es venta', badge: 'bg-emerald-100 text-emerald-800' },
];
const CATEGORY_BY_VALUE = Object.fromEntries([...OUT_CATEGORIES, ...IN_CATEGORIES].map(c => [c.value, c]));

const ACCOUNT_MODES = [
  { value: 'cuentas', label: 'De las cuentas', hint: 'Descuenta (o suma) en Cuentas → Resumen' },
  { value: 'caja', label: 'De la caja del día', hint: 'Ya se descontó en el cierre de caja: no se vuelve a restar' },
  { value: 'sin_mover', label: 'No mover cuentas', hint: 'Solo queda anotado (históricos o ya descontado)' },
];
const MODE_LABEL = { cuentas: 'Cuentas', caja: 'Caja del día', sin_mover: 'Sin mover' };

const EMPLOYEE_CATEGORIES = ['prestamo_empleada', 'devolucion_prestamo', 'sueldo'];
const STORE_CATEGORIES = ['prestamo_tienda', 'devolucion_prestamo_tienda'];

const todayStr = () => {
  const d = getColombiaDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyForm = (direction = 'out') => ({
  direction,
  date: todayStr(),
  period: '',
  concept: '',
  category: direction === 'out' ? 'operativo' : 'ingreso_extra',
  account_mode: 'cuentas',
  employee_name: '',
  related_store_code: '',
  fixed_expense_id: '',
  apply_fee: true,
  feeOverride: null,
  notes: '',
  ...Object.fromEntries(METHODS.map(m => [m.key, ''])),
});

const toNum = (v) => parseFloat(v) || 0;

const STATUS_STYLE = {
  pagado: 'bg-emerald-100 text-emerald-800',
  pendiente: 'bg-gray-100 text-gray-700',
  vencido: 'bg-red-100 text-red-700',
};

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';

const CuentasGastos = ({ onEntriesChanged } = {}) => {
  const now = getColombiaDate();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const ym = `${year}-${String(month).padStart(2, '0')}`;

  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({});
  const [fixed, setFixed] = useState({ items: [], inactive: [], summary: {}, template_available: false });
  const [interStore, setInterStore] = useState({ lent: [], owed: [] });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [fixedForm, setFixedForm] = useState(null); // null = cerrado; {id?, name, amount, due_day, category, default_method}
  const [showInactive, setShowInactive] = useState(false);
  const [openLoan, setOpenLoan] = useState(null);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [exp, fx, inter] = await Promise.all([
        getExpenses({ year, month }),
        getFixedExpenses({ year, month }),
        getInterStoreLoans(),
      ]);
      setItems(exp.items || []);
      setTotals(exp.totals || {});
      setFixed(fx);
      setInterStore(inter);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Tiendas a las que se les puede prestar (las "otras", vienen del backend)
  const otherStores = useMemo(
    () => (interStore.lent || []).map(l => ({ code: l.borrower, name: l.borrower_name })),
    [interStore],
  );
  const storeName = (code) => otherStores.find(s => s.code === code)?.name || code;

  // ── Formulario ────────────────────────────────────────────────────────────
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const formTotal = METHODS.reduce((s, m) => s + toNum(form[m.key]), 0);
  const formNonCash = formTotal - toNum(form.efectivo);
  const formFeeAuto = form.direction === 'out' && form.apply_fee ? Math.round(formNonCash * 4 / 1000) : 0;
  const formFee = form.direction !== 'out' ? 0 : (form.feeOverride !== null ? toNum(form.feeOverride) : formFeeAuto);
  const categories = form.direction === 'out' ? OUT_CATEGORIES : IN_CATEGORIES;

  const openNew = (direction) => {
    setForm(emptyForm(direction));
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openFromFixed = (f) => {
    const method = f.default_method || 'efectivo';
    setForm({
      ...emptyForm('out'),
      concept: f.name,
      category: f.category,
      period: ym,
      fixed_expense_id: String(f.id),
      [method]: String(Math.round(f.amount || 0)),
    });
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = (row) => {
    setForm({
      direction: row.direction,
      date: row.date,
      period: row.period,
      concept: row.concept,
      category: row.category,
      account_mode: row.account_mode,
      employee_name: row.employee_name || '',
      related_store_code: row.related_store_code || '',
      fixed_expense_id: row.fixed_expense_id ? String(row.fixed_expense_id) : '',
      apply_fee: row.apply_fee,
      feeOverride: row.fee_override != null ? String(row.fee_override) : null,
      notes: row.notes || '',
      ...Object.fromEntries(METHODS.map(m => [m.key, row[m.key] ? String(Math.round(row[m.key])) : ''])),
    });
    setEditingId(row.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm()); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        direction: form.direction,
        date: form.date,
        period: form.period || form.date.slice(0, 7),
        concept: form.concept.trim(),
        category: form.category,
        account_mode: form.account_mode,
        employee_name: EMPLOYEE_CATEGORIES.includes(form.category) ? form.employee_name : '',
        related_store_code: STORE_CATEGORIES.includes(form.category) ? form.related_store_code : '',
        fixed_expense_id: form.fixed_expense_id ? Number(form.fixed_expense_id) : null,
        apply_fee: form.apply_fee,
        fee_override: form.feeOverride !== null ? toNum(form.feeOverride) : null,
        notes: form.notes,
        ...Object.fromEntries(METHODS.map(m => [m.key, toNum(form[m.key])])),
      };
      if (editingId) { await updateExpense(editingId, payload); flash('Movimiento actualizado'); }
      else { await createExpense(payload); flash('Movimiento registrado'); }
      closeForm();
      await load();
      onEntriesChanged?.(); // puede haber movido saldos de Resumen
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`¿Eliminar "${row.concept}"?${row.account_mode === 'cuentas' ? ' Se devuelve el saldo a las cuentas.' : ''}`)) return;
    try {
      await deleteExpense(row.id);
      await load();
      onEntriesChanged?.();
    } catch (err) { setError(err.message); }
  };

  // ── Gastos fijos ──────────────────────────────────────────────────────────
  const saveFixed = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        name: fixedForm.name,
        amount: toNum(fixedForm.amount),
        due_day: Number(fixedForm.due_day) || 30,
        category: fixedForm.category,
        default_method: fixedForm.default_method || null,
        active: fixedForm.active !== false,
      };
      if (fixedForm.id) await updateFixedExpense(fixedForm.id, payload);
      else await createFixedExpense(payload);
      setFixedForm(null);
      await load();
    } catch (err) { setError(err.message); }
  };

  const toggleFixedActive = async (f) => {
    try { await updateFixedExpense(f.id, { active: !f.active }); await load(); }
    catch (err) { setError(err.message); }
  };

  const removeFixed = async (f) => {
    if (!window.confirm(`¿Eliminar el gasto fijo "${f.name}"? Los pagos ya registrados se conservan.`)) return;
    try { await deleteFixedExpense(f.id); setFixedForm(null); await load(); }
    catch (err) { setError(err.message); }
  };

  const handleLoadTemplate = async () => {
    try { await loadFixedTemplate(); flash('Gastos fijos del Excel cargados'); await load(); }
    catch (err) { setError(err.message); }
  };

  // ── Derivados para mostrar ────────────────────────────────────────────────
  const byCategory = totals.by_category || {};
  const outCategoryRows = OUT_CATEGORIES.filter(c => byCategory[c.value]);
  const inCategoryRows = IN_CATEGORIES.filter(c => byCategory[c.value]);
  const periodOutTotal = outCategoryRows.reduce((s, c) => s + byCategory[c.value].total + byCategory[c.value].fee, 0);
  const byMethod = totals.by_method || {};
  const fixedById = Object.fromEntries((fixed.items || []).map(f => [f.id, f]));

  return (
    <div className="space-y-5">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gastos</h2>
          <p className="text-sm text-gray-500 mt-1">Gastos, préstamos, retiros y otras entradas o salidas de plata (no ventas ni recompras)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button onClick={() => openNew('in')} className="flex items-center gap-1.5 px-3 py-2 border border-emerald-300 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50">
            <ArrowDownCircle className="w-4 h-4" /> Registrar entrada
          </button>
          <button onClick={() => openNew('out')} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
            <Plus className="w-4 h-4" /> Registrar gasto
          </button>
        </div>
      </div>

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

      {/* ── Formulario ─────────────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleSubmit} className={`bg-white border rounded-xl p-5 sm:p-6 shadow-sm space-y-5 ${form.direction === 'out' ? 'border-indigo-200' : 'border-emerald-300'}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-gray-900 text-base">
              {editingId ? 'Editar movimiento' : form.direction === 'out' ? 'Nuevo gasto / salida de plata' : 'Nueva entrada de plata'}
            </h3>
            {!editingId && (
              <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-sm">
                {[['out', 'Salida'], ['in', 'Entrada']].map(([d, label]) => (
                  <button type="button" key={d}
                    onClick={() => setForm(f => ({ ...f, direction: d, category: d === 'out' ? 'operativo' : 'ingreso_extra', fixed_expense_id: d === 'in' ? '' : f.fixed_expense_id }))}
                    className={`px-3 py-1 rounded-md ${form.direction === d ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Concepto *</label>
              <input aria-label="Concepto" type="text" required value={form.concept} placeholder="Ej.: Pago internet, bolsas, préstamo Mónica…"
                onChange={e => set('concept', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha en que salió/entró la plata *</label>
              <input aria-label="Fecha" type="date" required value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mes al que corresponde</label>
              <input aria-label="Mes al que corresponde" type="month" value={form.period || form.date.slice(0, 7)}
                onChange={e => set('period', e.target.value)} className={inputCls} />
              <p className="text-[11px] text-gray-500 mt-1">Para la ganancia. Ej.: internet de septiembre pagado en octubre.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoría *</label>
              <select aria-label="Categoría" value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {CATEGORY_BY_VALUE[form.category]?.hint && (
                <p className="text-[11px] text-gray-500 mt-1">{CATEGORY_BY_VALUE[form.category].hint}</p>
              )}
            </div>

            {EMPLOYEE_CATEGORIES.includes(form.category) && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Empleada {form.category === 'prestamo_empleada' ? '*' : '(opcional)'}
                </label>
                {form.category === 'prestamo_empleada' ? (
                  <EmployeeSelect value={form.employee_name} onChange={e => set('employee_name', e.target.value)} />
                ) : (
                  <select aria-label="Empleada" value={form.employee_name} onChange={e => set('employee_name', e.target.value)} className={inputCls}>
                    <option value="">Sin empleada</option>
                    {/* mismas opciones que Empleadas, sin hacerlo obligatorio */}
                    {EMPLOYEE_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                )}
              </div>
            )}

            {STORE_CATEGORIES.includes(form.category) && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {form.category === 'prestamo_tienda' ? 'Tienda a la que se le presta *' : 'Tienda que devuelve *'}
                </label>
                <select aria-label="Otra tienda" required value={form.related_store_code} onChange={e => set('related_store_code', e.target.value)} className={inputCls}>
                  <option value="" disabled>Selecciona…</option>
                  {otherStores.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </div>
            )}

            {form.direction === 'out' && (fixed.items || []).length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Gasto fijo que se paga (opcional)</label>
                <select aria-label="Gasto fijo" value={form.fixed_expense_id} onChange={e => set('fixed_expense_id', e.target.value)} className={inputCls}>
                  <option value="">Ninguno</option>
                  {fixed.items.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">¿De dónde {form.direction === 'out' ? 'sale' : 'entra'} la plata?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ACCOUNT_MODES.map(m => (
                <label key={m.value} className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer text-sm ${form.account_mode === m.value ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'}`}>
                  <input type="radio" name="account_mode" value={m.value} checked={form.account_mode === m.value}
                    disabled={m.value === 'caja' && form.direction === 'in'}
                    onChange={() => set('account_mode', m.value)} className="mt-0.5" />
                  <span>
                    <span className="font-medium text-gray-800">{m.label}</span>
                    <span className="block text-[11px] text-gray-500">{m.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Valor por medio de pago</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {METHODS.map(m => (
                <div key={m.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{m.label}</label>
                  <LiveMoneyInput value={form[m.key]} onChange={v => set(m.key, v)}
                    className={`${inputCls} ${form.account_mode === 'caja' && m.key !== 'efectivo' ? 'opacity-40' : ''}`} />
                </div>
              ))}
            </div>
            {form.account_mode === 'caja' && <p className="text-[11px] text-gray-500 mt-1">De la caja del día solo puede salir efectivo.</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="px-4 py-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-600 font-medium">Valor</p>
              <p className="text-lg font-bold text-gray-900">{fmt(formTotal)}</p>
            </div>
            {form.direction === 'out' && (
              <div className="px-4 py-3 bg-orange-50 rounded-xl">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-orange-700 font-medium">4x1000 {form.feeOverride === null ? '(automático, sin efectivo)' : '(editado)'}</span>
                  <label className="flex items-center gap-1 text-[11px] text-orange-700">
                    <input type="checkbox" checked={form.apply_fee} onChange={e => set('apply_fee', e.target.checked)} /> cobrar
                  </label>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-orange-800">$</span>
                  <LiveMoneyInput value={form.feeOverride !== null ? form.feeOverride : String(formFeeAuto)}
                    onChange={v => set('feeOverride', v)}
                    className="w-full bg-transparent text-lg font-bold text-orange-800 focus:outline-none" />
                </div>
                {form.feeOverride !== null && (
                  <button type="button" onClick={() => set('feeOverride', null)} className="text-[11px] text-orange-700 underline">Volver a automático</button>
                )}
              </div>
            )}
            <div className={`px-4 py-3 rounded-xl border-2 ${form.direction === 'out' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className={`text-xs font-medium ${form.direction === 'out' ? 'text-red-700' : 'text-emerald-700'}`}>
                {form.account_mode !== 'cuentas' ? 'No mueve las cuentas' : form.direction === 'out' ? 'Sale de las cuentas' : 'Entra a las cuentas'}
              </p>
              <p className={`text-lg font-bold ${form.direction === 'out' ? 'text-red-800' : 'text-emerald-800'}`}>{fmt(formTotal + formFee)}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea aria-label="Notas" rows={2} value={form.notes} placeholder="Observaciones…"
              onChange={e => set('notes', e.target.value)} className={`${inputCls} resize-none`} />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={closeForm}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </form>
      )}

      {/* ── Mes + totales ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <button onClick={prevMonth} aria-label="Mes anterior" className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{MONTHS[month - 1]} {year}</p>
            <p className="text-xs text-gray-500 mt-0.5">{items.length} movimiento{items.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={nextMonth} aria-label="Mes siguiente" className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Salió en el mes</p>
          <p className="text-2xl font-bold text-red-700">{fmt(totals.out_total)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Con fecha de {MONTHS[month - 1].toLowerCase()}, incluye {fmt(totals.fee_total)} de 4x1000</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Entró en el mes (no ventas)</p>
          <p className="text-2xl font-bold text-emerald-700">{fmt(totals.in_total)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Devoluciones de préstamos e ingresos extra</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Gastos fijos del mes ─────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-gray-700">Gastos fijos de {MONTHS[month - 1].toLowerCase()}</span>
                {fixed.summary && (fixed.items || []).length > 0 && (
                  <span className="text-xs text-gray-500">
                    {fixed.summary.pagado} pagados · {fixed.summary.pendiente} pendientes
                    {fixed.summary.vencido > 0 && <span className="text-red-600 font-semibold"> · {fixed.summary.vencido} vencidos</span>}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {fixed.template_available && (
                  <button onClick={handleLoadTemplate} className="px-3 py-1.5 text-xs font-medium border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50">
                    Cargar los gastos fijos del Excel
                  </button>
                )}
                <button onClick={() => setFixedForm({ name: '', amount: '', due_day: 30, category: 'operativo', default_method: '' })}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Plus className="w-3.5 h-3.5" /> Gasto fijo
                </button>
              </div>
            </div>

            {fixedForm && (
              <form onSubmit={saveFixed} className="px-4 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                  <input aria-label="Nombre del gasto fijo" required value={fixedForm.name} onChange={e => setFixedForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Valor de referencia</label>
                  <LiveMoneyInput value={fixedForm.amount} onChange={v => setFixedForm(f => ({ ...f, amount: v }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Día de pago</label>
                  <input aria-label="Día de pago" type="number" min="1" max="31" value={fixedForm.due_day} onChange={e => setFixedForm(f => ({ ...f, due_day: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                  <select aria-label="Categoría del gasto fijo" value={fixedForm.category} onChange={e => setFixedForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                    {OUT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Se paga por</label>
                  <select aria-label="Medio por defecto" value={fixedForm.default_method || ''} onChange={e => setFixedForm(f => ({ ...f, default_method: e.target.value }))} className={inputCls}>
                    <option value="">Efectivo</option>
                    {METHODS.filter(m => m.key !== 'efectivo').map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-6 flex gap-2">
                  <button type="submit" className="flex items-center gap-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"><Check className="w-4 h-4" /> Guardar</button>
                  <button type="button" onClick={() => setFixedForm(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
                  {fixedForm.id && (
                    <button type="button" onClick={() => removeFixed(fixedForm)} className="ml-auto px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Eliminar</button>
                  )}
                </div>
              </form>
            )}

            {(fixed.items || []).length === 0 && !fixedForm ? (
              <p className="px-4 py-6 text-sm text-gray-500 text-center">
                Todavía no hay gastos fijos. Agrégalos o carga los del Excel (arriendo, sueldos, internet, cuotas…).
              </p>
            ) : (
              <>
              <ul className="sm:hidden divide-y divide-gray-100">
                {(fixed.items || []).map(f => (
                  <li key={f.id} className={`px-4 py-3 ${!f.active ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{f.name}</p>
                        <p className="text-[11px] text-gray-500">Vence {f.due_date} · Ref. {fmt(f.amount)}</p>
                        {f.paid_amount > 0 && <p className="text-[11px] text-gray-700">Pagado {fmt(f.paid_amount)} el {f.paid_date}</p>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0 ${STATUS_STYLE[f.status]}`}>{f.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {f.status !== 'pagado' && f.active && (
                        <button onClick={() => openFromFixed(f)} className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg">Registrar pago</button>
                      )}
                      <button onClick={() => setFixedForm({ ...f, amount: String(Math.round(f.amount || 0)) })} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg">Editar</button>
                      <button onClick={() => toggleFixedActive(f)} className="px-2 py-1.5 text-xs text-gray-500">Desactivar</button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <th className="text-left px-4 py-2">Gasto fijo</th>
                      <th className="text-left px-3 py-2">Vence</th>
                      <th className="text-right px-3 py-2">Referencia</th>
                      <th className="text-right px-3 py-2">Pagado</th>
                      <th className="text-left px-3 py-2">Estado</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(fixed.items || []).map(f => (
                      <tr key={f.id} className={!f.active ? 'opacity-60' : ''}>
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-gray-800">{f.name}</span>
                          <span className="block text-[11px] text-gray-500">{CATEGORY_BY_VALUE[f.category]?.label}</span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{f.due_date}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600 whitespace-nowrap">{fmt(f.amount)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">{f.paid_amount ? fmt(f.paid_amount) : '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[f.status]}`}>{f.status}</span>
                          {f.paid_date && <span className="block text-[11px] text-gray-500 mt-0.5">{f.paid_date}</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 justify-end">
                            {f.status !== 'pagado' && f.active && (
                              <button onClick={() => openFromFixed(f)} className="px-2.5 py-1 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 whitespace-nowrap">Registrar pago</button>
                            )}
                            <button aria-label="Editar gasto fijo" onClick={() => setFixedForm({ ...f, amount: String(Math.round(f.amount || 0)) })} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => toggleFixedActive(f)} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded-lg">Desactivar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
            {(fixed.inactive || []).length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 text-xs">
                <button onClick={() => setShowInactive(v => !v)} className="text-gray-500 underline">
                  {showInactive ? 'Ocultar' : 'Ver'} desactivados ({fixed.inactive.length})
                </button>
                {showInactive && (
                  <ul className="mt-2 space-y-1">
                    {fixed.inactive.map(f => (
                      <li key={f.id} className="flex items-center gap-2">
                        <span className="text-gray-600">{f.name}</span>
                        <button onClick={() => toggleFixedActive(f)} className="text-indigo-600 underline">Activar</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* ── Movimientos del mes ──────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-gray-700">Movimientos de {MONTHS[month - 1].toLowerCase()}</span>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-10 text-sm text-gray-500 text-center">No hay gastos ni entradas registrados en {MONTHS[month - 1].toLowerCase()}.</p>
            ) : (
              <>
              <ul className="sm:hidden divide-y divide-gray-100">
                {items.map(row => {
                  const cat = CATEGORY_BY_VALUE[row.category];
                  return (
                    <li key={row.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 text-sm">{row.concept}</p>
                          <p className="text-[11px] text-gray-500">
                            {row.date} · {MODE_LABEL[row.account_mode]}{row.period !== ym && ` · corresponde a ${row.period}`}
                          </p>
                        </div>
                        <span className={`text-sm font-bold whitespace-nowrap ${row.direction === 'out' ? 'text-red-700' : 'text-emerald-700'}`}>
                          {row.direction === 'out' ? '−' : '+'}{fmt(row.total_with_fee)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cat?.badge || 'bg-gray-100 text-gray-700'}`}>{cat?.label || row.category}</span>
                        <span className="text-[11px] text-gray-600">
                          {METHODS.filter(m => row[m.key]).map(m => `${m.label} ${fmt(row[m.key])}`).join(' · ')}
                          {row.fee ? ` · 4x1000 ${fmt(row.fee)}` : ''}
                        </span>
                      </div>
                      {(row.employee_name || row.related_store_code || row.notes) && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          {[row.employee_name && `Empleada: ${row.employee_name}`, row.related_store_code && `Tienda: ${storeName(row.related_store_code)}`, row.notes].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => openEdit(row)} className="px-3 py-1 text-xs border border-gray-300 rounded-lg">Editar</button>
                        <button onClick={() => handleDelete(row)} className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded-lg">Eliminar</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-800 text-white text-xs uppercase tracking-wide">
                      <th className="text-left px-3 py-2.5">Fecha</th>
                      <th className="text-left px-3 py-2.5">Concepto</th>
                      <th className="text-left px-3 py-2.5">Categoría</th>
                      <th className="text-left px-3 py-2.5">Medios</th>
                      <th className="text-left px-3 py-2.5">De dónde</th>
                      <th className="text-right px-3 py-2.5">4x1000</th>
                      <th className="text-right px-3 py-2.5">Total</th>
                      <th className="px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map(row => {
                      const cat = CATEGORY_BY_VALUE[row.category];
                      const otherPeriod = row.period !== ym;
                      const otherDate = row.date.slice(0, 7) !== ym;
                      return (
                        <tr key={row.id} className="hover:bg-indigo-50/40 align-top">
                          <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">
                            {row.date}
                            {(otherPeriod || otherDate) && (
                              <span className="block text-[11px] text-amber-700">Corresponde a {row.period}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-medium text-gray-800">{row.concept}</span>
                            {row.employee_name && <span className="block text-[11px] text-gray-500">Empleada: {row.employee_name}</span>}
                            {row.related_store_code && <span className="block text-[11px] text-gray-500">Tienda: {storeName(row.related_store_code)}</span>}
                            {row.fixed_expense_id && <span className="block text-[11px] text-gray-500">Gasto fijo: {fixedById[row.fixed_expense_id]?.name || 'sí'}</span>}
                            {row.notes && <span className="block text-[11px] text-gray-500 italic">{row.notes}</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cat?.badge || 'bg-gray-100 text-gray-700'}`}>{cat?.label || row.category}</span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-600">
                            {METHODS.filter(m => row[m.key]).map(m => (
                              <span key={m.key} className="block whitespace-nowrap">{m.label}: {fmt(row[m.key])}</span>
                            ))}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{MODE_LABEL[row.account_mode]}</td>
                          <td className="px-3 py-2.5 text-right text-orange-700 whitespace-nowrap">
                            {row.fee ? fmt(row.fee) : '—'}{row.fee_override != null && <span title="4x1000 editado a mano" className="ml-1 text-orange-400">✎</span>}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${row.direction === 'out' ? 'text-red-700' : 'text-emerald-700'}`}>
                            {row.direction === 'out' ? '−' : '+'}{fmt(row.total_with_fee)}
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-1 justify-end">
                              <button aria-label="Editar" onClick={() => openEdit(row)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                              <button aria-label="Eliminar" onClick={() => handleDelete(row)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>

          {/* ── Resumen por categoría y por medio ───────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <p className="text-sm font-semibold text-gray-700">Lo que corresponde a {MONTHS[month - 1].toLowerCase()}, por categoría</p>
              <p className="text-[11px] text-gray-500 mb-3">Por "mes al que corresponde" (para la ganancia). Incluye el 4x1000 de cada gasto.</p>
              {outCategoryRows.length === 0 && inCategoryRows.length === 0 ? (
                <p className="text-sm text-gray-500">Sin movimientos.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {outCategoryRows.map(c => (
                      <tr key={c.value}>
                        <td className="py-1.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.badge}`}>{c.label}</span></td>
                        <td className="py-1.5 text-xs text-gray-500 text-right">{byCategory[c.value].count}</td>
                        <td className="py-1.5 text-right font-semibold text-red-700">{fmt(byCategory[c.value].total + byCategory[c.value].fee)}</td>
                      </tr>
                    ))}
                    {outCategoryRows.length > 0 && (
                      <tr className="font-bold">
                        <td className="py-2">Total salidas</td><td />
                        <td className="py-2 text-right text-red-800">{fmt(periodOutTotal)}</td>
                      </tr>
                    )}
                    {inCategoryRows.map(c => (
                      <tr key={c.value}>
                        <td className="py-1.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.badge}`}>{c.label}</span></td>
                        <td className="py-1.5 text-xs text-gray-500 text-right">{byCategory[c.value].count}</td>
                        <td className="py-1.5 text-right font-semibold text-emerald-700">+{fmt(byCategory[c.value].total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <p className="text-sm font-semibold text-gray-700">Por medio de pago en {MONTHS[month - 1].toLowerCase()}</p>
              <p className="text-[11px] text-gray-500 mb-3">Solo lo que movió las cuentas de Resumen (por fecha), con 4x1000. Lo de la caja del día no aparece aquí.</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase"><th className="text-left py-1">Medio</th><th className="text-right py-1">Salió</th><th className="text-right py-1">Entró</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {METHODS.filter(m => byMethod[m.key]?.out || byMethod[m.key]?.in).map(m => (
                    <tr key={m.key}>
                      <td className="py-1.5 text-gray-700">{m.label}</td>
                      <td className="py-1.5 text-right text-red-700">{byMethod[m.key].out ? fmt(byMethod[m.key].out) : '—'}</td>
                      <td className="py-1.5 text-right text-emerald-700">{byMethod[m.key].in ? fmt(byMethod[m.key].in) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Préstamos entre tiendas ──────────────────────────────────── */}
          {[...(interStore.lent || []), ...(interStore.owed || [])].some(l => l.items.length > 0) && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <Store className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-gray-700">Préstamos entre tiendas</span>
                <span className="text-xs text-gray-500">(todos los meses)</span>
              </div>
              <div className="divide-y divide-gray-100">
                {[...(interStore.lent || []).map(l => ({ ...l, kind: 'lent' })), ...(interStore.owed || []).map(l => ({ ...l, kind: 'owed' }))]
                  .filter(l => l.items.length > 0)
                  .map(l => {
                    const key = `${l.lender}-${l.borrower}`;
                    return (
                      <div key={key} className="px-4 py-3">
                        <button onClick={() => setOpenLoan(o => (o === key ? null : key))} className="w-full flex items-center justify-between gap-3 text-left flex-wrap">
                          <span className="text-sm text-gray-800">
                            {l.kind === 'lent' ? <>Le prestamos a <b>{l.borrower_name}</b></> : <>Le debemos a <b>{l.lender_name}</b></>}
                          </span>
                          <span className="flex items-center gap-4 text-sm">
                            <span className="text-gray-500">Prestado {fmt(l.lent)}</span>
                            <span className="text-gray-500">Devuelto {fmt(l.returned)}</span>
                            <span className={`font-bold ${l.kind === 'lent' ? 'text-indigo-700' : 'text-red-700'}`}>Saldo {fmt(l.balance)}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openLoan === key ? 'rotate-180' : ''}`} />
                          </span>
                        </button>
                        {openLoan === key && (
                          <table className="w-full text-xs mt-3">
                            <tbody className="divide-y divide-gray-100">
                              {l.items.map(it => (
                                <tr key={it.id}>
                                  <td className="py-1.5 text-gray-600 whitespace-nowrap">{it.date}</td>
                                  <td className="py-1.5 text-gray-800">{it.concept}{it.notes && <span className="text-gray-500 italic"> · {it.notes}</span>}</td>
                                  <td className={`py-1.5 text-right font-semibold whitespace-nowrap ${it.category === 'prestamo_tienda' ? 'text-red-700' : 'text-emerald-700'}`}>
                                    {it.category === 'prestamo_tienda' ? 'Préstamo ' : 'Devolución '}{fmt(it.total)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
            <ArrowUpCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            "De la caja del día": el cierre de caja ya abona a EFECTIVO lo que queda después de sacar los gastos y préstamos del día, así que esos se anotan aquí solo para la ganancia y para Empleadas, sin volver a restarlos.
          </p>
        </>
      )}
    </div>
  );
};

export default CuentasGastos;

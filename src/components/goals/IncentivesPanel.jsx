// Estadísticas → Metas: META 1 / META 2 de la tienda e incentivos por meta
// (Fase 4 del plan docs/PLAN_CUENTAS_DIARIAS.md del backend). Como los
// INCENTIVO 1 e INCENTIVO 2 del Excel: si la venta del mes pasa la meta, se
// paga el incentivo y queda registrado en Cuentas → Gastos (una vez por mes).
import React, { useCallback, useEffect, useState } from 'react';
import { Award, Plus, Pencil, Trash2, Check, X, Settings2 } from 'lucide-react';
import {
  getIncentives, createIncentiveRule, updateIncentiveRule, deleteIncentiveRule,
  loadIncentivesTemplate, payIncentive, saveFinanceSettings,
} from '../../services/financeService';
import LiveMoneyInput from '../common/LiveMoneyInput';

const formatCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.round(v || 0));

const METHODS = [
  ['efectivo', 'Efectivo'], ['qr', 'QR'], ['datafono', 'Datáfono/Addi'], ['nequi', 'Nequi'],
  ['daviplata', 'Daviplata'], ['bbva', 'BBVA'], ['ahorro', 'Ahorro'],
];
const CATEGORIES = [['sueldo', 'Sueldo / incentivo de empleadas'], ['retiro_socio', 'Retiro de socio (ganancia)'], ['operativo', 'Gasto operativo']];
const inputCls = 'w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';

const IncentivesPanel = ({ month, storeGoal, storeSales, isCurrent, isPast, onSettingsChanged }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState(null);          // regla en edición
  const [payForm, setPayForm] = useState(null);    // { rule, method, account_mode }
  const [settingsForm, setSettingsForm] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try { setData(await getIncentives(month)); } catch (e) { setError(e.message); }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const run = async (key, fn) => {
    setBusy(key);
    setError('');
    try { await fn(); await load(); return true; } catch (e) { setError(e.message); return false; } finally { setBusy(''); }
  };

  const settings = data?.settings;
  const meta1 = storeGoal || null;
  const meta2 = meta1 && settings ? meta1 + settings.meta2_extra : null;
  const targetOf = (r) => (r.threshold === 'meta1' ? meta1 : meta2);
  const statusOf = (r) => {
    if (r.paid) return { label: 'Pagado', cls: 'bg-emerald-100 text-emerald-800' };
    const t = targetOf(r);
    if (!t) return { label: 'Sin meta', cls: 'bg-gray-100 text-gray-600' };
    if (storeSales >= t) return { label: 'Alcanzado', cls: 'bg-indigo-100 text-indigo-800' };
    if (isCurrent) return { label: `Faltan ${formatCOP(t - storeSales)}`, cls: 'bg-amber-100 text-amber-800' };
    return { label: isPast ? 'No alcanzado' : 'Aún no empieza', cls: 'bg-gray-100 text-gray-600' };
  };

  const saveRule = (e) => {
    e.preventDefault();
    const payload = { name: form.name, amount: Number(form.amount) || 0, threshold: form.threshold, category: form.category };
    run('rule', () => (form.id ? updateIncentiveRule(form.id, payload) : createIncentiveRule(payload))).then(ok => ok && setForm(null));
  };

  const confirmPay = (e) => {
    e.preventDefault();
    const [y, m] = month.split('-').map(Number);
    run('pay', () => payIncentive({ rule_id: payForm.rule.id, year: y, month: m, method: payForm.method, account_mode: payForm.account_mode }))
      .then(ok => ok && setPayForm(null));
  };

  const saveSettings = (e) => {
    e.preventDefault();
    run('settings', () => saveFinanceSettings({
      goal_growth_pct: Number(settingsForm.goal_growth_pct), meta2_extra: Number(settingsForm.meta2_extra) || 0,
    })).then(ok => { if (ok) { setSettingsForm(null); onSettingsChanged?.(); } });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-gray-900 flex items-center gap-2"><Award className="w-4 h-4 text-indigo-500" /> Metas de la tienda e incentivos</p>
          <p className="text-xs text-gray-500 mt-0.5">
            META 1 = meta de la tienda{settings ? ` (mismo mes del año anterior + ${settings.goal_growth_pct} %)` : ''}. META 2 = META 1 + {settings ? formatCOP(settings.meta2_extra) : '…'}. Si la venta del mes pasa la meta, se paga el incentivo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSettingsForm({ goal_growth_pct: settings?.goal_growth_pct ?? 15, meta2_extra: String(settings?.meta2_extra ?? 300000) })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"><Settings2 className="w-3.5 h-3.5" /> Configurar metas</button>
          <button onClick={() => setForm({ name: '', amount: '', threshold: 'meta1', category: 'sueldo' })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"><Plus className="w-3.5 h-3.5" /> Incentivo</button>
        </div>
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {settingsForm && (
        <form onSubmit={saveSettings} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-gray-50 rounded-xl p-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Crecimiento de la META 1 (%)</label>
            <input aria-label="Crecimiento de la meta" type="number" step="1" value={settingsForm.goal_growth_pct}
              onChange={e => setSettingsForm(f => ({ ...f, goal_growth_pct: e.target.value }))} className={inputCls} />
            <p className="text-[11px] text-gray-500 mt-0.5">Tu Excel usaba 25 %. Cambia la meta de la tienda y la de cada vendedora.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">META 2 = META 1 +</label>
            <LiveMoneyInput value={settingsForm.meta2_extra} onChange={v => setSettingsForm(f => ({ ...f, meta2_extra: v }))} className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={!!busy} className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-50"><Check className="w-4 h-4" /> Guardar</button>
            <button type="button" onClick={() => setSettingsForm(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">META 1</p>
          <p className="text-lg font-bold text-gray-900">{meta1 ? formatCOP(meta1) : '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">META 2</p>
          <p className="text-lg font-bold text-gray-900">{meta2 ? formatCOP(meta2) : '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Vendido</p>
          <p className="text-lg font-bold text-gray-900">{formatCOP(storeSales)}</p>
        </div>
      </div>

      {form && (
        <form onSubmit={saveRule} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end bg-gray-50 rounded-xl p-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Nombre</label>
            <input aria-label="Nombre del incentivo" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Ej.: Incentivo empleadas" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Valor</label>
            <LiveMoneyInput value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Si se pasa</label>
            <select aria-label="Meta" value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))} className={inputCls}>
              <option value="meta1">META 1</option><option value="meta2">META 2</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Se registra como</label>
            <select aria-label="Categoría" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
              {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="sm:col-span-5 flex gap-2">
            <button type="submit" disabled={!!busy} className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-50"><Check className="w-4 h-4" /> Guardar</button>
            <button type="button" onClick={() => setForm(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      )}

      {data && data.rules.length === 0 && !form && (
        <div className="text-sm text-gray-500 flex items-center gap-3 flex-wrap">
          <span>Todavía no hay incentivos.</span>
          {data.template_available && (
            <button onClick={() => run('tpl', loadIncentivesTemplate)} disabled={!!busy}
              className="px-3 py-1.5 text-xs font-medium border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50">
              Cargar los del Excel (Incentivo 1: $300.000 con META 1 · Incentivo 2: $150.000 con META 2)
            </button>
          )}
        </div>
      )}

      {data && data.rules.length > 0 && (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
          {data.rules.map(r => {
            const st = statusOf(r);
            const canPay = !r.paid && targetOf(r) && storeSales >= targetOf(r);
            return (
              <li key={r.id} className={`px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap ${r.active ? '' : 'opacity-60'}`}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{r.name}</p>
                  <p className="text-[11px] text-gray-500">{formatCOP(r.amount)} si se pasa la {r.threshold === 'meta1' ? 'META 1' : 'META 2'}
                    {r.paid && <> · pagado el {r.paid.date}</>}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${st.cls}`}>{st.label}</span>
                  {canPay && (
                    <button onClick={() => setPayForm({ rule: r, method: 'efectivo', account_mode: 'cuentas' })}
                      className="px-2.5 py-1 text-xs font-medium bg-gray-900 text-white rounded-lg">Registrar pago</button>
                  )}
                  <button aria-label="Editar incentivo" onClick={() => setForm({ ...r, amount: String(Math.round(r.amount)) })} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                  <button aria-label="Eliminar incentivo" onClick={() => window.confirm(`¿Eliminar "${r.name}"? Los pagos ya registrados se conservan en Gastos.`) && run('del', () => deleteIncentiveRule(r.id))}
                    className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {payForm && (
        <form onSubmit={confirmPay} className="flex items-end gap-3 flex-wrap bg-indigo-50 rounded-xl p-3">
          <p className="text-sm text-gray-800 w-full">Registrar el pago de <b>{payForm.rule.name}</b> ({formatCOP(payForm.rule.amount)}) en Cuentas → Gastos:</p>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Se pagó por</label>
            <select aria-label="Medio de pago" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value, account_mode: e.target.value !== 'efectivo' && f.account_mode === 'caja' ? 'cuentas' : f.account_mode }))} className={inputCls}>
              {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">¿De dónde sale la plata?</label>
            <select aria-label="De dónde sale" value={payForm.account_mode} onChange={e => setPayForm(f => ({ ...f, account_mode: e.target.value }))} className={inputCls}>
              <option value="cuentas">De las cuentas</option>
              {payForm.method === 'efectivo' && <option value="caja">De la caja del día</option>}
              <option value="sin_mover">No mover cuentas</option>
            </select>
          </div>
          <button type="submit" disabled={!!busy} className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-50"><Check className="w-4 h-4" /> {busy === 'pay' ? 'Registrando…' : 'Registrar'}</button>
          <button type="button" onClick={() => setPayForm(null)} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"><X className="w-4 h-4" /> Cancelar</button>
        </form>
      )}
    </div>
  );
};

export default IncentivesPanel;

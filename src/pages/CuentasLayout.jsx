import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet, History, Plus, Minus, RefreshCw,
  AlertTriangle, CheckCircle2, ArrowLeftRight
} from 'lucide-react';
import {
  getAccounts, getMovements, manualAdjustment, transferBetweenAccounts, syncDaily
} from '../services/accountsService';
import { getColombiaTodayString, formatColombiaDateTime } from '../utils/dateUtils';

const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const COLOR_CLASSES = {
  green:  { dot: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700' },
  purple: { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  red:    { dot: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700' },
  orange: { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
  blue:   { dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700' },
  teal:   { dot: 'bg-teal-500',   bg: 'bg-teal-50',   text: 'text-teal-700' },
};

const MOVEMENT_TYPE_LABELS = {
  manual_adjustment: 'Ajuste manual',
  transfer_out: 'Transferencia (salida)',
  transfer_in: 'Transferencia (entrada)',
  cash_closing: 'Cierre de caja',
};

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: Wallet },
  { id: 'movimientos', label: 'Movimientos', icon: History },
];

const CuentasLayout = () => {
  const [tab, setTab] = useState('resumen');

  const [accounts, setAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [movements, setMovements] = useState([]);
  const [movementFilters, setMovementFilters] = useState({ accountId: '', type: '', startDate: '', endDate: '' });
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [adjustForm, setAdjustForm] = useState({ accountId: '', direction: 'in', amount: '', description: '' });
  const [savingAdjust, setSavingAdjust] = useState(false);

  const [transferForm, setTransferForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '' });
  const [savingTransfer, setSavingTransfer] = useState(false);

  const [syncing, setSyncing] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAccounts();
      setAccounts(data.accounts || []);
      setTotalBalance(data.total_balance || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMovements = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const data = await getMovements({
        accountId: movementFilters.accountId || undefined,
        type: movementFilters.type || undefined,
        startDate: movementFilters.startDate || undefined,
        endDate: movementFilters.endDate || undefined,
      });
      setMovements(data.movements || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMovements(false);
    }
  }, [movementFilters]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { if (tab === 'movimientos') loadMovements(); }, [tab, loadMovements]);

  const clearMessages = () => { setError(''); setSuccess(''); };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!adjustForm.accountId || !adjustForm.amount) {
      setError('Selecciona una cuenta e ingresa un monto');
      return;
    }
    setSavingAdjust(true);
    try {
      await manualAdjustment({
        account_id: Number(adjustForm.accountId),
        amount: Number(adjustForm.amount),
        direction: adjustForm.direction,
        description: adjustForm.description || undefined,
      });
      setSuccess('Ajuste registrado correctamente');
      setAdjustForm({ accountId: '', direction: 'in', amount: '', description: '' });
      await loadAccounts();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSavingAdjust(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!transferForm.fromAccountId || !transferForm.toAccountId || !transferForm.amount) {
      setError('Completa cuenta origen, destino y monto');
      return;
    }
    if (transferForm.fromAccountId === transferForm.toAccountId) {
      setError('La cuenta origen y destino deben ser distintas');
      return;
    }
    setSavingTransfer(true);
    try {
      await transferBetweenAccounts({
        from_account_id: Number(transferForm.fromAccountId),
        to_account_id: Number(transferForm.toAccountId),
        amount: Number(transferForm.amount),
        description: transferForm.description || undefined,
      });
      setSuccess('Transferencia realizada correctamente');
      setTransferForm({ fromAccountId: '', toAccountId: '', amount: '', description: '' });
      await loadAccounts();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSavingTransfer(false);
    }
  };

  const handleSync = async () => {
    clearMessages();
    setSyncing(true);
    try {
      const data = await syncDaily(getColombiaTodayString());
      if (data.credited && data.credited.length > 0) {
        setSuccess(`Sincronizado: ${data.credited.map(c => `${c.account} ${fmt(c.amount)}`).join(', ')}`);
      } else {
        setSuccess(data.message || 'Sincronización completada (sin montos nuevos que acreditar)');
      }
      await loadAccounts();
    } catch (e) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cuentas</h1>
        <p className="text-sm text-gray-500">Saldo por medio de pago, movimientos y ajustes</p>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {tab === 'resumen' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Saldo total (real)</p>
              <p className="text-3xl font-bold text-gray-900">{loading ? 'Cargando...' : fmt(totalBalance)}</p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(a => {
              const colors = COLOR_CLASSES[a.color] || COLOR_CLASSES.blue;
              return (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    <span className="text-sm font-semibold text-gray-700">{a.name}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{fmt(a.balance)}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Ajuste manual de saldo</h3>
              <form onSubmit={handleAdjustSubmit} className="space-y-3">
                <select
                  value={adjustForm.accountId}
                  onChange={e => setAdjustForm(f => ({ ...f, accountId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Selecciona una cuenta...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustForm(f => ({ ...f, direction: 'in' }))}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      adjustForm.direction === 'in' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Plus className="w-4 h-4" /> Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustForm(f => ({ ...f, direction: 'out' }))}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      adjustForm.direction === 'out' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Minus className="w-4 h-4" /> Salida
                  </button>
                </div>

                <input
                  type="number" min="0" step="1" placeholder="Monto"
                  value={adjustForm.amount}
                  onChange={e => setAdjustForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <input
                  type="text" placeholder="Nota (opcional)"
                  value={adjustForm.description}
                  onChange={e => setAdjustForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />

                <button
                  type="submit"
                  disabled={savingAdjust}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  {savingAdjust ? 'Registrando...' : 'Registrar ajuste'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Transferir entre cuentas</h3>
              <form onSubmit={handleTransferSubmit} className="space-y-3">
                <select
                  value={transferForm.fromAccountId}
                  onChange={e => setTransferForm(f => ({ ...f, fromAccountId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Cuenta origen...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>)}
                </select>

                <div className="flex justify-center text-gray-300">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>

                <select
                  value={transferForm.toAccountId}
                  onChange={e => setTransferForm(f => ({ ...f, toAccountId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Cuenta destino...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>

                <input
                  type="number" min="0" step="1" placeholder="Monto"
                  value={transferForm.amount}
                  onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <input
                  type="text" placeholder="Nota (opcional)"
                  value={transferForm.description}
                  onChange={e => setTransferForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />

                <button
                  type="submit"
                  disabled={savingTransfer}
                  className="w-full bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  {savingTransfer ? 'Transfiriendo...' : 'Transferir'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {tab === 'movimientos' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
            <select
              value={movementFilters.accountId}
              onChange={e => setMovementFilters(f => ({ ...f, accountId: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todas las cuentas</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select
              value={movementFilters.type}
              onChange={e => setMovementFilters(f => ({ ...f, type: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(MOVEMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input
              type="date"
              value={movementFilters.startDate}
              onChange={e => setMovementFilters(f => ({ ...f, startDate: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={movementFilters.endDate}
              onChange={e => setMovementFilters(f => ({ ...f, endDate: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cuenta</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {loadingMovements ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Cargando...</td></tr>
                ) : movements.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Sin movimientos</td></tr>
                ) : movements.map(m => (
                  <tr key={m.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 text-gray-600">{m.created_at ? formatColombiaDateTime(m.created_at) : '-'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{m.account_name}</td>
                    <td className="px-4 py-3 text-gray-600">{MOVEMENT_TYPE_LABELS[m.type] || m.type}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${m.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {m.amount >= 0 ? '+' : ''}{fmt(m.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{m.description || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{m.created_by_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuentasLayout;

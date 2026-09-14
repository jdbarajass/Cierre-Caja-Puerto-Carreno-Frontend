import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet, History, Plus, Minus, RefreshCw,
  AlertTriangle, CheckCircle2, ArrowLeftRight, Repeat
} from 'lucide-react';
import {
  getAccounts, getMovements, manualAdjustment, transferBetweenAccounts, syncDaily, getSyncStatus,
  updateContemplatedUntil
} from '../services/accountsService';
import { getEntries, getPurchases } from '../services/repurchaseService';
import { getColombiaDate, formatColombiaDateTime } from '../utils/dateUtils';
import CuentasRecompras from './CuentasRecompras';

const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const COLOR_CLASSES = {
  green:  { dot: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700' },
  purple: { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  red:    { dot: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700' },
  orange: { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
  blue:   { dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700' },
  teal:   { dot: 'bg-teal-500',   bg: 'bg-teal-50',   text: 'text-teal-700' },
  indigo: { dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  emerald: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

const MOVEMENT_TYPE_LABELS = {
  manual_adjustment: 'Ajuste manual',
  transfer_out: 'Transferencia (salida)',
  transfer_in: 'Transferencia (entrada)',
  cash_closing: 'Cierre de caja',
  repurchase_send: 'Envío a socio (recompra)',
};

// Input de monto con separador de miles: muestra el número plano mientras se
// escribe (foco activo) y formateado con puntos al perder el foco - mismo
// patrón ya usado en el campo "Base Caja" de Dashboard.jsx.
const CurrencyInput = ({ value, onChange, placeholder }) => {
  const [focused, setFocused] = useState(false);
  const display = focused ? value : (value ? Number(value).toLocaleString('es-CO') : '');
  return (
    <input
      type="text" inputMode="numeric" placeholder={placeholder}
      value={display}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
    />
  );
};

// La pestaña "Movimientos" se dejó oculta a pedido del usuario (2026-09-01).
// El código y el estado siguen intactos: para reactivarla basta con volver a
// agregar { id: 'movimientos', label: 'Movimientos', icon: History } aquí.
const TABS = [
  { id: 'resumen', label: 'Resumen', icon: Wallet },
  { id: 'recompras', label: 'Cuentas Recompras', icon: Repeat },
];

const CuentasLayout = () => {
  const [tab, setTab] = useState('resumen');

  const [accounts, setAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Balance disponible de "Cuentas Recompras" del mes en curso (lo que tiene
  // Jhonatan: recibido del mes − compras del mes), para mostrarlo combinado
  // con el saldo real de las cuentas en la tarjeta superior del Resumen.
  const [repurchaseBalance, setRepurchaseBalance] = useState({ recibido: 0, compras: 0, balance: 0 });
  const [loadingRepurchase, setLoadingRepurchase] = useState(false);

  const [movements, setMovements] = useState([]);
  const [movementFilters, setMovementFilters] = useState({ accountId: '', type: '', startDate: '', endDate: '' });
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [adjustForm, setAdjustForm] = useState({ accountId: '', direction: 'in', amount: '', description: '' });
  const [savingAdjust, setSavingAdjust] = useState(false);

  const [transferForm, setTransferForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '' });
  const [savingTransfer, setSavingTransfer] = useState(false);

  const [syncing, setSyncing] = useState(false);

  // Id de la cuenta cuya fecha "contempla saldo hasta" se está guardando en
  // este momento (ej. ADDI + DATÁFONO) - deshabilita ese input puntual mientras
  // responde el backend, sin bloquear el resto de la pantalla.
  const [savingContemplatedId, setSavingContemplatedId] = useState(null);

  // Estado de la última sincronización (fecha/hora, diferencia con Alegra,
  // cuántos cierres siguen sin sincronizar, y si el cron automático de las
  // 9pm falló recientemente) - se muestra junto al botón "Sincronizar ahora"
  // para que quede visible sin tener que adivinar si el cron corrió bien.
  const [syncStatus, setSyncStatus] = useState(null);

  const loadSyncStatus = useCallback(async () => {
    try {
      const data = await getSyncStatus();
      setSyncStatus(data);
    } catch {
      // No bloquea el resto de Cuentas si esto falla - simplemente no se muestra.
    }
  }, []);

  useEffect(() => { loadSyncStatus(); }, [loadSyncStatus]);

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

  const loadRepurchaseBalance = useCallback(async () => {
    setLoadingRepurchase(true);
    try {
      const today = getColombiaDate();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const [entriesData, purchasesData] = await Promise.all([
        getEntries({ year, month }),
        getPurchases({ year, month }),
      ]);
      const recibido = (entriesData.totals?.total_enviado || 0) + (entriesData.totals?.sobrante_acumulado || 0);
      const compras = purchasesData.total_compras || 0;
      setRepurchaseBalance({ recibido, compras, balance: recibido - compras });
    } catch {
      // No bloquea el resto del Resumen si esto falla - se deja en 0.
    } finally {
      setLoadingRepurchase(false);
    }
  }, []);

  // Refresca cuentas Y balance de recompras juntos: crear/editar/eliminar un
  // envío o una compra en "Cuentas Recompras" puede afectar a ambos.
  const refreshSummary = useCallback(async () => {
    await Promise.all([loadAccounts(), loadRepurchaseBalance()]);
  }, [loadAccounts, loadRepurchaseBalance]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { loadRepurchaseBalance(); }, [loadRepurchaseBalance]);
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

  const handleContemplatedUntilChange = async (accountId, dateStr) => {
    clearMessages();
    setSavingContemplatedId(accountId);
    try {
      const data = await updateContemplatedUntil(accountId, dateStr);
      setAccounts(prev => prev.map(a => (a.id === accountId ? data.account : a)));
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingContemplatedId(null);
    }
  };

  const handleSync = async () => {
    clearMessages();
    setSyncing(true);
    try {
      // Sin fecha: el backend sincroniza TODOS los cierres pendientes hasta
      // hoy (no solo el de hoy) - así un cierre atrasado (ej. el de ayer,
      // hecho hoy porque no se alcanzó a tiempo) también se acredita, sin
      // necesitar reintentar con una fecha específica.
      const data = await syncDaily();
      if (data.credited && data.credited.length > 0) {
        setSuccess(`Sincronizado: ${data.credited.map(c => `${c.account} ${fmt(c.amount)}${c.date ? ` (${c.date})` : ''}`).join(', ')}`);
      } else {
        setSuccess(data.message || 'Sincronización completada (sin montos nuevos que acreditar)');
      }
      await Promise.all([loadAccounts(), loadSyncStatus()]);
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
          {syncStatus?.last_failure && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  La sincronización automática falló el {formatColombiaDateTime(syncStatus.last_failure.at)}
                </p>
                <p className="text-red-600">{syncStatus.last_failure.message}</p>
                <p className="text-red-500 text-xs mt-1">Se resuelve sola en la próxima sincronización exitosa (o haz clic en "Sincronizar ahora").</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center flex-wrap gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Saldo total (real)</p>
                <p className="text-3xl font-bold text-gray-900">{loading ? 'Cargando...' : fmt(totalBalance)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Cuentas de la tienda para recompras (sin Ahorro)</p>
              </div>

              <span className="hidden sm:block text-2xl text-gray-300 font-light">+</span>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Balance disponible (Jhonatan)</p>
                <p className="text-3xl font-bold text-indigo-700">
                  {loadingRepurchase ? 'Cargando...' : fmt(repurchaseBalance.balance)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {fmt(repurchaseBalance.recibido)} recibido − {fmt(repurchaseBalance.compras)} en compras (este mes)
                </p>
              </div>

              <span className="hidden sm:block text-2xl text-gray-300 font-light">=</span>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Recompras</p>
                <p className="text-3xl font-bold text-emerald-700">
                  {(loading || loadingRepurchase) ? 'Cargando...' : fmt(totalBalance + repurchaseBalance.balance)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Tienda + Jhonatan (sin Ahorro)</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
              </button>
              {syncStatus && (
                <div className="text-right">
                  {syncStatus.last_synced_at ? (
                    <p className="text-xs text-gray-400">
                      Última sincronización: {formatColombiaDateTime(syncStatus.last_synced_at)} ({syncStatus.last_synced_date})
                      {syncStatus.last_discrepancy != null && (
                        <>
                          {' · '}
                          <span className={Math.abs(syncStatus.last_discrepancy) >= 100 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>
                            Diferencia con Alegra: {fmt(syncStatus.last_discrepancy)}
                          </span>
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">Aún no se ha sincronizado ningún cierre.</p>
                  )}
                  {syncStatus.pending_count > 0 && (
                    <p className="text-xs text-amber-600 font-medium">
                      {syncStatus.pending_count} cierre{syncStatus.pending_count > 1 ? 's' : ''} sin sincronizar
                    </p>
                  )}
                </div>
              )}
            </div>
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
                  {a.payment_key === 'cash' && (
                    <p className="text-xs text-gray-400 mt-1">Está en el local, aún no se ha enviado</p>
                  )}
                  {a.payment_key === 'addi_datafono' && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <label htmlFor={`contemplated-${a.id}`} className="text-xs text-gray-400 whitespace-nowrap">
                        Contempla saldo hasta:
                      </label>
                      <input
                        id={`contemplated-${a.id}`}
                        type="date"
                        value={a.contemplated_until || ''}
                        onChange={e => handleContemplatedUntilChange(a.id, e.target.value)}
                        disabled={savingContemplatedId === a.id}
                        className="text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
                      />
                    </div>
                  )}
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

                <CurrencyInput
                  placeholder="Monto"
                  value={adjustForm.amount}
                  onChange={v => setAdjustForm(f => ({ ...f, amount: v }))}
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

                <CurrencyInput
                  placeholder="Monto"
                  value={transferForm.amount}
                  onChange={v => setTransferForm(f => ({ ...f, amount: v }))}
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

      {tab === 'recompras' && <CuentasRecompras onEntriesChanged={refreshSummary} />}

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

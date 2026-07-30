import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Plus, Trash2, Pencil, X, Check, AlertCircle } from 'lucide-react';
import { getPayments, createPayment, updatePayment, deletePayment } from '../../services/employeesService';
import EmployeeSummaryCards from './EmployeeSummaryCards';
import EmployeeSelect from './EmployeeSelect';

const fmt = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);
const today = () => new Date().toISOString().split('T')[0];
const TYPE_LABELS = {
  quincena: { label: 'Quincena',  color: 'bg-green-100 text-green-700'   },
  prima:    { label: 'Prima',     color: 'bg-blue-100 text-blue-700'     },
  comision: { label: 'Comisión',  color: 'bg-purple-100 text-purple-700' },
  otro:     { label: 'Otro',      color: 'bg-gray-100 text-gray-700'     },
};
const EMPTY = { nombre_empleada: '', date: today(), type: 'quincena', amount: '', notes: '' };

const PagosSection = ({ isAdmin, filterNombre }) => {
  const [items, setItems] = useState([]);
  const [totalPagado, setTotalPagado] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await getPayments(filterNombre || null); setItems(data.items || []); setTotalPagado(data.total_pagado || 0); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [filterNombre]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { nombre_empleada: form.nombre_empleada.trim(), date: form.date, type: form.type, amount: parseFloat(form.amount), notes: form.notes };
      if (editingId) { await updatePayment(editingId, payload); setSuccess('Actualizado'); }
      else { await createPayment(payload); setSuccess('Registrado'); }
      setShowForm(false); setEditingId(null); setForm(EMPTY); await load();
    } catch (e) { setError(e.message); } finally { setSaving(false); setTimeout(() => setSuccess(''), 3000); }
  };

  const handleEdit = (item) => {
    setForm({ nombre_empleada: item.nombre_empleada, date: item.date, type: item.type, amount: String(item.amount), notes: item.notes || '' });
    setEditingId(item.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar?')) return;
    try { await deletePayment(id); await load(); } catch (e) { setError(e.message); }
  };

  const cancel = () => { setShowForm(false); setEditingId(null); setForm(EMPTY); setError(''); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><CreditCard className="w-5 h-5 text-green-600" /></div>
          <div><h2 className="text-base font-semibold text-gray-900">Pagos</h2><p className="text-xs text-gray-500">Quincenas, primas, comisiones y otros</p></div>
        </div>
        {isAdmin && (
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
            <Plus className="w-4 h-4" /> Registrar pago
          </button>
        )}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4">
        <div><p className="text-xs text-green-700 font-medium uppercase">Total pagado</p><p className="text-2xl font-bold text-green-800">{fmt(totalPagado)}</p></div>
        <div className="ml-auto"><p className="text-xs text-green-600">{items.length} pago{items.length !== 1 ? 's' : ''}</p></div>
      </div>

      <EmployeeSummaryCards
        items={items}
        valueFor={item => item.amount || 0}
        formatValue={fmt}
        countLabel="pago"
        accentClass="text-green-700"
      />

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><AlertCircle className="w-4 h-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700"><Check className="w-4 h-4" />{success}</div>}

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">{editingId ? 'Editar pago' : 'Nuevo pago'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Empleada *</label>
              <EmployeeSelect value={form.nombre_empleada} focusRing="focus:ring-green-300"
                onChange={e => setForm(f => ({ ...f, nombre_empleada: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo *</label>
              <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white">
                {Object.entries(TYPE_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha *</label>
              <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Monto *</label>
              <input type="number" required min="1000" step="1000" placeholder="0" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
            <textarea rows={2} placeholder="Período, concepto…" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={cancel} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /> Cancelar</button>
          </div>
        </form>
      )}

      {loading ? <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" /></div>
      : items.length === 0 ? <div className="text-center py-10 text-gray-400"><CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No hay pagos{filterNombre ? ` para "${filterNombre}"` : ''}</p></div>
      : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Empleada</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Monto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Notas</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => {
                const cfg = TYPE_LABELS[item.type] || TYPE_LABELS.otro;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{item.date}</td>
                    <td className="px-4 py-3 font-medium text-indigo-700">{item.nombre_empleada}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span></td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(item.amount)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.notes || '—'}</td>
                    {isAdmin && <td className="px-4 py-3"><div className="flex items-center gap-2 justify-end">
                      <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PagosSection;

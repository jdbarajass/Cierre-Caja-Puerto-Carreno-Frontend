import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Plus, Trash2, Pencil, X, Check, AlertCircle } from 'lucide-react';
import { getLoans, createLoan, updateLoan, deleteLoan } from '../../services/employeesService';

const fmt = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);
const today = () => new Date().toISOString().split('T')[0];
const EMPTY = { nombre_empleada: '', date: today(), amount: '', notes: '' };

const PrestamosSection = ({ isAdmin, filterNombre }) => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLoans(filterNombre || null);
      setItems(data.items || []); setTotal(data.total_acumulado || 0);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [filterNombre]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { nombre_empleada: form.nombre_empleada.trim(), date: form.date, amount: parseFloat(form.amount), notes: form.notes };
      if (editingId) { await updateLoan(editingId, payload); setSuccess('Actualizado'); }
      else { await createLoan(payload); setSuccess('Registrado'); }
      setShowForm(false); setEditingId(null); setForm(EMPTY); await load();
    } catch (e) { setError(e.message); } finally { setSaving(false); setTimeout(() => setSuccess(''), 3000); }
  };

  const handleEdit = (item) => {
    setForm({ nombre_empleada: item.nombre_empleada, date: item.date, amount: String(item.amount), notes: item.notes || '' });
    setEditingId(item.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar?')) return;
    try { await deleteLoan(id); await load(); } catch (e) { setError(e.message); }
  };

  const cancel = () => { setShowForm(false); setEditingId(null); setForm(EMPTY); setError(''); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><DollarSign className="w-5 h-5 text-amber-600" /></div>
          <div><h2 className="text-base font-semibold text-gray-900">Préstamos</h2><p className="text-xs text-gray-500">Dinero prestado con cargo a quincena</p></div>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY); }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
          <Plus className="w-4 h-4" /> Registrar préstamo
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
        <div><p className="text-xs text-amber-700 font-medium uppercase">Total prestado</p><p className="text-2xl font-bold text-amber-800">{fmt(total)}</p></div>
        <div className="ml-auto"><p className="text-xs text-amber-600">{items.length} registro{items.length !== 1 ? 's' : ''}</p></div>
      </div>

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><AlertCircle className="w-4 h-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700"><Check className="w-4 h-4" />{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">{editingId ? 'Editar' : 'Nuevo préstamo'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre empleada *</label>
              <input type="text" required placeholder="Mónica, Camila…" value={form.nombre_empleada}
                onChange={e => setForm(f => ({ ...f, nombre_empleada: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha *</label>
              <input type="date" required value={form.date} max={today()}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Monto *</label>
              <input type="number" required min="1000" step="1000" placeholder="0" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
            <textarea rows={2} placeholder="Para qué es el préstamo…" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors">
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={cancel} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /> Cancelar</button>
          </div>
        </form>
      )}

      {loading ? <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" /></div>
      : items.length === 0 ? <div className="text-center py-10 text-gray-400"><DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No hay préstamos{filterNombre ? ` para "${filterNombre}"` : ''}</p></div>
      : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Empleada</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Monto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Notas</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{item.date}</td>
                  <td className="px-4 py-3 font-medium text-indigo-700">{item.nombre_empleada}</td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-700">{fmt(item.amount)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.notes || '—'}</td>
                  {isAdmin && <td className="px-4 py-3"><div className="flex items-center gap-2 justify-end">
                    <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PrestamosSection;

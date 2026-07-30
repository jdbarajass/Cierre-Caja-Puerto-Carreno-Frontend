import React, { useState, useEffect, useCallback } from 'react';
import { Shirt, Plus, Trash2, Pencil, X, Check, AlertCircle } from 'lucide-react';
import { getClothing, createClothing, updateClothing, deleteClothing } from '../../services/employeesService';
import EmployeeSummaryCards from './EmployeeSummaryCards';
import EmployeeSelect from './EmployeeSelect';

const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const today = () => new Date().toISOString().split('T')[0];
const EMPTY = { nombre_empleada: '', date: today(), product: '', value: '', discount_pct: '0', notes: '' };

const RopaSection = ({ isAdmin, filterNombre }) => {
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
      const data = await getClothing(filterNombre || null);
      setItems(data.items || []);
      setTotal(data.total_acumulado || 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filterNombre]);

  useEffect(() => { load(); }, [load]);

  const finalValue = () => {
    const v = parseFloat(form.value) || 0;
    const d = parseFloat(form.discount_pct) || 0;
    return Math.round(v * (1 - d / 100));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        nombre_empleada: form.nombre_empleada.trim(),
        date: form.date, product: form.product,
        value: parseFloat(form.value),
        discount_pct: parseFloat(form.discount_pct),
        notes: form.notes,
      };
      if (editingId) { await updateClothing(editingId, payload); setSuccess('Registro actualizado'); }
      else { await createClothing(payload); setSuccess('Prenda registrada'); }
      setShowForm(false); setEditingId(null); setForm(EMPTY);
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); setTimeout(() => setSuccess(''), 3000); }
  };

  const handleEdit = (item) => {
    setForm({
      nombre_empleada: item.nombre_empleada,
      date: item.date, product: item.product,
      value: String(item.value), discount_pct: String(item.discount_pct),
      notes: item.notes || ''
    });
    setEditingId(item.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar?')) return;
    try { await deleteClothing(id); await load(); } catch (e) { setError(e.message); }
  };

  const cancel = () => { setShowForm(false); setEditingId(null); setForm(EMPTY); setError(''); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
            <Shirt className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Ropa tomada</h2>
            <p className="text-xs text-gray-500">Prendas con descuento de empleada</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY); }}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors">
          <Plus className="w-4 h-4" /> Registrar prenda
        </button>
      </div>

      <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 flex items-center gap-4">
        <div>
          <p className="text-xs text-pink-700 font-medium uppercase tracking-wide">Total acumulado</p>
          <p className="text-2xl font-bold text-pink-800">{fmt(total)}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-pink-600">{items.length} prenda{items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <EmployeeSummaryCards
        items={items}
        valueFor={item => item.final_value || 0}
        formatValue={fmt}
        countLabel="prenda"
        accentClass="text-pink-700"
      />

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><AlertCircle className="w-4 h-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700"><Check className="w-4 h-4" />{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">{editingId ? 'Editar prenda' : 'Nueva prenda'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre empleada */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Empleada *</label>
              <EmployeeSelect value={form.nombre_empleada} focusRing="focus:ring-pink-300"
                onChange={e => setForm(f => ({ ...f, nombre_empleada: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha *</label>
              <input type="date" required value={form.date} max={today()}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Producto *</label>
              <input type="text" required placeholder="Ej: Camiseta básica" value={form.product}
                onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Precio original *</label>
              <input type="number" required min="0" step="100" placeholder="0" value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descuento (%)</label>
              <input type="number" min="0" max="100" step="0.1" placeholder="0" value={form.discount_pct}
                onChange={e => setForm(f => ({ ...f, discount_pct: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 bg-pink-100 rounded-lg">
            <span className="text-sm text-pink-700 font-medium">Valor a pagar:</span>
            <span className="text-lg font-bold text-pink-800">{fmt(finalValue())}</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
            <textarea rows={2} placeholder="Observaciones…" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50 transition-colors">
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={cancel}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Shirt className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay prendas registradas{filterNombre ? ` para "${filterNombre}"` : ''}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Empleada</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Producto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Precio</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Desc.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">A pagar</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{item.date}</td>
                  <td className="px-4 py-3 font-medium text-indigo-700">{item.nombre_empleada}</td>
                  <td className="px-4 py-3 text-gray-900">{item.product}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(item.value)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">{item.discount_pct}%</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-pink-700">{fmt(item.final_value)}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RopaSection;

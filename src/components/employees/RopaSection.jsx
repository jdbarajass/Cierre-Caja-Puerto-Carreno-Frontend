import React, { useState, useEffect, useCallback } from 'react';
import { Shirt, Plus, Trash2, Pencil, X, Check, AlertCircle } from 'lucide-react';
import { getClothing, createClothing, updateClothing, deleteClothing } from '../../services/employeesService';

const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const today = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM = { date: today(), product: '', value: '', discount_pct: '0', notes: '' };

const RopaSection = ({ isAdmin, selectedEmployeeId }) => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClothing(isAdmin ? selectedEmployeeId : null);
      setItems(data.items || []);
      setTotal(data.total_acumulado || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedEmployeeId]);

  useEffect(() => { load(); }, [load]);

  const finalValue = () => {
    const v = parseFloat(form.value) || 0;
    const d = parseFloat(form.discount_pct) || 0;
    return (v * (1 - d / 100)).toFixed(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        date: form.date,
        product: form.product,
        value: parseFloat(form.value),
        discount_pct: parseFloat(form.discount_pct),
        notes: form.notes,
        ...(isAdmin && selectedEmployeeId ? { employee_id: selectedEmployeeId } : {})
      };
      if (editingId) {
        await updateClothing(editingId, payload);
        setSuccess('Registro actualizado');
      } else {
        await createClothing(payload);
        setSuccess('Prenda registrada');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleEdit = (item) => {
    setForm({
      date: item.date,
      product: item.product,
      value: String(item.value),
      discount_pct: String(item.discount_pct),
      notes: item.notes || ''
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    try {
      await deleteClothing(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  return (
    <div className="space-y-5">
      {/* Header de sección */}
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
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Registrar prenda
        </button>
      </div>

      {/* Resumen */}
      <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 flex items-center gap-4">
        <div>
          <p className="text-xs text-pink-700 font-medium uppercase tracking-wide">Total acumulado</p>
          <p className="text-2xl font-bold text-pink-800">{fmt(total)}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-pink-600">{items.length} prenda{items.length !== 1 ? 's' : ''} registrada{items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Mensajes */}
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

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">{editingId ? 'Editar prenda' : 'Nueva prenda'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Valor final calculado */}
          <div className="flex items-center gap-2 px-4 py-3 bg-pink-100 rounded-lg">
            <span className="text-sm text-pink-700 font-medium">Valor a pagar:</span>
            <span className="text-lg font-bold text-pink-800">{fmt(finalValue())}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
            <textarea rows={2} placeholder="Observaciones adicionales..." value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none" />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50 transition-colors">
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={cancelForm}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Shirt className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay prendas registradas</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Fecha</th>
                {isAdmin && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Empleada</th>}
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Producto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Precio</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Desc.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">A pagar</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700">{item.date}</td>
                  {isAdmin && <td className="px-4 py-3 text-gray-700">{item.employee_name}</td>}
                  <td className="px-4 py-3 text-gray-900 font-medium">{item.product}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(item.value)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">
                      {item.discount_pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-pink-700">{fmt(item.final_value)}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => handleEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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

import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Plus, Trash2, Pencil, X, Check, AlertCircle } from 'lucide-react';
import { getVacations, createVacation, updateVacation, deleteVacation } from '../../services/employeesService';

const today = () => new Date().toISOString().split('T')[0];
const EMPTY = { start_date: today(), end_date: today(), notes: '' };

const calcDays = (start, end) => {
  try {
    const d = (new Date(end) - new Date(start)) / 86400000 + 1;
    return d > 0 ? d : 0;
  } catch { return 0; }
};

const VacacionesSection = ({ isAdmin, selectedEmployeeId }) => {
  const [items, setItems] = useState([]);
  const [totalDays, setTotalDays] = useState(0);
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
      const data = await getVacations(isAdmin ? selectedEmployeeId : null);
      setItems(data.items || []);
      setTotalDays(data.total_dias || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedEmployeeId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        start_date: form.start_date,
        end_date: form.end_date,
        notes: form.notes,
        ...(isAdmin && selectedEmployeeId ? { employee_id: selectedEmployeeId } : {})
      };
      if (editingId) {
        await updateVacation(editingId, payload);
        setSuccess('Vacaciones actualizadas');
      } else {
        await createVacation(payload);
        setSuccess('Vacaciones registradas');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleEdit = (item) => {
    setForm({ start_date: item.start_date, end_date: item.end_date, notes: item.notes || '' });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro de vacaciones?')) return;
    try { await deleteVacation(id); await load(); }
    catch (e) { setError(e.message); }
  };

  const cancel = () => { setShowForm(false); setEditingId(null); setForm(EMPTY); setError(''); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
            <Sun className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Vacaciones</h2>
            <p className="text-xs text-gray-500">Períodos de vacaciones tomadas</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY); }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
          <Plus className="w-4 h-4" /> Registrar vacaciones
        </button>
      </div>

      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center gap-4">
        <div>
          <p className="text-xs text-teal-700 font-medium uppercase tracking-wide">Total días</p>
          <p className="text-2xl font-bold text-teal-800">{totalDays} <span className="text-base font-normal">días</span></p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-teal-600">{items.length} período{items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <Check className="w-4 h-4" /> {success}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">{editingId ? 'Editar vacaciones' : 'Nuevas vacaciones'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha inicio *</label>
              <input type="date" required value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha fin *</label>
              <input type="date" required value={form.end_date} min={form.start_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
            </div>
          </div>

          {/* Días calculados */}
          <div className="flex items-center gap-2 px-4 py-3 bg-teal-100 rounded-lg">
            <span className="text-sm text-teal-700 font-medium">Días de vacaciones:</span>
            <span className="text-lg font-bold text-teal-800">{calcDays(form.start_date, form.end_date)}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
            <textarea rows={2} placeholder="Observaciones..." value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
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
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Sun className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay vacaciones registradas</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Inicio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fin</th>
                {isAdmin && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Empleada</th>}
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Días</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Notas</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{item.start_date}</td>
                  <td className="px-4 py-3 text-gray-700">{item.end_date}</td>
                  {isAdmin && <td className="px-4 py-3 text-gray-700">{item.employee_name}</td>}
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-bold">
                      {item.days}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.notes || '—'}</td>
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

export default VacacionesSection;

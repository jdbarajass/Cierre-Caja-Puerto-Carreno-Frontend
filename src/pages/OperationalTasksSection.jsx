import React, { useState, useEffect, useCallback } from 'react';
import { CheckSquare, Plus, Trash2, Pencil, X, Check, AlertCircle, Circle, CheckCircle2 } from 'lucide-react';
import { isAdmin } from '../utils/auth';
import {
  getOperationalTasks, createOperationalTask, updateOperationalTask, deleteOperationalTask
} from '../services/notesTasksService';

const EMPTY = { description: '', priority: 'media' };

const PRIORITY_LABELS = {
  alta:  { label: 'Alta',  color: 'bg-red-100 text-red-700',     dot: 'bg-red-500'    },
  media: { label: 'Media', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  baja:  { label: 'Baja',  color: 'bg-green-100 text-green-700',  dot: 'bg-green-500'  },
};

const OperationalTasksSection = () => {
  const admin = isAdmin();
  const [items, setItems] = useState([]);
  const [pendientes, setPendientes] = useState(0);
  const [completados, setCompletados] = useState(0);
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
      const data = await getOperationalTasks();
      setItems(data.items || []);
      setPendientes(data.pendientes || 0);
      setCompletados(data.completados || 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { description: form.description.trim(), priority: form.priority };
      if (editingId) { await updateOperationalTask(editingId, payload); setSuccess('Actualizada'); }
      else { await createOperationalTask(payload); setSuccess('Tarea agregada'); }
      setShowForm(false); setEditingId(null); setForm(EMPTY);
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); setTimeout(() => setSuccess(''), 3000); }
  };

  const handleToggle = async (it) => {
    try { await updateOperationalTask(it.id, { completed: !it.completed }); await load(); }
    catch (e) { setError(e.message); }
  };

  const handleEdit = (it) => {
    setForm({ description: it.description, priority: it.priority });
    setEditingId(it.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta tarea?')) return;
    try { await deleteOperationalTask(id); await load(); } catch (e) { setError(e.message); }
  };

  const cancel = () => { setShowForm(false); setEditingId(null); setForm(EMPTY); setError(''); };

  const pendingItems = items.filter(i => !i.completed);
  const doneItems = items.filter(i => i.completed);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Tareas Operativas</h2>
            <p className="text-xs text-gray-500">Pendientes del día a día en el local</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" /> Agregar tarea
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide">Pendientes</p>
          <p className="text-2xl font-bold text-emerald-800">{pendientes}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Completadas</p>
          <p className="text-2xl font-bold text-gray-600">{completados}</p>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><AlertCircle className="w-4 h-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700"><Check className="w-4 h-4" />{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">{editingId ? 'Editar tarea' : 'Nueva tarea'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Descripción *</label>
              <input type="text" required placeholder="Ej: Llamar al proveedor de bolsas" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prioridad</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white">
                {Object.entries(PRIORITY_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
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
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay tareas registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingItems.length > 0 && (
            <div className="space-y-2">
              {pendingItems
                .slice()
                .sort((a, b) => ['alta', 'media', 'baja'].indexOf(a.priority) - ['alta', 'media', 'baja'].indexOf(b.priority))
                .map(it => {
                  const cfg = PRIORITY_LABELS[it.priority] || PRIORITY_LABELS.media;
                  return (
                    <div key={it.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-emerald-300 transition-colors">
                      <button onClick={() => handleToggle(it)} className="flex-shrink-0">
                        <Circle className="w-5 h-5 text-gray-300 hover:text-emerald-500 transition-colors" />
                      </button>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <span className="flex-1 text-sm text-gray-800 font-medium">{it.description}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                      {admin && (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleEdit(it)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(it.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {doneItems.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Completadas</p>
              {doneItems.map(it => {
                const cfg = PRIORITY_LABELS[it.priority] || PRIORITY_LABELS.media;
                return (
                  <div key={it.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl opacity-70">
                    <button onClick={() => handleToggle(it)} className="flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </button>
                    <span className="flex-1 text-sm text-gray-500 line-through">{it.description}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.color} opacity-60`}>{cfg.label}</span>
                    {admin && (
                      <button onClick={() => handleDelete(it.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OperationalTasksSection;

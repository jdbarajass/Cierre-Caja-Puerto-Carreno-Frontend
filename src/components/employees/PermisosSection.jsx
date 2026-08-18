import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Trash2, Pencil, X, Check, AlertCircle } from 'lucide-react';
import { getPermissions, createPermission, updatePermission, deletePermission } from '../../services/employeesService';
import { EMPLOYEE_GROUPS, groupKeyFor } from '../../utils/employeeGroups';
import EmployeeSelect from './EmployeeSelect';

const today = () => new Date().toISOString().split('T')[0];
const TYPE_LABELS = {
  permiso:         { label: 'Permiso',        color: 'bg-blue-100 text-blue-700'    },
  incapacidad:     { label: 'Incapacidad',     color: 'bg-red-100 text-red-700'      },
  llegada_tarde:   { label: 'Llegada tarde',   color: 'bg-orange-100 text-orange-700'},
  salida_temprana: { label: 'Salida temprana', color: 'bg-yellow-100 text-yellow-700'},
};
const EMPTY = { nombre_empleada: '', date: today(), type: 'permiso', description: '', hoursPart: '', minutesPart: '' };

// Cuando no se especifican horas se asume día completo (jornada de 9h)
const WORKDAY_HOURS = 9;
const MINUTE_OPTIONS = [0, 15, 30, 45];

const hoursFor = (item) => (item.hours !== null && item.hours !== undefined && item.hours !== '' ? Number(item.hours) : WORKDAY_HOURS);

// Combina los inputs separados de horas/minutos del formulario en un decimal (o null si ambos vienen vacíos)
const decimalHoursFromForm = (f) => {
  const h = f.hoursPart === '' ? 0 : parseInt(f.hoursPart, 10) || 0;
  const m = f.minutesPart === '' ? 0 : parseInt(f.minutesPart, 10) || 0;
  const total = h + m / 60;
  return total > 0 ? total : null;
};

// Inverso: separa un decimal guardado en horas/minutos para precargar el formulario al editar
const splitHoursForForm = (decimalHours) => {
  if (!decimalHours) return { hoursPart: '', minutesPart: '' };
  const totalMinutes = Math.round(Number(decimalHours) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return { hoursPart: h ? String(h) : '', minutesPart: m ? String(m) : '' };
};

// Formato legible "1h 30min" / "45min" / "2h" para mostrar horas guardadas
const fmtHM = (decimalHours) => {
  const totalMinutes = Math.round(Number(decimalHours) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h && m) return `${h}h ${m}min`;
  if (m) return `${m}min`;
  return `${h}h`;
};

const PermisosSection = ({ isAdmin, filterNombre }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await getPermissions(filterNombre || null); setItems(data.items || []); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [filterNombre]);

  useEffect(() => { load(); }, [load]);

  // Resumen de horas/registros por empleada (Mónica y Rita por separado) y por tipo
  const emptyTypeBucket = () => Object.keys(TYPE_LABELS).reduce((o, t) => { o[t] = { count: 0, hours: 0 }; return o; }, {});

  const summaryByEmployee = items.reduce((acc, item) => {
    const key = groupKeyFor(item.nombre_empleada);
    if (!acc[key]) acc[key] = emptyTypeBucket();
    acc[key][item.type].count += 1;
    acc[key][item.type].hours += hoursFor(item);
    return acc;
  }, { monica: emptyTypeBucket(), rita: emptyTypeBucket() });

  const employeeCards = [
    ...EMPLOYEE_GROUPS,
    ...(summaryByEmployee.otras ? [{ key: 'otras', label: 'Otras' }] : []),
  ];

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { nombre_empleada: form.nombre_empleada.trim(), date: form.date, type: form.type, description: form.description, hours: decimalHoursFromForm(form) };
      if (editingId) { await updatePermission(editingId, payload); setSuccess('Actualizado'); }
      else { await createPermission(payload); setSuccess('Registrado'); }
      setShowForm(false); setEditingId(null); setForm(EMPTY); await load();
    } catch (e) { setError(e.message); } finally { setSaving(false); setTimeout(() => setSuccess(''), 3000); }
  };

  const handleEdit = (item) => {
    setForm({ nombre_empleada: item.nombre_empleada, date: item.date, type: item.type, description: item.description || '', ...splitHoursForForm(item.hours) });
    setEditingId(item.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar?')) return;
    try { await deletePermission(id); await load(); } catch (e) { setError(e.message); }
  };

  const cancel = () => { setShowForm(false); setEditingId(null); setForm(EMPTY); setError(''); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center"><Clock className="w-5 h-5 text-orange-600" /></div>
          <div><h2 className="text-base font-semibold text-gray-900">Permisos e incapacidades</h2><p className="text-xs text-gray-500">Ausencias, llegadas tarde y salidas tempranas</p></div>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
          <Plus className="w-4 h-4" /> Registrar
        </button>
      </div>

      <div className="space-y-3">
        {employeeCards.map(({ key, label }) => {
          const data = summaryByEmployee[key] || emptyTypeBucket();
          const totalHours = fmtHM(Object.values(data).reduce((s, d) => s + d.hours, 0));
          return (
            <div key={key} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">{label}</h3>
                <span className="text-xs text-gray-500">Total permisos: <strong className="text-gray-700">{totalHours}</strong></span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(TYPE_LABELS).map(([type, cfg]) => (
                  <div key={type} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-gray-800">{fmtHM(data[type].hours)}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{cfg.label}</p>
                    <p className="text-[10px] text-gray-400">{data[type].count} registro{data[type].count === 1 ? '' : 's'}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><AlertCircle className="w-4 h-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700"><Check className="w-4 h-4" />{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">{editingId ? 'Editar' : 'Nuevo registro'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Empleada *</label>
              <EmployeeSelect value={form.nombre_empleada} focusRing="focus:ring-orange-300"
                onChange={e => setForm(f => ({ ...f, nombre_empleada: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha *</label>
              <input type="date" required value={form.date} max={today()}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo *</label>
              <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                {Object.entries(TYPE_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tiempo (opcional)</label>
              <div className="flex gap-2">
                <input type="number" min="0" max="23" placeholder="Horas" value={form.hoursPart}
                  onChange={e => setForm(f => ({ ...f, hoursPart: e.target.value }))}
                  className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                <select value={form.minutesPart} onChange={e => setForm(f => ({ ...f, minutesPart: e.target.value }))}
                  className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                  <option value="">Min</option>
                  {MINUTE_OPTIONS.map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Vacío = día completo ({WORKDAY_HOURS}h)</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
            <textarea rows={2} placeholder="Motivo…" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors">
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={cancel} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /> Cancelar</button>
          </div>
        </form>
      )}

      {loading ? <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" /></div>
      : items.length === 0 ? <div className="text-center py-10 text-gray-400"><Clock className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No hay permisos{filterNombre ? ` para "${filterNombre}"` : ''}</p></div>
      : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Empleada</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Descripción</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Horas</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => {
                const cfg = TYPE_LABELS[item.type] || { label: item.type, color: 'bg-gray-100 text-gray-700' };
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{item.date}</td>
                    <td className="px-4 py-3 font-medium text-indigo-700">{item.nombre_empleada}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.description || '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {item.hours ? fmtHM(item.hours) : <span title="Día completo, contado como 9h">{WORKDAY_HOURS}h <span className="text-gray-400 text-xs">(día completo)</span></span>}
                    </td>
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

export default PermisosSection;

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Plus, Trash2, Pencil, X, Check, AlertCircle,
  ChevronRight, TrendingUp, ChevronLeft, ChevronDown
} from 'lucide-react';
import {
  getEntries, createEntry, updateEntry, deleteEntry
} from '../services/repurchaseService';
import { isAdmin } from '../utils/auth';

const fmt = (v) =>
  v ? new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0
  }).format(v) : '—';

const fmtNum = (v) => v ? fmt(v) : '';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PAYMENT_COLS = [
  { key: 'efectivo',  label: 'EFECTIVO',   color: 'bg-green-50'  },
  { key: 'datafono',  label: 'DATAFONO',   color: 'bg-blue-50'   },
  { key: 'qr',        label: 'QR',         color: 'bg-purple-50' },
  { key: 'daviplata', label: 'DAVIPLATA',  color: 'bg-red-50'    },
  { key: 'nequi',     label: 'NEQUI',      color: 'bg-pink-50'   },
  { key: 'bbva',      label: 'BBVA',       color: 'bg-cyan-50'   },
];

const today = () => new Date().toISOString().split('T')[0];

const EMPTY = {
  date: today(),
  valor_no_enviado: '',
  efectivo: '', datafono: '', qr: '', daviplata: '', nequi: '', bbva: '',
  sobrante_mes_anterior: '',
  notes: ''
};

const CuentasRecompras = () => {
  const admin = isAdmin();
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [entries, setEntries]       = useState([]);
  const [totals,  setTotals]        = useState({});
  const [loading, setLoading]       = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY);
  const [editingId, setEditingId]   = useState(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getEntries({ year, month });
      setEntries(data.entries || []);
      setTotals(data.totals || {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  // Navegación mes anterior / siguiente
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1);  setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const rowTotal = (row) =>
    (row.efectivo || 0) + (row.datafono || 0) + (row.qr || 0) +
    (row.daviplata || 0) + (row.nequi || 0) + (row.bbva || 0);

  const grandTotal = () =>
    entries.reduce((acc, e) => acc + rowTotal(e) + (e.sobrante_mes_anterior || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const toNum = (v) => parseFloat(v) || 0;
      const payload = {
        date: form.date,
        valor_no_enviado:     toNum(form.valor_no_enviado),
        efectivo:             toNum(form.efectivo),
        datafono:             toNum(form.datafono),
        qr:                   toNum(form.qr),
        daviplata:            toNum(form.daviplata),
        nequi:                toNum(form.nequi),
        bbva:                 toNum(form.bbva),
        sobrante_mes_anterior:toNum(form.sobrante_mes_anterior),
        notes: form.notes,
      };
      if (editingId) {
        await updateEntry(editingId, payload);
        setSuccess('Registro actualizado');
      } else {
        await createEntry(payload);
        setSuccess('Registro creado');
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

  const handleEdit = (row) => {
    setForm({
      date: row.date,
      valor_no_enviado:      String(row.valor_no_enviado || ''),
      efectivo:              String(row.efectivo   || ''),
      datafono:              String(row.datafono   || ''),
      qr:                    String(row.qr         || ''),
      daviplata:             String(row.daviplata  || ''),
      nequi:                 String(row.nequi      || ''),
      bbva:                  String(row.bbva       || ''),
      sobrante_mes_anterior: String(row.sobrante_mes_anterior || ''),
      notes: row.notes || '',
    });
    setEditingId(row.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    try { await deleteEntry(id); await load(); }
    catch (e) { setError(e.message); }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
    setError('');
  };

  const Field = ({ label, k, placeholder = '0' }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="number" min="0" step="1000" placeholder={placeholder}
        value={form[k]}
        onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span>Sistema KOAJ</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">Cuentas Recompras</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cuentas Recompras</h1>
          <p className="text-sm text-gray-500 mt-1">
            Seguimiento de dinero enviado al socio para recompra de mercancía
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          {admin && (
            <button
              onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Agregar fila
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
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

      {/* Formulario */}
      {showForm && admin && (
        <form onSubmit={handleSubmit} className="bg-white border border-indigo-200 rounded-xl p-6 shadow-sm space-y-5">
          <h3 className="font-semibold text-gray-900 text-base">
            {editingId ? 'Editar registro' : 'Nuevo registro'}
          </h3>

          {/* Fila 1: Fecha + Valor no enviado + Sobrante */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
              <input type="date" required value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <Field label="Valor aún no enviado" k="valor_no_enviado" />
            <Field label="Sobrante mes anterior" k="sobrante_mes_anterior" />
          </div>

          {/* Fila 2: Medios de pago */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Montos ya enviados al socio por medio de pago</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {PAYMENT_COLS.map(({ key, label }) => (
                <Field key={key} label={label} k={key} />
              ))}
            </div>
          </div>

          {/* Total calculado */}
          <div className="flex flex-wrap items-center gap-6 px-4 py-3 bg-indigo-50 rounded-xl">
            <div>
              <p className="text-xs text-indigo-600 font-medium">Total enviado en esta fila</p>
              <p className="text-xl font-bold text-indigo-800">
                {fmt(
                  ['efectivo','datafono','qr','daviplata','nequi','bbva']
                    .reduce((s,k) => s + (parseFloat(form[k]) || 0), 0)
                )}
              </p>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea rows={2} placeholder="Observaciones adicionales..." value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar registro'}
            </button>
            <button type="button" onClick={cancelForm}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Selector de mes */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <button onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{MONTHS[month - 1]} {year}</p>
          <p className="text-xs text-gray-500">{entries.length} registro{entries.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Tarjetas de totales del mes */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {PAYMENT_COLS.map(({ key, label, color }) => (
            totals[key] > 0 && (
              <div key={key} className={`${color} border border-gray-200 rounded-xl p-4`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-lg font-bold text-gray-800 mt-1">{fmt(totals[key])}</p>
              </div>
            )
          ))}
          <div className="bg-indigo-600 rounded-xl p-4 col-span-2 sm:col-span-1">
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Total enviado</p>
            <p className="text-xl font-bold text-white mt-1">{fmt(totals.total_enviado)}</p>
          </div>
        </div>
      )}

      {/* Tabla principal */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl text-center py-16 text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-medium">No hay registros para {MONTHS[month - 1]} {year}</p>
          {admin && (
            <p className="text-sm mt-1">Haz clic en "Agregar fila" para comenzar</p>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Fecha</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wide bg-yellow-700 whitespace-nowrap">
                    Aún no enviado
                  </th>
                  {PAYMENT_COLS.map(({ key, label }) => (
                    <th key={key} className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                  <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wide bg-indigo-700 whitespace-nowrap">
                    Sobrante<br/>mes ant.
                  </th>
                  <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wide bg-indigo-800 whitespace-nowrap">
                    Total fila
                  </th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((row, idx) => {
                  const total = rowTotal(row) + (row.sobrante_mes_anterior || 0);
                  return (
                    <tr key={row.id} className={`hover:bg-indigo-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{row.date}</td>
                      <td className="px-3 py-3 text-right text-amber-700 font-medium bg-yellow-50 whitespace-nowrap">
                        {fmtNum(row.valor_no_enviado)}
                      </td>
                      {PAYMENT_COLS.map(({ key }) => (
                        <td key={key} className="px-3 py-3 text-right text-gray-700 whitespace-nowrap">
                          {fmtNum(row[key])}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-right font-semibold text-indigo-600 whitespace-nowrap">
                        {fmtNum(row.sobrante_mes_anterior)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-indigo-800 bg-indigo-50 whitespace-nowrap">
                        {fmt(total)}
                      </td>
                      <td className="px-3 py-3">
                        {admin && (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={() => handleEdit(row)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(row.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Fila de TOTALES */}
              <tfoot>
                <tr className="bg-indigo-700 text-white font-bold">
                  <td className="px-4 py-3 text-sm uppercase tracking-wide">TOTAL MES</td>
                  <td className="px-3 py-3 text-right text-yellow-200 text-xs">—</td>
                  {PAYMENT_COLS.map(({ key }) => (
                    <td key={key} className="px-3 py-3 text-right text-sm whitespace-nowrap">
                      {totals[key] ? fmt(totals[key]) : '—'}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right text-sm whitespace-nowrap">
                    {totals.sobrante_acumulado ? fmt(totals.sobrante_acumulado) : '—'}
                  </td>
                  <td className="px-3 py-3 text-right text-base whitespace-nowrap bg-indigo-900">
                    {fmt(grandTotal())}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notas de filas */}
          {entries.some(e => e.notes) && (
            <div className="px-4 py-3 border-t border-gray-200 space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notas</p>
              {entries.filter(e => e.notes).map(e => (
                <p key={e.id} className="text-xs text-gray-600">
                  <span className="font-medium">{e.date}:</span> {e.notes}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CuentasRecompras;

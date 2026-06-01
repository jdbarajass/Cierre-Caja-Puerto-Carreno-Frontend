import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Plus, Trash2, Pencil, X, Check, AlertCircle,
  ChevronRight, TrendingUp, ChevronLeft, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  getEntries, createEntry, updateEntry, deleteEntry
} from '../services/repurchaseService';

const fmt = (v) =>
  v != null && v !== 0
    ? new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0
      }).format(v)
    : '';

const fmtForce = (v) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0
  }).format(v || 0);

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PAYMENT_COLS = [
  { key: 'efectivo',  label: 'EFECTIVO'  },
  { key: 'datafono',  label: 'DATAFONO'  },
  { key: 'qr',        label: 'QR'        },
  { key: 'daviplata', label: 'DAVIPLATA' },
  { key: 'nequi',     label: 'NEQUI'     },
  { key: 'bbva',      label: 'BBVA'      },
];

const today = () => new Date().toISOString().split('T')[0];

const EMPTY = {
  date: today(),
  descripcion: 'Recompra Jhonatan',
  valor_no_enviado: '',
  efectivo: '', datafono: '', qr: '', daviplata: '', nequi: '', bbva: '',
  sobrante_mes_anterior: '',
  fecha_compra: '',
  notes: ''
};

const CuentasRecompras = () => {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [entries, setEntries]   = useState([]);
  const [totals,  setTotals]    = useState({});
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

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

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const toNum = (v) => parseFloat(v) || 0;

  const formTotal = () =>
    ['efectivo','datafono','qr','daviplata','nequi','bbva'].reduce(
      (s, k) => s + toNum(form[k]), 0);

  const formFee = () => Math.round(formTotal() * 4 / 1000);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        date: form.date,
        descripcion: form.descripcion || 'Recompra Jhonatan',
        valor_no_enviado: toNum(form.valor_no_enviado),
        efectivo: toNum(form.efectivo),
        datafono: toNum(form.datafono),
        qr: toNum(form.qr),
        daviplata: toNum(form.daviplata),
        nequi: toNum(form.nequi),
        bbva: toNum(form.bbva),
        sobrante_mes_anterior: toNum(form.sobrante_mes_anterior),
        fecha_compra: form.fecha_compra || null,
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
      descripcion: row.descripcion || 'Recompra Jhonatan',
      valor_no_enviado: String(row.valor_no_enviado || ''),
      efectivo: String(row.efectivo   || ''),
      datafono: String(row.datafono   || ''),
      qr:       String(row.qr         || ''),
      daviplata:String(row.daviplata  || ''),
      nequi:    String(row.nequi      || ''),
      bbva:     String(row.bbva       || ''),
      sobrante_mes_anterior: String(row.sobrante_mes_anterior || ''),
      fecha_compra: row.fecha_compra || '',
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

  const F = ({ label, k, placeholder = '' }) => (
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

  const grandTotal = () =>
    entries.reduce((acc, e) => acc + (e.total_enviado || 0) + (e.sobrante_mes_anterior || 0), 0);

  return (
    <div className="space-y-5">
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
            Control de dinero enviado al socio para recompra de mercancía
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button
            onClick={() => { setShowForm(v => !v); setEditingId(null); setForm(EMPTY); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            {showForm && !editingId ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm && !editingId ? 'Cancelar' : 'Agregar fila'}
          </button>
        </div>
      </div>

      {/* Alertas */}
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
        <form onSubmit={handleSubmit} className="bg-white border border-indigo-200 rounded-xl p-6 shadow-sm space-y-5">
          <h3 className="font-semibold text-gray-900 text-base">
            {editingId ? 'Editar registro' : 'Nuevo registro'}
          </h3>

          {/* Fila 1: descripción, fecha, fecha compra */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
              <input type="text" placeholder="Recompra Jhonatan" value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
              <input type="date" required value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha compra factura</label>
              <input type="date" value={form.fecha_compra}
                onChange={e => setForm(f => ({ ...f, fecha_compra: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          {/* Fila 2: pendiente + sobrante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Valor aún no enviado" k="valor_no_enviado" />
            <F label="Sobrante mes anterior" k="sobrante_mes_anterior" />
          </div>

          {/* Fila 3: medios de pago */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Montos ya enviados al socio por medio de pago
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {PAYMENT_COLS.map(({ key, label }) => (
                <F key={key} label={label} k={key} />
              ))}
            </div>
          </div>

          {/* Totales calculados */}
          <div className="grid grid-cols-3 gap-3">
            <div className="px-4 py-3 bg-indigo-50 rounded-xl">
              <p className="text-xs text-indigo-600 font-medium">Total enviado</p>
              <p className="text-lg font-bold text-indigo-800">{fmtForce(formTotal())}</p>
            </div>
            <div className="px-4 py-3 bg-orange-50 rounded-xl">
              <p className="text-xs text-orange-600 font-medium">Comisión 4‰</p>
              <p className="text-lg font-bold text-orange-800">{fmtForce(formFee())}</p>
            </div>
            <div className="px-4 py-3 bg-green-50 rounded-xl">
              <p className="text-xs text-green-600 font-medium">Valor sobrante</p>
              <p className="text-lg font-bold text-green-800">{fmtForce(formTotal() - formFee())}</p>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea rows={2} placeholder="Observaciones..." value={form.notes}
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

      {/* Navegación mes */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{MONTHS[month - 1]} {year}</p>
          <p className="text-xs text-gray-500">{entries.length} registro{entries.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl text-center py-16 text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-medium">No hay registros para {MONTHS[month - 1]} {year}</p>
          <p className="text-sm mt-1">Haz clic en "Agregar fila" para comenzar</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                {/* Fila de grupos de columnas */}
                <tr className="bg-gray-900 text-white text-xs">
                  <th colSpan={3} className="px-3 py-2 text-center border-r border-gray-700">
                    RECOMPRA {MONTHS[month - 1].toUpperCase()} {year}
                  </th>
                  <th colSpan={6} className="px-3 py-2 text-center border-r border-gray-700 bg-gray-800">
                    MEDIOS DE PAGO ENVIADOS
                  </th>
                  <th className="px-3 py-2 text-center border-r border-gray-700 bg-indigo-800">TOTAL</th>
                  <th colSpan={3} className="px-3 py-2 text-center bg-orange-700">
                    FACTURA RECOMPRA ROPA
                  </th>
                  <th className="px-2 py-2 bg-gray-900" />
                </tr>
                {/* Fila de encabezados */}
                <tr className="bg-gray-700 text-white text-xs uppercase tracking-wide">
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Descripción</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Fecha</th>
                  <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap bg-yellow-800">
                    Valor no enviado
                  </th>
                  {PAYMENT_COLS.map(({ key, label }) => (
                    <th key={key} className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                  <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap bg-indigo-700">
                    TOTAL
                  </th>
                  <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap bg-orange-700">
                    Fecha compra
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap bg-orange-700">
                    Valor Compra +<br/>(4×1000)
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap bg-orange-700">
                    Valor sobrante
                  </th>
                  <th className="px-2 py-2.5 bg-gray-700" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((row, idx) => (
                  <tr key={row.id} className={`hover:bg-indigo-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-sky-50'}`}>
                    <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">
                      {row.descripcion || 'Recompra Jhonatan'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{row.date}</td>
                    <td className="px-3 py-2.5 text-right text-amber-700 bg-yellow-50 whitespace-nowrap font-medium">
                      {fmt(row.valor_no_enviado)}
                    </td>
                    {PAYMENT_COLS.map(({ key }) => (
                      <td key={key} className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap">
                        {fmt(row[key])}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-bold text-indigo-800 bg-indigo-50 whitespace-nowrap">
                      {fmtForce(row.total_enviado)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-600 text-xs bg-orange-50 whitespace-nowrap">
                      {row.fecha_compra || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-orange-700 bg-orange-50 whitespace-nowrap">
                      {row.fee_4mil ? fmtForce(row.fee_4mil) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-green-700 bg-orange-50 whitespace-nowrap">
                      {row.valor_sobrante ? fmtForce(row.valor_sobrante) : '—'}
                    </td>
                    <td className="px-2 py-2.5">
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
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Fila de TOTALES */}
              <tfoot>
                <tr className="bg-gray-800 text-white font-bold text-sm">
                  <td className="px-3 py-3 uppercase tracking-wide" colSpan={2}>
                    TOTAL RECOMPRAS
                  </td>
                  <td className="px-3 py-3 text-right text-yellow-300">$ 0</td>
                  {PAYMENT_COLS.map(({ key }) => (
                    <td key={key} className="px-3 py-3 text-right whitespace-nowrap">
                      {totals[key] ? fmtForce(totals[key]) : '—'}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right whitespace-nowrap bg-indigo-700 text-base">
                    {fmtForce(totals.total_enviado)}
                  </td>
                  <td className="px-3 py-3 text-center bg-orange-700 text-xs">Total Facturas</td>
                  <td className="px-3 py-3 text-right bg-orange-700 whitespace-nowrap">
                    {totals.fee_4mil ? fmtForce(totals.fee_4mil) : '—'}
                  </td>
                  <td className="px-3 py-3 text-right bg-orange-700 whitespace-nowrap">
                    {totals.valor_sobrante ? fmtForce(totals.valor_sobrante) : '—'}
                  </td>
                  <td className="px-2 py-3 bg-gray-800" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuentasRecompras;

import React, { useEffect, useState } from 'react';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import useDialog from '../../hooks/useDialog';
import LiveMoneyInput from './LiveMoneyInput';

// Categorías que pueden salir de la caja del día (el backend acepta las
// mismas: CLOSING_EXPENSE_SUBCATEGORIES en app/routes/cash_closing.py)
const CATEGORIAS = [
  { value: 'operativo', label: 'Gasto operativo' },
  { value: 'flete', label: 'Flete mercancía' },
  { value: 'moto_carro', label: 'Moto carro' },
  { value: 'aseo', label: 'Aseo' },
  { value: 'inversion', label: 'Inversión / activo' },
];

const fmt = (n) => `$ ${Math.round(n || 0).toLocaleString('es-CO')}`;
const newLine = (concepto = '', valor = '') => ({ id: Math.random().toString(36).slice(2), concepto, valor: String(valor || ''), subcategoria: 'operativo' });

/**
 * Popup del cierre: "Hubo gastos operativos de $ X. ¿En qué se gastaron?".
 * Cada línea queda en Cuentas → Gastos como "De la caja del día" al enviar el
 * cierre. Las líneas deben sumar el total de gastos operativos.
 *
 * initialLines: líneas guardadas antes (se reusan si suman el total).
 * nota: nota de gastos del formulario o del Excel (llena la primera línea).
 */
const GastosDetalleDialog = ({ open, total, initialLines, nota, onCancel, onConfirm }) => {
  const [lines, setLines] = useState([]);
  const [error, setError] = useState(null);
  const ref = useDialog(open, onCancel);

  useEffect(() => {
    if (!open) return;
    const prevSum = (initialLines || []).reduce((s, l) => s + (parseInt(l.valor) || 0), 0);
    setLines(initialLines?.length && prevSum === total ? initialLines : [newLine(nota || '', total)]);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const sum = lines.reduce((s, l) => s + (parseInt(l.valor) || 0), 0);
  const falta = total - sum;
  const update = (id, patch) => setLines(ls => ls.map(l => (l.id === id ? { ...l, ...patch } : l)));

  const handleConfirm = () => {
    if (lines.some(l => !l.concepto.trim() || !(parseInt(l.valor) > 0))) {
      setError('Escribe en qué se gastó y el valor de cada gasto.');
      return;
    }
    if (falta !== 0) {
      setError(`Los gastos deben sumar ${fmt(total)}: ${falta > 0 ? `faltan ${fmt(falta)}` : `sobran ${fmt(-falta)}`}.`);
      return;
    }
    onConfirm(lines.map(l => ({ ...l, concepto: l.concepto.trim() })));
  };

  return (
    <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-[2px] animate-backdrop flex items-end sm:items-center justify-center z-[70] sm:p-4" role="dialog" aria-modal="true" aria-labelledby="dlg-gastos-cierre" ref={ref}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-sheet pb-sheet max-h-[92dvh] overflow-y-auto overscroll-contain">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-full mb-3">
            <Receipt className="w-8 h-8 text-amber-600" />
          </div>
          <h3 id="dlg-gastos-cierre" className="text-xl font-bold text-gray-900 leading-tight">
            Hubo gastos operativos de {fmt(total)}
          </h3>
          <p className="text-sm text-gray-600 mt-1">¿En qué se gastaron? Así quedan en Gastos con esta descripción.</p>
        </div>

        <div className="space-y-3">
          {lines.map((l, i) => (
            <div key={l.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={l.concepto}
                  onChange={(e) => update(l.id, { concepto: e.target.value })}
                  placeholder="Ej: Escalera"
                  aria-label={`En qué se gastó (gasto ${i + 1})`}
                  maxLength={255}
                  className="flex-1 min-w-0 h-11 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines(ls => ls.filter(x => x.id !== l.id))}
                    className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Quitar gasto ${i + 1}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                  <LiveMoneyInput
                    value={l.valor}
                    onChange={(v) => update(l.id, { valor: v })}
                    className="w-full h-11 pl-7 pr-3 rounded-lg border border-gray-300 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <select
                  value={l.subcategoria}
                  onChange={(e) => update(l.id, { subcategoria: e.target.value })}
                  aria-label={`Categoría (gasto ${i + 1})`}
                  className="h-11 px-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => setLines(ls => [...ls, newLine('', falta > 0 ? falta : '')])}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900">
          <Plus className="w-4 h-4" /> Agregar otro gasto
        </button>

        <div className={`mt-4 flex justify-between text-sm rounded-xl px-4 py-3 ${falta === 0 ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
          <span>Suma {fmt(sum)} de {fmt(total)}</span>
          {falta !== 0 && <span className="font-semibold">{falta > 0 ? `Faltan ${fmt(falta)}` : `Sobran ${fmt(-falta)}`}</span>}
        </div>

        {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-800 h-12 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
            Volver
          </button>
          <button type="button" onClick={handleConfirm}
            className="flex-1 bg-gray-900 text-white h-12 rounded-xl font-semibold hover:bg-gray-800 transition-colors">
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GastosDetalleDialog;

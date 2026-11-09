// Piezas comunes de Cuentas → Radiografía (Mes, Año y las fases que siguen).
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { pct } from '../../utils/radiografiaFormat';


export const Est = () => <span className="ml-1 text-[10px] font-bold text-amber-700 align-middle">ESTIMADO</span>;

// Variación con flecha y texto (nunca solo color)
export const Change = ({ c, invert = false }) => {
  if (!c || c.change_pct == null) return <span className="text-gray-400">sin datos</span>;
  const up = c.change_pct >= 0;
  const good = invert ? !up : up;
  return <span className={good ? 'text-emerald-700' : 'text-red-700'}>{up ? '▲' : '▼'} {pct(Math.abs(c.change_pct))}</span>;
};

export const Tile = ({ label, value, sub, estimated, tone = 'default' }) => (
  <div className={`rounded-xl border p-4 ${tone === 'good' ? 'bg-emerald-50 border-emerald-200' : tone === 'bad' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}{estimated && <Est />}</p>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    {sub && <div className="text-[11px] text-gray-600 mt-1">{sub}</div>}
  </div>
);

export const Warnings = ({ items }) => (items?.length > 0 ? (
  <ul className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 space-y-1">
    {items.map((w, i) => <li key={i} className="flex gap-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />{w}</li>)}
  </ul>
) : null);

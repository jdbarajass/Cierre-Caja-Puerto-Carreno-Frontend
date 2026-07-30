import React from 'react';
import { EMPLOYEE_GROUPS, groupKeyFor } from '../../utils/employeeGroups';

// Tarjetas de totales separadas por empleada (Mónica, Rita y Otras si aplica).
// valueFor(item) determina cuánto suma cada registro (dinero, días, etc.).
const EmployeeSummaryCards = ({ items, valueFor, formatValue, countLabel, accentClass = 'text-gray-800' }) => {
  const summary = items.reduce((acc, item) => {
    const key = groupKeyFor(item.nombre_empleada);
    if (!acc[key]) acc[key] = { total: 0, count: 0 };
    acc[key].total += valueFor(item);
    acc[key].count += 1;
    return acc;
  }, { monica: { total: 0, count: 0 }, rita: { total: 0, count: 0 } });

  const cards = [
    ...EMPLOYEE_GROUPS,
    ...(summary.otras ? [{ key: 'otras', label: 'Otras' }] : []),
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map(({ key, label }) => {
        const s = summary[key] || { total: 0, count: 0 };
        return (
          <div key={key} className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
            <p className={`text-xl font-bold ${accentClass}`}>{formatValue(s.total)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.count} {countLabel}{s.count === 1 ? '' : 's'}</p>
          </div>
        );
      })}
    </div>
  );
};

export default EmployeeSummaryCards;

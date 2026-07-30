import React from 'react';
import { EMPLOYEE_NAMES } from '../../utils/employeeGroups';

// Selector obligatorio de empleada para los formularios de Control de Empleadas.
// Reemplaza el campo de texto libre para evitar variantes/typos (ej: "monika", "MONICA")
// que impedían agrupar correctamente los totales por persona.
const EmployeeSelect = ({ value, onChange, focusRing = 'focus:ring-indigo-300', className = '' }) => (
  <select
    required
    value={value}
    onChange={onChange}
    className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${focusRing} bg-white ${className}`}
  >
    <option value="" disabled>Selecciona una empleada…</option>
    {EMPLOYEE_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
  </select>
);

export default EmployeeSelect;

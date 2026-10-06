import React, { useRef, useLayoutEffect } from 'react';

// Input de dinero con separador de miles EN VIVO (mientras se escribe).
// Usado en Cuentas Recompras y Cuentas → Gastos.
// `value` es el número plano (string de dígitos, ej. "400000"); `onChange`
// recibe ese mismo formato. Formatea con puntos en cada tecla, recalculando
// dónde debe quedar el cursor para que no salte al escribir en medio del número.
const formatMiles = (raw) => (raw ? Number(raw).toLocaleString('es-CO') : '');

const LiveMoneyInput = ({ value, onChange, className, placeholder = '0', id, required = false }) => {
  const inputRef = useRef(null);
  const pendingCursor = useRef(null);

  useLayoutEffect(() => {
    if (pendingCursor.current != null && inputRef.current) {
      inputRef.current.setSelectionRange(pendingCursor.current, pendingCursor.current);
      pendingCursor.current = null;
    }
  });

  const handleChange = (e) => {
    const rawInput = e.target.value;
    const cursorPos = e.target.selectionStart ?? rawInput.length;
    const digitsBeforeCursor = rawInput.slice(0, cursorPos).replace(/[^0-9]/g, '').length;
    const newDigits = rawInput.replace(/[^0-9]/g, '');
    const newFormatted = formatMiles(newDigits);

    let newCursor = 0;
    if (digitsBeforeCursor > 0) {
      let count = 0;
      for (newCursor = 0; newCursor < newFormatted.length; newCursor++) {
        if (/[0-9]/.test(newFormatted[newCursor])) {
          count++;
          if (count === digitsBeforeCursor) { newCursor++; break; }
        }
      }
    }
    pendingCursor.current = newCursor;
    onChange(newDigits);
  };

  return (
    <input
      ref={inputRef} id={id} required={required}
      type="text" inputMode="numeric" placeholder={placeholder}
      value={formatMiles(value)}
      onChange={handleChange}
      className={className || 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300'}
    />
  );
};

export default LiveMoneyInput;

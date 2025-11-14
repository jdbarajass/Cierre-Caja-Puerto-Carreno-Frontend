import { forwardRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Componente de input numérico reutilizable
 * Maneja automáticamente la validación numérica y formateo
 */
const NumericInput = forwardRef(({
  value,
  onChange,
  placeholder = '0',
  className = '',
  disabled = false,
  min = 0,
  max,
  label,
  showTotal = false,
  multiplier = 1,
  formatTotal,
  error,
  ...props
}, ref) => {

  /**
   * Maneja el input permitiendo solo números
   */
  const handleNumericInput = (inputValue) => {
    const cleaned = inputValue.replace(/[^0-9]/g, '');
    return cleaned;
  };

  /**
   * Maneja el cambio de valor
   */
  const handleChange = (e) => {
    const cleanedValue = handleNumericInput(e.target.value);
    onChange(cleanedValue);
  };

  /**
   * Selecciona todo el texto al hacer foco
   */
  const handleFocus = (e) => {
    e.target.select();
  };

  /**
   * Calcula el total si se proporciona un multiplicador
   */
  const calculateTotal = () => {
    const numValue = parseInt(value || 0);
    return multiplier * numValue;
  };

  const baseClasses = `flex-1 px-3 sm:px-4 py-1.5 sm:py-2 border rounded-lg
    focus:ring-2 focus:border-transparent text-sm sm:text-base transition-all
    ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-yellow-500'}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {label && (
        <label className="w-16 sm:w-24 text-xs sm:text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={`${baseClasses} ${className}`}
        aria-label={label || 'Numeric input'}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${label}-error` : undefined}
        {...props}
      />

      {showTotal && (
        <span className="w-20 sm:w-28 text-right text-xs sm:text-sm font-semibold text-gray-900">
          {formatTotal ? formatTotal(calculateTotal()) : calculateTotal()}
        </span>
      )}

      {error && (
        <span id={`${label}-error`} className="text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
});

NumericInput.displayName = 'NumericInput';

NumericInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  min: PropTypes.number,
  max: PropTypes.number,
  label: PropTypes.string,
  showTotal: PropTypes.bool,
  multiplier: PropTypes.number,
  formatTotal: PropTypes.func,
  error: PropTypes.string,
};

export default NumericInput;

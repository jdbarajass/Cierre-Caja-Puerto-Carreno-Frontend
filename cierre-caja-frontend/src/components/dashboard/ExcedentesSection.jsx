import React from 'react';
import PropTypes from 'prop-types';
import { FileText, Plus, X } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

/**
 * Componente para la sección de excedentes (máximo 3)
 */
const ExcedentesSection = ({
  excedentes,
  onUpdateExcedente,
  onAddExcedente,
  onRemoveExcedente,
  totalExcedentes,
  canAddMore,
  canRemove
}) => {
  const tiposExcedente = [
    { value: 'efectivo', label: 'Excedente Efectivo' },
    { value: 'qr_transferencias', label: 'Excedente QR/Transferencias' },
    { value: 'datafono', label: 'Excedente Datafono' }
  ];

  const subtiposTransferencia = [
    { value: 'nequi', label: 'Nequi' },
    { value: 'daviplata', label: 'Daviplata' },
    { value: 'qr', label: 'QR' }
  ];

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <label className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
          Excedentes (Máx. 3)
        </label>
        {canAddMore && (
          <button
            type="button"
            onClick={onAddExcedente}
            className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-xs sm:text-sm"
            aria-label="Agregar excedente"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            Agregar
          </button>
        )}
      </div>

      <div className="space-y-3">
        {excedentes.map((excedente, index) => (
          <div
            key={excedente.id}
            className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <select
                  value={excedente.tipo}
                  onChange={(e) => onUpdateExcedente(excedente.id, 'tipo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  aria-label={`Tipo de excedente ${index + 1}`}
                >
                  {tiposExcedente.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
              </div>
              {excedente.tipo === 'qr_transferencias' && (
                <div className="flex-1">
                  <select
                    value={excedente.subtipo}
                    onChange={(e) => onUpdateExcedente(excedente.id, 'subtipo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    aria-label={`Subtipo de excedente ${index + 1}`}
                  >
                    {subtiposTransferencia.map(sub => (
                      <option key={sub.value} value={sub.value}>{sub.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={excedente.valor}
                  onChange={(e) => onUpdateExcedente(excedente.id, 'valor', e.target.value.replace(/[^0-9]/g, ''))}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 sm:w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="0"
                  aria-label={`Valor del excedente ${index + 1}`}
                />
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => onRemoveExcedente(excedente.id)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                    aria-label={`Eliminar excedente ${index + 1}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {totalExcedentes > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Total Excedentes:</span>
              <span className="text-base font-bold text-indigo-600">
                {formatCurrency(totalExcedentes)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

ExcedentesSection.propTypes = {
  excedentes: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    tipo: PropTypes.string.isRequired,
    subtipo: PropTypes.string,
    valor: PropTypes.string.isRequired,
  })).isRequired,
  onUpdateExcedente: PropTypes.func.isRequired,
  onAddExcedente: PropTypes.func.isRequired,
  onRemoveExcedente: PropTypes.func.isRequired,
  totalExcedentes: PropTypes.number.isRequired,
  canAddMore: PropTypes.bool.isRequired,
  canRemove: PropTypes.bool.isRequired,
};

export default ExcedentesSection;

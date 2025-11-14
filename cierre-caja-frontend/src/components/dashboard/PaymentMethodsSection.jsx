import React from 'react';
import PropTypes from 'prop-types';
import { CreditCard } from 'lucide-react';
import NumericInput from '../common/NumericInput';
import { formatCurrency } from '../../utils/formatters';

/**
 * Componente para la sección de métodos de pago registrados
 */
const PaymentMethodsSection = ({
  metodosPago,
  onPaymentChange,
  totalTransferencias,
  totalDatafono
}) => {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Registro de Métodos de Pago</h2>
      </div>

      <div className="space-y-4">
        {/* Transferencias */}
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <h3 className="text-sm font-semibold text-purple-900 mb-3">Transferencias (QR)</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nequi</label>
              <input
                type="text"
                inputMode="numeric"
                value={metodosPago.nequi_luz_helena}
                onChange={(e) => onPaymentChange('nequi_luz_helena', e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                placeholder="0"
                aria-label="Nequi"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Daviplata</label>
              <input
                type="text"
                inputMode="numeric"
                value={metodosPago.daviplata_jose}
                onChange={(e) => onPaymentChange('daviplata_jose', e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                placeholder="0"
                aria-label="Daviplata"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Transferencias (QR)</label>
              <input
                type="text"
                inputMode="numeric"
                value={metodosPago.qr_julieth}
                onChange={(e) => onPaymentChange('qr_julieth', e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                placeholder="0"
                aria-label="QR Julieth"
              />
            </div>
          </div>
          {totalTransferencias > 0 && (
            <div className="mt-2 text-sm font-semibold text-purple-700">
              Total: {formatCurrency(totalTransferencias)}
            </div>
          )}
        </div>

        {/* Datafono */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">Datafono</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ADDI Datáfono</label>
              <input
                type="text"
                inputMode="numeric"
                value={metodosPago.addi_datafono}
                onChange={(e) => onPaymentChange('addi_datafono', e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="0"
                aria-label="ADDI Datáfono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tarjeta Débito</label>
              <input
                type="text"
                inputMode="numeric"
                value={metodosPago.tarjeta_debito}
                onChange={(e) => onPaymentChange('tarjeta_debito', e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="0"
                aria-label="Tarjeta Débito"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tarjeta Crédito</label>
              <input
                type="text"
                inputMode="numeric"
                value={metodosPago.tarjeta_credito}
                onChange={(e) => onPaymentChange('tarjeta_credito', e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="0"
                aria-label="Tarjeta Crédito"
              />
            </div>
          </div>
          {totalDatafono > 0 && (
            <div className="mt-2 text-sm font-semibold text-blue-700">
              Total: {formatCurrency(totalDatafono)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

PaymentMethodsSection.propTypes = {
  metodosPago: PropTypes.object.isRequired,
  onPaymentChange: PropTypes.func.isRequired,
  totalTransferencias: PropTypes.number.isRequired,
  totalDatafono: PropTypes.number.isRequired,
};

export default PaymentMethodsSection;

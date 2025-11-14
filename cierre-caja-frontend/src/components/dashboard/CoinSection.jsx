import React from 'react';
import PropTypes from 'prop-types';
import NumericInput from '../common/NumericInput';
import { formatCurrency } from '../../utils/formatters';

/**
 * Componente para la sección de monedas
 */
const CoinSection = ({ coins, onCoinChange, total }) => {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
        Monedas
      </h2>
      <div className="space-y-2 sm:space-y-3">
        {Object.keys(coins).map((denom) => (
          <NumericInput
            key={denom}
            label={`$${parseInt(denom).toLocaleString()}`}
            value={coins[denom]}
            onChange={(value) => onCoinChange(denom, value)}
            showTotal
            multiplier={parseInt(denom)}
            formatTotal={formatCurrency}
          />
        ))}
        <div className="pt-2 sm:pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm sm:text-base font-semibold text-gray-700">Total Monedas:</span>
            <span className="text-base sm:text-lg font-bold text-yellow-600">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

CoinSection.propTypes = {
  coins: PropTypes.object.isRequired,
  onCoinChange: PropTypes.func.isRequired,
  total: PropTypes.number.isRequired,
};

export default CoinSection;

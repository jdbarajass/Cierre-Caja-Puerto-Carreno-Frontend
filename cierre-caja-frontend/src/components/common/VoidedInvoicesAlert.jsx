import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Alerta que muestra información sobre facturas anuladas detectadas
 * con opción de expandir para ver más detalles
 * @param {Object} props
 * @param {Object} props.voidedInvoices - Información de facturas anuladas
 * @param {number} props.voidedInvoices.count - Cantidad de facturas anuladas
 * @param {string} props.voidedInvoices.total_amount_formatted - Total formateado
 * @param {Array} props.voidedInvoices.details - Detalles de cada factura
 * @param {Function} props.onViewDetails - Callback cuando se hace clic en ver detalles
 */
const VoidedInvoicesAlert = ({ voidedInvoices, onViewDetails }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Validación
  if (!voidedInvoices) {
    return null;
  }

  // Usar los nombres de campos correctos del backend
  const count = voidedInvoices.voided_count || 0;
  const totalFormatted = voidedInvoices.total_voided_amount_formatted || '$0';
  const details = voidedInvoices.voided_summary || [];

  if (count === 0 && details.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg overflow-hidden">
      {/* Header - siempre visible */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-900 mb-1">
              Facturas anuladas detectadas
            </h3>
            <p className="text-sm text-yellow-800">
              Se encontraron <strong>{count}</strong> factura(s) anulada(s) por un total de{' '}
              <strong>{totalFormatted}</strong>. Estas facturas han sido excluidas
              automáticamente de los cálculos.
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-yellow-100 rounded transition-colors"
            title={isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-yellow-700" />
            ) : (
              <ChevronDown className="w-5 h-5 text-yellow-700" />
            )}
          </button>
        </div>
      </div>

      {/* Detalles expandibles */}
      {isExpanded && details.length > 0 && (
        <div className="border-t border-yellow-200 bg-yellow-50/50 p-4">
          <div className="space-y-2">
            {details.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white border border-yellow-200 rounded-md p-3 text-sm"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-600">Factura #:</span>
                    <span className="ml-2 font-semibold text-gray-900">{invoice.number}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="ml-2 font-semibold text-gray-900">{invoice.total_formatted}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="ml-2 text-gray-900">{invoice.client_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fecha:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(invoice.date).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Estado:</span>
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      {invoice.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {onViewDetails && count > 3 && (
            <button
              onClick={onViewDetails}
              className="mt-3 w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Ver todas las facturas anuladas ({count})
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default VoidedInvoicesAlert;

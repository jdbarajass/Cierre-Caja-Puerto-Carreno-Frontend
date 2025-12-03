import React from 'react';
import { X, AlertTriangle, FileX } from 'lucide-react';

/**
 * Modal que muestra la lista completa de facturas anuladas con detalles
 * @param {Object} props
 * @param {boolean} props.isOpen - Si el modal está abierto
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {Object} props.voidedInvoices - Información de facturas anuladas
 * @param {number} props.voidedInvoices.voided_count - Cantidad de facturas anuladas
 * @param {string} props.voidedInvoices.total_voided_amount_formatted - Total formateado
 * @param {Array} props.voidedInvoices.voided_summary - Array con detalles de cada factura
 */
const VoidedInvoicesModal = ({ isOpen, onClose, voidedInvoices }) => {
  if (!isOpen || !voidedInvoices) {
    return null;
  }

  // Usar los nombres de campos correctos del backend
  const count = voidedInvoices.voided_count || 0;
  const totalFormatted = voidedInvoices.total_voided_amount_formatted || '$0';
  const details = voidedInvoices.voided_summary || [];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeColor = (status) => {
    const statusColors = {
      'void': 'bg-red-100 text-red-800',
      'cancelled': 'bg-orange-100 text-orange-800',
      'annulled': 'bg-purple-100 text-purple-800',
      'reversed': 'bg-pink-100 text-pink-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <FileX className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Facturas Anuladas</h2>
                  <p className="text-sm text-white/90">
                    {count} factura(s) excluida(s) automáticamente
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Total Excluded */}
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-700">
                  Total excluido de los cálculos:
                </p>
                <p className="text-2xl font-bold text-yellow-900">
                  {totalFormatted}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Estas facturas fueron detectadas como anuladas y no se incluyen en los totales de venta.
            </p>
          </div>

          {/* Table */}
          <div className="overflow-y-auto max-h-[calc(90vh-250px)]">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Factura #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {details.map((invoice, index) => (
                  <tr key={invoice.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {invoice.number}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDate(invoice.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {invoice.client_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {invoice.total_formatted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoidedInvoicesModal;

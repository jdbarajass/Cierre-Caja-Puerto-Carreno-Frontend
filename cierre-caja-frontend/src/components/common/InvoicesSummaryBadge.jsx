import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

/**
 * Badge que muestra un resumen de facturas anuladas de forma compacta
 * @param {Object} props
 * @param {Object} props.invoicesSummary - Resumen de facturas del backend
 * @param {number} props.invoicesSummary.total_invoices - Total de facturas recibidas
 * @param {number} props.invoicesSummary.active_invoices - Facturas activas analizadas
 * @param {number} props.invoicesSummary.voided_invoices - Facturas anuladas excluidas
 * @param {string} props.variant - Variante visual: 'compact' | 'detailed'
 */
const InvoicesSummaryBadge = ({ invoicesSummary, variant = 'compact' }) => {
  if (!invoicesSummary) {
    return null;
  }

  const hasVoidedInvoices = invoicesSummary.voided_invoices > 0;

  if (!hasVoidedInvoices && variant === 'compact') {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs font-medium border border-yellow-200">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>{invoicesSummary.voided_invoices} anulada(s)</span>
      </div>
    );
  }

  // Variant: detailed
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">Resumen de Facturas</h4>
          <div className="text-xs text-blue-800 space-y-0.5">
            <div className="flex justify-between">
              <span>Total recibidas:</span>
              <span className="font-semibold">{invoicesSummary.total_invoices}</span>
            </div>
            <div className="flex justify-between">
              <span>Facturas activas:</span>
              <span className="font-semibold text-green-700">{invoicesSummary.active_invoices}</span>
            </div>
            {hasVoidedInvoices && (
              <div className="flex justify-between">
                <span>Anuladas (excluidas):</span>
                <span className="font-semibold text-yellow-700">{invoicesSummary.voided_invoices}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicesSummaryBadge;

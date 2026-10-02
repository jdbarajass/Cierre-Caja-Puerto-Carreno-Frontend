import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0);

// "2026-09-05" -> "5 sep" sin pasar por new Date() (evita el corrimiento UTC de Colombia)
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const formatDay = (ymd) => {
  const [, m, d] = String(ymd).split('-');
  return `${Number(d)} ${MESES[Number(m) - 1] || ''}`.trim();
};

/**
 * Avisos de calidad de datos de /api/direct/sales/documents:
 * - failedDays: días que Alegra no entregó tras reintentar (los totales están incompletos).
 * - voided: facturas anuladas que se excluyeron de los totales.
 */
const SalesDataNotice = ({ failedDays = [], voided = null }) => {
  const hasFailed = failedDays.length > 0;
  const hasVoided = voided && voided.count > 0;
  if (!hasFailed && !hasVoided) return null;

  return (
    <div className="space-y-2">
      {hasFailed && (
        <div role="alert" className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">{failedDays.length === 1 ? 'Falta 1 día' : `Faltan ${failedDays.length} días`}: los totales están por debajo del real</p>
            <p>Alegra no respondió para: {failedDays.map(formatDay).join(', ')}. Vuelva a consultar en unos minutos.</p>
          </div>
        </div>
      )}
      {hasVoided && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-2 text-gray-700 text-sm">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Se excluyeron {voided.count === 1 ? '1 factura anulada' : `${voided.count} facturas anuladas`} ({formatCOP(voided.total)}): no son venta.
          </p>
        </div>
      )}
    </div>
  );
};

export default SalesDataNotice;

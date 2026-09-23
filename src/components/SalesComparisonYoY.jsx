import React from 'react';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { useSalesComparison } from '../hooks/useSalesComparison';

/**
 * Componente para mostrar comparación de ventas año sobre año
 * Muestra ventas del día y mes actual comparadas con el mismo período del año anterior
 */
const SalesComparisonYoY = () => {
  const { dailyComparison, monthlyComparison, nextDayLastYear, previousDay, loading, error } = useSalesComparison();

  // Log para debugging
  console.log('🔍 SalesComparisonYoY - nextDayLastYear:', nextDayLastYear);

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Error al cargar comparación</span>
        </div>
      </div>
    );
  }

  // Componente helper para mostrar una comparación individual
  const ComparisonCard = ({ title, icon: Icon, current, previous, comparison, isLoading }) => {
    if (isLoading) {
      return (
        <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
          {/* Título */}
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
            <Icon className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-gray-700">{title}</h4>
          </div>
          {/* Mensaje de carga */}
          <div className="flex items-center justify-center gap-2 py-6 text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-medium">Cargando…</span>
          </div>
        </div>
      );
    }
    const TrendIcon = comparison.isGrowth ? TrendingUp : TrendingDown;
    const trendColor = comparison.isGrowth ? 'text-green-600' : 'text-red-600';
    const bgColor = comparison.isGrowth ? 'bg-green-50' : 'bg-red-50';
    const borderColor = comparison.isGrowth ? 'border-green-200' : 'border-red-200';

    return (
      <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
        {/* Título */}
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
          <Icon className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold text-gray-700">{title}</h4>
        </div>

        {/* Valores */}
        <div className="space-y-1.5 mb-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-600">Actual:</span>
            <span className="text-sm font-bold text-gray-900">{current.formatted}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500">Año ant.:</span>
            <span className="text-xs font-semibold text-gray-600">{previous.formatted}</span>
          </div>
        </div>

        {/* Comparación */}
        <div className={`${bgColor} ${borderColor} border rounded-lg p-2`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <TrendIcon className={`w-3 h-3 ${trendColor}`} />
              <span className={`text-[10px] font-bold ${trendColor}`}>
                {comparison.isGrowth ? '+' : ''}{comparison.percentageChange}%
              </span>
            </div>
            <span className={`text-[10px] font-medium ${trendColor}`}>
              {comparison.isGrowth ? '+' : '-'} {comparison.differenceFormatted}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
      <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-amber-600 rounded"></span>
        Comparación con Año Anterior
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Comparación Diaria */}
        <ComparisonCard
          title="Venta del Día"
          icon={Calendar}
          current={dailyComparison?.current}
          previous={dailyComparison?.previous}
          comparison={dailyComparison}
          isLoading={loading || !dailyComparison}
        />

        {/* Comparación Mensual */}
        <ComparisonCard
          title="Venta del Mes"
          icon={DollarSign}
          current={monthlyComparison?.current}
          previous={monthlyComparison?.previous}
          comparison={monthlyComparison}
          isLoading={loading || !monthlyComparison}
        />
      </div>

      {/* Día anterior (ayer) y Día siguiente del año anterior */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Día anterior (ayer) */}
        {previousDay && previousDay.date && (
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-900">
                  Venta {previousDay.date}
                </span>
              </div>
              <span className="text-sm font-bold text-purple-900">
                {previousDay.formatted}
              </span>
            </div>
          </div>
        )}

        {/* Día siguiente del año anterior */}
        {nextDayLastYear && nextDayLastYear.date && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-900">
                  Venta {nextDayLastYear.date}
                </span>
              </div>
              <span className="text-sm font-bold text-blue-900">
                {nextDayLastYear.formatted}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Información adicional */}
      {dailyComparison && dailyComparison.current && dailyComparison.previous && (
        <div className="mt-2 text-[10px] text-amber-700 bg-amber-100 rounded-lg p-1.5 border border-amber-300 text-center">
          <strong>Comparación:</strong> {dailyComparison.current.date} vs {dailyComparison.previous.date}
        </div>
      )}
    </div>
  );
};

export default SalesComparisonYoY;

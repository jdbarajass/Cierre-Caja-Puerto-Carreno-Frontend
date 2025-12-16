import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { getSalesComparisonYoY } from '../services/api';
import logger from '../utils/logger';

/**
 * Componente para mostrar comparación de ventas año sobre año
 * Muestra ventas del día y mes actual comparadas con el mismo período del año anterior
 */
const SalesComparisonYoY = ({ date }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        setLoading(true);
        setError(null);

        logger.info('Obteniendo comparación año sobre año para:', date);
        const data = await getSalesComparisonYoY(date);

        if (data.success) {
          setComparisonData(data);
          logger.info('Datos de comparación obtenidos exitosamente');
        } else {
          throw new Error(data.error || 'Error al obtener datos de comparación');
        }
      } catch (err) {
        logger.error('Error al obtener comparación:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [date]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border-2 border-blue-200">
        <div className="flex items-center justify-center gap-2 text-blue-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Cargando comparación año anterior...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border-2 border-red-200">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Error al cargar comparación: {error}</span>
        </div>
      </div>
    );
  }

  if (!comparisonData) {
    return null;
  }

  const { daily_comparison, monthly_comparison } = comparisonData;

  // Componente helper para mostrar una comparación individual
  const ComparisonCard = ({ title, icon: Icon, current, previous, comparison, periodLabel }) => {
    const isGrowth = comparison.is_growth;
    const TrendIcon = isGrowth ? TrendingUp : TrendingDown;
    const trendColor = isGrowth ? 'text-green-600' : 'text-red-600';
    const bgColor = isGrowth ? 'bg-green-100' : 'bg-red-100';
    const borderColor = isGrowth ? 'border-green-300' : 'border-red-300';

    return (
      <div className="bg-white rounded-lg p-4 border-2 border-gray-200 shadow-sm">
        {/* Título */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
          <Icon className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-bold text-gray-700">{title}</h4>
        </div>

        {/* Valores actuales y anteriores */}
        <div className="space-y-2 mb-3">
          {/* Actual */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">{periodLabel}:</span>
            <span className="text-base font-bold text-gray-900">{current.formatted}</span>
          </div>

          {/* Año anterior */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Año anterior:</span>
            <span className="text-sm font-semibold text-gray-600">{previous.formatted}</span>
          </div>
        </div>

        {/* Comparación */}
        <div className={`${bgColor} ${borderColor} border rounded-lg p-2.5`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <TrendIcon className={`w-4 h-4 ${trendColor}`} />
              <span className={`text-xs font-semibold ${trendColor}`}>
                {comparison.growth_label.toUpperCase()}
              </span>
            </div>
            <span className={`text-sm font-bold ${trendColor}`}>
              {isGrowth ? '+' : ''}{comparison.percentage_change}%
            </span>
          </div>
          <div className="mt-1.5 text-xs text-gray-700 font-medium">
            Diferencia: {isGrowth ? '+' : '-'} {comparison.difference_formatted}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 sm:p-6 border-2 border-amber-200 mb-4 sm:mb-6">
      <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
        <span className="w-1.5 h-6 bg-amber-600 rounded"></span>
        Comparación con Año Anterior
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Comparación Diaria */}
        <ComparisonCard
          title="Ventas del Día"
          icon={Calendar}
          current={daily_comparison.current}
          previous={daily_comparison.previous_year}
          comparison={daily_comparison.comparison}
          periodLabel={`Hoy (${daily_comparison.current.date})`}
        />

        {/* Comparación Mensual */}
        <ComparisonCard
          title="Ventas del Mes"
          icon={DollarSign}
          current={monthly_comparison.current}
          previous={monthly_comparison.previous_year}
          comparison={monthly_comparison.comparison}
          periodLabel="Mes actual"
        />
      </div>

      {/* Información adicional */}
      <div className="mt-3 text-xs text-amber-700 bg-amber-100 rounded-lg p-2 border border-amber-300">
        <strong>Nota:</strong> Comparación con el mismo día y mes del año {daily_comparison.previous_year.date.split('-')[0]}
      </div>
    </div>
  );
};

export default SalesComparisonYoY;

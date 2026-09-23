import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { getSalesTrends } from '../../services/analyticsService';
import { getColombiaTodayString } from '../../utils/dateUtils';
import { useSceneSeries } from '../../experience/store';

const SalesTrends = () => {
  // Inicializar fechas con el mes actual
  const currentDate = getColombiaTodayString();
  const currentMonthStart = currentDate.substring(0, 8) + '01';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start_date: currentMonthStart,
    end_date: currentDate
  });

  const fetchData = async () => {
    if (!dateRange.start_date || !dateRange.end_date) {
      setError('Por favor selecciona ambas fechas para consultar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getSalesTrends(dateRange);
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Error al cargar datos');
      }
    } catch (err) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Escena WebGL (solo lectura): la serie que este módulo ya muestra
  useSceneSeries('Ventas por día', data?.daily_sales, (d) => d.total_revenue, (d) => `${d.day_name} ${d.date}`, 'money');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando tendencias…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3 text-red-800">
          <AlertCircle className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">Error al cargar datos</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-700">Rango de Fechas:</span>
            </div>
            <input
              type="date"
              aria-label="Fecha inicial"
              value={dateRange.start_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-600">hasta</span>
            <input
              type="date"
              aria-label="Fecha final"
              value={dateRange.end_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Consultar Período
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <TrendingUp className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Selecciona un período para consultar
          </h3>
          <p className="text-blue-700">
            Elige las fechas de inicio y fin para visualizar las tendencias de ventas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-700">Rango de Fechas:</span>
          </div>
          <input
            type="date"
            aria-label="Fecha inicial"
            value={dateRange.start_date}
            onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-600">hasta</span>
          <input
            type="date"
            aria-label="Fecha final"
            value={dateRange.end_date}
            onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Consultar Período
          </button>
        </div>
      </div>

      {/* Cards de Resumen */}
      {data.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Total Período</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {data.summary.total_revenue_formatted}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Promedio Diario</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {data.summary.avg_revenue_per_day_formatted}
            </div>
          </div>
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
            <div className="text-sm text-green-700 mb-2">Mejor Día</div>
            <div className="font-semibold text-green-900">{data.summary.best_day?.day_name}</div>
            <div className="text-xl font-bold text-green-600">
              {data.summary.best_day?.total_revenue_formatted}
            </div>
            <div className="text-xs text-green-700 mt-1">{data.summary.best_day?.date}</div>
          </div>
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
            <div className="text-sm text-red-700 mb-2">Peor Día</div>
            <div className="font-semibold text-red-900">{data.summary.worst_day?.day_name}</div>
            <div className="text-xl font-bold text-red-600">
              {data.summary.worst_day?.total_revenue_formatted}
            </div>
            <div className="text-xs text-red-700 mt-1">{data.summary.worst_day?.date}</div>
          </div>
        </div>
      )}

      {/* Análisis por Día de la Semana */}
      {data.weekday_analysis && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Análisis por Día de la Semana</h3>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {data.weekday_analysis.map((day) => (
              <div key={day.day_name} className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="font-semibold text-gray-900 mb-2">{day.day_name}</div>
                <div className="text-lg font-bold text-blue-600 mb-1">
                  {day.avg_revenue_per_day_formatted}
                </div>
                <div className="text-xs text-gray-600">{day.invoice_count} facturas</div>
                <div className="text-xs text-gray-500 mt-1">{day.days_count} días</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ventas Diarias */}
      {data.daily_sales && data.daily_sales.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Ventas Diarias</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facturas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket Prom.</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.daily_sales.map((day) => (
                  <tr key={day.date} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{day.day_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-green-600">{day.total_revenue_formatted}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.invoice_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.average_ticket_formatted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTrends;

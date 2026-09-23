import React, { useState, useEffect } from 'react';
import { Clock, Users, Trophy, RefreshCw, TrendingUp, ShoppingBag, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { getAnalyticsDashboard } from '../../services/analyticsService';
import { getColombiaTodayString } from '../../utils/dateUtils';

const AnalyticsDashboard = () => {
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

  const fetchDashboard = async () => {
    if (!dateRange.start_date || !dateRange.end_date) {
      setError('Por favor selecciona ambas fechas para consultar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getAnalyticsDashboard(dateRange);
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Error al cargar el dashboard');
      }
    } catch (err) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md px-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-800 font-semibold mb-2">Procesando análisis de ventas…</p>
          <p className="text-gray-600 text-sm">
            Esto puede tardar hasta 50 segundos dependiendo de la cantidad de facturas.
          </p>
          <p className="text-gray-500 text-xs mt-2">Por favor espera…</p>
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
          onClick={fetchDashboard}
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
        {/* Filtros de Fecha */}
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
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-600">hasta</span>
            <input
              type="date"
              aria-label="Fecha final"
              value={dateRange.end_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={fetchDashboard}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Consultar Período
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <Calendar className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Selecciona un período para consultar
          </h3>
          <p className="text-blue-700">
            Elige la fecha de inicio y fecha de fin, luego presiona "Consultar Período" para ver el análisis completo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros de Fecha */}
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
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-600">hasta</span>
          <input
            type="date"
            aria-label="Fecha final"
            value={dateRange.end_date}
            onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={fetchDashboard}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Consultar Período
          </button>
        </div>
      </div>

      {/* Grid de Cards de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Horas Pico */}
        {data.peak_hours && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Horas Pico</h3>
            </div>
            {data.peak_hours.top_5_peak_hours && data.peak_hours.top_5_peak_hours[0] && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Mejor hora:</div>
                <div className="text-2xl font-bold text-blue-600">
                  {data.peak_hours.top_5_peak_hours[0].hour_range}
                </div>
                <div className="text-sm text-gray-700">
                  {data.peak_hours.top_5_peak_hours[0].total_revenue_formatted}
                </div>
                <div className="text-xs text-gray-500">
                  {data.peak_hours.top_5_peak_hours[0].invoice_count} facturas
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top Clientes */}
        {data.top_customers && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Top Clientes</h3>
            </div>
            {data.top_customers.summary && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Total clientes:</div>
                <div className="text-2xl font-bold text-green-600">
                  {data.top_customers.summary.total_unique_customers}
                </div>
                <div className="text-sm text-gray-700">
                  Recurrencia: {data.top_customers.summary.recurring_rate?.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  {data.top_customers.summary.total_revenue_formatted}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top Vendedoras */}
        {data.top_sellers && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Top Vendedoras</h3>
            </div>
            {data.top_sellers.top_sellers && data.top_sellers.top_sellers[0] && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Mejor vendedora:</div>
                <div className="text-lg font-bold text-yellow-600 truncate">
                  {data.top_sellers.top_sellers[0].seller_name}
                </div>
                <div className="text-sm text-gray-700">
                  {data.top_sellers.top_sellers[0].total_sales_formatted}
                </div>
                <div className="text-xs text-gray-500">
                  {data.top_sellers.top_sellers[0].invoice_count} facturas
                </div>
              </div>
            )}
          </div>
        )}

        {/* Retención */}
        {data.customer_retention && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <RefreshCw className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Retención</h3>
            </div>
            {data.customer_retention.summary && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Tasa de retención:</div>
                <div className="text-2xl font-bold text-purple-600">
                  {data.customer_retention.summary.retention_rate?.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-700">
                  Leales: {data.customer_retention.summary.loyal_customers}
                </div>
                <div className="text-xs text-gray-500">
                  En riesgo: {data.customer_retention.summary.at_risk_customers}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tendencias */}
        {data.sales_trends && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Tendencias</h3>
            </div>
            {data.sales_trends.summary && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Mejor día:</div>
                <div className="text-lg font-bold text-indigo-600">
                  {data.sales_trends.summary.best_day?.day_name}
                </div>
                <div className="text-sm text-gray-700">
                  {data.sales_trends.summary.best_day?.total_revenue_formatted}
                </div>
                <div className="text-xs text-gray-500">
                  Promedio: {data.sales_trends.summary.avg_revenue_per_day_formatted}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cross-Selling */}
        {data.cross_selling && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-pink-100 rounded-lg">
                <ShoppingBag className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Cross-Selling</h3>
            </div>
            {data.cross_selling.summary && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Combos encontrados:</div>
                <div className="text-2xl font-bold text-pink-600">
                  {data.cross_selling.summary.total_product_pairs}
                </div>
                {data.cross_selling.top_product_pairs && data.cross_selling.top_product_pairs[0] && (
                  <>
                    <div className="text-sm text-gray-700">
                      Top combo: {data.cross_selling.top_product_pairs[0].times_bought_together} veces
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {data.cross_selling.top_product_pairs[0].total_revenue_formatted}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Selecciona cada sección en el menú superior para ver el análisis completo con gráficos y tablas detalladas.
        </p>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

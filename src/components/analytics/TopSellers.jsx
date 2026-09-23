import React, { useState, useEffect } from 'react';
import { Calendar, Trophy, DollarSign, FileText, Loader2, AlertCircle } from 'lucide-react';
import { getTopSellers } from '../../services/analyticsService';
import { getColombiaTodayString } from '../../utils/dateUtils';
import { useSceneSeries } from '../../experience/store';
import RankBadge from '../common/RankBadge';

const TopSellers = () => {
  // Inicializar fechas con el mes actual
  const currentDate = getColombiaTodayString();
  const currentMonthStart = currentDate.substring(0, 8) + '01';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(10);
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
      const result = await getTopSellers({ ...dateRange, limit });
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
  useSceneSeries('Ventas por vendedora', data?.top_sellers, (s) => s.total_sales, (s) => s.seller_name, 'money');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando top vendedoras…</p>
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
          <Trophy className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Selecciona un período para consultar
          </h3>
          <p className="text-blue-700">
            Elige las fechas de inicio y fin para visualizar el ranking de vendedoras
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Total Ingresos</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {data.summary.total_revenue_formatted}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-gray-600">Promedio por Vendedora</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {data.summary.average_sales_per_seller_formatted}
            </div>
          </div>
        </div>
      )}

      {/* Podio de Top 3 */}
      {data.top_sellers && data.top_sellers.length >= 3 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Podio de Vendedoras</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Oro */}
            <div className="bg-yellow-100 rounded-lg p-6 border-2 border-yellow-400">
              <div className="text-center mb-4">
                <RankBadge rank={1} size="xl" />
              </div>
              <div className="text-center">
                <h4 className="font-bold text-gray-900 mb-2">{data.top_sellers[0].seller_name}</h4>
                <div className="text-2xl font-bold text-yellow-600 mb-2">
                  {data.top_sellers[0].total_sales_formatted}
                </div>
                <div className="space-y-1 text-sm text-gray-700">
                  <div>{data.top_sellers[0].invoice_count} facturas</div>
                  <div>Ticket: {data.top_sellers[0].average_ticket_formatted}</div>
                  <div className="text-xs text-gray-600">Hora productiva: {data.top_sellers[0].most_productive_hour}</div>
                </div>
              </div>
            </div>

            {/* Plata */}
            <div className="bg-gray-200 rounded-lg p-6 border-2 border-gray-400">
              <div className="text-center mb-4">
                <RankBadge rank={2} size="xl" />
              </div>
              <div className="text-center">
                <h4 className="font-bold text-gray-900 mb-2">{data.top_sellers[1].seller_name}</h4>
                <div className="text-2xl font-bold text-gray-600 mb-2">
                  {data.top_sellers[1].total_sales_formatted}
                </div>
                <div className="space-y-1 text-sm text-gray-700">
                  <div>{data.top_sellers[1].invoice_count} facturas</div>
                  <div>Ticket: {data.top_sellers[1].average_ticket_formatted}</div>
                  <div className="text-xs text-gray-600">Hora productiva: {data.top_sellers[1].most_productive_hour}</div>
                </div>
              </div>
            </div>

            {/* Bronce */}
            <div className="bg-orange-100 rounded-lg p-6 border-2 border-orange-400">
              <div className="text-center mb-4">
                <RankBadge rank={3} size="xl" />
              </div>
              <div className="text-center">
                <h4 className="font-bold text-gray-900 mb-2">{data.top_sellers[2].seller_name}</h4>
                <div className="text-2xl font-bold text-orange-600 mb-2">
                  {data.top_sellers[2].total_sales_formatted}
                </div>
                <div className="space-y-1 text-sm text-gray-700">
                  <div>{data.top_sellers[2].invoice_count} facturas</div>
                  <div>Ticket: {data.top_sellers[2].average_ticket_formatted}</div>
                  <div className="text-xs text-gray-600">Hora productiva: {data.top_sellers[2].most_productive_hour}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla Completa */}
      {data.top_sellers && data.top_sellers.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Ranking Completo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Ventas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facturas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket Prom.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clientes Únicos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora Productiva</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.top_sellers.map((seller, index) => (
                  <tr key={seller.seller_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-bold ${
                        index === 0 ? 'text-yellow-600' :
                        index === 1 ? 'text-gray-500' :
                        index === 2 ? 'text-orange-600' :
                        'text-gray-600'
                      }`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{seller.seller_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-green-600">{seller.total_sales_formatted}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{seller.invoice_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{seller.average_ticket_formatted}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{seller.unique_customers}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{seller.most_productive_hour}</td>
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

export default TopSellers;

import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Users, Loader2, AlertCircle } from 'lucide-react';
import { getCustomerRetention } from '../../services/analyticsService';
import { getColombiaTodayString } from '../../utils/dateUtils';

const CustomerRetention = () => {
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
      const result = await getCustomerRetention(dateRange);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando retención de clientes…</p>
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
          <RefreshCw className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Selecciona un período para consultar
          </h3>
          <p className="text-blue-700">
            Elige las fechas de inicio y fin para visualizar la retención de clientes
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

      {/* Segmentación de Clientes */}
      {data.summary && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Segmentación de Clientes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 text-center">
              <h4 className="text-lg font-semibold text-green-800 mb-2">Nuevos</h4>
              <div className="text-4xl font-bold text-green-600 mb-2">{data.summary.new_customers}</div>
              <p className="text-sm text-green-700">1 compra</p>
            </div>
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 text-center">
              <h4 className="text-lg font-semibold text-blue-800 mb-2">Recurrentes</h4>
              <div className="text-4xl font-bold text-blue-600 mb-2">{data.summary.recurring_customers}</div>
              <p className="text-sm text-blue-700">2-4 compras</p>
            </div>
            <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6 text-center">
              <h4 className="text-lg font-semibold text-purple-800 mb-2">Leales</h4>
              <div className="text-4xl font-bold text-purple-600 mb-2">{data.summary.loyal_customers}</div>
              <p className="text-sm text-purple-700">5+ compras</p>
            </div>
          </div>

          {/* Estados de Actividad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <div>
                <div className="font-semibold text-gray-900">Activos</div>
                <div className="text-2xl font-bold text-green-600">{data.summary.active_customers}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <div>
                <div className="font-semibold text-gray-900">En Riesgo</div>
                <div className="text-2xl font-bold text-yellow-600">{data.summary.at_risk_customers}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <div>
                <div className="font-semibold text-gray-900">Inactivos</div>
                <div className="text-2xl font-bold text-red-600">{data.summary.inactive_customers}</div>
              </div>
            </div>
          </div>

          {/* Tasa de Retención */}
          <div className="mt-6 text-center">
            <div className="text-sm text-gray-600 mb-2">Tasa de Retención</div>
            <div className="text-5xl font-bold text-purple-600">{data.summary.retention_rate?.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* Top Clientes Leales */}
      {data.top_loyal_customers && data.top_loyal_customers.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Top Clientes Leales</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frecuencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Gastado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Compra</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.top_loyal_customers.slice(0, 10).map((customer) => (
                  <tr key={customer.customer_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{customer.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.frequency} compras</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-green-600">{customer.monetary_formatted}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.last_purchase_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        customer.activity_status === 'Activo' ? 'bg-green-100 text-green-800' :
                        customer.activity_status === 'En riesgo' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {customer.activity_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clientes en Riesgo */}
      {data.at_risk_customers && data.at_risk_customers.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Clientes en Riesgo
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días Sin Comprar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Gastado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Compra</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.at_risk_customers.slice(0, 10).map((customer) => (
                  <tr key={customer.customer_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{customer.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-yellow-600">{customer.recency_days} días</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.monetary_formatted}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.last_purchase_date}</td>
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

export default CustomerRetention;

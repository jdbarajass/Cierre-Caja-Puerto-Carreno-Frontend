import React, { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, FileText, Loader2, AlertCircle } from 'lucide-react';
import { getPeakHours } from '../../services/analyticsService';
import { getColombiaTodayString } from '../../utils/dateUtils';
import { useSceneSeries } from '../../experience/store';
import RankBadge from '../common/RankBadge';

const PeakHours = () => {
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
      const result = await getPeakHours(dateRange);
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
  useSceneSeries('Ventas por hora', data?.hourly_breakdown, (h) => h.total_revenue, (h) => h.hour_range, 'money');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando horas pico…</p>
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
          <Clock className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Selecciona un período para consultar
          </h3>
          <p className="text-blue-700">
            Elige las fechas de inicio y fin para visualizar las horas pico de ventas
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Total Facturas</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {data.summary.total_invoices}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600">Horas con Ventas</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {data.summary.hours_with_sales}
            </div>
          </div>
        </div>
      )}

      {/* Top 5 Horas Pico */}
      {data.top_5_peak_hours && data.top_5_peak_hours.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Top 5 Horas Pico</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {data.top_5_peak_hours.map((hour, index) => (
              <div key={hour.hour} className={`border-2 rounded-lg p-4 ${
                index === 0 ? 'border-yellow-400 bg-yellow-50' :
                index === 1 ? 'border-gray-400 bg-gray-50' :
                index === 2 ? 'border-orange-400 bg-orange-50' :
                'border-gray-200 bg-white'
              }`}>
                <div className="text-center mb-2">
                  <RankBadge rank={index + 1} size="lg" />
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{hour.hour_range}</div>
                  <div className="text-sm font-semibold text-blue-600 mt-2">
                    {hour.total_revenue_formatted}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {hour.invoice_count} facturas
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Ticket: {hour.average_ticket_formatted}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Desglose por Día de la Semana */}
      {data.daily_hourly_breakdown && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Ventas por Día de la Semana</h3>
          <div className="space-y-4">
            {Object.entries(data.daily_hourly_breakdown).map(([day, hours]) => (
              hours.length > 0 && (
                <div key={day} className="border-b border-gray-200 last:border-b-0 pb-4 last:pb-0">
                  <h4 className="font-semibold text-gray-900 mb-2">{day}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {hours.slice(0, 6).map((hour) => (
                      <div key={hour.hour} className="bg-gray-50 rounded p-2 text-sm">
                        <div className="font-semibold text-gray-700">{hour.hour_range}</div>
                        <div className="text-xs text-blue-600">{hour.total_revenue_formatted}</div>
                        <div className="text-xs text-gray-500">{hour.invoice_count} fact.</div>
                      </div>
                    ))}
                  </div>
                  {hours.length > 6 && (
                    <div className="text-xs text-gray-500 mt-2">
                      +{hours.length - 6} horas más
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PeakHours;

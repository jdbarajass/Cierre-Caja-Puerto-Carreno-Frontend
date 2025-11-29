import React, { useState } from 'react';
import { Ruler, Loader2, AlertCircle, Calendar, Search, RefreshCw } from 'lucide-react';
import { getAnalisisPorTalla } from '../../services/tallasService';
import { getColombiaTodayString } from '../../utils/dateUtils';

const AnalisisPorTalla = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentDate = getColombiaTodayString();
  const currentMonthStart = currentDate.substring(0, 8) + '01';

  const [startDate, setStartDate] = useState(currentMonthStart);
  const [endDate, setEndDate] = useState(currentDate);

  const fetchAnalisis = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAnalisisPorTalla({ startDate, endDate });

      if (!result.success) {
        throw new Error(result.error || 'Error al obtener datos');
      }

      setData(result.data.sizes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Error al cargar datos</h3>
          <p className="text-gray-600 text-center">{error}</p>
          <button
            onClick={fetchAnalisis}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de Rango de Fechas */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Ruler className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">Análisis Global por Talla</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fecha Inicio */}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-600" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || getColombiaTodayString()}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Fecha Fin */}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-600" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={getColombiaTodayString()}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Botón Consultar */}
        <button
          onClick={fetchAnalisis}
          disabled={loading}
          className={`w-full mt-4 flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl transition-all shadow-md ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Consultando...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Consultar Período
            </>
          )}
        </button>
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">Cargando análisis por talla...</p>
          </div>
        </div>
      )}

      {/* Mensaje inicial */}
      {!loading && !data && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <Ruler className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Selecciona un período para consultar</h3>
          <p className="text-sm text-blue-700">
            Elige las fechas y presiona "Consultar Período" para ver el análisis de ventas por talla
          </p>
        </div>
      )}

      {/* Tabla de Resultados */}
      {!loading && data && data.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Ruler className="w-6 h-6" />
              Ventas por Talla ({data.length} tallas)
            </h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Talla</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Cantidad</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Ingresos</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">% Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.map((talla, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                          {talla.size}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">{talla.units_formatted}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                        {talla.revenue_formatted}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                        {talla.percentage_formatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje sin datos */}
      {!loading && data && data.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">No hay datos disponibles</h3>
          <p className="text-sm text-yellow-700">
            No se encontraron ventas para el período seleccionado
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalisisPorTalla;

import React, { useState } from 'react';
import { TrendingUp, Loader2, AlertCircle, Calendar, RefreshCw, ArrowLeftRight, Search } from 'lucide-react';
import { getTopProductos } from '../../services/productosService';
import { getColombiaTodayString } from '../../utils/dateUtils';
import { useSceneSeries } from '../../experience/store';

const TopProductos = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentDate = getColombiaTodayString();
  const currentMonthStart = currentDate.substring(0, 8) + '01';

  const [startDate, setStartDate] = useState(currentMonthStart);
  const [endDate, setEndDate] = useState(currentDate);
  const [limit, setLimit] = useState(10);
  const [unified, setUnified] = useState(true);
  const [dateRange, setDateRange] = useState('');

  const fetchTopProductos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTopProductos({ startDate, endDate, limit, unified });

      if (!data.success) {
        throw new Error(data.error || 'Error al obtener datos');
      }

      setProductos(data.products);
      setDateRange(data.date_range);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Escena WebGL (solo lectura): la serie que este módulo ya muestra
  useSceneSeries('Participación por producto', productos, (p) => p.porcentaje_participacion, (p) => (unified ? p.nombre_base : p.nombre), 'percent');

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
            onClick={fetchTopProductos}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition flex items-center gap-2"
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
      {/* Controles */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Fecha Inicio */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              Fecha Inicio
            </label>
            <input aria-label="Fecha Inicio"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate || getColombiaTodayString()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              Fecha Fin
            </label>
            <input aria-label="Fecha Fin"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={getColombiaTodayString()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Selector de Cantidad */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              Cantidad a Mostrar
            </label>
            <select aria-label="Cantidad a Mostrar"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
            </select>
          </div>

          {/* Toggle Unificado */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <ArrowLeftRight className="w-4 h-4 text-blue-600" />
              Modo de Vista
            </label>
            <button
              onClick={() => setUnified(!unified)}
              disabled={loading}
              className={`w-full px-4 py-2 rounded-lg font-semibold transition ${
                unified
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {unified ? 'Unificado (por producto)' : 'Individual (por SKU)'}
            </button>
          </div>

          {/* Botón Consultar */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 text-purple-600" />
              Acción
            </label>
            <button
              onClick={fetchTopProductos}
              disabled={loading}
              className={`w-full px-4 py-2 rounded-lg font-semibold transition shadow-md ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 hover:bg-gray-800 text-white'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Consultando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Search className="w-4 h-4" />
                  Consultar
                </span>
              )}
            </button>
          </div>
        </div>

        {dateRange && !loading && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Periodo:</strong> {dateRange} | <strong>Mostrando:</strong> Top {limit} productos{' '}
              {unified ? '(variantes agrupadas)' : '(SKU individuales)'}
            </p>
          </div>
        )}
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">Cargando top productos…</p>
          </div>
        </div>
      )}

      {/* Mensaje inicial */}
      {!loading && productos.length === 0 && !error && !dateRange && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <TrendingUp className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Selecciona un período para consultar</h3>
          <p className="text-sm text-blue-700">
            Elige las fechas y presiona "Consultar" para ver el top de productos
          </p>
        </div>
      )}

      {/* Tabla de Productos */}
      {!loading && productos.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-900">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Top {limit} Productos Más Vendidos
          </h2>
          <p className="text-sm text-blue-100 mt-1">
            {unified ? 'Productos unificados por nombre base' : 'Productos individuales por SKU'}
          </p>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Producto
                  </th>
                  {unified && (
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Variantes
                    </th>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    % Participación
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productos.map((producto) => {
                  const isTop3 = producto.ranking <= 3;
                  return (
                    <tr
                      key={producto.ranking}
                      className={`hover:bg-gray-50 transition-colors ${
                        isTop3 ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                            producto.ranking === 1
                              ? 'bg-yellow-400 text-yellow-900'
                              : producto.ranking === 2
                              ? 'bg-gray-300 text-gray-900'
                              : producto.ranking === 3
                              ? 'bg-orange-400 text-orange-900'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {producto.ranking}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {unified ? producto.nombre_base : producto.nombre}
                        </div>
                      </td>
                      {unified && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {producto.numero_variantes} variante(s)
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                        {producto.cantidad_formatted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                        {producto.ingresos_formatted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${producto.porcentaje_participacion}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-700 min-w-[3rem]">
                            {producto.porcentaje_participacion_formatted}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
      </div>
      )}

      {/* Leyenda para Top 3 */}
      {!loading && productos.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-800">
            Los primeros 3 productos están destacados en amarillo
          </p>
        </div>
      )}
    </div>
  );
};

export default TopProductos;

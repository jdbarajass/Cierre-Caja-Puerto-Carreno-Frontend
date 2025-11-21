import React, { useState, useEffect } from 'react';
import { Package, Loader2, AlertCircle, Calendar, RefreshCw, PieChart } from 'lucide-react';
import { getCategorias } from '../../services/productosService';
import { getColombiaTodayString } from '../../utils/dateUtils';

const CategoriasProductos = () => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(getColombiaTodayString());
  const [dateRange, setDateRange] = useState('');
  const [totalCategorias, setTotalCategorias] = useState(0);

  useEffect(() => {
    fetchCategorias();
  }, [date]);

  const fetchCategorias = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCategorias({ date });

      if (!data.success) {
        throw new Error(data.error || 'Error al obtener datos');
      }

      setCategorias(data.data.categorias);
      setTotalCategorias(data.data.total_categorias);
      setDateRange(data.date_range);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getColorForCategory = (index) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-green-500 to-green-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-red-500 to-red-600',
      'from-teal-500 to-teal-600',
      'from-yellow-500 to-yellow-600',
      'from-gray-500 to-gray-600'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Cargando análisis por categorías...</p>
        </div>
      </div>
    );
  }

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
            onClick={fetchCategorias}
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
      {/* Selector de Fecha */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-purple-600" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={getColombiaTodayString()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Periodo:</strong> {dateRange} | <strong>Total categorías:</strong>{' '}
            {totalCategorias}
          </p>
        </div>
      </div>

      {/* Cards de Categorías */}
      {categorias.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-500">
          No se encontraron categorías para esta fecha
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categorias.map((categoria, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Header con gradiente */}
                <div className={`bg-gradient-to-r ${getColorForCategory(index)} p-4`}>
                  <div className="flex items-center justify-between text-white">
                    <h3 className="text-lg font-bold">{categoria.categoria}</h3>
                    <Package className="w-6 h-6 opacity-80" />
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Cantidad */}
                    <div>
                      <p className="text-sm text-gray-600">Cantidad Vendida</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {categoria.cantidad_formatted}
                      </p>
                    </div>

                    {/* Ingresos */}
                    <div>
                      <p className="text-sm text-gray-600">Ingresos</p>
                      <p className="text-2xl font-bold text-green-600">
                        {categoria.ingresos_formatted}
                      </p>
                    </div>

                    {/* Productos Diferentes */}
                    <div>
                      <p className="text-sm text-gray-600">Productos Diferentes</p>
                      <p className="text-lg font-semibold text-gray-700">
                        {categoria.numero_productos_diferentes}
                      </p>
                    </div>

                    {/* Porcentaje de Participación */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">% Participación</p>
                        <span className="text-sm font-bold text-blue-600">
                          {categoria.porcentaje_participacion_formatted}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`bg-gradient-to-r ${getColorForCategory(
                            index
                          )} h-3 rounded-full transition-all duration-500`}
                          style={{ width: `${categoria.porcentaje_participacion}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabla Detallada */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <PieChart className="w-6 h-6" />
                Resumen por Categorías
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Ingresos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Productos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      % Participación
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categorias.map((categoria, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full bg-gradient-to-r ${getColorForCategory(
                              index
                            )}`}
                          ></div>
                          <span className="text-sm font-semibold text-gray-900">
                            {categoria.categoria}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                        {categoria.cantidad_formatted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                        {categoria.ingresos_formatted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                        {categoria.numero_productos_diferentes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-blue-600">
                        {categoria.porcentaje_participacion_formatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CategoriasProductos;

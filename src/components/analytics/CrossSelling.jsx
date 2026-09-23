import React, { useState, useEffect } from 'react';
import { Calendar, ShoppingBag, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { getCrossSelling } from '../../services/analyticsService';
import { getColombiaTodayString } from '../../utils/dateUtils';
import { useSceneSeries } from '../../experience/store';

const CrossSelling = () => {
  // Inicializar fechas con el mes actual
  const currentDate = getColombiaTodayString();
  const currentMonthStart = currentDate.substring(0, 8) + '01';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [minSupport, setMinSupport] = useState(2);
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
      const result = await getCrossSelling({ ...dateRange, min_support: minSupport });
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
  useSceneSeries('Veces comprados juntos', data?.top_product_pairs, (p) => p.times_bought_together, (p) => `${p.product1} + ${p.product2}`, 'count');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando análisis de cross-selling…</p>
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
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Soporte mínimo:</label>
              <input aria-label="Soporte mínimo"
                type="number"
                min="1"
                max="10"
                value={minSupport}
                onChange={(e) => setMinSupport(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Consultar Período
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <ShoppingBag className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Selecciona un período para consultar
          </h3>
          <p className="text-blue-700">
            Elige las fechas de inicio y fin para visualizar productos que se compran juntos
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
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Soporte mínimo:</label>
            <input aria-label="Soporte mínimo"
              type="number"
              min="1"
              max="10"
              value={minSupport}
              onChange={(e) => setMinSupport(Number(e.target.value))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Consultar Período
          </button>
        </div>
      </div>

      {/* Resumen */}
      {data.summary && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Resumen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <ShoppingBag className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-sm text-gray-600">Combos Encontrados</div>
                <div className="text-3xl font-bold text-blue-600">{data.summary.total_product_pairs}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
              <DollarSign className="w-8 h-8 text-purple-600" />
              <div>
                <div className="text-sm text-gray-600">Productos Únicos</div>
                <div className="text-3xl font-bold text-purple-600">{data.summary.total_unique_products}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Pares de Productos */}
      {data.top_product_pairs && data.top_product_pairs.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Top Productos que se Compran Juntos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.top_product_pairs.map((pair, index) => (
              <div key={index} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                <div className="text-center mb-3">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 font-semibold rounded-full text-sm">
                    #{index + 1}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900 truncate" title={pair.product1}>
                    {pair.product1}
                  </div>
                  <div className="text-center text-2xl font-bold text-gray-500">+</div>
                  <div className="text-sm font-medium text-gray-900 truncate" title={pair.product2}>
                    {pair.product2}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Comprados juntos:</span>
                    <span className="font-semibold text-blue-600">{pair.times_bought_together} veces</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Ingresos:</span>
                    <span className="font-semibold text-green-600">{pair.total_revenue_formatted}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Confianza:</span>
                    <span className="font-semibold text-purple-600">{pair.avg_confidence?.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nota informativa */}
      {data.top_product_pairs && data.top_product_pairs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Sugerencia:</strong> Estos pares de productos se compran frecuentemente juntos. Considera crear combos o promociones para incrementar las ventas.
          </p>
        </div>
      )}

      {data.top_product_pairs && data.top_product_pairs.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">
            No se encontraron pares de productos con el soporte mínimo de {minSupport}. Intenta reducir el soporte mínimo o ampliar el rango de fechas.
          </p>
        </div>
      )}
    </div>
  );
};

export default CrossSelling;

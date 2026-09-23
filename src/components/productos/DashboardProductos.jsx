import React, { useState } from 'react';
import { DollarSign, Package, TrendingUp, FileText, Loader2, AlertCircle, Calendar, RefreshCw, Search } from 'lucide-react';
import { getResumenProductos } from '../../services/productosService';
import { getColombiaTodayString } from '../../utils/dateUtils';

const DashboardProductos = () => {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentDate = getColombiaTodayString();
  const currentMonthStart = currentDate.substring(0, 8) + '01';

  const [startDate, setStartDate] = useState(currentMonthStart);
  const [endDate, setEndDate] = useState(currentDate);

  const fetchResumen = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getResumenProductos({ startDate, endDate });

      if (!data.success) {
        throw new Error(data.error || 'Error al obtener datos');
      }

      setResumen(data.summary);
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
            onClick={fetchResumen}
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
      {/* Selector de Rango de Fechas y Descarga PDF */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fecha Inicio */}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-600" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Inicio
                </label>
                <input aria-label="Fecha Inicio"
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
                <input aria-label="Fecha Fin"
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
          <div className="flex justify-center">
            <button
              onClick={fetchResumen}
              disabled={loading}
              className={`flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl transition shadow-md ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 hover:bg-gray-800 text-white'
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
        </div>
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">Cargando resumen de productos…</p>
            <p className="text-sm text-gray-500 mt-2">Consultando datos desde Alegra</p>
          </div>
        </div>
      )}

      {/* Métricas Principales */}
      {!loading && resumen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Productos Vendidos */}
        <div className="bg-gray-900 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <Package className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Total Productos Vendidos</h3>
          <p className="text-3xl font-bold mb-2">{resumen.total_productos_vendidos_formatted}</p>
          <p className="text-xs opacity-75">{resumen.numero_items_unicos} productos únicos</p>
        </div>

        {/* Ingresos Totales */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-700 mb-1">Ingresos Totales</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">
            {resumen.ingresos_totales_formatted}
          </p>
          <p className="text-xs text-gray-500">De productos vendidos</p>
        </div>

        {/* Producto Más Vendido */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-700 mb-1">Producto Más Vendido</h3>
          <p className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
            {resumen.producto_mas_vendido}
          </p>
          <p className="text-xs text-gray-500">
            {resumen.unidades_mas_vendido_formatted} unidades vendidas
          </p>
        </div>

        {/* Número de Facturas */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <FileText className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-700 mb-1">Facturas Procesadas</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">{resumen.numero_facturas}</p>
          <p className="text-xs text-gray-500">Facturas con productos</p>
        </div>
      </div>
      )}

      {/* Información adicional */}
      {!loading && resumen && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>Período consultado:</strong> {startDate} {startDate !== endDate ? `hasta ${endDate}` : ''}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Los datos se obtienen directamente desde las facturas de Alegra
          </p>
        </div>
      )}

      {/* Mensaje inicial */}
      {!loading && !resumen && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <Package className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Selecciona un período para consultar</h3>
          <p className="text-sm text-blue-700">
            Elige las fechas y presiona "Consultar Período" para ver el resumen de productos
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardProductos;

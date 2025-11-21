import React, { useState, useEffect } from 'react';
import { DollarSign, Package, TrendingUp, FileText, Loader2, AlertCircle, Calendar, RefreshCw, Download } from 'lucide-react';
import { getResumenProductos, descargarReportePDF } from '../../services/productosService';
import { getColombiaTodayString } from '../../utils/dateUtils';

const DashboardProductos = () => {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(getColombiaTodayString());
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    fetchResumen();
  }, [date]);

  const fetchResumen = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getResumenProductos({ date });

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

  const handleDescargarPDF = async () => {
    try {
      setDownloadingPDF(true);
      await descargarReportePDF({ date });
    } catch (err) {
      alert(`Error al descargar PDF: ${err.message}`);
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Cargando resumen de productos...</p>
          <p className="text-sm text-gray-500 mt-2">Consultando datos desde Alegra</p>
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
            onClick={fetchResumen}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!resumen) return null;

  return (
    <div className="space-y-6">
      {/* Selector de Fecha y Descarga PDF */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
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

          <button
            onClick={handleDescargarPDF}
            disabled={downloadingPDF}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all shadow-md ${
              downloadingPDF
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white'
            }`}
          >
            {downloadingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Descargar Reporte PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Productos Vendidos */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
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

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Fecha consultada:</strong> {date}
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Los datos se obtienen directamente desde las facturas de Alegra
        </p>
      </div>
    </div>
  );
};

export default DashboardProductos;

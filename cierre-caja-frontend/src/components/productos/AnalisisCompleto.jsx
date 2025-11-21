import React, { useState, useEffect } from 'react';
import { FileBarChart, Loader2, AlertCircle, Calendar, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { getAnalisisCompleto } from '../../services/productosService';
import { getColombiaTodayString } from '../../utils/dateUtils';

const AnalisisCompleto = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(getColombiaTodayString());
  const [expandedSections, setExpandedSections] = useState({
    resumen: true,
    top10: true,
    top10Unified: true,
    todosUnified: false,
    listadoCompleto: false
  });

  useEffect(() => {
    fetchAnalisis();
  }, [date]);

  const fetchAnalisis = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAnalisisCompleto({ date });

      if (!result.success) {
        throw new Error(result.error || 'Error al obtener datos');
      }

      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Cargando análisis completo...</p>
          <p className="text-sm text-gray-500 mt-2">Este proceso puede tardar unos segundos</p>
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

  if (!data) return null;

  const Section = ({ title, isExpanded, onToggle, children }) => (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-between hover:from-blue-700 hover:to-purple-700 transition-all"
      >
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileBarChart className="w-6 h-6" />
          {title}
        </h2>
        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {isExpanded && <div className="p-6">{children}</div>}
    </div>
  );

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

        {data.metadata && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg space-y-1">
            <p className="text-sm text-blue-800">
              <strong>Fecha de generación:</strong> {data.metadata.fecha_generacion}
            </p>
            <p className="text-sm text-blue-800">
              <strong>Facturas procesadas:</strong> {data.metadata.numero_facturas_procesadas}
            </p>
            <p className="text-sm text-blue-800">
              <strong>Items procesados:</strong> {data.metadata.numero_items_procesados}
            </p>
          </div>
        )}
      </div>

      {/* Resumen Ejecutivo */}
      <Section
        title="Resumen Ejecutivo"
        isExpanded={expandedSections.resumen}
        onToggle={() => toggleSection('resumen')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-700 font-medium">Total Productos Vendidos</p>
            <p className="text-2xl font-bold text-blue-900">
              {data.resumen_ejecutivo.total_productos_vendidos_formatted}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-700 font-medium">Ingresos Totales</p>
            <p className="text-2xl font-bold text-green-900">
              {data.resumen_ejecutivo.ingresos_totales_formatted}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-700 font-medium">Producto Más Vendido</p>
            <p className="text-sm font-bold text-purple-900 line-clamp-2">
              {data.resumen_ejecutivo.producto_mas_vendido}
            </p>
            <p className="text-xs text-purple-600 mt-1">
              {data.resumen_ejecutivo.unidades_mas_vendido_formatted} unidades
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-orange-700 font-medium">Facturas</p>
            <p className="text-2xl font-bold text-orange-900">
              {data.resumen_ejecutivo.numero_facturas}
            </p>
            <p className="text-xs text-orange-600 mt-1">
              {data.resumen_ejecutivo.numero_items_unicos} productos únicos
            </p>
          </div>
        </div>
      </Section>

      {/* Top 10 Sin Unificar */}
      <Section
        title="Top 10 Productos (Sin Unificar)"
        isExpanded={expandedSections.top10}
        onToggle={() => toggleSection('top10')}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">#</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                  Producto
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  Cantidad
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  Ingresos
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  % Part.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.top_10_productos.map((producto) => (
                <tr key={producto.ranking} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-bold">{producto.ranking}</td>
                  <td className="px-4 py-3 text-sm">{producto.nombre}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">
                    {producto.cantidad_formatted}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                    {producto.ingresos_formatted}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                    {producto.porcentaje_participacion_formatted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Top 10 Unificados */}
      <Section
        title="Top 10 Productos Unificados"
        isExpanded={expandedSections.top10Unified}
        onToggle={() => toggleSection('top10Unified')}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">#</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                  Producto Base
                </th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">
                  Variantes
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  Cantidad
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  Ingresos
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  % Part.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.top_10_productos_unificados.map((producto) => (
                <tr key={producto.ranking} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-bold">{producto.ranking}</td>
                  <td className="px-4 py-3 text-sm">{producto.nombre_base}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {producto.numero_variantes}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">
                    {producto.cantidad_formatted}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                    {producto.ingresos_formatted}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                    {producto.porcentaje_participacion_formatted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Todos Productos Unificados */}
      <Section
        title={`Todos los Productos Unificados (${data.todos_productos_unificados?.length || 0})`}
        isExpanded={expandedSections.todosUnified}
        onToggle={() => toggleSection('todosUnified')}
      >
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">#</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                  Producto
                </th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">
                  Variantes
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  Cantidad
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  Ingresos
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.todos_productos_unificados?.map((producto, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">{index + 1}</td>
                  <td className="px-4 py-2 text-sm">{producto.nombre_base}</td>
                  <td className="px-4 py-2 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {producto.numero_variantes}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-right">{producto.cantidad_formatted}</td>
                  <td className="px-4 py-2 text-sm text-right text-green-600">
                    {producto.ingresos_formatted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Listado Completo */}
      <Section
        title={`Listado Completo de Productos (${data.listado_completo?.length || 0})`}
        isExpanded={expandedSections.listadoCompleto}
        onToggle={() => toggleSection('listadoCompleto')}
      >
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">#</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                  Producto
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  Cantidad
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  Ingresos
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.listado_completo?.map((producto, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">{index + 1}</td>
                  <td className="px-4 py-2 text-sm">{producto.nombre}</td>
                  <td className="px-4 py-2 text-sm text-right">{producto.cantidad_formatted}</td>
                  <td className="px-4 py-2 text-sm text-right text-green-600">
                    {producto.ingresos_formatted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};

export default AnalisisCompleto;

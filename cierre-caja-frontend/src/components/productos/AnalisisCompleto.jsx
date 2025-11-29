import React, { useState } from 'react';
import { FileBarChart, Loader2, AlertCircle, Calendar, RefreshCw, ChevronDown, ChevronUp, Search, Download } from 'lucide-react';
import { getAnalisisCompleto, descargarReportePDF } from '../../services/productosService';
import { getColombiaTodayString } from '../../utils/dateUtils';

const AnalisisCompleto = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentDate = getColombiaTodayString();
  const currentMonthStart = currentDate.substring(0, 8) + '01';

  const [startDate, setStartDate] = useState(currentMonthStart);
  const [endDate, setEndDate] = useState(currentDate);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    resumen: true,
    top10: true,
    top10Unified: true,
    todosUnified: false,
    listadoCompleto: false,
    ventasPorTalla: false,
    ventasPorCategoriaTalla: false,
    ventasPorDepartamentoTalla: false
  });

  const fetchAnalisis = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAnalisisCompleto({ startDate, endDate });

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

  const handleDescargarPDF = async () => {
    try {
      setDownloadingPDF(true);
      await descargarReportePDF({ startDate, endDate });
    } catch (err) {
      alert(`Error al descargar PDF: ${err.message}`);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
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
      {/* Selector de Rango de Fechas */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
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

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          {/* Botón Consultar */}
          <button
            onClick={fetchAnalisis}
            disabled={loading}
            className={`flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl transition-all shadow-md flex-1 ${
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

          {/* Botón Descargar PDF */}
          <button
            onClick={handleDescargarPDF}
            disabled={downloadingPDF || !data}
            className={`flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl transition-all shadow-md ${
              downloadingPDF || !data
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white'
            }`}
          >
            {downloadingPDF ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Descargar PDF Completo
              </>
            )}
          </button>
        </div>

        {data && data.metadata && (
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

      {/* Estado de carga */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">Cargando análisis completo...</p>
            <p className="text-sm text-gray-500 mt-2">Este proceso puede tardar unos segundos</p>
          </div>
        </div>
      )}

      {/* Mensaje inicial */}
      {!loading && !data && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <FileBarChart className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Selecciona un período para consultar</h3>
          <p className="text-sm text-blue-700">
            Elige las fechas y presiona "Consultar Período" para ver el análisis completo
          </p>
        </div>
      )}

      {/* Resumen Ejecutivo */}
      {!loading && data && (
        <>
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

      {/* Análisis por Talla */}
      {data.ventas_por_talla && data.ventas_por_talla.sizes && data.ventas_por_talla.sizes.length > 0 && (
        <Section
          title={`Análisis por Talla (${data.ventas_por_talla.sizes.length} tallas)`}
          isExpanded={expandedSections.ventasPorTalla}
          onToggle={() => toggleSection('ventasPorTalla')}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Talla</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Cantidad</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Ingresos</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">% Part.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.ventas_por_talla.sizes.map((talla, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-bold">{talla.size}</td>
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
        </Section>
      )}

      {/* Análisis por Categoría y Talla */}
      {data.ventas_por_categoria_talla && data.ventas_por_categoria_talla.categories && data.ventas_por_categoria_talla.categories.length > 0 && (
        <Section
          title={`Análisis por Categoría y Talla (${data.ventas_por_categoria_talla.categories.length} categorías)`}
          isExpanded={expandedSections.ventasPorCategoriaTalla}
          onToggle={() => toggleSection('ventasPorCategoriaTalla')}
        >
          <div className="space-y-4">
            {data.ventas_por_categoria_talla.categories.map((categoria, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">{categoria.category}</h3>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total: {categoria.total_units_formatted} unidades</p>
                    <p className="text-sm font-semibold text-green-600">{categoria.total_revenue_formatted}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Talla</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Cantidad</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Ingresos</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">% Part.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {categoria.sizes.map((talla, tallaIndex) => (
                        <tr key={tallaIndex} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm font-medium">{talla.size}</td>
                          <td className="px-3 py-2 text-sm text-right">{talla.units_formatted}</td>
                          <td className="px-3 py-2 text-sm text-right text-green-600">
                            {talla.revenue_formatted}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-blue-600">
                            {talla.percentage_in_category_formatted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Análisis por Departamento y Talla */}
      {data.ventas_por_departamento_talla && data.ventas_por_departamento_talla.departments && data.ventas_por_departamento_talla.departments.length > 0 && (
        <Section
          title={`Análisis por Departamento y Talla (${data.ventas_por_departamento_talla.departments.length} departamentos)`}
          isExpanded={expandedSections.ventasPorDepartamentoTalla}
          onToggle={() => toggleSection('ventasPorDepartamentoTalla')}
        >
          <div className="space-y-4">
            {data.ventas_por_departamento_talla.departments.map((departamento, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">{departamento.department}</h3>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total: {departamento.total_units_formatted} unidades</p>
                    <p className="text-sm font-semibold text-green-600">{departamento.total_revenue_formatted}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Talla</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Cantidad</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Ingresos</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">% Part.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {departamento.sizes.map((talla, tallaIndex) => (
                        <tr key={tallaIndex} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm font-medium">{talla.size}</td>
                          <td className="px-3 py-2 text-sm text-right">{talla.units_formatted}</td>
                          <td className="px-3 py-2 text-sm text-right text-green-600">
                            {talla.revenue_formatted}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-blue-600">
                            {talla.percentage_in_department_formatted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
        </>
      )}
    </div>
  );
};

export default AnalisisCompleto;

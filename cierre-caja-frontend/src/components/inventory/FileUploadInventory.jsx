import React, { useState, useRef } from 'react';
import { Upload, Package, DollarSign, TrendingUp, FileText, AlertCircle, CheckCircle, Database, LayoutDashboard, Grid, Award, Ruler, PieChart } from 'lucide-react';
import { getFullAnalysis, uploadFile } from '../../services/inventoryService';

const FileUploadInventory = () => {
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [activeView, setActiveView] = useState('resumen'); // 'resumen', 'departamentos', 'top-productos', 'categorias'
  const fileInputRef = useRef(null);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleViewCurrentInventory = async () => {
    setLoading(true);
    setError(null);
    setFileName(null);

    try {
      const result = await getFullAnalysis();
      if (result.success) {
        setAnalysisData(result);
      } else {
        setError('Error al obtener inventario actual');
      }
    } catch (err) {
      setError(err.message || 'Error al obtener inventario desde Alegra');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar extensión
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setError('Formato no soportado. Use CSV o Excel (.csv, .xlsx, .xls)');
      return;
    }

    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const result = await uploadFile(file);
      if (result.success) {
        setAnalysisData(result);
      } else {
        setError('Error al procesar el archivo');
      }
    } catch (err) {
      setError(err.message || 'Error al cargar el archivo');
    } finally {
      setLoading(false);
      // Limpiar el input para permitir subir el mismo archivo otra vez
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Header con botones */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Análisis de Inventario</h2>
        <p className="text-gray-600 mb-6">
          Consulte el inventario actual desde Alegra o cargue un archivo exportado para análisis
        </p>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleViewCurrentInventory}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Database className="w-5 h-5" />
            Ver Inventario Actual
          </button>

          <button
            onClick={handleUploadClick}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Upload className="w-5 h-5" />
            Cargar Archivo de Inventario
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {fileName && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            <span>Archivo: <strong>{fileName}</strong></span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div>
              <p className="font-semibold text-blue-900">Procesando...</p>
              <p className="text-sm text-blue-700">
                {fileName ? 'Analizando archivo de inventario' : 'Consultando inventario desde Alegra'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="w-6 h-6" />
            <div>
              <h3 className="font-semibold">Error</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {analysisData && !loading && (
        <div className="space-y-6">
          {/* Success Badge */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <p className="font-semibold">Análisis completado exitosamente</p>
            </div>
          </div>

          {/* Navegación de Vistas */}
          <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
              {[
                { id: 'resumen', label: 'Resumen General', icon: LayoutDashboard },
                { id: 'departamentos', label: 'Departamentos', icon: Grid },
                { id: 'top-productos', label: 'Top Categorías', icon: Award },
                { id: 'categorias', label: 'Todas las Categorías', icon: Ruler }
              ].map((view) => {
                const Icon = view.icon;
                const isActive = activeView === view.id;

                return (
                  <button
                    key={view.id}
                    onClick={() => setActiveView(view.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                    <span className="text-sm font-semibold">{view.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenido según vista activa */}
          {renderActiveView()}
        </div>
      )}
    </div>
  );

  // Función para renderizar la vista activa
  function renderActiveView() {
    switch (activeView) {
      case 'resumen':
        return renderResumenGeneral();
      case 'departamentos':
        return renderDepartamentos();
      case 'top-productos':
        return renderTopCategorias();
      case 'categorias':
        return renderTodasCategorias();
      default:
        return renderResumenGeneral();
    }
  }

  // Vista: Resumen General
  function renderResumenGeneral() {
    return (
      <div className="space-y-6">
        {/* Resumen General - Tarjetas */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Resumen General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Total Items</p>
                    <p className="text-3xl font-bold text-blue-900 mt-1">
                      {analysisData.resumen_general?.total_items || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-lg">
                    <Package className="w-6 h-6 text-blue-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Valor Inventario</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">
                      {formatCurrency(analysisData.resumen_general?.valor_total_precio || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Margen Total</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">
                      {formatCurrency(analysisData.resumen_general?.margen_total || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow p-4 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-700 font-medium">Margen %</p>
                    <p className="text-3xl font-bold text-orange-900 mt-1">
                      {analysisData.resumen_general?.margen_porcentaje?.toFixed(2) || 0}%
                    </p>
                  </div>
                  <div className="p-3 bg-orange-200 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-orange-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow p-4 border border-indigo-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-700 font-medium">Total Categorías</p>
                    <p className="text-3xl font-bold text-indigo-900 mt-1">
                      {analysisData.resumen_general?.total_categorias || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-200 rounded-lg">
                    <FileText className="w-6 h-6 text-indigo-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg shadow p-4 border border-pink-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-pink-700 font-medium">Valor Costo</p>
                    <p className="text-2xl font-bold text-pink-900 mt-1">
                      {formatCurrency(analysisData.resumen_general?.valor_total_costo || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-pink-200 rounded-lg">
                    <DollarSign className="w-6 h-6 text-pink-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Departamentos Ordenados por Valor */}
        {analysisData.departamentos_ordenados && analysisData.departamentos_ordenados.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Departamentos por Valor</h3>
            <div className="space-y-3">
              {analysisData.departamentos_ordenados.map((dept, index) => (
                <div key={index} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800 capitalize">{dept.nombre}</span>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{dept.cantidad} items</p>
                      <p className="font-bold text-gray-900">{formatCurrency(dept.valor)}</p>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                      style={{
                        width: `${(dept.valor / analysisData.departamentos_ordenados[0].valor) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vista: Departamentos
  function renderDepartamentos() {
    if (!analysisData.por_departamento) {
      return (
        <div className="text-center py-12 text-gray-500">
          No hay datos de departamentos disponibles en el archivo cargado
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Tabla de Departamentos */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Análisis Detallado por Departamento</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left p-3 font-semibold text-gray-700">Departamento</th>
                  <th className="text-right p-3 font-semibold text-gray-700">Cantidad</th>
                  <th className="text-right p-3 font-semibold text-gray-700">Valor Costo</th>
                  <th className="text-right p-3 font-semibold text-gray-700">Valor Precio</th>
                  <th className="text-right p-3 font-semibold text-gray-700">Margen $</th>
                  <th className="text-right p-3 font-semibold text-gray-700">Margen %</th>
                  <th className="text-right p-3 font-semibold text-gray-700">% Inventario</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analysisData.por_departamento).map(([dept, data]) => (
                  <tr key={dept} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-semibold text-gray-900 capitalize">{dept}</td>
                    <td className="text-right p-3 text-gray-700">{data.cantidad}</td>
                    <td className="text-right p-3 text-gray-700">{formatCurrency(data.valor_costo)}</td>
                    <td className="text-right p-3 text-gray-700">{formatCurrency(data.valor_precio)}</td>
                    <td className="text-right p-3 text-green-700 font-semibold">
                      {formatCurrency(data.margen_total)}
                    </td>
                    <td className="text-right p-3">
                      <span className={`px-2 py-1 rounded-full text-sm font-semibold ${
                        data.margen_porcentaje >= 20
                          ? 'bg-green-100 text-green-700'
                          : data.margen_porcentaje >= 10
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {data.margen_porcentaje.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right p-3 text-gray-700">
                      {data.porcentaje_inventario?.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico de barras de departamentos */}
        {analysisData.departamentos_ordenados && analysisData.departamentos_ordenados.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Distribución por Valor</h3>
            <div className="space-y-3">
              {analysisData.departamentos_ordenados.map((dept, index) => (
                <div key={index} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800 capitalize">{dept.nombre}</span>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{dept.cantidad} items</p>
                      <p className="font-bold text-gray-900">{formatCurrency(dept.valor)}</p>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all"
                      style={{
                        width: `${(dept.valor / analysisData.departamentos_ordenados[0].valor) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vista: Top Categorías
  function renderTopCategorias() {
    if (!analysisData.top_categorias || analysisData.top_categorias.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No hay datos de categorías disponibles en el archivo cargado
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Top Categorías */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Top 20 Categorías</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysisData.top_categorias.slice(0, 20).map((cat, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-bold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-semibold text-gray-800">{cat.categoria}</span>
                </div>
                <span className="text-gray-600 font-semibold">{cat.cantidad} items</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking visual */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Distribución Visual</h3>
          <div className="space-y-3">
            {analysisData.top_categorias.slice(0, 10).map((cat, index) => {
              const maxCantidad = analysisData.top_categorias[0].cantidad;
              const percentage = (cat.cantidad / maxCantidad) * 100;

              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-gray-900">{cat.categoria}</span>
                    </div>
                    <span className="text-sm text-gray-600">{cat.cantidad} items</span>
                  </div>
                  <div className="w-full h-8 bg-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-end px-3 transition-all"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    >
                      <span className="text-white text-xs font-semibold">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Vista: Todas las Categorías
  function renderTodasCategorias() {
    if (!analysisData.top_categorias || analysisData.top_categorias.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No hay datos de categorías disponibles en el archivo cargado
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Resumen */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-100 rounded-xl shadow-md p-6 border border-indigo-200">
          <h4 className="text-sm font-semibold text-indigo-900 mb-4">Resumen de Categorías</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-gray-700">Total Categorías:</span>
              <span className="ml-2 text-lg font-bold text-indigo-700">
                {analysisData.top_categorias.length}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-700">Total Items:</span>
              <span className="ml-2 text-lg font-bold text-indigo-700">
                {analysisData.top_categorias.reduce((sum, cat) => sum + cat.cantidad, 0)}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-700">Promedio por Categoría:</span>
              <span className="ml-2 text-lg font-bold text-indigo-700">
                {(analysisData.top_categorias.reduce((sum, cat) => sum + cat.cantidad, 0) /
                  analysisData.top_categorias.length).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Listado completo de categorías */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Todas las Categorías ({analysisData.top_categorias.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Items</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">% del Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analysisData.top_categorias.map((cat, index) => {
                  const totalItems = analysisData.top_categorias.reduce((sum, c) => sum + c.cantidad, 0);
                  const percentage = (cat.cantidad / totalItems) * 100;

                  return (
                    <tr key={index} className="hover:bg-indigo-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{cat.categoria}</td>
                      <td className="px-4 py-3 text-sm text-center font-semibold text-indigo-600">
                        {cat.cantidad}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-gray-600">
                            {percentage.toFixed(1)}%
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
      </div>
    );
  }
};

export default FileUploadInventory;

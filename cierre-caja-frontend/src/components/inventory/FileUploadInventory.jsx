import React, { useState, useRef } from 'react';
import { Upload, Package, DollarSign, TrendingUp, FileText, AlertCircle, CheckCircle, Database, LayoutDashboard, Grid, Award, Ruler, PieChart, List } from 'lucide-react';
import { getFullAnalysis, uploadFile } from '../../services/inventoryService';

const FileUploadInventory = () => {
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [activeView, setActiveView] = useState('inventario-completo'); // 'inventario-completo', 'resumen', 'departamentos', 'top-productos', 'categorias'
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

          {/* Indicador del tipo de archivo */}
          {analysisData.tipo_archivo && (
            <div className={`rounded-xl p-4 border ${
              analysisData.tipo_archivo === 'inventario_alegra'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-purple-50 border-purple-200'
            }`}>
              <div className={`flex items-center gap-2 ${
                analysisData.tipo_archivo === 'inventario_alegra'
                  ? 'text-blue-800'
                  : 'text-purple-800'
              }`}>
                <Package className="w-5 h-5" />
                <p className="font-semibold">
                  {analysisData.tipo_archivo === 'inventario_alegra'
                    ? '📦 Archivo de inventario detectado - Incluye cantidades en stock'
                    : '📋 Archivo de exportación detectado - Catálogo de productos'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Navegación de Vistas */}
          <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
              {[
                { id: 'inventario-completo', label: 'Inventario Completo', icon: List },
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
      case 'inventario-completo':
        return renderInventarioCompleto();
      case 'resumen':
        return renderResumenGeneral();
      case 'departamentos':
        return renderDepartamentos();
      case 'top-productos':
        return renderTopCategorias();
      case 'categorias':
        return renderTodasCategorias();
      default:
        return renderInventarioCompleto();
    }
  }

  // Vista: Inventario Completo
  function renderInventarioCompleto() {
    if (!analysisData.por_departamento) {
      return (
        <div className="text-center py-12 text-gray-500">
          No hay datos de inventario disponibles
        </div>
      );
    }

    const isInventoryReport = analysisData.tipo_archivo === 'inventario_alegra';

    // Definir el orden de los departamentos
    const departmentOrder = ['mujer', 'hombre', 'niño', 'niña', 'accesorios', 'otros'];

    // Mapeo de colores para cada departamento
    const departmentColors = {
      'mujer': { from: 'from-pink-50', to: 'to-pink-100', border: 'border-pink-200', text: 'text-pink-700', bg: 'bg-pink-200', icon: 'text-pink-700', bar: 'from-pink-500 to-pink-600' },
      'hombre': { from: 'from-blue-50', to: 'to-blue-100', border: 'border-blue-200', text: 'text-blue-700', bg: 'bg-blue-200', icon: 'text-blue-700', bar: 'from-blue-500 to-blue-600' },
      'niño': { from: 'from-green-50', to: 'to-green-100', border: 'border-green-200', text: 'text-green-700', bg: 'bg-green-200', icon: 'text-green-700', bar: 'from-green-500 to-green-600' },
      'niña': { from: 'from-purple-50', to: 'to-purple-100', border: 'border-purple-200', text: 'text-purple-700', bg: 'bg-purple-200', icon: 'text-purple-700', bar: 'from-purple-500 to-purple-600' },
      'accesorios': { from: 'from-orange-50', to: 'to-orange-100', border: 'border-orange-200', text: 'text-orange-700', bg: 'bg-orange-200', icon: 'text-orange-700', bar: 'from-orange-500 to-orange-600' },
      'otros': { from: 'from-gray-50', to: 'to-gray-100', border: 'border-gray-200', text: 'text-gray-700', bg: 'bg-gray-200', icon: 'text-gray-700', bar: 'from-gray-500 to-gray-600' }
    };

    // Ordenar departamentos según el orden especificado
    const sortedDepartments = departmentOrder
      .filter(dept => analysisData.por_departamento[dept])
      .map(dept => ({ name: dept, data: analysisData.por_departamento[dept] }));

    // Calcular el valor máximo para las barras de progreso
    const maxValue = Math.max(...sortedDepartments.map(d => d.data.valor_inventario || d.data.valor_precio || 0));

    return (
      <div className="space-y-6">
        {/* Header con resumen total */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl shadow-md p-6 border border-indigo-200">
          <h3 className="text-2xl font-bold text-indigo-900 mb-4">Inventario Completo por Departamento</h3>
          <p className="text-indigo-700 mb-6">Vista detallada de todo el inventario sectorizado por departamento</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/80 rounded-lg p-4 border border-indigo-200">
              <p className="text-sm text-gray-600 mb-1">Total Items</p>
              <p className="text-2xl font-bold text-indigo-900">
                {analysisData.resumen_general?.total_items || 0}
              </p>
            </div>
            {isInventoryReport && analysisData.resumen_general?.total_unidades && (
              <div className="bg-white/80 rounded-lg p-4 border border-indigo-200">
                <p className="text-sm text-gray-600 mb-1">Total Unidades</p>
                <p className="text-2xl font-bold text-indigo-900">
                  {analysisData.resumen_general.total_unidades.toLocaleString()}
                </p>
              </div>
            )}
            <div className="bg-white/80 rounded-lg p-4 border border-indigo-200">
              <p className="text-sm text-gray-600 mb-1">Valor Total Inventario</p>
              <p className="text-2xl font-bold text-indigo-900">
                {formatCurrency(
                  analysisData.resumen_general?.valor_total_inventario ||
                  analysisData.resumen_general?.valor_total_precio ||
                  0
                )}
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-4 border border-indigo-200">
              <p className="text-sm text-gray-600 mb-1">Departamentos Activos</p>
              <p className="text-2xl font-bold text-indigo-900">
                {sortedDepartments.length}
              </p>
            </div>
          </div>
        </div>

        {/* Secciones por Departamento */}
        {sortedDepartments.map((department, index) => {
          const colors = departmentColors[department.name] || departmentColors['otros'];
          const deptData = department.data;

          return (
            <div key={index} className={`bg-gradient-to-br ${colors.from} ${colors.to} rounded-xl shadow-lg p-6 border ${colors.border}`}>
              {/* Header del departamento */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 ${colors.bg} rounded-lg`}>
                    <Package className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <h4 className={`text-2xl font-bold ${colors.text} capitalize`}>{department.name}</h4>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">% del Inventario</p>
                  <p className={`text-2xl font-bold ${colors.text}`}>
                    {(deptData.porcentaje_unidades || deptData.porcentaje_inventario || deptData.porcentaje_valor || 0).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Grid de métricas */}
              <div className={`grid grid-cols-2 gap-4 mb-6 ${isInventoryReport ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
                <div className="bg-white/90 rounded-lg p-4 shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-gray-600" />
                    <p className="text-xs text-gray-600 font-medium">Cantidad Items</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{deptData.cantidad_items || deptData.cantidad || 0}</p>
                </div>

                {isInventoryReport && deptData.cantidad_unidades !== undefined && (
                  <div className="bg-white/90 rounded-lg p-4 shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-gray-600" />
                      <p className="text-xs text-gray-600 font-medium">Unidades</p>
                    </div>
                    <p className="text-xl font-bold text-blue-700">{deptData.cantidad_unidades.toLocaleString()}</p>
                  </div>
                )}

                <div className="bg-white/90 rounded-lg p-4 shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-gray-600" />
                    <p className="text-xs text-gray-600 font-medium">Valor {isInventoryReport ? 'Inventario' : 'Precio'}</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(deptData.valor_inventario || deptData.valor_precio || 0)}
                  </p>
                </div>

                <div className="bg-white/90 rounded-lg p-4 shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-gray-600" />
                    <p className="text-xs text-gray-600 font-medium">Valor Costo</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(deptData.costo_total || deptData.valor_costo || 0)}
                  </p>
                </div>

                {!isInventoryReport && deptData.margen_total !== undefined && (
                  <div className="bg-white/90 rounded-lg p-4 shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-gray-600" />
                      <p className="text-xs text-gray-600 font-medium">Margen</p>
                    </div>
                    <p className="text-lg font-bold text-green-700">{formatCurrency(deptData.margen_total)}</p>
                    <p className={`text-xs font-semibold ${
                      deptData.margen_porcentaje >= 20 ? 'text-green-600' :
                      deptData.margen_porcentaje >= 10 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {deptData.margen_porcentaje.toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>

              {/* Barra de progreso visual */}
              <div className="bg-white/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Participación en el Inventario</span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(deptData.valor_inventario || deptData.valor_precio || 0)}
                  </span>
                </div>
                <div className="h-4 bg-white rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full bg-gradient-to-r ${colors.bar} rounded-full transition-all flex items-center justify-end px-2`}
                    style={{ width: `${((deptData.valor_inventario || deptData.valor_precio || 0) / maxValue) * 100}%` }}
                  >
                    <span className="text-white text-xs font-semibold">
                      {(((deptData.valor_inventario || deptData.valor_precio || 0) / maxValue) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de productos - Solo para archivos de inventario con items */}
              {isInventoryReport && deptData.items && deptData.items.length > 0 && (
                <div className="mt-4 bg-white/50 rounded-lg p-4">
                  <h5 className="text-sm font-bold text-gray-800 mb-3">
                    Top Productos ({deptData.items.length})
                  </h5>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {deptData.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {item.nombre}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {item.categoria}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.estado && (
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                item.estado === 'Activo'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {item.estado}
                              </span>
                            )}
                            {item.cantidad !== undefined && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                {item.cantidad} uds
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-gray-600">
                            Costo: {formatCurrency(item.costo_unitario || item.costo || 0)}
                          </span>
                          <span className="font-semibold text-gray-900">
                            Total: {formatCurrency(item.valor_total || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Comparativa Final */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Comparativa de Departamentos</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left p-3 font-semibold text-gray-700">Departamento</th>
                  <th className="text-right p-3 font-semibold text-gray-700">Items</th>
                  {isInventoryReport && (
                    <th className="text-right p-3 font-semibold text-gray-700">Unidades</th>
                  )}
                  <th className="text-right p-3 font-semibold text-gray-700">Valor {isInventoryReport ? 'Inventario' : 'Precio'}</th>
                  <th className="text-right p-3 font-semibold text-gray-700">Valor Costo</th>
                  {!isInventoryReport && (
                    <>
                      <th className="text-right p-3 font-semibold text-gray-700">Margen $</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Margen %</th>
                    </>
                  )}
                  <th className="text-right p-3 font-semibold text-gray-700">% Inventario</th>
                </tr>
              </thead>
              <tbody>
                {sortedDepartments.map((department, index) => {
                  const deptData = department.data;
                  const colors = departmentColors[department.name] || departmentColors['otros'];

                  return (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className={`p-3 font-semibold capitalize ${colors.text}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${colors.bar}`}></div>
                          {department.name}
                        </div>
                      </td>
                      <td className="text-right p-3 text-gray-700 font-semibold">
                        {deptData.cantidad_items || deptData.cantidad || 0}
                      </td>
                      {isInventoryReport && (
                        <td className="text-right p-3 text-blue-700 font-semibold">
                          {deptData.cantidad_unidades?.toLocaleString() || 0}
                        </td>
                      )}
                      <td className="text-right p-3 text-gray-700">
                        {formatCurrency(deptData.valor_inventario || deptData.valor_precio || 0)}
                      </td>
                      <td className="text-right p-3 text-gray-700">
                        {formatCurrency(deptData.costo_total || deptData.valor_costo || 0)}
                      </td>
                      {!isInventoryReport && deptData.margen_total !== undefined && (
                        <>
                          <td className="text-right p-3 text-green-700 font-semibold">
                            {formatCurrency(deptData.margen_total)}
                          </td>
                          <td className="text-right p-3">
                            <span className={`px-2 py-1 rounded-full text-sm font-semibold ${
                              deptData.margen_porcentaje >= 20
                                ? 'bg-green-100 text-green-700'
                                : deptData.margen_porcentaje >= 10
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {deptData.margen_porcentaje.toFixed(2)}%
                            </span>
                          </td>
                        </>
                      )}
                      <td className="text-right p-3 text-gray-700 font-semibold">
                        {(deptData.porcentaje_unidades || deptData.porcentaje_inventario || deptData.porcentaje_valor || 0).toFixed(2)}%
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

  // Vista: Resumen General
  function renderResumenGeneral() {
    const isInventoryReport = analysisData.tipo_archivo === 'inventario_alegra';
    const isProductExport = analysisData.tipo_archivo === 'exportacion_productos';

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

              {/* Total Unidades - Solo para archivos de inventario */}
              {isInventoryReport && analysisData.resumen_general?.total_unidades !== undefined && (
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg shadow p-4 border border-cyan-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-cyan-700 font-medium">Total Unidades</p>
                      <p className="text-3xl font-bold text-cyan-900 mt-1">
                        {analysisData.resumen_general.total_unidades.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-cyan-200 rounded-lg">
                      <Package className="w-6 h-6 text-cyan-700" />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Valor Inventario</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">
                      {formatCurrency(
                        analysisData.resumen_general?.valor_total_inventario ||
                        analysisData.resumen_general?.valor_total_precio ||
                        0
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-700" />
                  </div>
                </div>
              </div>

              {/* Items Activos - Solo para archivos de inventario */}
              {isInventoryReport && analysisData.resumen_general?.items_activos !== undefined && (
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg shadow p-4 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-emerald-700 font-medium">Productos Activos</p>
                      <p className="text-3xl font-bold text-emerald-900 mt-1">
                        {analysisData.resumen_general.items_activos.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-200 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-emerald-700" />
                    </div>
                  </div>
                </div>
              )}

              {/* Items Inactivos - Solo para archivos de inventario */}
              {isInventoryReport && analysisData.resumen_general?.items_inactivos !== undefined && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700 font-medium">Productos Inactivos</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {analysisData.resumen_general.items_inactivos.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-200 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-gray-700" />
                    </div>
                  </div>
                </div>
              )}

              {/* Margen Total - Solo para archivos de exportación */}
              {isProductExport && analysisData.resumen_general?.margen_total !== undefined && (
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-700 font-medium">Margen Total</p>
                      <p className="text-2xl font-bold text-purple-900 mt-1">
                        {formatCurrency(analysisData.resumen_general.margen_total)}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-200 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-purple-700" />
                    </div>
                  </div>
                </div>
              )}

              {/* Margen % - Solo para archivos de exportación */}
              {isProductExport && analysisData.resumen_general?.margen_porcentaje !== undefined && (
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow p-4 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-700 font-medium">Margen %</p>
                      <p className="text-3xl font-bold text-orange-900 mt-1">
                        {analysisData.resumen_general.margen_porcentaje.toFixed(2)}%
                      </p>
                    </div>
                    <div className="p-3 bg-orange-200 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-orange-700" />
                    </div>
                  </div>
                </div>
              )}

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
                      {formatCurrency(
                        analysisData.resumen_general?.costo_total_inventario ||
                        analysisData.resumen_general?.valor_total_costo ||
                        0
                      )}
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

    const isInventoryReport = analysisData.tipo_archivo === 'inventario_alegra';

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
                  <th className="text-right p-3 font-semibold text-gray-700">Items</th>
                  {isInventoryReport && (
                    <th className="text-right p-3 font-semibold text-gray-700">Unidades</th>
                  )}
                  <th className="text-right p-3 font-semibold text-gray-700">Valor Costo</th>
                  <th className="text-right p-3 font-semibold text-gray-700">Valor {isInventoryReport ? 'Inventario' : 'Precio'}</th>
                  {!isInventoryReport && (
                    <>
                      <th className="text-right p-3 font-semibold text-gray-700">Margen $</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Margen %</th>
                    </>
                  )}
                  <th className="text-right p-3 font-semibold text-gray-700">% Inventario</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analysisData.por_departamento).map(([dept, data]) => (
                  <tr key={dept} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-semibold text-gray-900 capitalize">{dept}</td>
                    <td className="text-right p-3 text-gray-700">
                      {data.cantidad_items || data.cantidad || 0}
                    </td>
                    {isInventoryReport && (
                      <td className="text-right p-3 text-blue-700 font-semibold">
                        {data.cantidad_unidades?.toLocaleString() || 0}
                      </td>
                    )}
                    <td className="text-right p-3 text-gray-700">
                      {formatCurrency(data.costo_total || data.valor_costo || 0)}
                    </td>
                    <td className="text-right p-3 text-gray-700">
                      {formatCurrency(data.valor_inventario || data.valor_precio || 0)}
                    </td>
                    {!isInventoryReport && data.margen_total !== undefined && (
                      <>
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
                      </>
                    )}
                    <td className="text-right p-3 text-gray-700">
                      {(data.porcentaje_unidades || data.porcentaje_inventario || data.porcentaje_valor || 0).toFixed(2)}%
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

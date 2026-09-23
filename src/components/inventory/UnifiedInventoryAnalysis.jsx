import React, { useState, useRef } from 'react';
import {
  Package, Calendar, Loader2, AlertCircle, CheckCircle, Database,
  LayoutDashboard, Grid, AlertTriangle, PieChart, TrendingUp, Ruler, Upload, FileText
} from 'lucide-react';
import { getInventoryValueReport } from '../../services/directApiService';
import { uploadFile } from '../../services/inventoryService';
import { getColombiaTodayString } from '../../utils/dateUtils';
import useDocumentTitle from '../../hooks/useDocumentTitle';

// Importar componentes de análisis existentes
import InventoryDashboard from './InventoryDashboard';
import DepartmentAnalysis from './DepartmentAnalysis';
import StockAlerts from './StockAlerts';
import ABCAnalysis from './ABCAnalysis';
import TopProducts from './TopProducts';
import CategorySizeAnalysis from './CategorySizeAnalysis';

const UnifiedInventoryAnalysis = () => {
  useDocumentTitle('Análisis de Inventario');

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(getColombiaTodayString());
  const [dataSource, setDataSource] = useState(null); // 'api' o 'file'
  const [fileName, setFileName] = useState(null);
  const fileInputRef = useRef(null);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  // Función para procesar datos de la API y convertirlos al formato esperado por los análisis
  const processApiData = (rawData) => {
    // Los datos vienen en el formato de Alegra: { id, name, reference, quantity, unit_price, total_value, ... }
    // Necesitamos transformarlos al formato que esperan los componentes de análisis

    const processedItems = rawData.map(item => ({
      item: item.name || 'Sin nombre',
      categoria: item.category?.name || 'Sin categoría',
      departamento: item.category?.name || 'General',
      cantidad: item.quantity || 0,
      costo: item.unit_price || 0,
      total: item.total_value || 0,
      referencia: item.reference || '',
      id: item.id
    }));

    // Calcular resumen
    const totalItems = processedItems.length;
    const totalQuantity = processedItems.reduce((sum, item) => sum + item.cantidad, 0);
    const totalValue = processedItems.reduce((sum, item) => sum + item.total, 0);

    // Por departamentos
    const byDepartment = processedItems.reduce((acc, item) => {
      const dept = item.departamento;
      if (!acc[dept]) {
        acc[dept] = { items: [], totalValue: 0, totalQuantity: 0 };
      }
      acc[dept].items.push(item);
      acc[dept].totalValue += item.total;
      acc[dept].totalQuantity += item.cantidad;
      return acc;
    }, {});

    // Por categorías
    const byCategory = processedItems.reduce((acc, item) => {
      const cat = item.categoria;
      if (!acc[cat]) {
        acc[cat] = { items: [], totalValue: 0, totalQuantity: 0 };
      }
      acc[cat].items.push(item);
      acc[cat].totalValue += item.total;
      acc[cat].totalQuantity += item.cantidad;
      return acc;
    }, {});

    // Stock alerts
    const outOfStock = processedItems.filter(item => item.cantidad === 0);
    const lowStock = processedItems.filter(item => item.cantidad > 0 && item.cantidad <= 5);

    // Top productos por valor
    const topProducts = [...processedItems]
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    // Análisis ABC (Pareto)
    const sortedByValue = [...processedItems].sort((a, b) => b.total - a.total);
    let cumulativeValue = 0;
    const abcAnalysis = sortedByValue.map(item => {
      cumulativeValue += item.total;
      const cumulativePercentage = (cumulativeValue / totalValue) * 100;
      let classification = 'C';
      if (cumulativePercentage <= 80) classification = 'A';
      else if (cumulativePercentage <= 95) classification = 'B';

      return {
        ...item,
        classification,
        cumulativePercentage
      };
    });

    const classA = abcAnalysis.filter(item => item.classification === 'A');
    const classB = abcAnalysis.filter(item => item.classification === 'B');
    const classC = abcAnalysis.filter(item => item.classification === 'C');

    return {
      success: true,
      items_completos: processedItems,
      resumen: {
        total_items: totalItems,
        total_quantity: totalQuantity,
        total_value: totalValue,
        average_cost: totalValue / totalQuantity || 0
      },
      by_department: byDepartment,
      by_category: byCategory,
      stock_alerts: {
        out_of_stock: outOfStock,
        low_stock: lowStock
      },
      top_products: topProducts,
      abc_analysis: {
        class_a: classA,
        class_b: classB,
        class_c: classC,
        summary: {
          a_count: classA.length,
          a_percentage: (classA.length / totalItems) * 100,
          a_value: classA.reduce((sum, item) => sum + item.total, 0),
          b_count: classB.length,
          b_percentage: (classB.length / totalItems) * 100,
          b_value: classB.reduce((sum, item) => sum + item.total, 0),
          c_count: classC.length,
          c_percentage: (classC.length / totalItems) * 100,
          c_value: classC.reduce((sum, item) => sum + item.total, 0)
        }
      }
    };
  };

  const handleFetchFromAPI = async () => {
    setLoading(true);
    setError(null);
    setLoadingMessage('Consultando inventario desde Alegra... Esto puede tomar entre 1 y 3 minutos.');
    setDataSource(null);
    setFileName(null);

    try {
      const params = {
        toDate: selectedDate,
        limit: 3000, // Traer todo el inventario
        page: 1
      };

      const response = await getInventoryValueReport(params);

      if (response.success) {
        if (!response.data || response.data.length === 0) {
          setError('No se encontraron productos en el inventario para esta fecha. Los items pueden haber sido filtrados por estar deshabilitados o tener nombres con asteriscos (*).');
          setInventoryData(null);
          setMetadata(null);
          return;
        }

        // Procesar datos de la API
        const processed = processApiData(response.data);
        setInventoryData(processed);
        setMetadata(response.metadata);
        setDataSource('api');
        setActiveView('dashboard'); // Ir directamente al dashboard
      } else {
        throw new Error(response.error || 'Error al obtener inventario');
      }
    } catch (err) {
      setError(err.message || 'Error al obtener inventario desde Alegra. Verifique que el servidor esté funcionando y que tenga conexión a internet.');
      setInventoryData(null);
      setMetadata(null);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleFileUpload = async (event) => {
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
    setLoadingMessage('Procesando archivo de inventario...');
    setDataSource(null);
    setFileName(file.name);

    try {
      const result = await uploadFile(file);
      if (result.success) {
        setInventoryData(result);
        setMetadata(null);
        setDataSource('file');
        setActiveView('dashboard');
      } else {
        setError('Error al procesar el archivo');
        setInventoryData(null);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar el archivo');
      setInventoryData(null);
    } finally {
      setLoading(false);
      setLoadingMessage('');
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const analysisViews = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Resumen ejecutivo' },
    { id: 'departamentos', label: 'Departamentos', icon: Grid, description: 'Por departamento' },
    { id: 'alertas', label: 'Alertas de Stock', icon: AlertTriangle, description: 'Stock bajo y sin stock' },
    { id: 'abc', label: 'Análisis ABC', icon: PieChart, description: 'Clasificación Pareto' },
    { id: 'top-productos', label: 'Top Productos', icon: TrendingUp, description: 'Mayor valor' },
    { id: 'categorias-tallas', label: 'Categorías y Tallas', icon: Ruler, description: 'Análisis detallado' }
  ];

  const renderAnalysisView = () => {
    if (!inventoryData) return null;

    // Los componentes esperan recibir la data a través de props o context
    // Por ahora, vamos a pasar los datos procesados directamente

    switch (activeView) {
      case 'dashboard':
        return <InventoryDashboard data={inventoryData} />;
      case 'departamentos':
        return <DepartmentAnalysis data={inventoryData} />;
      case 'alertas':
        return <StockAlerts data={inventoryData} />;
      case 'abc':
        return <ABCAnalysis data={inventoryData} />;
      case 'top-productos':
        return <TopProducts data={inventoryData} />;
      case 'categorias-tallas':
        return <CategorySizeAnalysis data={inventoryData} />;
      default:
        return <InventoryDashboard data={inventoryData} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="bg-teal-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Package className="w-10 h-10" />
          <div>
            <h1 className="text-3xl font-bold">Análisis de Inventario</h1>
            <p className="text-teal-50 mt-1">
              Consulta directa desde Alegra o carga manual de archivos
            </p>
          </div>
        </div>
      </div>

      {/* Sección de Consulta */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Obtener Inventario</h2>
        <p className="text-gray-600 mb-6">
          Seleccione una opción para analizar el inventario
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Opción 1: Consulta desde API */}
          <div className="border-2 border-teal-200 rounded-xl p-6 bg-teal-50">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-teal-600" />
              <h3 className="text-lg font-bold text-gray-900">Consulta Directa desde Alegra</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Obtiene el inventario actual directamente desde Alegra API.
              <span className="font-semibold text-teal-700"> Puede tardar entre 1 y 3 minutos.</span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha del Inventario
              </label>
              <input aria-label="Fecha del Inventario"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Selecciona la fecha hasta la cual deseas consultar el inventario
              </p>
            </div>

            <button
              onClick={handleFetchFromAPI}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Database className="w-5 h-5" />
              Consultar Inventario
            </button>
          </div>

          {/* Opción 2: Carga de Archivo */}
          <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">Cargar Archivo Manual</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Sube un archivo CSV o Excel exportado desde Alegra para análisis offline.
            </p>

            {fileName && (
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 bg-white p-3 rounded-lg border border-blue-200">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Archivo: <strong>{fileName}</strong></span>
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Upload className="w-5 h-5" />
              Cargar Archivo
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            <div className="text-center">
              <p className="font-bold text-xl text-blue-900 mb-2">Procesando…</p>
              <p className="text-blue-700 mb-4">{loadingMessage}</p>
              {dataSource === null && selectedDate && (
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⏱️ Por favor espere. El proceso puede tardar entre 1 y 3 minutos mientras se consulta todo el inventario.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3 text-red-800">
            <AlertCircle className="w-6 h-6 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-lg">Error al obtener inventario</h3>
              <p className="text-sm mt-1">{error}</p>
              {metadata && metadata.total_filtered > 0 && (
                <div className="mt-3 text-sm">
                  <p className="font-semibold">Información del filtrado:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Items recibidos de Alegra: {metadata.total_received}</li>
                    {metadata.total_filtered_asterisk > 0 && (
                      <li>Items filtrados (asteriscos): {metadata.total_filtered_asterisk}</li>
                    )}
                    {metadata.total_filtered_disabled > 0 && (
                      <li>Items filtrados (deshabilitados): {metadata.total_filtered_disabled}</li>
                    )}
                    <li>Total filtrados: {metadata.total_filtered}</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success State con datos */}
      {inventoryData && !loading && !error && (
        <div className="space-y-6">
          {/* Success Badge */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-bold text-green-900">Análisis completado exitosamente</p>
                <p className="text-sm text-green-700">
                  {dataSource === 'api'
                    ? `Inventario obtenido desde Alegra (Fecha: ${selectedDate})`
                    : `Archivo cargado: ${fileName}`
                  }
                </p>
              </div>
            </div>

            {/* Metadata del filtrado (solo para API) */}
            {metadata && dataSource === 'api' && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <p className="text-sm text-green-800 font-semibold mb-2">Información del procesamiento:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-2 border border-green-200">
                    <p className="text-gray-600">Recibidos</p>
                    <p className="font-bold text-green-900">{metadata.total_received}</p>
                  </div>
                  {metadata.total_filtered_asterisk > 0 && (
                    <div className="bg-white rounded-lg p-2 border border-yellow-200">
                      <p className="text-gray-600">Asteriscos</p>
                      <p className="font-bold text-yellow-900">{metadata.total_filtered_asterisk}</p>
                    </div>
                  )}
                  {metadata.total_filtered_disabled > 0 && (
                    <div className="bg-white rounded-lg p-2 border border-orange-200">
                      <p className="text-gray-600">Deshabilitados</p>
                      <p className="font-bold text-orange-900">{metadata.total_filtered_disabled}</p>
                    </div>
                  )}
                  <div className="bg-white rounded-lg p-2 border border-green-200">
                    <p className="text-gray-600">Válidos</p>
                    <p className="font-bold text-green-900">{metadata.total_returned}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resumen Rápido */}
          {inventoryData.resumen && (
            <div className="bg-purple-50 rounded-xl shadow-md p-6 border border-purple-200">
              <h3 className="text-xl font-bold text-purple-900 mb-4">Resumen del Inventario</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Total Items</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {inventoryData.resumen.total_items?.toLocaleString('es-CO') || 0}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Cantidad Total</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {inventoryData.resumen.total_quantity?.toLocaleString('es-CO') || 0}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(inventoryData.resumen.total_value || 0)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-orange-200">
                  <p className="text-sm text-gray-600 mb-1">Costo Promedio</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {formatCurrency(inventoryData.resumen.average_cost || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navegación de Vistas de Análisis */}
          <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Seleccionar Vista de Análisis</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {analysisViews.map((view) => {
                const Icon = view.icon;
                const isActive = activeView === view.id;

                return (
                  <button
                    key={view.id}
                    onClick={() => setActiveView(view.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg transition border-2 ${
                      isActive
                        ? 'bg-teal-600 text-white border-teal-600 shadow-lg transform scale-105'
                        : 'bg-gray-50 text-gray-700 hover:bg-teal-50 hover:text-teal-700 border-gray-200'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                    <div className="text-center">
                      <div className={`text-sm font-bold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                        {view.label}
                      </div>
                      <div className={`text-xs ${isActive ? 'text-teal-100' : 'text-gray-500'}`}>
                        {view.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenido del Análisis */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            {renderAnalysisView()}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedInventoryAnalysis;

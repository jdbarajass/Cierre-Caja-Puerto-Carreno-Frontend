import React, { useState } from 'react';
import { Package, ShoppingCart, DollarSign, TrendingUp, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { getSummary, getOutOfStock, getLowStock } from '../../services/inventoryService';

const InventoryDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [outOfStock, setOutOfStock] = useState(null);
  const [lowStock, setLowStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, outOfStockData, lowStockData] = await Promise.all([
        getSummary(),
        getOutOfStock(),
        getLowStock(5)
      ]);

      setSummary(summaryData.summary);
      setOutOfStock(outOfStockData);
      setLowStock(lowStockData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // NO hacer la petición automáticamente
  // useEffect(() => {
  //   fetchData();
  // }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getMarginColor = (margin) => {
    if (margin >= 20) return 'text-green-600 bg-green-100';
    if (margin >= 10) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Estado inicial: sin datos
  if (!summary && !loading && !error) {
    return (
      <div className="bg-gradient-to-br from-teal-50 to-blue-50 border-2 border-teal-200 rounded-xl p-12">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-100 rounded-full mb-6">
            <Package className="w-10 h-10 text-teal-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Análisis de Inventario desde Alegra</h3>
          <p className="text-gray-600 mb-8">
            Consulta el inventario actual desde Alegra para ver métricas detalladas, alertas de stock y análisis completo.
          </p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-3 px-8 py-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl text-lg font-semibold"
          >
            <Database className="w-6 h-6" />
            Consultar Inventario desde Alegra
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Consultando inventario desde Alegra...</p>
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
            <h3 className="font-semibold">Error al cargar inventario</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Resumen Ejecutivo</h2>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Alertas */}
      {(outOfStock?.total > 0 || lowStock?.total > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outOfStock?.total > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-red-600 font-medium">Sin Stock</p>
                  <p className="text-2xl font-bold text-red-700">{outOfStock.total} productos</p>
                </div>
              </div>
            </div>
          )}

          {lowStock?.total > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Bajo Stock</p>
                  <p className="text-2xl font-bold text-yellow-700">{lowStock.total} productos</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Items */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.total_items}</p>
              <p className="text-xs text-gray-500 mt-1">Con stock: {summary.total_items_con_stock}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Unidades */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Unidades</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.total_unidades}</p>
              <p className="text-xs text-gray-500 mt-1">En inventario</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <ShoppingCart className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Valor Total */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Valor Inventario</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(summary.valor_total_inventario)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Costo total</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Margen Esperado */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Margen Esperado</p>
              <p className={`text-3xl font-bold mt-2 ${getMarginColor(summary.porcentaje_margen).split(' ')[0]}`}>
                {summary.porcentaje_margen.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(summary.margen_esperado)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${getMarginColor(summary.porcentaje_margen).split(' ')[1]}`}>
              <TrendingUp className={`w-8 h-8 ${getMarginColor(summary.porcentaje_margen).split(' ')[0]}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Comparación Valor Inventario vs Valor Potencial Venta */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Valor de Inventario vs Potencial de Venta</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Valor Inventario (Costo)</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.valor_total_inventario)}
            </p>
            <div className="mt-2 h-2 bg-blue-200 rounded-full">
              <div className="h-2 bg-blue-600 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Valor Potencial Venta</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.valor_potencial_venta)}
            </p>
            <div className="mt-2 h-2 bg-green-200 rounded-full">
              <div
                className="h-2 bg-green-600 rounded-full"
                style={{
                  width: `${(summary.valor_potencial_venta / summary.valor_total_inventario) * 100}%`
                }}
              ></div>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Ganancia Esperada</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(summary.margen_esperado)}
            </p>
            <div className="mt-2 h-2 bg-purple-200 rounded-full">
              <div
                className="h-2 bg-purple-600 rounded-full"
                style={{
                  width: `${summary.porcentaje_margen}%`
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Promedios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md p-6 border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Costo Promedio por Unidad</h4>
          <p className="text-3xl font-bold text-blue-700">
            {formatCurrency(summary.costo_promedio_por_unidad)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md p-6 border border-green-200">
          <h4 className="text-sm font-semibold text-green-900 mb-2">Precio Promedio de Venta</h4>
          <p className="text-3xl font-bold text-green-700">
            {formatCurrency(summary.precio_promedio_venta)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;

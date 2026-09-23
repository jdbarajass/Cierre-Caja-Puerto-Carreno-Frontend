import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, RefreshCw, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { getOutOfStock, getLowStock } from '../../services/inventoryService';

const StockAlerts = () => {
  const [outOfStock, setOutOfStock] = useState(null);
  const [lowStock, setLowStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [threshold, setThreshold] = useState(5);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showOutOfStock, setShowOutOfStock] = useState(true);
  const [showLowStock, setShowLowStock] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [outOfStockData, lowStockData] = await Promise.all([
        getOutOfStock(),
        getLowStock(threshold)
      ]);

      setOutOfStock(outOfStockData);
      setLowStock(lowStockData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [threshold]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const filterProducts = (products) => {
    if (!products) return [];

    return products.filter(product => {
      const matchDepartment = !filterDepartment || product.departamento === filterDepartment;
      const matchCategory = !filterCategory || product.categoria === filterCategory;
      return matchDepartment && matchCategory;
    });
  };

  const getDepartments = () => {
    const departments = new Set();
    if (outOfStock?.products) {
      outOfStock.products.forEach(p => departments.add(p.departamento));
    }
    if (lowStock?.products) {
      lowStock.products.forEach(p => departments.add(p.departamento));
    }
    return Array.from(departments).sort();
  };

  const getCategories = () => {
    const categories = new Set();
    if (outOfStock?.products) {
      outOfStock.products.forEach(p => categories.add(p.categoria));
    }
    if (lowStock?.products) {
      lowStock.products.forEach(p => categories.add(p.categoria));
    }
    return Array.from(categories).sort();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Cargando alertas de stock…</p>
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
            <h3 className="font-semibold">Error al cargar alertas</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  const filteredOutOfStock = filterProducts(outOfStock?.products || []);
  const filteredLowStock = filterProducts(lowStock?.products || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alertas de Stock</h2>
          <p className="text-sm text-gray-600 mt-1">Productos sin stock y con inventario bajo</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Resumen de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-600 font-medium">Sin Stock</p>
              <p className="text-4xl font-bold text-red-700">{outOfStock?.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-600 font-medium">Bajo Stock</p>
              <p className="text-4xl font-bold text-yellow-700">{lowStock?.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <div>
            <p className="text-sm text-blue-600 font-medium mb-2">Umbral de Stock Bajo</p>
            <input
              aria-label="Umbral de stock bajo"
              type="number"
              min="1"
              max="20"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 5)}
              className="w-full px-4 py-2 text-2xl font-bold text-blue-700 bg-white border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-600 mt-2">Productos con menos de {threshold} unidades</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Departamento</label>
            <select aria-label="Departamento"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {getDepartments().map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <select aria-label="Categoría"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {getCategories().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterDepartment('');
                setFilterCategory('');
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Productos Sin Stock */}
      <div className="bg-white rounded-xl shadow-md border border-red-200">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-red-50 transition-colors"
          onClick={() => setShowOutOfStock(!showOutOfStock)}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-bold text-gray-900">
              Productos Sin Stock ({filteredOutOfStock.length})
            </h3>
          </div>
          {showOutOfStock ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
        </div>

        {showOutOfStock && (
          <div className="border-t border-red-200 overflow-x-auto">
            {filteredOutOfStock.length > 0 ? (
              <table className="w-full">
                <thead className="bg-red-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Producto</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Departamento</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Precio Venta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOutOfStock.map((product) => (
                    <tr key={product.id} className="hover:bg-red-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">{product.id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{product.categoria}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {product.departamento}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900">
                        {formatCurrency(product.precio_venta)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No hay productos sin stock con los filtros seleccionados
              </div>
            )}
          </div>
        )}
      </div>

      {/* Productos con Bajo Stock */}
      <div className="bg-white rounded-xl shadow-md border border-yellow-200">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-yellow-50 transition-colors"
          onClick={() => setShowLowStock(!showLowStock)}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <h3 className="text-lg font-bold text-gray-900">
              Productos con Bajo Stock ({filteredLowStock.length})
            </h3>
          </div>
          {showLowStock ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
        </div>

        {showLowStock && (
          <div className="border-t border-yellow-200 overflow-x-auto">
            {filteredLowStock.length > 0 ? (
              <table className="w-full">
                <thead className="bg-yellow-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Producto</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Departamento</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Stock</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Precio Venta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLowStock.map((product) => (
                    <tr key={product.id} className="hover:bg-yellow-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">{product.id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{product.categoria}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {product.departamento}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex px-3 py-1 text-sm font-bold rounded-full bg-yellow-100 text-yellow-800">
                          {product.cantidad_disponible}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900">
                        {formatCurrency(product.precio_venta)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No hay productos con bajo stock con los filtros seleccionados
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockAlerts;

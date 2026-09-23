import React, { useState, useEffect } from 'react';
import { Grid, Ruler, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getByCategory, getBySize } from '../../services/inventoryService';

const CategorySizeAnalysis = () => {
  const [categories, setCategories] = useState(null);
  const [sizes, setSizes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCategories, setShowCategories] = useState(true);
  const [showSizes, setShowSizes] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [categoriesData, sizesData] = await Promise.all([
        getByCategory(),
        getBySize()
      ]);

      setCategories(categoriesData.categories);
      setSizes(sizesData.sizes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getTotalValue = (data) => {
    if (!data) return 0;
    return data.reduce((sum, item) => sum + (item.valor_inventario || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Cargando análisis de categorías y tallas…</p>
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
            <h3 className="font-semibold">Error al cargar análisis</h3>
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

  const totalCategoryValue = getTotalValue(categories);
  const totalSizeValue = getTotalValue(sizes);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Categorías y Tallas</h2>
          <p className="text-sm text-gray-600 mt-1">Análisis detallado por categoría y talla</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Análisis por Categoría */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div
          className="flex items-center justify-between p-6 bg-blue-50 border-b border-gray-200 cursor-pointer hover:bg-blue-200 transition-colors"
          onClick={() => setShowCategories(!showCategories)}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Grid className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Análisis por Categoría</h3>
              <p className="text-sm text-gray-600">
                {categories?.length || 0} categorías - Valor total: {formatCurrency(totalCategoryValue)}
              </p>
            </div>
          </div>
          {showCategories ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
        </div>

        {showCategories && categories && (
          <div className="p-6">
            {/* Gráfico de barras visual */}
            <div className="mb-6 space-y-3">
              {categories
                .sort((a, b) => b.valor_inventario - a.valor_inventario)
                .slice(0, 10)
                .map((category, index) => {
                  const percentage = totalCategoryValue > 0 ? (category.valor_inventario / totalCategoryValue) * 100 : 0;

                  return (
                    <div key={category.categoria}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-gray-900">{category.categoria}</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {percentage.toFixed(1)}% - {formatCurrency(category.valor_inventario)}
                        </span>
                      </div>
                      <div className="w-full h-8 bg-gray-200 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-gray-900 flex items-center justify-between px-3 transition-[width]"
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        >
                          <span className="text-white text-xs font-semibold">
                            {category.total_items} items
                          </span>
                          <span className="text-white text-xs font-semibold">
                            {category.total_unidades} uds
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Tabla detallada */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-y border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Items</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Unidades</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor Inventario</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">% del Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categories
                    .sort((a, b) => b.valor_inventario - a.valor_inventario)
                    .map((category, index) => {
                      const percentage = totalCategoryValue > 0 ? (category.valor_inventario / totalCategoryValue) * 100 : 0;

                      return (
                        <tr key={category.categoria} className="hover:bg-blue-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{category.categoria}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">{category.total_items}</td>
                          <td className="px-4 py-3 text-sm text-center font-semibold text-blue-600">
                            {category.total_unidades}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                            {formatCurrency(category.valor_inventario)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                              {percentage.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Análisis por Talla */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div
          className="flex items-center justify-between p-6 bg-purple-50 border-b border-gray-200 cursor-pointer hover:bg-purple-200 transition-colors"
          onClick={() => setShowSizes(!showSizes)}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Ruler className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Análisis por Talla</h3>
              <p className="text-sm text-gray-600">
                {sizes?.length || 0} tallas - Valor total: {formatCurrency(totalSizeValue)}
              </p>
            </div>
          </div>
          {showSizes ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
        </div>

        {showSizes && sizes && (
          <div className="p-6">
            {/* Gráfico de barras visual */}
            <div className="mb-6 space-y-3">
              {sizes
                .sort((a, b) => b.total_unidades - a.total_unidades)
                .slice(0, 15)
                .map((size, index) => {
                  const maxUnits = Math.max(...sizes.map(s => s.total_unidades));
                  const percentage = maxUnits > 0 ? (size.total_unidades / maxUnits) * 100 : 0;

                  return (
                    <div key={size.talla}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-16 h-8 rounded-lg bg-purple-100 text-purple-700 text-sm font-bold border-2 border-purple-300">
                            {size.talla}
                          </span>
                          <span className="text-sm text-gray-600">{size.cantidad_items} items diferentes</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {size.total_unidades} unidades
                        </span>
                      </div>
                      <div className="w-full h-6 bg-gray-200 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-gray-900 flex items-center justify-end px-3 transition-[width]"
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        >
                          <span className="text-white text-xs font-semibold">
                            {formatCurrency(size.valor_inventario)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Tabla detallada */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-y border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Talla</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Items Diferentes</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total Unidades</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor Inventario</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">% del Total (Valor)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sizes
                    .sort((a, b) => b.valor_inventario - a.valor_inventario)
                    .map((size) => {
                      const percentage = totalSizeValue > 0 ? (size.valor_inventario / totalSizeValue) * 100 : 0;

                      return (
                        <tr key={size.talla} className="hover:bg-purple-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center justify-center min-w-[60px] px-3 py-1 rounded-lg bg-purple-100 text-purple-800 text-sm font-bold border border-purple-300">
                              {size.talla}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">{size.cantidad_items}</td>
                          <td className="px-4 py-3 text-sm text-center font-bold text-purple-600">
                            {size.total_unidades}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                            {formatCurrency(size.valor_inventario)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800">
                              {percentage.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Estadísticas Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-xl shadow-md p-6 border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-4">Resumen de Categorías</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Total Categorías:</span>
              <span className="text-lg font-bold text-blue-700">{categories?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Valor Total:</span>
              <span className="text-lg font-bold text-blue-700">{formatCurrency(totalCategoryValue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Promedio por Categoría:</span>
              <span className="text-lg font-bold text-blue-700">
                {formatCurrency(categories?.length ? totalCategoryValue / categories.length : 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl shadow-md p-6 border border-purple-200">
          <h4 className="text-sm font-semibold text-purple-900 mb-4">Resumen de Tallas</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Total Tallas:</span>
              <span className="text-lg font-bold text-purple-700">{sizes?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Valor Total:</span>
              <span className="text-lg font-bold text-purple-700">{formatCurrency(totalSizeValue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Promedio por Talla:</span>
              <span className="text-lg font-bold text-purple-700">
                {formatCurrency(sizes?.length ? totalSizeValue / sizes.length : 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategorySizeAnalysis;

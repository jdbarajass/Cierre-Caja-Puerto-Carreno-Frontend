import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, AlertCircle, Award, DollarSign } from 'lucide-react';
import { getTopByValue } from '../../services/inventoryService';
import RankBadge from '../common/RankBadge';

const TopProducts = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(20);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTopByValue(limit);
      setData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [limit]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    if (rank === 2) return { color: 'bg-gray-100 text-gray-800 border-gray-300' };
    if (rank === 3) return { color: 'bg-orange-100 text-orange-800 border-orange-300' };
    return { color: 'bg-blue-100 text-blue-800 border-blue-300' };
  };

  const calculateMargin = (costo, precio) => {
    if (!precio || precio === 0) return 0;
    return (((precio - costo) / precio) * 100).toFixed(1);
  };

  const getTotalValue = () => {
    if (!data?.products) return 0;
    return data.products.reduce((sum, p) => sum + p.valor_inventario, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Cargando top productos…</p>
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
            <h3 className="font-semibold">Error al cargar top productos</h3>
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

  if (!data?.products || data.products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No hay datos de productos disponibles
      </div>
    );
  }

  const totalValue = getTotalValue();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Top Productos por Valor</h2>
          <p className="text-sm text-gray-600 mt-1">Productos con mayor valor en inventario</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Controles y Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Selector de Límite */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Cantidad de Productos
          </label>
          <div className="flex gap-2">
            {[10, 20, 50].map((value) => (
              <button
                key={value}
                onClick={() => setLimit(value)}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                  limit === value
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Top {value}
              </button>
            ))}
          </div>
        </div>

        {/* Total de Productos */}
        <div className="bg-blue-50 rounded-xl shadow-md p-6 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-200 rounded-lg">
              <Award className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Productos Mostrados</p>
              <p className="text-3xl font-bold text-blue-900">{data.products.length}</p>
            </div>
          </div>
        </div>

        {/* Valor Total */}
        <div className="bg-green-50 rounded-xl shadow-md p-6 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-200 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">Valor Total (Top {limit})</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(totalValue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Destacados */}
      {data.products.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.products.slice(0, 3).map((product, index) => {
            const rank = index + 1;
            const badge = getRankBadge(rank);
            const margin = calculateMargin(product.costo_unitario, product.precio_venta);

            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl shadow-lg border-2 ${badge.color.split(' ').pop().replace('text-', 'border-')} overflow-hidden transform hover:scale-105 transition-transform`}
              >
                <div className={`${badge.color} p-4 text-center border-b-2`}>
                  <RankBadge rank={rank} size="lg" className="mb-2" />
                  <p className="font-bold text-lg">Posición {rank}</p>
                </div>
                <div className="p-6 space-y-3">
                  <h4 className="font-bold text-gray-900 text-sm line-clamp-2 min-h-[40px]">
                    {product.nombre}
                  </h4>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Categoría:</span>
                    <span className="font-semibold text-gray-900">{product.categoria}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Cantidad:</span>
                    <span className="font-bold text-blue-600">{product.cantidad} uds</span>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-600 mb-1">Valor en Inventario</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(product.valor_inventario)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabla Completa */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-purple-50">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-bold text-gray-900">Ranking Completo</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-20">Rank</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Producto</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Depto</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Cantidad</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Costo Unit.</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Precio Venta</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor Inv.</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor Venta</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Margen</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">% Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.products.map((product, index) => {
                const rank = index + 1;
                const badge = getRankBadge(rank);
                const margin = calculateMargin(product.costo_unitario, product.precio_venta);
                const percentageOfTotal = ((product.valor_inventario / totalValue) * 100).toFixed(1);

                return (
                  <tr key={product.id} className="hover:bg-purple-50 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-2 ${badge.color} font-bold text-sm`}>
                        {rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">
                      {product.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.categoria}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {product.departamento}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex px-3 py-1 text-sm font-bold rounded-full bg-gray-100 text-gray-800">
                        {product.cantidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {formatCurrency(product.costo_unitario)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900">
                      {formatCurrency(product.precio_venta)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-right text-purple-700">
                      {formatCurrency(product.valor_inventario)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-right text-green-700">
                      {formatCurrency(product.valor_potencial_venta)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${
                        margin >= 20 ? 'bg-green-100 text-green-800' :
                        margin >= 10 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {margin}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500"
                            style={{ width: `${percentageOfTotal}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-gray-600">
                          {percentageOfTotal}%
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
};

export default TopProducts;

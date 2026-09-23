import React, { useState, useEffect } from 'react';
import { Package, Search, Calendar, Loader2, AlertCircle, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { getInventoryValueReport } from '../../services/directApiService';
import { getColombiaTodayString } from '../../utils/dateUtils';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const DirectInventory = () => {
  useDocumentTitle('Inventario Detallado - Estadísticas Avanzadas');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [metadata, setMetadata] = useState(null);

  // Filtros
  const [toDate, setToDate] = useState(getColombiaTodayString());
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        toDate,
        limit,
        page: currentPage,
      };

      if (searchQuery.trim()) {
        params.query = searchQuery.trim();
      }

      const response = await getInventoryValueReport(params);

      if (response.success) {
        setInventory(response.data || []);
        setMetadata(response.metadata || null);
      } else {
        throw new Error(response.error || 'Error al obtener inventario');
      }
    } catch (err) {
      setError(err.message);
      setInventory([]);
      setMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  // Cargar inventario al montar y cuando cambien los filtros
  useEffect(() => {
    fetchInventory();
  }, [toDate, limit, currentPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Resetear a página 1 al buscar
    fetchInventory();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
    fetchInventory();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  const totalValue = inventory.reduce((sum, item) => sum + (item.total_value || 0), 0);
  const totalQuantity = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-green-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Package className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Inventario Detallado</h2>
        </div>
        <p className="text-green-50">
          Consulta rápida y completa del inventario directo desde Alegra
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Selector de Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Fecha
            </label>
            <input aria-label="Fecha"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Límite de items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Items por página
            </label>
            <select aria-label="Items por página"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value={50}>50 items</option>
              <option value={100}>100 items</option>
              <option value={200}>200 items</option>
              <option value={500}>500 items</option>
              <option value={1000}>1000 items (máximo)</option>
            </select>
          </div>

          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Buscar producto
            </label>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input aria-label="Buscar producto"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nombre del producto…"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button aria-label="Buscar"
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Limpiar
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Resumen */}
        {!loading && inventory.length > 0 && (
          <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Total Items Mostrados</p>
                <p className="text-2xl font-bold text-green-600">{inventory.length}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Cantidad Total</p>
                <p className="text-2xl font-bold text-blue-600">{totalQuantity}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalValue)}</p>
              </div>
            </div>

            {/* Estadísticas de Filtrado (si hay items filtrados) */}
            {metadata && (metadata.total_filtered > 0 || metadata.total_received) && (
              <div className="bg-yellow-50 ring-1 ring-inset ring-yellow-200 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-yellow-800">Filtrado automático aplicado</h4>
                    <div className="mt-2 text-sm text-yellow-700 space-y-1">
                      <p>
                        <span className="font-medium">Items en Alegra:</span> {metadata.total_received || 0}
                      </p>
                      {metadata.total_filtered > 0 && (
                        <p>
                          <span className="font-medium">Items obsoletos filtrados:</span> {metadata.total_filtered}
                          <span className="text-xs ml-1">(productos con * al inicio)</span>
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Items válidos mostrados:</span> {metadata.total_returned || inventory.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Error al cargar inventario</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando inventario…</p>
        </div>
      )}

      {/* Tabla de Inventario */}
      {!loading && !error && inventory.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referencia
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Unit.
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.name || 'Sin nombre'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.reference || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-semibold">
                      {item.quantity || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                      {formatCurrency(item.total_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {metadata && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Página {metadata.page || currentPage} de {metadata.total_pages || 1}
                {' '}({metadata.total_items || 0} items totales)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!metadata.total_pages || currentPage >= metadata.total_pages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sin resultados */}
      {!loading && !error && inventory.length === 0 && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron productos</h3>
          <p className="text-gray-600">
            {searchQuery ? 'Intenta con otro término de búsqueda' : 'No hay productos en el inventario para esta fecha'}
          </p>
        </div>
      )}
    </div>
  );
};

export default DirectInventory;

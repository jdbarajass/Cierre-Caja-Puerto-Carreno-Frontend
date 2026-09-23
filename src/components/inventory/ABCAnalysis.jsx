import React, { useState, useEffect } from 'react';
import { PieChart, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { getABCAnalysis } from '../../services/inventoryService';

const ABCAnalysis = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getABCAnalysis();
      setData(response.data);
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

  const getClassColor = (className) => {
    const colors = {
      'clase_A': {
        bg: 'bg-red-50',
        border: 'border-red-300',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-800',
        primary: 'bg-red-500',
        label: 'Clase A - CRÍTICOS'
      },
      'clase_B': {
        bg: 'bg-yellow-50',
        border: 'border-yellow-300',
        text: 'text-yellow-700',
        badge: 'bg-yellow-100 text-yellow-800',
        primary: 'bg-yellow-500',
        label: 'Clase B - IMPORTANTES'
      },
      'clase_C': {
        bg: 'bg-green-50',
        border: 'border-green-300',
        text: 'text-green-700',
        badge: 'bg-green-100 text-green-800',
        primary: 'bg-green-500',
        label: 'Clase C - NORMALES'
      }
    };
    return colors[className];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Cargando análisis ABC…</p>
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

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        No hay datos de análisis ABC disponibles
      </div>
    );
  }

  const classes = ['clase_A', 'clase_B', 'clase_C'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Análisis ABC (Pareto)</h2>
          <p className="text-sm text-gray-600 mt-1">Clasificación de productos según su valor</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Explicación del Análisis ABC */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">¿Qué es el Análisis ABC?</h3>
            <p className="text-sm text-blue-800 mb-3">
              El análisis ABC clasifica los productos según su contribución al valor total del inventario,
              siguiendo el principio de Pareto (80/20):
            </p>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-bold text-red-600">Clase A (Críticos):</span>
                <span>~20% de los productos representan ~80% del valor total. Requieren control estricto.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-yellow-600">Clase B (Importantes):</span>
                <span>~30% de los productos representan ~15% del valor. Control moderado.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-green-600">Clase C (Normales):</span>
                <span>~50% de los productos representan ~5% del valor. Control básico.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Visualización Simple de Distribución */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Distribución ABC</h3>

        {/* Barras de distribución */}
        <div className="space-y-4">
          {classes.map((className) => {
            const classData = data[className];
            const colors = getClassColor(className);

            return (
              <div key={className}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold ${colors.text}`}>{colors.label}</span>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">
                      {classData.porcentaje_valor.toFixed(1)}% del valor
                    </span>
                    <span className="text-sm text-gray-600 ml-2">
                      ({classData.porcentaje_items.toFixed(1)}% items)
                    </span>
                  </div>
                </div>
                <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors.primary} transition-[width] flex items-center justify-end pr-3`}
                    style={{ width: `${classData.porcentaje_valor}%` }}
                  >
                    <span className="text-white text-sm font-bold">
                      {classData.porcentaje_valor > 10 ? `${classData.porcentaje_valor.toFixed(1)}%` : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cards Detalladas por Clase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {classes.map((className) => {
          const classData = data[className];
          const colors = getClassColor(className);

          return (
            <div key={className} className={`bg-white rounded-xl shadow-lg border-2 ${colors.border} overflow-hidden`}>
              {/* Header con color */}
              <div className={`${colors.bg} border-b-2 ${colors.border} p-4`}>
                <div className="flex items-center gap-3">
                  <div className={`p-3 ${colors.badge} rounded-lg`}>
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${colors.text}`}>
                      {colors.label}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Métricas */}
              <div className="p-6 space-y-4">
                {/* Cantidad de Items */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Cantidad de Items</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-3xl font-bold ${colors.text}`}>
                      {classData.cantidad_items}
                    </p>
                    <span className={`text-sm font-semibold ${colors.badge} px-2 py-1 rounded-full`}>
                      {classData.porcentaje_items.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Valor de Inventario */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Valor de Inventario</p>
                  <p className={`text-xl font-bold ${colors.text}`}>
                    {formatCurrency(classData.valor_inventario)}
                  </p>
                </div>

                {/* Porcentaje del Valor Total */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Contribución al Valor Total</p>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors.primary}`}
                      style={{ width: `${classData.porcentaje_valor}%` }}
                    ></div>
                  </div>
                  <p className={`text-2xl font-bold ${colors.text} mt-2`}>
                    {classData.porcentaje_valor.toFixed(1)}%
                  </p>
                </div>

                {/* Recomendación */}
                <div className={`${colors.bg} rounded-lg p-3 mt-4`}>
                  <p className="text-xs font-semibold text-gray-700 mb-1">RECOMENDACIÓN:</p>
                  <p className="text-xs text-gray-700">
                    {className === 'clase_A' && 'Control estricto, monitoreo constante, reabastecimiento prioritario'}
                    {className === 'clase_B' && 'Control moderado, revisiones periódicas, planificación estándar'}
                    {className === 'clase_C' && 'Control básico, pedidos por lotes, revisión ocasional'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla Comparativa */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Tabla Comparativa</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Clase</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Items</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">% Items</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Valor Inventario</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">% Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {classes.map((className) => {
                const classData = data[className];
                const colors = getClassColor(className);

                return (
                  <tr key={className} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full ${colors.badge} font-bold`}>
                        {colors.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-900 font-semibold">
                      {classData.cantidad_items}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-gray-600 font-medium">
                        {classData.porcentaje_items.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900 font-bold">
                      {formatCurrency(classData.valor_inventario)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colors.primary}`}
                            style={{ width: `${classData.porcentaje_valor}%` }}
                          ></div>
                        </div>
                        <span className={`font-bold ${colors.text}`}>
                          {classData.porcentaje_valor.toFixed(1)}%
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

export default ABCAnalysis;

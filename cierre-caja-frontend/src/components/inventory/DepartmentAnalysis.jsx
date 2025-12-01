import React, { useState } from 'react';
import { Grid, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Package, Database } from 'lucide-react';
import { getByDepartment } from '../../services/inventoryService';

const DepartmentAnalysis = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedDept, setExpandedDept] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getByDepartment();
      setData(response.data);
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

  const getDepartmentColor = (dept) => {
    const colors = {
      'HOMBRE': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
      'MUJER': { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-800' },
      'NIÑO': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
      'NIÑA': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
      'UNKNOWN': { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' }
    };
    return colors[dept] || colors['UNKNOWN'];
  };

  const calculateTotalValue = () => {
    if (!data) return 0;
    return Object.values(data).reduce((sum, dept) => sum + (dept.valor_inventario || 0), 0);
  };

  const calculatePercentage = (value) => {
    const total = calculateTotalValue();
    return total > 0 ? ((value / total) * 100).toFixed(1) : 0;
  };

  // Estado inicial: sin datos
  if (!data && !loading && !error) {
    return (
      <div className="bg-gradient-to-br from-teal-50 to-blue-50 border-2 border-teal-200 rounded-xl p-12">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-100 rounded-full mb-6">
            <Grid className="w-10 h-10 text-teal-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Análisis por Departamento</h3>
          <p className="text-gray-600 mb-8">
            Consulta el análisis detallado de inventario agrupado por departamentos desde Alegra.
          </p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-3 px-8 py-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl text-lg font-semibold"
          >
            <Database className="w-6 h-6" />
            Consultar Análisis por Departamento
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
          <p className="mt-4 text-gray-600 font-medium">Consultando análisis por departamento...</p>
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
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No hay datos de departamentos disponibles
      </div>
    );
  }

  const departments = Object.entries(data);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Análisis por Departamento</h2>
          <p className="text-sm text-gray-600 mt-1">Distribución de inventario por departamento</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Resumen General */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Distribución Total</h3>
        <div className="space-y-3">
          {departments.map(([deptName, deptData]) => {
            const colors = getDepartmentColor(deptName);
            const percentage = calculatePercentage(deptData.valor_inventario);

            return (
              <div key={deptName}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold ${colors.text}`}>{deptName}</span>
                  <span className="text-sm text-gray-600">{percentage}%</span>
                </div>
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors.badge.split(' ')[0]} transition-all`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{formatCurrency(deptData.valor_inventario)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cards por Departamento */}
      <div className="grid grid-cols-1 gap-6">
        {departments.map(([deptName, deptData]) => {
          const colors = getDepartmentColor(deptName);
          const isExpanded = expandedDept === deptName;
          const hasCategories = deptData.por_categoria && Object.keys(deptData.por_categoria).length > 0;

          return (
            <div key={deptName} className={`bg-white rounded-xl shadow-md border-2 ${colors.border}`}>
              {/* Header del Departamento */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 ${colors.badge} rounded-lg`}>
                      <Grid className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${colors.text}`}>{deptName}</h3>
                      <p className="text-sm text-gray-600">
                        {calculatePercentage(deptData.valor_inventario)}% del inventario total
                      </p>
                    </div>
                  </div>
                  {hasCategories && (
                    <button
                      onClick={() => setExpandedDept(isExpanded ? null : deptName)}
                      className={`p-2 ${colors.bg} rounded-lg hover:${colors.badge} transition-colors`}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  )}
                </div>

                {/* Métricas del Departamento */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`${colors.bg} rounded-lg p-4`}>
                    <p className="text-sm text-gray-600 mb-1">Total Items</p>
                    <p className={`text-2xl font-bold ${colors.text}`}>{deptData.total_items}</p>
                  </div>

                  <div className={`${colors.bg} rounded-lg p-4`}>
                    <p className="text-sm text-gray-600 mb-1">Total Unidades</p>
                    <p className={`text-2xl font-bold ${colors.text}`}>{deptData.total_unidades}</p>
                  </div>

                  <div className={`${colors.bg} rounded-lg p-4`}>
                    <p className="text-sm text-gray-600 mb-1">Valor Inventario</p>
                    <p className={`text-lg font-bold ${colors.text}`}>
                      {formatCurrency(deptData.valor_inventario)}
                    </p>
                  </div>

                  <div className={`${colors.bg} rounded-lg p-4`}>
                    <p className="text-sm text-gray-600 mb-1">Margen</p>
                    <p className={`text-lg font-bold ${colors.text}`}>
                      {formatCurrency(deptData.margen)}
                    </p>
                  </div>
                </div>

                {/* Valor Potencial Venta */}
                <div className={`mt-4 ${colors.bg} rounded-lg p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Valor Potencial de Venta</p>
                      <p className={`text-xl font-bold ${colors.text}`}>
                        {formatCurrency(deptData.valor_potencial_venta)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Ganancia Esperada</p>
                      <p className="text-lg font-semibold text-green-600">
                        {((deptData.margen / deptData.valor_inventario) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desglose por Categoría */}
              {isExpanded && hasCategories && (
                <div className={`border-t-2 ${colors.border} p-6 ${colors.bg}`}>
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Desglose por Categoría
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white border-b-2 border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Items</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Unidades</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor Inventario</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">% del Depto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {Object.entries(deptData.por_categoria)
                          .sort(([, a], [, b]) => b.valor_inventario - a.valor_inventario)
                          .map(([catName, catData]) => {
                            const catPercentage = ((catData.valor_inventario / deptData.valor_inventario) * 100).toFixed(1);
                            return (
                              <tr key={catName} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{catName}</td>
                                <td className="px-4 py-3 text-sm text-center text-gray-600">{catData.total_items}</td>
                                <td className="px-4 py-3 text-sm text-center text-gray-600">{catData.total_unidades}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900">
                                  {formatCurrency(catData.valor_inventario)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={`inline-flex px-2 py-1 rounded-full ${colors.badge} font-semibold`}>
                                    {catPercentage}%
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
          );
        })}
      </div>
    </div>
  );
};

export default DepartmentAnalysis;

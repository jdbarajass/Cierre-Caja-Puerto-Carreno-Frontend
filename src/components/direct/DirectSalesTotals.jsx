import React, { useState } from 'react';
import { TrendingUp, Calendar, Loader2, AlertCircle, DollarSign, ShoppingCart, Clock, Users, Package, CreditCard, BarChart3 } from 'lucide-react';
import { getQuickSalesSummary, getSalesDocuments } from '../../services/directApiService';
import { getColombiaTodayString } from '../../utils/dateUtils';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { fetchWithRetry } from '../../utils/retryHelper';

const DirectSalesTotals = () => {
  useDocumentTitle('Totales de Ventas - Estadísticas Avanzadas');

  // Estado para controlar el tab activo
  const [activeTab, setActiveTab] = useState('quick'); // 'quick' o 'monthly'

  // Estado para la sección de Totales de Ventas (Quick)
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState(null);
  const [quickData, setQuickData] = useState(null);
  const [quickFromDate, setQuickFromDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // Primer día del mes
    return date.toISOString().split('T')[0];
  });
  const [quickToDate, setQuickToDate] = useState(getColombiaTodayString());

  // Estado para la sección de Ventas Mensuales (Métricas)
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlyFromDate, setMonthlyFromDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // Primer día del mes
    return date.toISOString().split('T')[0];
  });
  const [monthlyToDate, setMonthlyToDate] = useState(getColombiaTodayString());

  // Función para consultar totales rápidos con reintentos automáticos
  const fetchQuickSummary = async () => {
    setQuickLoading(true);
    setQuickError(null);

    try {
      const response = await fetchWithRetry(
        // Función que hace la petición
        () => getQuickSalesSummary({
          from: quickFromDate,
          to: quickToDate,
        }),
        {
          maxRetries: 3,
          retryDelay: 8000,
          shouldRetry: (result, error) => {
            // Reintentar si hay error de red
            if (error) {
              return error.message?.includes('timeout') ||
                     error.message?.includes('network') ||
                     error.message?.includes('fetch');
            }
            // Reintentar si no es exitoso o ventas en 0 (posible cold start)
            return !result || !result.success || result.total_sales === 0;
          },
          onRetry: (retryCount, maxRetries) => {
            setQuickError(`El servidor se está iniciando... Reintento ${retryCount}/${maxRetries}`);
            console.log(`🔄 Reintentando consulta rápida: ${retryCount}/${maxRetries}`);
          }
        }
      );

      if (response && response.success) {
        setQuickData(response);
        setQuickError(null);
      } else {
        throw new Error(response?.error || 'Error al obtener resumen de ventas');
      }
    } catch (err) {
      setQuickError(err.message || 'El servidor no responde. Intenta nuevamente en unos minutos.');
      setQuickData(null);
    } finally {
      setQuickLoading(false);
    }
  };

  // Función para analizar datos mensuales
  const analyzeMonthlyData = (documents) => {
    if (!documents || documents.length === 0) {
      return null;
    }

    console.log('📊 Analizando documentos:', documents.length);
    console.log('📄 Primera factura (muestra):', documents[0]);

    // 1. Métricas generales
    const totalVentas = documents.reduce((sum, doc) => sum + (doc.total || 0), 0);
    const numFacturas = documents.length;
    const ticketPromedio = numFacturas > 0 ? totalVentas / numFacturas : 0;

    // 2. Métricas por método de pago
    const metodosPago = {};
    documents.forEach(doc => {
      const metodo = doc.paymentMethod || 'No especificado';
      if (!metodosPago[metodo]) {
        metodosPago[metodo] = { total: 0, count: 0 };
      }
      metodosPago[metodo].total += doc.total || 0;
      metodosPago[metodo].count += 1;
    });

    const metodosPagoArray = Object.entries(metodosPago).map(([metodo, data]) => ({
      metodo,
      total: data.total,
      count: data.count,
      porcentaje: totalVentas > 0 ? (data.total / totalVentas) * 100 : 0,
    })).sort((a, b) => b.total - a.total);

    // 3. Métricas por vendedor
    const vendedores = {};
    documents.forEach(doc => {
      const vendedor = doc.seller || 'Sin vendedor';
      if (!vendedores[vendedor]) {
        vendedores[vendedor] = { total: 0, count: 0 };
      }
      vendedores[vendedor].total += doc.total || 0;
      vendedores[vendedor].count += 1;
    });

    const vendedoresArray = Object.entries(vendedores).map(([vendedor, data]) => ({
      vendedor,
      total: data.total,
      count: data.count,
      ticketPromedio: data.count > 0 ? data.total / data.count : 0,
    })).sort((a, b) => b.total - a.total);

    // 4. Métricas de productos
    const productos = {};
    let totalUnidades = 0;

    console.log('🔍 Iniciando análisis de productos...');

    documents.forEach((doc, index) => {
      console.log(`Factura ${index + 1}:`, {
        id: doc.id,
        hasItems: !!doc.items,
        isArray: Array.isArray(doc.items),
        itemsCount: doc.items ? doc.items.length : 0,
        items: doc.items
      });

      if (doc.items && Array.isArray(doc.items)) {
        doc.items.forEach(item => {
          const nombreProducto = item.name || 'Sin nombre';
          const cantidad = item.quantity || 0;
          const precio = item.price || 0;
          const totalItem = cantidad * precio;

          console.log('  📦 Producto:', { nombreProducto, cantidad, precio, totalItem });

          if (!productos[nombreProducto]) {
            productos[nombreProducto] = { cantidad: 0, ingresos: 0 };
          }
          productos[nombreProducto].cantidad += cantidad;
          productos[nombreProducto].ingresos += totalItem;
          totalUnidades += cantidad;
        });
      } else {
        console.log(`  ⚠️ Factura ${doc.id} no tiene items o no es array`);
      }
    });

    console.log('📦 Total de productos procesados:', Object.keys(productos).length);
    console.log('📦 Total de unidades:', totalUnidades);
    console.log('📦 Productos:', productos);

    const productosPorCantidad = Object.entries(productos).map(([nombre, data]) => ({
      nombre,
      cantidad: data.cantidad,
      ingresos: data.ingresos,
    })).sort((a, b) => b.cantidad - a.cantidad);

    const productosPorIngresos = [...productosPorCantidad].sort((a, b) => b.ingresos - a.ingresos);

    const cantidadPromedioProductos = numFacturas > 0 ? totalUnidades / numFacturas : 0;

    // 5. Métricas de clientes
    const clientes = {};
    documents.forEach(doc => {
      const clienteId = doc.client?.id || 'Sin cliente';
      const clienteNombre = doc.client?.name || 'Cliente general';

      if (!clientes[clienteId]) {
        clientes[clienteId] = { nombre: clienteNombre, total: 0, count: 0 };
      }
      clientes[clienteId].total += doc.total || 0;
      clientes[clienteId].count += 1;
    });

    const clientesUnicos = Object.keys(clientes).length;
    const ticketPromedioPorCliente = clientesUnicos > 0 ? totalVentas / clientesUnicos : 0;

    const topClientes = Object.entries(clientes).map(([id, data]) => ({
      id,
      nombre: data.nombre,
      total: data.total,
      count: data.count,
    })).sort((a, b) => b.total - a.total).slice(0, 10);

    // 6. Métricas de tiempo
    const ventasPorHora = {};
    for (let i = 0; i < 24; i++) {
      ventasPorHora[i] = { total: 0, count: 0 };
    }

    documents.forEach(doc => {
      if (doc.date || doc.datetime) {
        try {
          const fecha = new Date(doc.date || doc.datetime);
          const hora = fecha.getHours();
          if (hora >= 0 && hora < 24) {
            ventasPorHora[hora].total += doc.total || 0;
            ventasPorHora[hora].count += 1;
          }
        } catch (e) {
          // Ignorar fechas inválidas
        }
      }
    });

    const ventasPorHoraArray = Object.entries(ventasPorHora).map(([hora, data]) => ({
      hora: parseInt(hora),
      total: data.total,
      count: data.count,
    })).sort((a, b) => b.total - a.total);

    const horaMayorVentas = ventasPorHoraArray[0];

    // Distribución por franja horaria
    const franjas = {
      manana: { total: 0, count: 0 }, // 6-11
      tarde: { total: 0, count: 0 },  // 12-17
      noche: { total: 0, count: 0 },  // 18-23
    };

    ventasPorHoraArray.forEach(({ hora, total, count }) => {
      if (hora >= 6 && hora <= 11) {
        franjas.manana.total += total;
        franjas.manana.count += count;
      } else if (hora >= 12 && hora <= 17) {
        franjas.tarde.total += total;
        franjas.tarde.count += count;
      } else if (hora >= 18 && hora <= 23) {
        franjas.noche.total += total;
        franjas.noche.count += count;
      }
    });

    return {
      general: {
        totalVentas,
        numFacturas,
        ticketPromedio,
        ventasPromedioFactura: ticketPromedio,
      },
      metodosPago: metodosPagoArray,
      vendedores: vendedoresArray,
      productos: {
        porCantidad: productosPorCantidad.slice(0, 10),
        porIngresos: productosPorIngresos.slice(0, 10),
        totalUnidades,
        cantidadPromedioProductos,
      },
      clientes: {
        clientesUnicos,
        ticketPromedioPorCliente,
        topClientes,
      },
      tiempo: {
        ventasPorHora: ventasPorHoraArray,
        horaMayorVentas,
        franjas,
      },
    };
  };

  // Función para consultar métricas mensuales con reintentos automáticos
  const fetchMonthlyMetrics = async () => {
    setMonthlyLoading(true);
    setMonthlyError(null);

    try {
      // El backend ahora trae TODAS las facturas automáticamente con paginación
      const response = await fetchWithRetry(
        // Función que hace la petición
        () => getSalesDocuments({
          from: monthlyFromDate,
          to: monthlyToDate,
        }),
        {
          maxRetries: 3,
          retryDelay: 10000, // 10 segundos para esta petición más pesada
          shouldRetry: (result, error) => {
            // Reintentar si hay error de red
            if (error) {
              return error.message?.includes('timeout') ||
                     error.message?.includes('network') ||
                     error.message?.includes('fetch');
            }
            // Reintentar si no es exitoso o no hay datos (posible cold start)
            return !result || !result.success || !result.data || result.data.length === 0;
          },
          onRetry: (retryCount, maxRetries) => {
            setMonthlyError(`El servidor se está iniciando... Reintento ${retryCount}/${maxRetries} (puede tomar hasta 30 segundos)`);
            console.log(`🔄 Reintentando consulta mensual: ${retryCount}/${maxRetries}`);
          }
        }
      );

      if (response && response.success) {
        const metrics = analyzeMonthlyData(response.data);
        setMonthlyData(metrics);
        setMonthlyError(null);
      } else {
        throw new Error(response?.error || 'Error al obtener documentos de ventas');
      }
    } catch (err) {
      setMonthlyError(err.message || 'El servidor no responde. Intenta nuevamente en unos minutos.');
      setMonthlyData(null);
    } finally {
      setMonthlyLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Ventas Totales y Métricas Mensuales</h1>
        </div>
        <p className="text-yellow-50">
          Consulta de totales de ventas y análisis detallado de métricas mensuales
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'quick'
                ? 'bg-yellow-50 text-yellow-700 border-b-2 border-yellow-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="w-5 h-5" />
              <span>Totales de Ventas</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'monthly'
                ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <span>Ventas Mensuales y Métricas</span>
            </div>
          </button>
        </div>

        {/* Contenido del Tab: Totales de Ventas */}
        {activeTab === 'quick' && (
          <div className="p-6 space-y-6">
            {/* Filtros */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Selecciona el rango de fechas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fecha Desde */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Desde
                  </label>
                  <input
                    type="date"
                    value={quickFromDate}
                    onChange={(e) => setQuickFromDate(e.target.value)}
                    max={quickToDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>

                {/* Fecha Hasta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={quickToDate}
                    onChange={(e) => setQuickToDate(e.target.value)}
                    min={quickFromDate}
                    max={getColombiaTodayString()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>

                {/* Botón Consultar */}
                <div className="flex items-end">
                  <button
                    onClick={fetchQuickSummary}
                    disabled={quickLoading || !quickFromDate || !quickToDate}
                    className="w-full px-6 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {quickLoading ? 'Consultando...' : 'Consultar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {quickError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800">Error al cargar ventas</h3>
                  <p className="text-red-600 text-sm mt-1">{quickError}</p>
                </div>
              </div>
            )}

            {/* Loading */}
            {quickLoading && (
              <div className="bg-white rounded-lg p-12 text-center">
                <Loader2 className="w-12 h-12 text-yellow-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Consultando totales de ventas...</p>
              </div>
            )}

            {/* Resultados */}
            {!quickLoading && !quickError && quickData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-6 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-6 h-6 text-green-600" />
                    <p className="text-sm text-gray-600 font-medium">Total de Ventas</p>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{quickData.total_sales_formatted || formatCurrency(quickData.total_sales)}</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                    <p className="text-sm text-gray-600 font-medium">Días Procesados</p>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{quickData.days_count || 0}</p>
                </div>
              </div>
            )}

            {/* Sin consultar */}
            {!quickLoading && !quickError && !quickData && (
              <div className="bg-gray-50 rounded-lg p-12 text-center">
                <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Consulta tus ventas</h3>
                <p className="text-gray-600">
                  Selecciona un rango de fechas y haz clic en "Consultar" para ver los totales
                </p>
              </div>
            )}
          </div>
        )}

        {/* Contenido del Tab: Ventas Mensuales y Métricas */}
        {activeTab === 'monthly' && (
          <div className="p-6 space-y-6">
            {/* Filtros */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Selecciona el rango de fechas para análisis</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fecha Desde */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Desde
                  </label>
                  <input
                    type="date"
                    value={monthlyFromDate}
                    onChange={(e) => setMonthlyFromDate(e.target.value)}
                    max={monthlyToDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* Fecha Hasta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={monthlyToDate}
                    onChange={(e) => setMonthlyToDate(e.target.value)}
                    min={monthlyFromDate}
                    max={getColombiaTodayString()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* Botón Consultar */}
                <div className="flex items-end">
                  <button
                    onClick={fetchMonthlyMetrics}
                    disabled={monthlyLoading || !monthlyFromDate || !monthlyToDate}
                    className="w-full px-6 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {monthlyLoading ? 'Analizando...' : 'Consultar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {monthlyError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800">Error al cargar métricas</h3>
                  <p className="text-red-600 text-sm mt-1">{monthlyError}</p>
                </div>
              </div>
            )}

            {/* Loading */}
            {monthlyLoading && (
              <div className="bg-white rounded-lg p-12 text-center">
                <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Analizando ventas y métricas...</p>
              </div>
            )}

            {/* Resultados de Métricas */}
            {!monthlyLoading && !monthlyError && monthlyData && (
              <div className="space-y-6">
                {/* 1. Métricas Generales */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                    Métricas Generales de Ventas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total de Ventas</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(monthlyData.general.totalVentas)}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Número de Facturas</p>
                      <p className="text-2xl font-bold text-blue-600">{monthlyData.general.numFacturas}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Ticket Promedio</p>
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(monthlyData.general.ticketPromedio)}</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Promedio por Factura</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(monthlyData.general.ventasPromedioFactura)}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Métricas por Método de Pago */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-orange-600" />
                    Métodos de Pago
                  </h3>
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transacciones</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% del Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {monthlyData.metodosPago.map((metodo, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{metodo.metodo}</td>
                            <td className="px-4 py-3 text-sm text-right text-green-600 font-semibold">{formatCurrency(metodo.total)}</td>
                            <td className="px-4 py-3 text-sm text-right text-blue-600">{metodo.count}</td>
                            <td className="px-4 py-3 text-sm text-right text-purple-600 font-semibold">{metodo.porcentaje.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Métricas por Vendedor */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-600" />
                    Ranking de Vendedores
                  </h3>
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Vendido</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Facturas</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ticket Promedio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {monthlyData.vendedores.map((vendedor, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{vendedor.vendedor}</td>
                            <td className="px-4 py-3 text-sm text-right text-green-600 font-semibold">{formatCurrency(vendedor.total)}</td>
                            <td className="px-4 py-3 text-sm text-right text-blue-600">{vendedor.count}</td>
                            <td className="px-4 py-3 text-sm text-right text-purple-600">{formatCurrency(vendedor.ticketPromedio)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. Métricas de Productos */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-600" />
                    Productos Destacados
                  </h3>

                  {/* Cards de resumen de productos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total de Unidades Vendidas</p>
                      <p className="text-2xl font-bold text-indigo-600">{monthlyData.productos.totalUnidades}</p>
                    </div>
                    <div className="bg-pink-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Promedio Productos por Factura</p>
                      <p className="text-2xl font-bold text-pink-600">{monthlyData.productos.cantidadPromedioProductos.toFixed(1)}</p>
                    </div>
                  </div>

                  {/* Tablas de productos */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Top por cantidad */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Top 10 - Más Vendidos por Cantidad</h4>
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cant.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {monthlyData.productos.porCantidad.map((prod, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-xs text-gray-900 truncate max-w-[200px]" title={prod.nombre}>{prod.nombre}</td>
                                <td className="px-3 py-2 text-xs text-right text-blue-600 font-semibold">{prod.cantidad}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Top por ingresos */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Top 10 - Mayores Ingresos</h4>
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {monthlyData.productos.porIngresos.map((prod, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-xs text-gray-900 truncate max-w-[200px]" title={prod.nombre}>{prod.nombre}</td>
                                <td className="px-3 py-2 text-xs text-right text-green-600 font-semibold">{formatCurrency(prod.ingresos)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Métricas de Clientes */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-600" />
                    Clientes
                  </h3>

                  {/* Cards de resumen de clientes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-cyan-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Clientes Únicos</p>
                      <p className="text-2xl font-bold text-cyan-600">{monthlyData.clientes.clientesUnicos}</p>
                    </div>
                    <div className="bg-teal-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Ticket Promedio por Cliente</p>
                      <p className="text-2xl font-bold text-teal-600">{formatCurrency(monthlyData.clientes.ticketPromedioPorCliente)}</p>
                    </div>
                  </div>

                  {/* Top clientes */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Top 10 Clientes por Compra Total</h4>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Compras</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {monthlyData.clientes.topClientes.map((cliente, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{cliente.nombre}</td>
                              <td className="px-4 py-3 text-sm text-right text-green-600 font-semibold">{formatCurrency(cliente.total)}</td>
                              <td className="px-4 py-3 text-sm text-right text-blue-600">{cliente.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* 6. Métricas de Tiempo */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    Análisis de Horarios
                  </h3>

                  {/* Hora con mayor volumen */}
                  <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-gray-600 mb-1">Hora con Mayor Volumen de Ventas</p>
                    <p className="text-2xl font-bold text-yellow-700">
                      {monthlyData.tiempo.horaMayorVentas.hora}:00 - {monthlyData.tiempo.horaMayorVentas.hora + 1}:00
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {formatCurrency(monthlyData.tiempo.horaMayorVentas.total)} en {monthlyData.tiempo.horaMayorVentas.count} transacciones
                    </p>
                  </div>

                  {/* Franjas horarias */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Distribución por Franja Horaria</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Mañana (6am - 11am)</p>
                        <p className="text-xl font-bold text-orange-600">{formatCurrency(monthlyData.tiempo.franjas.manana.total)}</p>
                        <p className="text-xs text-gray-500 mt-1">{monthlyData.tiempo.franjas.manana.count} transacciones</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Tarde (12pm - 5pm)</p>
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(monthlyData.tiempo.franjas.tarde.total)}</p>
                        <p className="text-xs text-gray-500 mt-1">{monthlyData.tiempo.franjas.tarde.count} transacciones</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Noche (6pm - 11pm)</p>
                        <p className="text-xl font-bold text-purple-600">{formatCurrency(monthlyData.tiempo.franjas.noche.total)}</p>
                        <p className="text-xs text-gray-500 mt-1">{monthlyData.tiempo.franjas.noche.count} transacciones</p>
                      </div>
                    </div>
                  </div>

                  {/* Top 5 horas */}
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Top 5 Horas de Mayor Venta</h4>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transacciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {monthlyData.tiempo.ventasPorHora.slice(0, 5).map((hora, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{hora.hora}:00 - {hora.hora + 1}:00</td>
                              <td className="px-4 py-3 text-sm text-right text-green-600 font-semibold">{formatCurrency(hora.total)}</td>
                              <td className="px-4 py-3 text-sm text-right text-blue-600">{hora.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sin consultar */}
            {!monthlyLoading && !monthlyError && !monthlyData && (
              <div className="bg-gray-50 rounded-lg p-12 text-center">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Analiza tus ventas mensuales</h3>
                <p className="text-gray-600">
                  Selecciona un rango de fechas y haz clic en "Consultar" para ver métricas detalladas
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectSalesTotals;

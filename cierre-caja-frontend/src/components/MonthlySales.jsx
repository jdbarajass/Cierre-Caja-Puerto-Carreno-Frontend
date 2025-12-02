import React, { useState } from 'react';
import { TrendingUp, DollarSign, FileText, CreditCard, Loader2, AlertCircle, Calendar, RefreshCw, ArrowLeft, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMonthlySales } from '../hooks/useMonthlySales';
import { getColombiaTodayString } from '../utils/dateUtils';
import useDocumentTitle from '../hooks/useDocumentTitle';

const MonthlySales = () => {
  const navigate = useNavigate();

  // Establecer título de la página
  useDocumentTitle('Ventas Mensuales');

  // Estado para las fechas
  const currentDate = getColombiaTodayString();
  const currentMonthStart = currentDate.substring(0, 8) + '01'; // Primer día del mes actual

  const [startDate, setStartDate] = useState(currentMonthStart);
  const [endDate, setEndDate] = useState(currentDate);
  const [validationWarning, setValidationWarning] = useState(null);

  // Usar el hook personalizado
  const { data, loading, error, refetch } = useMonthlySales(startDate, endDate);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const calculatePercentage = (methodTotal, total) => {
    if (total === 0) return '0.0';
    return ((methodTotal / total) * 100).toFixed(1);
  };

  const calculateAverage = (total, count) => {
    if (count === 0) return 0;
    return total / count;
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Error al cargar datos</h3>
            <p className="text-gray-600 text-center">{error}</p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={refetch}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
              <button
                onClick={handleBackToDashboard}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      {/* Notificación de Validación - Popup Superior */}
      {validationWarning && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-md animate-slide-down">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg shadow-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900">Validación</h3>
              <p className="text-sm text-yellow-700 mt-1">{validationWarning}</p>
            </div>
            <button
              onClick={() => setValidationWarning(null)}
              className="text-yellow-600 hover:text-yellow-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToDashboard}
              className="p-2 hover:bg-white rounded-lg transition-all"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                Ventas Mensuales
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Consulta de ventas desde Alegra
              </p>
            </div>
          </div>

        </div>

        {/* Selector de Periodo */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Seleccionar Periodo</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  if (selectedDate > currentDate) {
                    setValidationWarning('No se pueden seleccionar fechas futuras. Se ha establecido la fecha de hoy como fecha de inicio.');
                    setStartDate(currentDate);
                    setTimeout(() => setValidationWarning(null), 5000);
                  } else {
                    setStartDate(selectedDate);
                  }
                }}
                max={endDate}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  if (selectedDate > currentDate) {
                    setValidationWarning('No se pueden seleccionar fechas futuras. Se ha establecido la fecha de hoy.');
                    setEndDate(currentDate);
                    setTimeout(() => setValidationWarning(null), 5000);
                  } else {
                    setEndDate(selectedDate);
                  }
                }}
                min={startDate}
                max={currentDate}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Botón Consultar */}
          <div className="flex justify-center mt-4">
            <button
              onClick={refetch}
              disabled={loading}
              className={`flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl transition-all shadow-md ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Consultar Período
                </>
              )}
            </button>
          </div>

          {data && data.date_range && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Periodo consultado:</strong> {data.date_range.start} al {data.date_range.end}
              </p>
            </div>
          )}
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-gray-800 font-semibold text-lg">Procesando facturas...</p>
                <p className="text-sm text-gray-600 text-center">
                  Estamos consultando todas las facturas del periodo en Alegra.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-2">
                  <p className="text-sm text-yellow-800 text-center">
                    ⏱️ <strong>Este proceso puede tardar 1-3 minutos</strong> dependiendo de la cantidad de facturas.
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">Por favor no cierres esta ventana</p>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje inicial */}
        {!loading && !data && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
            <TrendingUp className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Selecciona un período para consultar</h3>
            <p className="text-sm text-blue-700">
              Elige las fechas y presiona "Consultar Período" para ver las ventas mensuales
            </p>
          </div>
        )}

        {/* Métricas Principales */}
        {!loading && data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Total Vendido */}
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <DollarSign className="w-8 h-8 opacity-80" />
                </div>
                <h3 className="text-sm font-medium opacity-90 mb-1">Total Vendido</h3>
                <p className="text-3xl font-bold mb-2">{data.total_vendido.formatted}</p>
                <p className="text-xs opacity-75">{data.date_range.start} - {data.date_range.end}</p>
              </div>

              {/* Cantidad de Facturas */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Facturas Generadas</h3>
                <p className="text-3xl font-bold text-gray-900 mb-2">{data.cantidad_facturas}</p>
                <p className="text-xs text-gray-500">Facturas en el periodo</p>
              </div>

              {/* Promedio por Factura */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Promedio por Factura</h3>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(calculateAverage(data.total_vendido.total, data.cantidad_facturas))}
                </p>
                <p className="text-xs text-gray-500">Venta promedio</p>
              </div>
            </div>

        {/* Desglose por Métodos de Pago */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Desglose por Método de Pago</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Efectivo */}
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-green-900">
                  {data.payment_methods.cash.label}
                </h3>
                <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded">
                  {calculatePercentage(data.payment_methods.cash.total, data.total_vendido.total)}%
                </span>
              </div>
              <p className="text-2xl font-bold text-green-700 mb-1">
                {data.payment_methods.cash.formatted}
              </p>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${calculatePercentage(data.payment_methods.cash.total, data.total_vendido.total)}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Transferencia */}
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-purple-900">
                  {data.payment_methods.transfer.label}
                </h3>
                <span className="text-xs font-bold text-purple-700 bg-purple-200 px-2 py-1 rounded">
                  {calculatePercentage(data.payment_methods.transfer.total, data.total_vendido.total)}%
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-700 mb-1">
                {data.payment_methods.transfer.formatted}
              </p>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{
                    width: `${calculatePercentage(data.payment_methods.transfer.total, data.total_vendido.total)}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Tarjeta de Crédito */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-blue-900">
                  {data.payment_methods['credit-card'].label}
                </h3>
                <span className="text-xs font-bold text-blue-700 bg-blue-200 px-2 py-1 rounded">
                  {calculatePercentage(data.payment_methods['credit-card'].total, data.total_vendido.total)}%
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-700 mb-1">
                {data.payment_methods['credit-card'].formatted}
              </p>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${calculatePercentage(data.payment_methods['credit-card'].total, data.total_vendido.total)}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Tarjeta de Débito */}
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-orange-900">
                  {data.payment_methods['debit-card'].label}
                </h3>
                <span className="text-xs font-bold text-orange-700 bg-orange-200 px-2 py-1 rounded">
                  {calculatePercentage(data.payment_methods['debit-card'].total, data.total_vendido.total)}%
                </span>
              </div>
              <p className="text-2xl font-bold text-orange-700 mb-1">
                {data.payment_methods['debit-card'].formatted}
              </p>
              <div className="w-full bg-orange-200 rounded-full h-2">
                <div
                  className="bg-orange-600 h-2 rounded-full"
                  style={{
                    width: `${calculatePercentage(data.payment_methods['debit-card'].total, data.total_vendido.total)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

            {/* Información Adicional */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Usuario Alegra:</strong> {data.username_used}</p>
                <p><strong>Timestamp del servidor:</strong> {data.server_timestamp}</p>
                <p><strong>Zona horaria:</strong> {data.timezone}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MonthlySales;

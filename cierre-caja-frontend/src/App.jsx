import React, { useState } from 'react';
import { Calendar, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Loader2, Plus, X } from 'lucide-react';

const App = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const [coins, setCoins] = useState({
    '50': 0, '100': 0, '200': 0, '500': 0, '1000': 0
  });

  const [bills, setBills] = useState({
    '2000': 0, '5000': 0, '10000': 0, '20000': 0, '50000': 0, '100000': 0
  });

  // Nuevo estado para excedentes múltiples
  const [excedentes, setExcedentes] = useState([
    { id: 1, tipo: 'efectivo', valor: 0 }
  ]);

  const [adjustments, setAdjustments] = useState({
    gastos_operativos: 0,
    prestamos: 0
  });

  const tiposExcedente = [
    { value: 'efectivo', label: 'Excedente Efectivo' },
    { value: 'qr_transferencias', label: 'Excedente QR/Transferencias' },
    { value: 'datafono', label: 'Excedente Datafono' }
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const calculateTotal = (items) => {
    return Object.entries(items).reduce((sum, [denom, qty]) => {
      return sum + (parseInt(denom) * parseInt(qty || 0));
    }, 0);
  };

  const totalCoins = calculateTotal(coins);
  const totalBills = calculateTotal(bills);
  const totalGeneral = totalCoins + totalBills;

  // Calcular total de excedentes
  const totalExcedentes = excedentes.reduce((sum, exc) => sum + (parseInt(exc.valor) || 0), 0);

  // Agregar un nuevo excedente
  const agregarExcedente = () => {
    if (excedentes.length < 3) {
      setExcedentes([
        ...excedentes,
        { id: Date.now(), tipo: 'efectivo', valor: 0 }
      ]);
    }
  };

  // Eliminar un excedente
  const eliminarExcedente = (id) => {
    if (excedentes.length > 1) {
      setExcedentes(excedentes.filter(exc => exc.id !== id));
    }
  };

  // Actualizar tipo de excedente
  const actualizarTipoExcedente = (id, nuevoTipo) => {
    setExcedentes(excedentes.map(exc =>
      exc.id === id ? { ...exc, tipo: nuevoTipo } : exc
    ));
  };

  // Actualizar valor de excedente
  const actualizarValorExcedente = (id, nuevoValor) => {
    setExcedentes(excedentes.map(exc =>
      exc.id === id ? { ...exc, valor: nuevoValor } : exc
    ));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Agrupar excedentes por tipo
      const excedentesPorTipo = {
        excedente_efectivo: 0,
        excedente_qr_transferencias: 0,
        excedente_datafono: 0
      };

      excedentes.forEach(exc => {
        const valor = parseInt(exc.valor) || 0;
        if (exc.tipo === 'efectivo') {
          excedentesPorTipo.excedente_efectivo += valor;
        } else if (exc.tipo === 'qr_transferencias') {
          excedentesPorTipo.excedente_qr_transferencias += valor;
        } else if (exc.tipo === 'datafono') {
          excedentesPorTipo.excedente_datafono += valor;
        }
      });

      const payload = {
        date,
        coins: Object.fromEntries(
          Object.entries(coins).map(([k, v]) => [k, parseInt(v) || 0])
        ),
        bills: Object.fromEntries(
          Object.entries(bills).map(([k, v]) => [k, parseInt(v) || 0])
        ),
        excedente: totalExcedentes, // Total general de excedentes
        excedente_efectivo: excedentesPorTipo.excedente_efectivo,
        excedente_qr_transferencias: excedentesPorTipo.excedente_qr_transferencias,
        excedente_datafono: excedentesPorTipo.excedente_datafono,
        gastos_operativos: parseInt(adjustments.gastos_operativos) || 0,
        prestamos: parseInt(adjustments.prestamos) || 0
      };

      const response = await fetch('https://cierre-caja-api.onrender.com/sum_payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Error en la respuesta del servidor');

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCoins({ '50': 0, '100': 0, '200': 0, '500': 0, '1000': 0 });
    setBills({ '2000': 0, '5000': 0, '10000': 0, '20000': 0, '50000': 0, '100000': 0 });
    setExcedentes([{ id: 1, tipo: 'efectivo', valor: 0 }]);
    setAdjustments({ gastos_operativos: 0, prestamos: 0 });
    setResults(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-3 sm:mb-4 shadow-lg">
            <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 px-2">Cierre Diario de Caja Puerto Carreño</h1>
          <p className="text-sm sm:text-base text-gray-600">Sistema de arqueo y conciliación</p>
        </div>

        {/* Main Form */}
        <div className="space-y-4 sm:space-y-6">
          {/* Date Selection */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Fecha del Cierre</h2>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
              required
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Coins Section */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                Monedas
              </h2>
              <div className="space-y-2 sm:space-y-3">
                {Object.keys(coins).map((denom) => (
                  <div key={denom} className="flex items-center gap-2 sm:gap-3">
                    <label className="w-16 sm:w-24 text-xs sm:text-sm font-medium text-gray-700">
                      ${parseInt(denom).toLocaleString()}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={coins[denom]}
                      onChange={(e) => setCoins({ ...coins, [denom]: e.target.value })}
                      className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="Cantidad"
                    />
                    <span className="w-20 sm:w-28 text-right text-xs sm:text-sm font-semibold text-gray-900">
                      {formatCurrency(parseInt(denom) * (parseInt(coins[denom]) || 0))}
                    </span>
                  </div>
                ))}
                <div className="pt-2 sm:pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base font-semibold text-gray-700">Total Monedas:</span>
                    <span className="text-base sm:text-lg font-bold text-yellow-600">{formatCurrency(totalCoins)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bills Section */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Billetes
              </h2>
              <div className="space-y-2 sm:space-y-3">
                {Object.keys(bills).map((denom) => (
                  <div key={denom} className="flex items-center gap-2 sm:gap-3">
                    <label className="w-16 sm:w-24 text-xs sm:text-sm font-medium text-gray-700">
                      ${parseInt(denom).toLocaleString()}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={bills[denom]}
                      onChange={(e) => setBills({ ...bills, [denom]: e.target.value })}
                      className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="Cantidad"
                    />
                    <span className="w-20 sm:w-28 text-right text-xs sm:text-sm font-semibold text-gray-900">
                      {formatCurrency(parseInt(denom) * (parseInt(bills[denom]) || 0))}
                    </span>
                  </div>
                ))}
                <div className="pt-2 sm:pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base font-semibold text-gray-700">Total Billetes:</span>
                    <span className="text-base sm:text-lg font-bold text-green-600">{formatCurrency(totalBills)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Adjustments */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Ajustes y Movimientos</h2>
            </div>
            
            {/* Excedentes Dinámicos */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm sm:text-base font-medium text-gray-700">
                  Excedentes (Opcional)
                </label>
                {excedentes.length < 3 && (
                  <button
                    type="button"
                    onClick={agregarExcedente}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-xs sm:text-sm"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    Agregar
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {excedentes.map((excedente, index) => (
                  <div key={excedente.id} className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <select
                        value={excedente.tipo}
                        onChange={(e) => actualizarTipoExcedente(excedente.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      >
                        {tiposExcedente.map(tipo => (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        value={excedente.valor}
                        onChange={(e) => actualizarValorExcedente(excedente.id, e.target.value)}
                        className="flex-1 sm:w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        placeholder="Valor"
                      />
                      {excedentes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => eliminarExcedente(excedente.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {totalExcedentes > 0 && (
                <div className="mt-3 p-2 bg-purple-50 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700">Total Excedentes:</span>
                    <span className="font-bold text-purple-600">{formatCurrency(totalExcedentes)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Otros Ajustes */}
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gastos Operativos
                </label>
                <input
                  type="number"
                  value={adjustments.gastos_operativos}
                  onChange={(e) => setAdjustments({ ...adjustments, gastos_operativos: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Préstamos
                </label>
                <input
                  type="number"
                  value={adjustments.prestamos}
                  onChange={(e) => setAdjustments({ ...adjustments, prestamos: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Total Display */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
              <span className="text-lg sm:text-xl font-semibold">Total en Caja:</span>
              <span className="text-2xl sm:text-3xl font-bold">{formatCurrency(totalGeneral)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 sm:py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  Realizar Cierre
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              className="sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all text-sm sm:text-base"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 sm:mt-6 bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-red-900">Error</h3>
              <p className="text-xs sm:text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Resultados del Cierre</h2>
              
              {/* Alegra Sales Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-100">
                  <div className="text-xs sm:text-sm text-blue-600 font-medium mb-1">Efectivo</div>
                  <div className="text-lg sm:text-2xl font-bold text-blue-900">
                    {results.alegra.results.cash.formatted}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 sm:p-4 border border-purple-100">
                  <div className="text-xs sm:text-sm text-purple-600 font-medium mb-1">Transferencia</div>
                  <div className="text-lg sm:text-2xl font-bold text-purple-900">
                    {results.alegra.results.transfer.formatted}
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 sm:p-4 border border-green-100">
                  <div className="text-xs sm:text-sm text-green-600 font-medium mb-1">Tarjeta Débito</div>
                  <div className="text-lg sm:text-2xl font-bold text-green-900">
                    {results.alegra.results['debit-card'].formatted}
                  </div>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 sm:p-4 border border-orange-100">
                  <div className="text-xs sm:text-sm text-orange-600 font-medium mb-1">Tarjeta Crédito</div>
                  <div className="text-lg sm:text-2xl font-bold text-orange-900">
                    {results.alegra.results['credit-card'].formatted}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 sm:p-6 text-white mb-4 sm:mb-6">
                <div className="text-xs sm:text-sm font-medium opacity-90 mb-1">TOTAL VENTA DEL DÍA</div>
                <div className="text-2xl sm:text-4xl font-bold">{results.alegra.total_sale.formatted}</div>
              </div>

              {/* Cash Count Details */}
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">Base de Caja</h3>
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Base:</span>
                      <span className="font-semibold">{results.cash_count.base.total_base_formatted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Exacta:</span>
                      <span className={`font-semibold ${results.cash_count.base.exact_base_obtained ? 'text-green-600' : 'text-red-600'}`}>
                        {results.cash_count.base.exact_base_obtained ? 'Sí' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">A Consignar</h3>
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Efectivo Final:</span>
                      <span className="font-semibold text-green-600">
                        {results.cash_count.consignar.efectivo_para_consignar_final_formatted}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sin Ajustes:</span>
                      <span className="font-semibold">
                        {results.cash_count.consignar.total_consignar_sin_ajustes_formatted}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Adjustments Summary */}
              <div className="mt-4 sm:mt-6 bg-yellow-50 rounded-xl p-3 sm:p-4 border border-yellow-100">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">Ajustes Aplicados</h3>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <div className="text-gray-600 mb-1">Excedente</div>
                    <div className="font-semibold">{results.cash_count.adjustments.excedente_formatted}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Gastos Operativos</div>
                    <div className="font-semibold">{results.cash_count.adjustments.gastos_operativos_formatted}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Préstamos</div>
                    <div className="font-semibold">{results.cash_count.adjustments.prestamos_formatted}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Venta Efectivo Alegra</div>
                    <div className="font-semibold">{results.cash_count.adjustments.venta_efectivo_diaria_alegra_formatted}</div>
                  </div>
                </div>
              </div>

              {/* Footer Info */}
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200 text-xs sm:text-sm text-gray-600">
                <div className="flex flex-col sm:flex-row justify-between gap-2">
                  <span>Usuario: {results.username_used}</span>
                  <span>Fecha: {results.request_date} {results.request_time}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
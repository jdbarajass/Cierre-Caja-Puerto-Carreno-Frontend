import React, { useState } from 'react';
import { Calendar, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Loader2, Plus, X, FileText, CreditCard, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { submitCashClosing } from '../services/api';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [coins, setCoins] = useState({
    '50': '', '100': '', '200': '', '500': '', '1000': ''
  });

  const [bills, setBills] = useState({
    '2000': '', '5000': '', '10000': '', '20000': '', '50000': '', '100000': ''
  });

  const [excedentes, setExcedentes] = useState([
    { id: 1, tipo: 'efectivo', subtipo: '', valor: '' }
  ]);

  const [adjustments, setAdjustments] = useState({
    gastos_operativos: '',
    gastos_operativos_nota: '',
    prestamos: '',
    prestamos_nota: ''
  });

  const [metodosPago, setMetodosPago] = useState({
    addi_datafono: '',
    nequi_luz_helena: '',
    daviplata_jose: '',
    qr_julieth: '',
    tarjeta_debito: '',
    tarjeta_credito: ''
  });

  const tiposExcedente = [
    { value: 'efectivo', label: 'Excedente Efectivo' },
    { value: 'qr_transferencias', label: 'Excedente QR/Transferencias' },
    { value: 'datafono', label: 'Excedente Datafono' }
  ];

  const subtiposTransferencia = [
    { value: 'nequi', label: 'Nequi' },
    { value: 'daviplata', label: 'Daviplata' },
    { value: 'qr', label: 'QR' }
  ];

  const handleNumericInput = (value) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    return cleaned;
  };

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
  const totalExcedentes = excedentes.reduce((sum, exc) => sum + (parseInt(exc.valor) || 0), 0);

  const totalTransferenciasRegistradas =
    parseInt(metodosPago.nequi_luz_helena || 0) +
    parseInt(metodosPago.daviplata_jose || 0) +
    parseInt(metodosPago.qr_julieth || 0);

  const totalDatafonoRegistrado =
    parseInt(metodosPago.addi_datafono || 0) +
    parseInt(metodosPago.tarjeta_debito || 0) +
    parseInt(metodosPago.tarjeta_credito || 0);

  const agregarExcedente = () => {
    if (excedentes.length < 3) {
      setExcedentes([...excedentes, { id: Date.now(), tipo: 'efectivo', subtipo: '', valor: '' }]);
    }
  };

  const eliminarExcedente = (id) => {
    if (excedentes.length > 1) {
      setExcedentes(excedentes.filter(exc => exc.id !== id));
    }
  };

  const actualizarTipoExcedente = (id, nuevoTipo) => {
    setExcedentes(excedentes.map(exc =>
      exc.id === id ? { ...exc, tipo: nuevoTipo, subtipo: nuevoTipo === 'qr_transferencias' ? 'nequi' : '' } : exc
    ));
  };

  const actualizarSubtipoExcedente = (id, nuevoSubtipo) => {
    setExcedentes(excedentes.map(exc =>
      exc.id === id ? { ...exc, subtipo: nuevoSubtipo } : exc
    ));
  };

  const actualizarValorExcedente = (id, nuevoValor) => {
    const valorLimpio = handleNumericInput(nuevoValor);
    setExcedentes(excedentes.map(exc =>
      exc.id === id ? { ...exc, valor: valorLimpio } : exc
    ));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setShowSuccessModal(false);

    try {
      const excedentesPorTipo = {
        excedente_efectivo: 0,
        excedente_datafono: 0,
        excedente_nequi: 0,
        excedente_daviplata: 0,
        excedente_qr: 0
      };

      const excedentesDetalle = [];

      excedentes.forEach(exc => {
        const valor = parseInt(exc.valor) || 0;
        if (valor > 0) {
          if (exc.tipo === 'efectivo') {
            excedentesPorTipo.excedente_efectivo += valor;
            excedentesDetalle.push({ tipo: 'Efectivo', valor });
          } else if (exc.tipo === 'datafono') {
            excedentesPorTipo.excedente_datafono += valor;
            excedentesDetalle.push({ tipo: 'Datafono', valor });
          } else if (exc.tipo === 'qr_transferencias') {
            if (exc.subtipo === 'nequi') {
              excedentesPorTipo.excedente_nequi += valor;
              excedentesDetalle.push({ tipo: 'Transferencia', subtipo: 'Nequi', valor });
            } else if (exc.subtipo === 'daviplata') {
              excedentesPorTipo.excedente_daviplata += valor;
              excedentesDetalle.push({ tipo: 'Transferencia', subtipo: 'Daviplata', valor });
            } else if (exc.subtipo === 'qr') {
              excedentesPorTipo.excedente_qr += valor;
              excedentesDetalle.push({ tipo: 'Transferencia', subtipo: 'QR', valor });
            }
          }
        }
      });

      const payload = {
        date,
        coins: Object.fromEntries(Object.entries(coins).map(([k, v]) => [k, parseInt(v) || 0])),
        bills: Object.fromEntries(Object.entries(bills).map(([k, v]) => [k, parseInt(v) || 0])),
        excedente: totalExcedentes,
        ...excedentesPorTipo,
        excedentes_detalle: excedentesDetalle,
        gastos_operativos: parseInt(adjustments.gastos_operativos) || 0,
        gastos_operativos_nota: adjustments.gastos_operativos_nota || '',
        prestamos: parseInt(adjustments.prestamos) || 0,
        prestamos_nota: adjustments.prestamos_nota || '',
        metodos_pago: {
          addi_datafono: parseInt(metodosPago.addi_datafono) || 0,
          nequi_luz_helena: parseInt(metodosPago.nequi_luz_helena) || 0,
          daviplata_jose: parseInt(metodosPago.daviplata_jose) || 0,
          qr_julieth: parseInt(metodosPago.qr_julieth) || 0,
          tarjeta_debito: parseInt(metodosPago.tarjeta_debito) || 0,
          tarjeta_credito: parseInt(metodosPago.tarjeta_credito) || 0,
          total_transferencias_registradas: totalTransferenciasRegistradas,
          total_datafono_registrado: totalDatafonoRegistrado
        }
      };

      const data = await submitCashClosing(payload);
      data.excedentes_detalle = excedentesDetalle;
      data.gastos_operativos_nota = adjustments.gastos_operativos_nota;
      data.prestamos_nota = adjustments.prestamos_nota;
      data.metodos_pago_registrados = payload.metodos_pago;

      setResults(data);

      const transferenciaAlegra = data.alegra.results.transfer.total || 0;
      const datafonoAlegraTotal =
        (data.alegra.results['debit-card']?.total || 0) +
        (data.alegra.results['credit-card']?.total || 0);

      const diferenciaTransferencia = Math.abs(transferenciaAlegra - totalTransferenciasRegistradas);
      const diferenciaDatafono = Math.abs(datafonoAlegraTotal - totalDatafonoRegistrado);

      if (diferenciaTransferencia < 100 && diferenciaDatafono < 100) {
        setShowSuccessModal(true);
      }

    } catch (err) {
      console.error(err);
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCoins({ '50': '', '100': '', '200': '', '500': '', '1000': '' });
    setBills({ '2000': '', '5000': '', '10000': '', '20000': '', '50000': '', '100000': '' });
    setExcedentes([{ id: 1, tipo: 'efectivo', subtipo: '', valor: '' }]);
    setAdjustments({ gastos_operativos: '', gastos_operativos_nota: '', prestamos: '', prestamos_nota: '' });
    setMetodosPago({
      addi_datafono: '',
      nequi_luz_helena: '',
      daviplata_jose: '',
      qr_julieth: '',
      tarjeta_debito: '',
      tarjeta_credito: ''
    });
    setResults(null);
    setError(null);
    setShowSuccessModal(false);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header con botón de logout */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-md px-4 py-2 border border-gray-100">
            <div className="text-sm">
              <span className="text-gray-600">Usuario: </span>
              <span className="font-semibold text-gray-900">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center mb-3 sm:mb-4">
            <div className="bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="text-white text-4xl sm:text-5xl font-bold tracking-widest" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.3em' }}>
                KOAJ
              </div>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 px-2">Cierre Diario de Caja</h1>
          <p className="text-lg sm:text-xl text-blue-600 font-semibold mb-1">Puerto Carreño</p>
          <p className="text-sm sm:text-base text-gray-600">Sistema de arqueo y conciliación</p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Fecha del Cierre */}
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

          {/* Monedas y Billetes */}
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
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
                      type="text"
                      inputMode="numeric"
                      value={coins[denom]}
                      onChange={(e) => setCoins({ ...coins, [denom]: handleNumericInput(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="0"
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
                      type="text"
                      inputMode="numeric"
                      value={bills[denom]}
                      onChange={(e) => setBills({ ...bills, [denom]: handleNumericInput(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="0"
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

          {/* Métodos de Pago Registrados */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Registro de Métodos de Pago</h2>
            </div>

            <div className="space-y-4">
              {/* Transferencias */}
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <h3 className="text-sm font-semibold text-purple-900 mb-3">Transferencias (QR)</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nequi</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={metodosPago.nequi_luz_helena}
                      onChange={(e) => setMetodosPago({ ...metodosPago, nequi_luz_helena: handleNumericInput(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Daviplata</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={metodosPago.daviplata_jose}
                      onChange={(e) => setMetodosPago({ ...metodosPago, daviplata_jose: handleNumericInput(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Transferencias (QR)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={metodosPago.qr_julieth}
                      onChange={(e) => setMetodosPago({ ...metodosPago, qr_julieth: handleNumericInput(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
                {totalTransferenciasRegistradas > 0 && (
                  <div className="mt-2 text-sm font-semibold text-purple-700">
                    Total: {formatCurrency(totalTransferenciasRegistradas)}
                  </div>
                )}
              </div>

              {/* Datafono */}
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <h3 className="text-sm font-semibold text-orange-900 mb-3">Datafono</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Addi (Datafono)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={metodosPago.addi_datafono}
                      onChange={(e) => setMetodosPago({ ...metodosPago, addi_datafono: handleNumericInput(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tarjeta Débito (Datafono)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={metodosPago.tarjeta_debito}
                      onChange={(e) => setMetodosPago({ ...metodosPago, tarjeta_debito: handleNumericInput(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tarjeta Crédito (Datafono)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={metodosPago.tarjeta_credito}
                      onChange={(e) => setMetodosPago({ ...metodosPago, tarjeta_credito: handleNumericInput(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
                {totalDatafonoRegistrado > 0 && (
                  <div className="mt-2 text-sm font-semibold text-orange-700">
                    Total: {formatCurrency(totalDatafonoRegistrado)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ajustes y Movimientos */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Ajustes y Movimientos</h2>
            </div>

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
                {excedentes.map((excedente) => (
                  <div key={excedente.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <select
                          value={excedente.tipo}
                          onChange={(e) => actualizarTipoExcedente(excedente.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        >
                          {tiposExcedente.map(tipo => (
                            <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                          ))}
                        </select>
                      </div>
                      {excedente.tipo === 'qr_transferencias' && (
                        <div className="flex-1">
                          <select
                            value={excedente.subtipo}
                            onChange={(e) => actualizarSubtipoExcedente(excedente.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                          >
                            {subtiposTransferencia.map(sub => (
                              <option key={sub.value} value={sub.value}>{sub.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={excedente.valor}
                          onChange={(e) => actualizarValorExcedente(excedente.id, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="flex-1 sm:w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                          placeholder="0"
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

            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gastos Operativos
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={adjustments.gastos_operativos}
                  onChange={(e) => setAdjustments({ ...adjustments, gastos_operativos: handleNumericInput(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base mb-2"
                  placeholder="0"
                />
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={adjustments.gastos_operativos_nota}
                    onChange={(e) => setAdjustments({ ...adjustments, gastos_operativos_nota: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    placeholder="Nota: ej. Compra de papelería..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Préstamos
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={adjustments.prestamos}
                  onChange={(e) => setAdjustments({ ...adjustments, prestamos: handleNumericInput(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base mb-2"
                  placeholder="0"
                />
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={adjustments.prestamos_nota}
                    onChange={(e) => setAdjustments({ ...adjustments, prestamos_nota: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    placeholder="Nota: ej. Préstamo a María..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Total en Caja */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
              <span className="text-lg sm:text-xl font-semibold">Total en Caja:</span>
              <span className="text-2xl sm:text-3xl font-bold">{formatCurrency(totalGeneral)}</span>
            </div>
          </div>

          {/* Botones de Acción */}
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

        {/* Modal de Éxito */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-bounce-once">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Cierre Exitoso!</h3>
                <p className="text-gray-600 mb-6">
                  Los montos registrados coinciden con los datos de Alegra. El cierre se ha realizado correctamente.
                </p>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

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

              {/* Comparación de Métodos de Pago */}
              <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
                <h3 className="text-base font-semibold text-blue-900 mb-3">Comparación de Métodos de Pago</h3>

                <div className="space-y-3">
                  {/* Transferencias */}
                  <div className="bg-white rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-sm">Transferencias</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-gray-600">Alegra:</div>
                        <div className="font-semibold text-purple-700">
                          {results.alegra.results.transfer.formatted}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Registrado:</div>
                        <div className="font-semibold text-blue-700">
                          {formatCurrency(results.metodos_pago_registrados.total_transferencias_registradas)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs">
                      <div className="text-gray-600">Desglose:</div>
                      <div className="grid grid-cols-3 gap-1 mt-1">
                        <div>Nequi: {formatCurrency(results.metodos_pago_registrados.nequi_luz_helena)}</div>
                        <div>Daviplata: {formatCurrency(results.metodos_pago_registrados.daviplata_jose)}</div>
                        <div>QR: {formatCurrency(results.metodos_pago_registrados.qr_julieth)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Datafono */}
                  <div className="bg-white rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-sm">Datafono</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-gray-600">Alegra (Déb + Créd):</div>
                        <div className="font-semibold text-orange-700">
                          {formatCurrency(
                            (results.alegra.results['debit-card']?.total || 0) +
                            (results.alegra.results['credit-card']?.total || 0)
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Registrado:</div>
                        <div className="font-semibold text-blue-700">
                          {formatCurrency(results.metodos_pago_registrados.total_datafono_registrado)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs">
                      <div className="text-gray-600">Desglose:</div>
                      <div className="grid grid-cols-3 gap-1 mt-1">
                        <div>Addi: {formatCurrency(results.metodos_pago_registrados.addi_datafono)}</div>
                        <div>T. Débito: {formatCurrency(results.metodos_pago_registrados.tarjeta_debito)}</div>
                        <div>T. Crédito: {formatCurrency(results.metodos_pago_registrados.tarjeta_credito)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen Alegra */}
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

              {/* Base y Consignar */}
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
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

              {/* Ajustes Aplicados */}
              <div className="bg-yellow-50 rounded-xl p-3 sm:p-4 border border-yellow-100">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">Ajustes Aplicados</h3>

                {results.excedentes_detalle && results.excedentes_detalle.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Excedentes:</div>
                    <div className="space-y-2">
                      {results.excedentes_detalle.map((exc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center text-xs bg-white rounded-lg px-3 py-2 border border-gray-200"
                        >
                          <span className="text-gray-600 whitespace-nowrap">
                            {exc.tipo} {exc.subtipo && `(${exc.subtipo})`}:
                          </span>
                          <span className="flex-1 mx-2 border-b-2 border-dotted border-gray-300 min-w-[20px]"></span>
                          <span className="font-semibold text-gray-900 whitespace-nowrap bg-yellow-50 px-2 py-1 rounded">
                            {formatCurrency(exc.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <div className="text-gray-600 mb-1">Total Excedente</div>
                    <div className="font-semibold">{results.cash_count.adjustments.excedente_formatted}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Gastos Operativos</div>
                    <div className="font-semibold">{results.cash_count.adjustments.gastos_operativos_formatted}</div>
                    {results.gastos_operativos_nota && (
                      <div className="text-xs text-gray-500 mt-1 italic">Nota: {results.gastos_operativos_nota}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Préstamos</div>
                    <div className="font-semibold">{results.cash_count.adjustments.prestamos_formatted}</div>
                    {results.prestamos_nota && (
                      <div className="text-xs text-gray-500 mt-1 italic">Nota: {results.prestamos_nota}</div>
                    )}
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

export default Dashboard;

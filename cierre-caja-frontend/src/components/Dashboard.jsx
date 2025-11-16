import React, { useState, useRef, useEffect } from 'react';
import { Calendar, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Loader2, Plus, X, FileText, CreditCard, LogOut, Download, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { submitCashClosing } from '../services/api';
import { getColombiaTodayString, formatColombiaDate, getColombiaTimeString, getColombiaTimestamp, formatDateStringToColombiaDate } from '../utils/dateUtils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const resultsRef = useRef(null);

  const [date, setDate] = useState(getColombiaTodayString());
  const [closingDate, setClosingDate] = useState(getColombiaTodayString());
  const [currentTime, setCurrentTime] = useState(getColombiaTimeString());
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [validationWarning, setValidationWarning] = useState(null);

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

  const formatNumberWithThousands = (value) => {
    // Eliminar todo excepto números
    const cleaned = value.replace(/[^0-9]/g, '');
    if (!cleaned) return '';

    // Formatear con separador de miles (punto) y signo de pesos
    return '$' + parseInt(cleaned).toLocaleString('es-CO');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getMensajeCajaBase = (baseData) => {
    if (!baseData || !baseData.base_status) return '';

    const status = baseData.base_status;
    const mensajeOriginal = baseData.mensaje_base || '';

    // Extraer el monto de diferencia del mensaje original si existe
    const match = mensajeOriginal.match(/\$[\d.,]+/);
    const montoStr = match ? match[0] : '';

    if (status === 'exacto') {
      return 'Base de caja exacta - $450.000';
    } else if (status === 'sobrante') {
      return `Ajuste de caja realizado - Valor sobrante para consignar: ${montoStr}`;
    } else if (status === 'faltante') {
      return `Ajuste de caja necesario - Valor faltante en caja: ${montoStr}`;
    }

    return mensajeOriginal;
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

  // Calcular totales de métodos de pago
  const totalTransferencias = (parseInt(metodosPago.nequi_luz_helena) || 0) +
                               (parseInt(metodosPago.daviplata_jose) || 0) +
                               (parseInt(metodosPago.qr_julieth) || 0);
  const totalDatafono = (parseInt(metodosPago.addi_datafono) || 0) +
                        (parseInt(metodosPago.tarjeta_debito) || 0) +
                        (parseInt(metodosPago.tarjeta_credito) || 0);

  // Actualizar la hora cada segundo para mostrar la hora de Colombia en tiempo real
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getColombiaTimeString());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
    // Validar que haya al menos un valor en monedas o billetes
    const hasCoins = Object.values(coins).some(value => parseInt(value) > 0);
    const hasBills = Object.values(bills).some(value => parseInt(value) > 0);

    if (!hasCoins && !hasBills) {
      setValidationWarning('Debe ingresar al menos un valor en Monedas o en Billetes para realizar el cierre.');
      setTimeout(() => setValidationWarning(null), 5000); // Auto-cerrar después de 5 segundos
      return;
    }

    // Preparar datos para el modal de confirmación
    const excedentesArray = excedentes
      .filter(exc => (parseInt(exc.valor) || 0) > 0)
      .map(exc => ({
        tipo: exc.tipo,
        subtipo: exc.tipo === 'qr_transferencias' ? exc.subtipo : null,
        valor: parseInt(exc.valor) || 0
      }));

    const confirmationData = {
      fecha: closingDate,
      totalMonedas: totalCoins,
      totalBilletes: totalBills,
      totalGeneral: totalGeneral,
      totalExcedentes: totalExcedentes,
      hasExcedentes: excedentesArray.length > 0,
      hasGastos: parseInt(adjustments.gastos_operativos) > 0,
      hasPrestamos: parseInt(adjustments.prestamos) > 0
    };

    setConfirmData(confirmationData);
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setError(null);
    setShowSuccessModal(false);
    setShowWarningModal(false);

    try {
      const excedentesArray = excedentes
        .filter(exc => (parseInt(exc.valor) || 0) > 0)
        .map(exc => ({
          tipo: exc.tipo,
          subtipo: exc.tipo === 'qr_transferencias' ? exc.subtipo : null,
          valor: parseInt(exc.valor) || 0
        }));

      const payload = {
        date: closingDate,
        timezone: 'America/Bogota',
        utc_offset: '-05:00',
        request_timestamp: getColombiaTimestamp(),
        coins: Object.fromEntries(Object.entries(coins).map(([k, v]) => [k, parseInt(v) || 0])),
        bills: Object.fromEntries(Object.entries(bills).map(([k, v]) => [k, parseInt(v) || 0])),
        excedentes: excedentesArray,
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
          tarjeta_credito: parseInt(metodosPago.tarjeta_credito) || 0
        }
      };

      const data = await submitCashClosing(payload);

      if (data.cash_count && data.cash_count.base) {
        const baseData = data.cash_count.base;
        const consignarData = data.cash_count.consignar;

        // Calcular totales de monedas y billetes para consignación
        const consignarCoins = consignarData?.consignar_monedas || {};
        const consignarBills = consignarData?.consignar_billetes || {};

        const totalConsignarCoins = Object.entries(consignarCoins).reduce((sum, [denom, qty]) => {
          return sum + (parseInt(denom) * parseInt(qty || 0));
        }, 0);

        const totalConsignarBills = Object.entries(consignarBills).reduce((sum, [denom, qty]) => {
          return sum + (parseInt(denom) * parseInt(qty || 0));
        }, 0);

        data.distribucion_caja = {
          cajaBase: {
            coins: baseData.base_monedas || {},
            bills: baseData.base_billetes || {},
            totalCoins: baseData.total_base_monedas || 0,
            totalBills: baseData.total_base_billetes || 0,
            total: baseData.total_base || 450000
          },
          consignacion: {
            coins: consignarCoins,
            bills: consignarBills,
            totalCoins: totalConsignarCoins,
            totalBills: totalConsignarBills,
            total: consignarData?.efectivo_para_consignar_final || 0
          }
        };
      }

      setResults(data);

      if (data.validation && data.validation.cierre_validado) {
        setShowSuccessModal(true);
      } else if (data.validation && !data.validation.cierre_validado) {
        setShowWarningModal(true);
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
    setShowConfirmModal(false);
    setConfirmData(null);
  };

  const handleLogout = () => {
    logout();
  };

  const generatePDF = async () => {
    if (!resultsRef.current) return;

    setGeneratingPDF(true);
    try {
      // Capturar el contenido HTML como imagen
      const canvas = await html2canvas(resultsRef.current, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Calcular dimensiones para ajustar a una sola página
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const imgAspectRatio = imgWidth / imgHeight;

      // Márgenes
      const margin = 5;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);

      // Escalar para que quepa en una página
      let finalWidth, finalHeight;

      if (imgAspectRatio > (availableWidth / availableHeight)) {
        // La imagen es más ancha, ajustar por ancho
        finalWidth = availableWidth;
        finalHeight = availableWidth / imgAspectRatio;
      } else {
        // La imagen es más alta, ajustar por alto
        finalHeight = availableHeight;
        finalWidth = availableHeight * imgAspectRatio;
      }

      // Centrar en la página
      const xPos = (pdfWidth - finalWidth) / 2;
      const yPos = (pdfHeight - finalHeight) / 2;

      // Agregar imagen ajustada a una sola página
      pdf.addImage(imgData, 'PNG', xPos, yPos, finalWidth, finalHeight);

      // Generar nombre del archivo con fecha
      const fileName = `Cierre_Caja_${results.request_date.replace(/\//g, '-')}.pdf`;

      // Guardar el PDF
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta nuevamente.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-4 sm:py-8 px-3 sm:px-4">
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
        {/* Header con información del usuario y hora de Colombia */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          {/* Fecha y Hora de Colombia */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-lg px-4 py-2 border-2 border-blue-300">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <div>
                <div className="text-xs font-medium opacity-90">Hora Colombia (UTC-5)</div>
                <div className="text-lg font-bold tabular-nums">{currentTime}</div>
                <div className="text-xs opacity-90">{formatDateStringToColombiaDate(date)}</div>
              </div>
            </div>
          </div>

          {/* Usuario y logout */}
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
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
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

          {/* Grid de 2 columnas: Métodos de Pago y Ajustes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Columna Izquierda: Métodos de Pago Registrados */}
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
                        value={formatNumberWithThousands(metodosPago.nequi_luz_helena)}
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
                        value={formatNumberWithThousands(metodosPago.daviplata_jose)}
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
                        value={formatNumberWithThousands(metodosPago.qr_julieth)}
                        onChange={(e) => setMetodosPago({ ...metodosPago, qr_julieth: handleNumericInput(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {totalTransferencias > 0 && (
                    <div className="pt-3 mt-3 border-t border-purple-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-purple-900">Total Transferencias (QR):</span>
                        <span className="text-base font-bold text-purple-700">{formatCurrency(totalTransferencias)}</span>
                      </div>
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
                        value={formatNumberWithThousands(metodosPago.addi_datafono)}
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
                        value={formatNumberWithThousands(metodosPago.tarjeta_debito)}
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
                        value={formatNumberWithThousands(metodosPago.tarjeta_credito)}
                        onChange={(e) => setMetodosPago({ ...metodosPago, tarjeta_credito: handleNumericInput(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {totalDatafono > 0 && (
                    <div className="pt-3 mt-3 border-t border-orange-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-orange-900">Total Datafono:</span>
                        <span className="text-base font-bold text-orange-700">{formatCurrency(totalDatafono)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Ajustes y Movimientos */}
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
                          value={formatNumberWithThousands(excedente.valor)}
                          onChange={(e) => actualizarValorExcedente(excedente.id, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="flex-1 sm:w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                          placeholder="$0"
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
                  value={formatNumberWithThousands(adjustments.gastos_operativos)}
                  onChange={(e) => setAdjustments({ ...adjustments, gastos_operativos: handleNumericInput(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base mb-2"
                  placeholder="$0"
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
                  value={formatNumberWithThousands(adjustments.prestamos)}
                  onChange={(e) => setAdjustments({ ...adjustments, prestamos: handleNumericInput(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base mb-2"
                  placeholder="$0"
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

        {/* Modal de Carga */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Procesando...</h3>
                <p className="text-gray-600">
                  Validando cierre con Alegra y calculando distribución
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmación */}
        {showConfirmModal && confirmData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <AlertCircle className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirmar Cierre de Caja</h3>
                <p className="text-sm text-gray-600">
                  Por favor, verifica los datos antes de continuar
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">Fecha:</span>
                  <span className="text-sm font-bold text-blue-600">
                    {formatDateStringToColombiaDate(confirmData.fecha)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-100">
                    <div className="text-xs text-gray-600 mb-1">Monedas</div>
                    <div className="text-base font-bold text-yellow-700">
                      {formatCurrency(confirmData.totalMonedas)}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                    <div className="text-xs text-gray-600 mb-1">Billetes</div>
                    <div className="text-base font-bold text-green-700">
                      {formatCurrency(confirmData.totalBilletes)}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-3 text-white">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Total en Caja:</span>
                    <span className="text-xl font-bold">{formatCurrency(confirmData.totalGeneral)}</span>
                  </div>
                </div>

                {confirmData.hasExcedentes && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Excedentes:</span>
                    <span className="font-semibold text-purple-600">{formatCurrency(confirmData.totalExcedentes)}</span>
                  </div>
                )}

                {confirmData.hasGastos && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Gastos operativos registrados</span>
                  </div>
                )}

                {confirmData.hasPrestamos && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Préstamos registrados</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-700 mb-6 text-center">
                ¿Está seguro que desea realizar el cierre con estos valores?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Advertencia */}
        {showWarningModal && results && results.validation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                  <AlertCircle className="w-10 h-10 text-yellow-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Diferencias Detectadas</h3>
                <p className="text-gray-600">
                  {results.validation.mensaje_validacion}
                </p>
              </div>

              {/* Diferencias */}
              {results.validation.diferencias && (
                <div className="space-y-4 mb-6">
                  {/* Transferencias */}
                  {results.validation.diferencias.transferencias && results.validation.diferencias.transferencias.es_significativa && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 mb-1">Diferencia en Transferencias</h4>
                          {results.validation.diferencias.transferencias.detalle && (
                            <p className="text-sm text-gray-600 mb-3 italic">{results.validation.diferencias.transferencias.detalle}</p>
                          )}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">Alegra:</span>
                              <span className="ml-2 font-semibold">{formatCurrency(results.validation.diferencias.transferencias.alegra)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Registrado:</span>
                              <span className="ml-2 font-semibold">{formatCurrency(results.validation.diferencias.transferencias.registrado)}</span>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-yellow-300">
                            <span className="text-sm font-bold text-yellow-800">
                              Diferencia: {results.validation.diferencias.transferencias.diferencia_formatted}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            Posible causa: Verifica los montos de Nequi, Daviplata, QR o Addi
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Datafono */}
                  {results.validation.diferencias.datafono && results.validation.diferencias.datafono.es_significativa && (
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 mb-1">Diferencia en Datafono</h4>
                          {results.validation.diferencias.datafono.detalle && (
                            <p className="text-sm text-gray-600 mb-3 italic">{results.validation.diferencias.datafono.detalle}</p>
                          )}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">Alegra:</span>
                              <span className="ml-2 font-semibold">{formatCurrency(results.validation.diferencias.datafono.alegra)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Registrado:</span>
                              <span className="ml-2 font-semibold">{formatCurrency(results.validation.diferencias.datafono.registrado)}</span>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-orange-300">
                            <span className="text-sm font-bold text-orange-800">
                              Diferencia: {results.validation.diferencias.datafono.diferencia_formatted}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            Posible causa: Verifica los montos de Tarjeta Débito o Tarjeta Crédito
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info: Datafono Real */}
                  {results.validation.diferencias.datafono_real && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-blue-900">Datafono Monto Real</h4>
                          <p className="text-xs text-blue-700 mt-1">{results.validation.diferencias.datafono_real.detalle}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-blue-900">
                            {results.validation.diferencias.datafono_real.total_formatted}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                >
                  Revisar
                </button>
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-3 rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-700 transition-all"
                >
                  Entendido
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
            <div ref={resultsRef} className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Resultados del Cierre</h2>

              {/* Sección de Validación */}
              {results.validation && (
                <div className={`mb-4 sm:mb-6 p-4 rounded-xl border-2 ${
                  results.validation.validation_status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : results.validation.validation_status === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {results.validation.validation_status === 'success' ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold mb-2 ${
                        results.validation.validation_status === 'success'
                          ? 'text-green-900'
                          : 'text-yellow-900'
                      }`}>
                        Estado de Validación
                      </h3>
                      <p className={`text-sm mb-3 ${
                        results.validation.validation_status === 'success'
                          ? 'text-green-800'
                          : 'text-yellow-800'
                      }`}>
                        {results.validation.mensaje_validacion}
                      </p>

                      {/* Mostrar diferencias si existen */}
                      {results.validation.diferencias && (
                        <div className="space-y-3">
                          <div className="grid sm:grid-cols-2 gap-3">
                            {/* Diferencias en Transferencias */}
                            {results.validation.diferencias.transferencias && results.validation.diferencias.transferencias.es_significativa && (
                              <div className="bg-white rounded-lg p-3 border border-yellow-200">
                                <h4 className="font-semibold text-sm text-gray-900 mb-1">Transferencias</h4>
                                {results.validation.diferencias.transferencias.detalle && (
                                  <p className="text-xs text-gray-600 mb-2 italic">{results.validation.diferencias.transferencias.detalle}</p>
                                )}
                                <div className="text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Alegra:</span>
                                    <span className="font-semibold">{formatCurrency(results.validation.diferencias.transferencias.alegra)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Registrado:</span>
                                    <span className="font-semibold">{formatCurrency(results.validation.diferencias.transferencias.registrado)}</span>
                                  </div>
                                  <div className="flex justify-between pt-1 border-t border-gray-200">
                                    <span className="text-gray-700 font-medium">Diferencia:</span>
                                    <span className="font-bold text-yellow-700">{results.validation.diferencias.transferencias.diferencia_formatted}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Diferencias en Datafono */}
                            {results.validation.diferencias.datafono && results.validation.diferencias.datafono.es_significativa && (
                              <div className="bg-white rounded-lg p-3 border border-yellow-200">
                                <h4 className="font-semibold text-sm text-gray-900 mb-1">Datafono</h4>
                                {results.validation.diferencias.datafono.detalle && (
                                  <p className="text-xs text-gray-600 mb-2 italic">{results.validation.diferencias.datafono.detalle}</p>
                                )}
                                <div className="text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Alegra:</span>
                                    <span className="font-semibold">{formatCurrency(results.validation.diferencias.datafono.alegra)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Registrado:</span>
                                    <span className="font-semibold">{formatCurrency(results.validation.diferencias.datafono.registrado)}</span>
                                  </div>
                                  <div className="flex justify-between pt-1 border-t border-gray-200">
                                    <span className="text-gray-700 font-medium">Diferencia:</span>
                                    <span className="font-bold text-yellow-700">{results.validation.diferencias.datafono.diferencia_formatted}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Datafono Real - NUEVO */}
                          {results.validation.diferencias.datafono_real && (
                            <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-sm text-blue-900 mb-1">Datafono Monto Real</h4>
                                  {results.validation.diferencias.datafono_real.detalle && (
                                    <p className="text-xs text-blue-700 italic">{results.validation.diferencias.datafono_real.detalle}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-blue-900">
                                    {results.validation.diferencias.datafono_real.total_formatted}
                                  </p>
                                  <p className="text-xs text-blue-700">Tarjetas + Addi</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Título de la sección */}
              <div className="mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-blue-900">Comparación de Métodos de Pago</h3>
              </div>

              {/* Grid de 2 columnas: Transferencias y Datafono lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                {/* Transferencias */}
                <div className="bg-white rounded-lg p-2 sm:p-3 border-2 border-purple-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-xs sm:text-sm">Transferencias</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-purple-50 rounded-md p-2 border border-purple-100">
                      <div className="text-gray-600 text-xs mb-0.5">Alegra:</div>
                      <div className="font-semibold text-purple-700">
                        {results.alegra.results.transfer.formatted}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-md p-2 border border-blue-100">
                      <div className="text-gray-600 text-xs mb-0.5">Registrado:</div>
                      <div className="font-semibold text-blue-700">
                        {formatCurrency(results.metodos_pago_registrados.total_transferencias_registradas)}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                    <div className="text-gray-600 mb-1 font-medium text-xs">Desglose:</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-white rounded px-2 py-1 border border-gray-100">
                        <span className="text-gray-600 text-xs">Nequi:</span>
                        <span className="ml-1 font-semibold text-xs">{formatCurrency(results.metodos_pago_registrados.nequi_luz_helena)}</span>
                      </div>
                      <div className="bg-white rounded px-2 py-1 border border-gray-100">
                        <span className="text-gray-600 text-xs">Daviplata:</span>
                        <span className="ml-1 font-semibold text-xs">{formatCurrency(results.metodos_pago_registrados.daviplata_jose)}</span>
                      </div>
                      <div className="bg-white rounded px-2 py-1 border border-gray-100">
                        <span className="text-gray-600 text-xs">QR:</span>
                        <span className="ml-1 font-semibold text-xs">{formatCurrency(results.metodos_pago_registrados.qr_julieth)}</span>
                      </div>
                      <div className="bg-white rounded px-2 py-1 border border-gray-100 flex items-center gap-1">
                        <span className="text-gray-600 text-xs">Addi:</span>
                        <span className="font-semibold text-xs">{formatCurrency(results.metodos_pago_registrados.addi_datafono)}</span>
                        <span className="text-xs px-1 bg-blue-100 text-blue-700 rounded">→ DF</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 italic">Alegra registra Addi como transferencia</p>
                  </div>
                </div>

                {/* Datafono */}
                <div className="bg-white rounded-lg p-2 sm:p-3 border-2 border-orange-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-xs sm:text-sm">Datafono (Validación Alegra)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-orange-50 rounded-md p-2 border border-orange-100">
                      <div className="text-gray-600 text-xs mb-0.5">Alegra (Déb + Créd):</div>
                      <div className="font-semibold text-orange-700">
                        {formatCurrency(
                          (results.alegra.results['debit-card']?.total || 0) +
                          (results.alegra.results['credit-card']?.total || 0)
                        )}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-md p-2 border border-blue-100">
                      <div className="text-gray-600 text-xs mb-0.5">Registrado (Solo Tarjetas):</div>
                      <div className="font-semibold text-blue-700">
                        {formatCurrency(results.metodos_pago_registrados.total_solo_tarjetas)}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-md p-2 border border-gray-200 mb-2">
                    <div className="text-gray-600 mb-1 font-medium text-xs">Desglose Tarjetas:</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-white rounded px-2 py-1 border border-gray-100">
                        <span className="text-gray-600 text-xs">T. Débito:</span>
                        <span className="ml-1 font-semibold text-xs">{formatCurrency(results.metodos_pago_registrados.tarjeta_debito)}</span>
                      </div>
                      <div className="bg-white rounded px-2 py-1 border border-gray-100">
                        <span className="text-gray-600 text-xs">T. Crédito:</span>
                        <span className="ml-1 font-semibold text-xs">{formatCurrency(results.metodos_pago_registrados.tarjeta_credito)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-md p-2 border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-700">Total Real Datafono:</span>
                      <span className="text-sm font-bold text-green-800">
                        {formatCurrency(results.metodos_pago_registrados.total_datafono_real)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 italic">Lo que llega al datafono (Tarjetas + Addi: {formatCurrency(results.metodos_pago_registrados.addi_datafono)})</p>
                  </div>
                </div>
              </div>

              {/* Resumen Alegra - 2 columnas alineadas con secciones superiores */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                {/* Columna Izquierda: Efectivo y Transferencia Alegra lado a lado */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {/* Efectivo Alegra */}
                  <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-100">
                    <div className="text-xs text-blue-600 font-medium mb-2">Efectivo Alegra</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-gray-600">Efectivo:</div>
                        <div className="text-sm font-bold text-blue-900">
                          {results.alegra.results.cash.formatted}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">A Consignar:</div>
                        <div className="text-sm font-bold text-green-700">
                          {results.cash_count.consignar.efectivo_para_consignar_final_formatted}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transferencia Alegra */}
                  <div className="bg-purple-50 rounded-lg p-2 sm:p-3 border border-purple-100">
                    <div className="text-xs text-purple-600 font-medium mb-2">Transferencia Alegra</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-gray-600">Total:</div>
                        <div className="text-sm font-bold text-purple-900">
                          {results.alegra.results.transfer.formatted}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Desglose:</div>
                        <div className="text-xs space-y-0.5">
                          {results.metodos_pago_registrados.nequi_luz_helena > 0 && (
                            <div className="font-semibold">Nequi: {formatCurrency(results.metodos_pago_registrados.nequi_luz_helena)}</div>
                          )}
                          {results.metodos_pago_registrados.daviplata_jose > 0 && (
                            <div className="font-semibold">Davi: {formatCurrency(results.metodos_pago_registrados.daviplata_jose)}</div>
                          )}
                          {results.metodos_pago_registrados.qr_julieth > 0 && (
                            <div className="font-semibold">QR: {formatCurrency(results.metodos_pago_registrados.qr_julieth)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Datafono Alegra */}
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-300">
                  <div className="text-xs text-gray-700 font-medium mb-2">Datafono Alegra</div>
                  <div className={`grid ${results.metodos_pago_registrados.addi_datafono > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-2 text-xs`}>
                    <div>
                      <div className="text-green-600">T. Débito:</div>
                      <div className="font-bold text-green-900">
                        {results.alegra.results['debit-card'].formatted}
                      </div>
                    </div>
                    <div>
                      <div className="text-orange-600">T. Crédito:</div>
                      <div className="font-bold text-orange-900">
                        {results.alegra.results['credit-card'].formatted}
                      </div>
                    </div>
                    {results.metodos_pago_registrados.addi_datafono > 0 && (
                      <div>
                        <div className="text-gray-600">Addi:</div>
                        <div className="font-semibold">{formatCurrency(results.metodos_pago_registrados.addi_datafono)}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-gray-700 font-medium">Total Datafono:</div>
                      <div className="font-bold text-green-700">{formatCurrency(results.metodos_pago_registrados.total_datafono_real)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid de 2 columnas: Ajustes a la izquierda, Totales a la derecha */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                {/* Columna Izquierda: Ajustes Aplicados */}
                <div className="bg-yellow-50 rounded-xl p-3 sm:p-4 border border-yellow-100 h-full flex flex-col">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">Ajustes Aplicados</h3>

                  <div className="flex-1 flex flex-col justify-between">
                    {results.excedentes_detalle && results.excedentes_detalle.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Excedentes:</div>
                        <div className="space-y-1.5">
                          {results.excedentes_detalle.map((exc, idx) => (
                            <div
                              key={idx}
                              className="flex items-center text-xs bg-white rounded-lg px-2 py-1.5 border border-gray-200"
                            >
                              <span className="text-gray-600 whitespace-nowrap">
                                {exc.tipo} {exc.subtipo && `(${exc.subtipo})`}:
                              </span>
                              <span className="flex-1 mx-2 border-b-2 border-dotted border-gray-300 min-w-[20px]"></span>
                              <span className="font-semibold text-gray-900 whitespace-nowrap bg-yellow-50 px-2 py-0.5 rounded">
                                {formatCurrency(exc.valor)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
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
                </div>

                {/* Columna Derecha: Totales apilados */}
                <div className="flex flex-col gap-2 sm:gap-3 h-full">
                  {/* TOTAL VENTA DEL DÍA */}
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 sm:p-6 text-white flex-1 flex flex-col justify-center">
                    <div className="text-xs sm:text-sm font-medium opacity-90 mb-1">TOTAL VENTA DEL DÍA</div>
                    <div className="text-2xl sm:text-4xl font-bold">{results.alegra.total_sale.formatted}</div>
                  </div>

                  {/* Total a Consignar */}
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 sm:p-6 text-white flex-1 flex flex-col justify-center">
                    <div className="text-xs sm:text-sm font-medium opacity-90 mb-1">Total a Consignar</div>
                    <div className="text-2xl sm:text-4xl font-bold">
                      {results.cash_count.consignar.efectivo_para_consignar_final_formatted}
                    </div>
                  </div>
                </div>
              </div>

              {/* Base y Consignar */}
              <div className="grid sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="bg-gray-50 rounded-xl p-2 sm:p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Base de Caja</h3>
                  <div className="space-y-1 text-xs sm:text-sm">
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
                    {results.cash_count.base.mensaje_base && (
                      <div className={`mt-2 p-2 rounded-lg text-xs ${
                        results.cash_count.base.base_status === 'exacto'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : results.cash_count.base.base_status === 'sobrante'
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        <div className="flex items-start gap-1">
                          {results.cash_count.base.base_status === 'exacto' ? (
                            <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          )}
                          <span className="font-medium">{getMensajeCajaBase(results.cash_count.base)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-2 sm:p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">A Consignar</h3>
                  <div className="space-y-1 text-xs sm:text-sm">
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

              {/* Distribución Detallada de Caja */}
              {results.distribucion_caja && (
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                    Distribución de Monedas y Billetes
                  </h2>

                  <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Caja Base - 450,000 */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-blue-900">💰 Caja Base (450,000)</h3>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-900">
                            {formatCurrency(results.distribucion_caja.cajaBase.total)}
                          </div>
                        </div>
                      </div>

                      {/* Monedas en Caja Base */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                          Monedas
                        </h4>
                        <div className="bg-white rounded-lg p-3 space-y-1.5">
                          {Object.entries(results.distribucion_caja.cajaBase.coins).map(([denom, qty]) => {
                            const cantidad = parseInt(qty || 0);
                            const valor = cantidad * parseInt(denom);
                            if (cantidad === 0) return null;
                            return (
                              <div key={denom} className="flex items-center text-xs">
                                <span className="text-gray-600 w-20">
                                  ${parseInt(denom).toLocaleString()}:
                                </span>
                                <span className="text-gray-900 font-semibold w-16 text-right">
                                  {cantidad} un.
                                </span>
                                <span className="flex-1 mx-2 border-b border-dotted border-gray-300"></span>
                                <span className="font-semibold text-gray-900 bg-yellow-50 px-2 py-0.5 rounded">
                                  {formatCurrency(valor)}
                                </span>
                              </div>
                            );
                          })}
                          <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-700">Subtotal Monedas:</span>
                            <span className="text-sm font-bold text-yellow-600">
                              {formatCurrency(results.distribucion_caja.cajaBase.totalCoins)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Billetes en Caja Base */}
                      <div>
                        <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Billetes
                        </h4>
                        <div className="bg-white rounded-lg p-3 space-y-1.5">
                          {Object.entries(results.distribucion_caja.cajaBase.bills).map(([denom, qty]) => {
                            const cantidad = parseInt(qty || 0);
                            const valor = cantidad * parseInt(denom);
                            if (cantidad === 0) return null;
                            return (
                              <div key={denom} className="flex items-center text-xs">
                                <span className="text-gray-600 w-20">
                                  ${parseInt(denom).toLocaleString()}:
                                </span>
                                <span className="text-gray-900 font-semibold w-16 text-right">
                                  {cantidad} un.
                                </span>
                                <span className="flex-1 mx-2 border-b border-dotted border-gray-300"></span>
                                <span className="font-semibold text-gray-900 bg-green-50 px-2 py-0.5 rounded">
                                  {formatCurrency(valor)}
                                </span>
                              </div>
                            );
                          })}
                          <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-700">Subtotal Billetes:</span>
                            <span className="text-sm font-bold text-green-600">
                              {formatCurrency(results.distribucion_caja.cajaBase.totalBills)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Para Consignación */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 sm:p-6 border-2 border-emerald-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-emerald-900">🏦 Para Consignación</h3>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-emerald-900">
                            {formatCurrency(results.distribucion_caja.consignacion.total)}
                          </div>
                        </div>
                      </div>

                      {/* Monedas para Consignación */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                          Monedas
                        </h4>
                        <div className="bg-white rounded-lg p-3 space-y-1.5">
                          {Object.entries(results.distribucion_caja.consignacion.coins).map(([denom, qty]) => {
                            const cantidad = parseInt(qty || 0);
                            const valor = cantidad * parseInt(denom);
                            if (cantidad === 0) return null;
                            return (
                              <div key={denom} className="flex items-center text-xs">
                                <span className="text-gray-600 w-20">
                                  ${parseInt(denom).toLocaleString()}:
                                </span>
                                <span className="text-gray-900 font-semibold w-16 text-right">
                                  {cantidad} un.
                                </span>
                                <span className="flex-1 mx-2 border-b border-dotted border-gray-300"></span>
                                <span className="font-semibold text-gray-900 bg-yellow-50 px-2 py-0.5 rounded">
                                  {formatCurrency(valor)}
                                </span>
                              </div>
                            );
                          })}
                          {results.distribucion_caja.consignacion.totalCoins === 0 ? (
                            <div className="text-xs text-gray-500 italic text-center py-2">
                              No hay monedas para consignar
                            </div>
                          ) : (
                            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                              <span className="text-xs font-semibold text-gray-700">Subtotal Monedas:</span>
                              <span className="text-sm font-bold text-yellow-600">
                                {formatCurrency(results.distribucion_caja.consignacion.totalCoins)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Billetes para Consignación */}
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Billetes
                        </h4>
                        <div className="bg-white rounded-lg p-3 space-y-1.5">
                          {Object.entries(results.distribucion_caja.consignacion.bills).map(([denom, qty]) => {
                            const cantidad = parseInt(qty || 0);
                            const valor = cantidad * parseInt(denom);
                            if (cantidad === 0) return null;
                            return (
                              <div key={denom} className="flex items-center text-xs">
                                <span className="text-gray-600 w-20">
                                  ${parseInt(denom).toLocaleString()}:
                                </span>
                                <span className="text-gray-900 font-semibold w-16 text-right">
                                  {cantidad} un.
                                </span>
                                <span className="flex-1 mx-2 border-b border-dotted border-gray-300"></span>
                                <span className="font-semibold text-gray-900 bg-green-50 px-2 py-0.5 rounded">
                                  {formatCurrency(valor)}
                                </span>
                              </div>
                            );
                          })}
                          {results.distribucion_caja.consignacion.totalBills === 0 ? (
                            <div className="text-xs text-gray-500 italic text-center py-2">
                              No hay billetes para consignar
                            </div>
                          ) : (
                            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                              <span className="text-xs font-semibold text-gray-700">Subtotal Billetes:</span>
                              <span className="text-sm font-bold text-green-600">
                                {formatCurrency(results.distribucion_caja.consignacion.totalBills)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resumen Total */}
                  <div className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white">
                    <div className="grid sm:grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs font-medium opacity-90 mb-1">Total en Caja Base</div>
                        <div className="text-xl font-bold">{formatCurrency(results.distribucion_caja.cajaBase.total)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium opacity-90 mb-1">Total a Consignar</div>
                        <div className="text-xl font-bold">{formatCurrency(results.distribucion_caja.consignacion.total)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium opacity-90 mb-1">Total Contado</div>
                        <div className="text-xl font-bold">
                          {formatCurrency(results.distribucion_caja.cajaBase.total + results.distribucion_caja.consignacion.total)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Info */}
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200 text-xs sm:text-sm text-gray-600">
                <div className="flex flex-col sm:flex-row justify-between gap-2">
                  <span>Usuario: {results.username_used}</span>
                  <span>Fecha: {results.request_date} {results.request_time}</span>
                </div>
              </div>
            </div>

            {/* Botón Generar PDF */}
            <div className="flex justify-center">
              <button
                onClick={generatePDF}
                disabled={generatingPDF}
                className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {generatingPDF ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generando PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Generar PDF
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

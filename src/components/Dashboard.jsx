import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Loader2, Plus, X, FileText, CreditCard, Download, Image, ChevronDown, Wallet, Landmark } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { submitCashClosing, getPreconsulta } from '../services/api';
import { getColombiaTodayString, formatColombiaDate, getColombiaTimestamp, formatDateStringToColombiaDate } from '../utils/dateUtils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import useDocumentTitle from '../hooks/useDocumentTitle';
import useDialog from '../hooks/useDialog';
import InvoicesSummaryBadge from './common/InvoicesSummaryBadge';
import VoidedInvoicesAlert from './common/VoidedInvoicesAlert';
import VoidedInvoicesModal from './common/VoidedInvoicesModal';
import { saveDraft, loadDraft, clearDraft } from '../utils/cashClosingDraft';
import { usePublishSceneData } from '../experience/store';

/* --- Presentación del formulario de cierre (sistema "Arqueo") ------------ */

const CLOSING_STEPS = [
  { id: 'paso-fecha', label: 'Fecha' },
  { id: 'paso-efectivo', label: 'Efectivo' },
  { id: 'paso-medios', label: 'Medios de pago' },
  { id: 'paso-ajustes', label: 'Ajustes' },
];

// Campo de formulario compartido por todo el cierre
const FIELD = 'block w-full px-3 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-300 hover:border-gray-300 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/10 outline-none disabled:bg-gray-50 disabled:text-gray-500';
const LABEL = 'block text-[13px] font-medium text-gray-600 mb-1.5';
const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 whitespace-nowrap';
// Fila del libro de denominaciones: valor | cantidad | subtotal
const LEDGER_ROW = 'grid grid-cols-[4.75rem_minmax(0,7.5rem)_1fr] sm:grid-cols-[5.5rem_minmax(0,8.5rem)_1fr] items-center gap-3 py-2';

const StepSection = ({ id, number, title, description, reveal, children }) => (
  <section
    id={id}
    aria-labelledby={`${id}-titulo`}
    className={`scroll-mt-24 bg-white rounded-2xl ring-1 ring-gray-900/[0.06] shadow-sm ${reveal ? 'animate-rise' : ''}`}
    style={reveal ? { '--i': reveal } : undefined}
  >
    <header className="flex items-start gap-3 px-5 sm:px-6 pt-5 sm:pt-6">
      <span className="mt-0.5 w-7 h-7 flex-shrink-0 rounded-full bg-gray-900 text-white font-display text-[13px] font-bold grid place-items-center">
        {number}
      </span>
      <div className="min-w-0">
        <h2 id={`${id}-titulo`} className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
    </header>
    <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-5">{children}</div>
  </section>
);

const InvoiceRange = ({ title, from, to, count }) => (
  <div>
    <div className="flex items-baseline justify-between gap-3 mb-1.5">
      <h4 className="text-[13px] font-semibold text-gray-700">{title}</h4>
      <span className="text-xs text-gray-500">{count}</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-white rounded-lg px-3 py-2 ring-1 ring-gray-900/[0.05]">
        <p className="text-[11px] text-gray-500">Factura Inicial</p>
        <p className="font-display text-base font-bold text-gray-900 truncate">{from}</p>
      </div>
      <div className="bg-white rounded-lg px-3 py-2 ring-1 ring-gray-900/[0.05]">
        <p className="text-[11px] text-gray-500">Factura Final</p>
        <p className="font-display text-base font-bold text-gray-900 truncate">{to}</p>
      </div>
    </div>
  </div>
);

const MethodTotal = ({ label, value, tone }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="flex items-center gap-2.5 text-sm text-gray-600">
      <span className={`w-1 h-4 rounded-full ${tone}`} aria-hidden="true" />
      {label}
    </dt>
    <dd className="text-[15px] font-semibold text-gray-900">{value}</dd>
  </div>
);

// Monto numérico de un total de la preconsulta ({ total, formatted })
const preTotal = (t) => (t && Number.isFinite(t.total) ? t.total : parseInt(String(t?.formatted || '').replace(/\D/g, ''), 10) || 0);

const ROOM_CAPTIONS = {
  'paso-fecha': ['Ventas del día en Alegra', 'Por medio de pago'],
  'paso-efectivo': ['Efectivo contado', 'Billetes y monedas por denominación'],
  'paso-medios': ['Registrado frente a Alegra', 'Transferencias y datáfono'],
  'paso-ajustes': ['Ajustes que salen de la caja', 'Excedentes, gastos y préstamos'],
};

/**
 * Ventana de la escena 3D del cierre (solo presentación). Es transparente: el
 * canvas WebGL, que vive detrás de toda la app, dibuja aquí adentro.
 */
const CashSceneWindow = ({ step, ready }) => {
  const [title, hint] = ready ? ROOM_CAPTIONS[step] || ROOM_CAPTIONS['paso-fecha'] : ['Esperando la preconsulta', 'Consulta Alegra para empezar'];
  return (
    <aside aria-hidden="true" className="cash-scene-aside self-stretch">
      <div
        data-scene-anchor="cash-window"
        className="sticky top-24 h-[min(calc(100dvh-8rem),720px)] rounded-3xl ring-1 ring-gray-900/[0.06] bg-gradient-to-b from-white/40 to-transparent"
      >
        <div key={title} className="absolute top-5 left-6 right-6 animate-fade-in-scale">
          <p className="text-[13px] font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
        </div>
      </div>
    </aside>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const resultsRef = useRef(null);

  // Establecer título de la página
  useDocumentTitle('Dashboard');

  // Si se llega desde el aviso de "cierre pendiente" (MainLayout redirige a
  // /dashboard?date=YYYY-MM-DD), precargar esa fecha en vez de la de hoy.
  // Se valida el formato y que no sea una fecha futura (misma regla que ya
  // aplica el selector de fecha manual más abajo).
  const [searchParams] = useSearchParams();
  const getInitialClosingDate = () => {
    const requested = searchParams.get('date');
    const today = getColombiaTodayString();
    if (requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested <= today) {
      return requested;
    }
    return today;
  };

  const [date, setDate] = useState(getInitialClosingDate());
  const [closingDate, setClosingDate] = useState(getInitialClosingDate());
  const [baseCaja, setBaseCaja] = useState(450000);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [validationWarning, setValidationWarning] = useState(null);
  const [isVoidedModalOpen, setIsVoidedModalOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState(null);
  const [draftRestoredNotice, setDraftRestoredNotice] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('jpeg');
  const [desfaseSugerido, setDesfaseSugerido] = useState(null);
  // Teclado en los modales: Escape = mismo botón Cerrar/Cancelar, foco atrapado
  // y devuelto al cerrar. El de carga no se puede cerrar (onClose = null).
  const successDialogRef = useDialog(showSuccessModal, () => setShowSuccessModal(false));
  const errorDialogRef = useDialog(Boolean(errorModalMessage), () => setErrorModalMessage(null));
  const loadingDialogRef = useDialog(loading);
  const confirmDialogRef = useDialog(showConfirmModal && Boolean(confirmData), () => setShowConfirmModal(false));
  const warningDialogRef = useDialog(showWarningModal && Boolean(results?.validation), () => setShowWarningModal(false));
  const [showDesfaseSection, setShowDesfaseSection] = useState(false);

  // Estados para la preconsulta
  const [preconsultaData, setPreconsultaData] = useState(null);
  const [preconsultaRealizada, setPreconsultaRealizada] = useState(false);
  const [loadingPreconsulta, setLoadingPreconsulta] = useState(false);
  const [errorPreconsulta, setErrorPreconsulta] = useState(null);

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
    prestamos_nota: '',
    desfase_tipo: '',
    desfase_valor: '',
    desfase_nota: ''
  });

  const [metodosPago, setMetodosPago] = useState({
    addi_datafono: '',
    nequi_luz_helena: '',
    daviplata_jose: '',
    qr_julieth: '',
    tarjeta_debito: '',
    tarjeta_credito: ''
  });

  // Autoguardado del borrador local: si se pierde la conexión o se recarga
  // la página a mitad del conteo, el trabajo ya ingresado no se pierde.
  useEffect(() => {
    if (!preconsultaRealizada) return;

    const timeoutId = setTimeout(() => {
      saveDraft(closingDate, { coins, bills, excedentes, adjustments, metodosPago, baseCaja });
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [preconsultaRealizada, closingDate, coins, bills, excedentes, adjustments, metodosPago, baseCaja]);

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

  // El backend envía 'exacta' (cash_calculator.py / responses.py); se acepta
  // también 'exacto' por compatibilidad. Antes solo se comparaba con 'exacto' y
  // la base exacta se mostraba en rojo como si fuera un problema.
  const isBaseExacta = (status) => status === 'exacta' || status === 'exacto';

  const getMensajeCajaBase = (baseData) => {
    if (!baseData || !baseData.base_status) return '';

    const status = baseData.base_status;
    const mensajeOriginal = baseData.mensaje_base || '';

    // Extraer el monto de diferencia del mensaje original si existe
    const match = mensajeOriginal.match(/\$[\d.,]+/);
    const montoStr = match ? match[0] : '';

    if (isBaseExacta(status)) {
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

  const limpiarDesfases = () => {
    setAdjustments({
      ...adjustments,
      desfase_tipo: '',
      desfase_valor: '',
      desfase_nota: ''
    });
    setDesfaseSugerido(null);
  };

  // Función para realizar la preconsulta a Alegra
  const handlePreconsulta = async () => {
    setLoadingPreconsulta(true);
    setErrorPreconsulta(null);

    try {
      const data = await getPreconsulta(closingDate);

      if (data.success) {
        setPreconsultaData(data);
        setPreconsultaRealizada(true);
        setErrorPreconsulta(null);

        // Restaurar borrador local si existe (ej. tras perder la conexión
        // o recargar la página a mitad del conteo de billetes)
        const draft = loadDraft(closingDate);
        if (draft) {
          if (draft.coins) setCoins(draft.coins);
          if (draft.bills) setBills(draft.bills);
          if (draft.excedentes) setExcedentes(draft.excedentes);
          if (draft.adjustments) setAdjustments(draft.adjustments);
          if (draft.metodosPago) setMetodosPago(draft.metodosPago);
          if (draft.baseCaja) setBaseCaja(draft.baseCaja);
          setDraftRestoredNotice(true);
        }
      } else {
        setErrorPreconsulta(data.error || 'Error al realizar la preconsulta');
        setPreconsultaRealizada(false);
      }
    } catch (err) {
      setErrorPreconsulta(err.message || 'Error de conexión al realizar la preconsulta');
      setPreconsultaRealizada(false);
    } finally {
      setLoadingPreconsulta(false);
    }
  };

  // Función para resetear la preconsulta (cuando cambia la fecha)
  const resetPreconsulta = () => {
    setPreconsultaData(null);
    setPreconsultaRealizada(false);
    setErrorPreconsulta(null);
    setDraftRestoredNotice(false);
  };

  // Si la URL cambia a otra fecha (ej. clic en el aviso fijo de "cierre
  // pendiente" estando ya en /dashboard) sincroniza el formulario con esa
  // fecha. El useState inicial de closingDate solo cubre la primera carga
  // de la página - React Router no remonta el componente al cambiar solo
  // el query string de la misma ruta, así que sin este efecto el segundo
  // clic en el aviso (sin recargar la página) no movería la fecha.
  useEffect(() => {
    const requested = searchParams.get('date');
    const today = getColombiaTodayString();
    if (requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested <= today && requested !== closingDate) {
      setDate(requested);
      setClosingDate(requested);
      resetPreconsulta();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = async () => {
    // Validar que haya al menos un valor en monedas o billetes
    const hasCoins = Object.values(coins).some(value => parseInt(value) > 0);
    const hasBills = Object.values(bills).some(value => parseInt(value) > 0);

    if (!hasCoins && !hasBills) {
      setValidationWarning('Debe ingresar al menos un valor en Monedas o en Billetes para realizar el cierre.');
      setTimeout(() => setValidationWarning(null), 5000); // Auto-cerrar después de 5 segundos
      return;
    }

    // Validar desfases si están presentes
    if (adjustments.desfase_tipo && adjustments.desfase_valor) {
      if (!adjustments.desfase_nota || adjustments.desfase_nota.trim().length < 4) {
        setValidationWarning('La nota del desfase debe tener al menos 4 caracteres explicando la causa y responsable.');
        setTimeout(() => setValidationWarning(null), 5000);
        return;
      }
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
        base_objetivo: parseInt(baseCaja) || 450000,
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

      // Agregar desfases si están registrados
      if (adjustments.desfase_tipo && adjustments.desfase_valor && adjustments.desfase_nota) {
        payload.desfases = [{
          tipo: adjustments.desfase_tipo,
          valor: parseInt(adjustments.desfase_valor) || 0,
          nota: adjustments.desfase_nota
        }];
      }

      const data = await submitCashClosing(payload);

      // El cierre se envió y procesó correctamente: ya no hace falta el borrador local
      clearDraft(closingDate);

      // Avisa a MainLayout (aviso fijo de "cierre pendiente") que esta fecha
      // ya tiene un cierre registrado, para que deje de mostrarla sin esperar
      // a la próxima navegación entre páginas.
      window.dispatchEvent(new CustomEvent('cash-closing-success', { detail: { date: closingDate } }));

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
        // Verificar si hay desfase detectado
        if (data.validation.desfase_sugerido && data.validation.desfase_sugerido.detectado) {
          setDesfaseSugerido(data.validation.desfase_sugerido);
          setShowDesfaseSection(true);

          // Auto-rellenar el formulario de desfases
          setAdjustments(prev => ({
            ...prev,
            desfase_tipo: data.validation.desfase_sugerido.tipo,
            desfase_valor: data.validation.desfase_sugerido.valor.toString()
          }));

          // Scroll a la sección de desfases después de un breve delay
          setTimeout(() => {
            const desfaseNotaElement = document.getElementById('desfase-nota');
            if (desfaseNotaElement) {
              desfaseNotaElement.focus();
              desfaseNotaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        }
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
    setAdjustments({
      gastos_operativos: '',
      gastos_operativos_nota: '',
      prestamos: '',
      prestamos_nota: '',
      desfase_tipo: '',
      desfase_valor: '',
      desfase_nota: ''
    });
    setDesfaseSugerido(null);
    setShowDesfaseSection(false);
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
      setErrorModalMessage('Error al generar el PDF. Por favor, intenta nuevamente.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const downloadImage = async () => {
    if (!resultsRef.current) return;

    setGeneratingImage(true);
    try {
      // Capturar el contenido HTML como imagen con mayor calidad
      const canvas = await html2canvas(resultsRef.current, {
        scale: 2.5, // Mayor escala para mejor calidad
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Convertir canvas a blob para mejor compresión
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('No se pudo generar la imagen');
        }

        // Crear URL del blob
        const url = URL.createObjectURL(blob);

        // Crear link de descarga
        const link = document.createElement('a');
        const fileName = `Cierre_Caja_${results.request_date.replace(/\//g, '-')}.png`;
        link.href = url;
        link.download = fileName;

        // Ejecutar descarga
        document.body.appendChild(link);
        link.click();

        // Limpiar
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setGeneratingImage(false);
      }, 'image/png', 0.95); // PNG con calidad 95%
    } catch (error) {
      console.error('Error generando imagen:', error);
      setErrorModalMessage('Error al generar la imagen. Por favor, intenta nuevamente.');
      setGeneratingImage(false);
    }
  };

  const downloadJPEG = async () => {
    if (!resultsRef.current) return;

    setGeneratingImage(true);
    try {
      // Capturar el contenido HTML como imagen con alta calidad
      const canvas = await html2canvas(resultsRef.current, {
        scale: 3.0, // Escala alta para máxima calidad en JPEG
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Convertir canvas a blob JPEG con alta calidad
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('No se pudo generar la imagen JPEG');
        }

        // Crear URL del blob
        const url = URL.createObjectURL(blob);

        // Crear link de descarga
        const link = document.createElement('a');
        const fileName = `Cierre_Caja_${results.request_date.replace(/\//g, '-')}.jpeg`;
        link.href = url;
        link.download = fileName;

        // Ejecutar descarga
        document.body.appendChild(link);
        link.click();

        // Limpiar
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setGeneratingImage(false);
      }, 'image/jpeg', 0.95); // JPEG con calidad 95%
    } catch (error) {
      console.error('Error generando imagen JPEG:', error);
      setErrorModalMessage('Error al generar la imagen JPEG. Por favor, intenta nuevamente.');
      setGeneratingImage(false);
    }
  };

  const handleDownload = () => {
    switch (downloadFormat) {
      case 'jpeg':
        downloadJPEG();
        break;
      case 'png':
        downloadImage();
        break;
      case 'pdf':
        generatePDF();
        break;
      default:
        downloadJPEG();
    }
  };

  // Paso visible del formulario (para la navegación contextual de pasos).
  // IntersectionObserver: sin listeners de scroll.
  const [activeStep, setActiveStep] = useState(CLOSING_STEPS[0].id);
  useEffect(() => {
    if (!preconsultaRealizada || typeof IntersectionObserver === 'undefined') return;
    const sections = CLOSING_STEPS.map((s) => document.getElementById(s.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveStep(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px' }
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [preconsultaRealizada]);

  // --- Escena WebGL (solo lectura): valores que la página YA calcula ---
  const sceneCash = useMemo(() => ({
    step: activeStep,
    preconsulta: preconsultaRealizada && preconsultaData?.totales ? {
      efectivo: preTotal(preconsultaData.totales.efectivo),
      transferencia: preTotal(preconsultaData.totales.transferencia),
      debito: preTotal(preconsultaData.totales.tarjeta_debito),
      credito: preTotal(preconsultaData.totales.tarjeta_credito),
    } : null,
    coins,
    bills,
    registrado: { transferencias: totalTransferencias, datafono: totalDatafono },
    ajustes: {
      excedentes: totalExcedentes,
      gastos: parseInt(adjustments.gastos_operativos, 10) || 0,
      prestamos: parseInt(adjustments.prestamos, 10) || 0,
    },
    total: totalGeneral,
    submitting: loading,
    outcome: results?.validation ? (results.validation.cierre_validado ? 'ok' : 'diff') : null,
  }), [activeStep, preconsultaRealizada, preconsultaData, coins, bills, totalTransferencias, totalDatafono,
    totalExcedentes, adjustments.gastos_operativos, adjustments.prestamos, totalGeneral, loading, results]);
  usePublishSceneData('cash', sceneCash);

  return (
    <div className="relative">
      {/* Notificación de Validación - Popup Superior */}
      {validationWarning && (
        <div role="alert" className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md animate-slide-down">
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl p-4 pr-2 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-sans text-sm font-semibold tracking-normal">Revisa antes de continuar</h3>
              <p className="text-sm text-gray-300 mt-1 leading-relaxed">{validationWarning}</p>
            </div>
            <button
              onClick={() => setValidationWarning(null)}
              className="w-10 h-10 -mt-1.5 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Notificación de Borrador Recuperado */}
      {draftRestoredNotice && (
        <div role="status" className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md animate-slide-down">
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl p-4 pr-2 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-sans text-sm font-semibold tracking-normal">Borrador recuperado</h3>
              <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                Se restauraron los valores que habías ingresado antes de perder la conexión o recargar la página.
              </p>
            </div>
            <button
              onClick={() => setDraftRestoredNotice(false)}
              className="w-10 h-10 -mt-1.5 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Encabezado de página */}
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <p className="text-sm font-medium text-gray-500">Arqueo y conciliación con Alegra</p>
            <h1 className="mt-1 text-[2rem] sm:text-4xl lg:text-[2.75rem] font-bold text-gray-900 leading-[1.05]">
              Cierre diario de caja
            </h1>
          </div>

          {/* Navegación contextual entre pasos (desktop): resalta el paso visible */}
          {preconsultaRealizada && (
            <nav aria-label="Pasos del cierre" className="hidden lg:block">
              <ol className="flex items-center gap-1 p-1 rounded-full bg-white ring-1 ring-gray-900/[0.06] shadow-sm">
                {CLOSING_STEPS.map((step, index) => {
                  const current = activeStep === step.id;
                  return (
                    <li key={step.id}>
                      <a
                        href={`#${step.id}`}
                        aria-current={current ? 'step' : undefined}
                        className={`flex items-center gap-2 h-9 pl-1.5 pr-3.5 rounded-full text-[13px] font-medium transition-colors ${
                          current ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold ${current ? 'bg-white/15' : 'bg-gray-100'}`}>
                          {index + 1}
                        </span>
                        {step.label}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
        </header>

        <div className="cash-layout">
        <div className="space-y-4 sm:space-y-5 min-w-0">
          {/* PASO 1 - Fecha del Cierre + preconsulta */}
          <StepSection id="paso-fecha" number={1} title="Fecha del cierre" description="Consulta primero lo que Alegra registró ese día.">
            <div className="grid sm:grid-cols-[minmax(0,1fr)_auto] gap-3">
              <div>
                <label htmlFor="closing-date" className="sr-only">Fecha del cierre</label>
                <input
                  id="closing-date"
                  type="date"
                  value={closingDate}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    const today = getColombiaTodayString();

                    if (selectedDate > today) {
                      setValidationWarning('No se pueden seleccionar fechas futuras. Se ha establecido la fecha de hoy.');
                      setClosingDate(today);
                      setTimeout(() => setValidationWarning(null), 5000);
                    } else {
                      setClosingDate(selectedDate);
                      resetPreconsulta(); // Resetear preconsulta al cambiar fecha
                    }
                  }}
                  max={getColombiaTodayString()}
                  aria-label="Fecha del cierre de caja"
                  className={`${FIELD} h-12 text-base font-medium`}
                  required
                />
              </div>

              {/* Botón de Preconsulta */}
              {!preconsultaRealizada && (
                <button
                  onClick={handlePreconsulta}
                  disabled={loadingPreconsulta}
                  className={`${BTN_PRIMARY} h-12 px-6 text-[15px]`}
                >
                  {loadingPreconsulta ? (
                    <>
                      <Loader2 className="w-[18px] h-[18px] animate-spin" />
                      Consultando Alegra…
                    </>
                  ) : (
                    <>
                      <FileText className="w-[18px] h-[18px]" />
                      Realizar Preconsulta
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Carga de la preconsulta: esqueleto con la forma del resultado */}
            {loadingPreconsulta && (
              <div className="mt-5 grid md:grid-cols-2 gap-4" aria-hidden="true">
                <div className="space-y-3"><div className="skeleton h-5 w-1/2" /><div className="skeleton h-12" /><div className="skeleton h-12" /></div>
                <div className="space-y-3"><div className="skeleton h-5 w-1/3" /><div className="skeleton h-9" /><div className="skeleton h-9" /><div className="skeleton h-12" /></div>
              </div>
            )}

            {/* Error de preconsulta */}
            {!preconsultaRealizada && errorPreconsulta && (
              <div role="alert" className="mt-4 p-3.5 bg-red-50 ring-1 ring-red-200 rounded-xl flex items-start gap-2.5 text-red-800">
                <AlertCircle className="w-[18px] h-[18px] flex-shrink-0 mt-px" />
                <p className="text-sm">{errorPreconsulta}</p>
              </div>
            )}

            {/* Datos de la Preconsulta */}
            {preconsultaRealizada && preconsultaData && (
              <div className="mt-5 animate-rise rounded-xl bg-gray-50 ring-1 ring-gray-900/[0.05] overflow-hidden">
                <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-gray-200/70">
                  <CheckCircle2 className="w-[18px] h-[18px] text-emerald-600" />
                  <h3 className="font-sans text-sm font-semibold text-gray-900 tracking-normal">Datos de Alegra</h3>
                  <span className="text-sm text-gray-500">{preconsultaData.date}</span>
                </div>

                <div className="grid md:grid-cols-2 md:divide-x divide-gray-200/70">
                  {/* Facturación */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {preconsultaData.facturacion_electronica && preconsultaData.facturacion_electronica.cantidad > 0 && (
                      <InvoiceRange
                        title="Facturación Electrónica"
                        from={preconsultaData.facturacion_electronica.factura_inicial || 'N/A'}
                        to={preconsultaData.facturacion_electronica.factura_final || 'N/A'}
                        count={`${preconsultaData.facturacion_electronica.cantidad} facturas electrónicas`}
                      />
                    )}
                    {preconsultaData.facturacion_principal && preconsultaData.facturacion_principal.cantidad > 0 && (
                      <InvoiceRange
                        title="Facturación Principal"
                        from={preconsultaData.facturacion_principal.factura_inicial || 'N/A'}
                        to={preconsultaData.facturacion_principal.factura_final || 'N/A'}
                        count={`${preconsultaData.facturacion_principal.cantidad} facturas principales`}
                      />
                    )}
                    <div className="flex items-baseline justify-between pt-3 border-t border-gray-200/70">
                      <span className="text-sm text-gray-600">Total facturas activas</span>
                      <span className="font-display text-xl font-bold text-gray-900">{preconsultaData.cantidad_facturas}</span>
                    </div>
                    {preconsultaData.facturas_anuladas > 0 && (
                      <div className="flex items-baseline justify-between -mt-2 text-orange-700">
                        <span className="text-xs">Facturas anuladas</span>
                        <span className="text-sm font-semibold">{preconsultaData.facturas_anuladas}</span>
                      </div>
                    )}
                  </div>

                  {/* Totales por método de pago */}
                  <div className="p-4 sm:p-5 border-t md:border-t-0 border-gray-200/70">
                    <dl className="space-y-2.5">
                      <MethodTotal label="Efectivo" value={preconsultaData.totales.efectivo.formatted} tone="bg-blue-600" />
                      <MethodTotal label="Transferencia" value={preconsultaData.totales.transferencia.formatted} tone="bg-purple-600" />
                      <MethodTotal label="Tarjeta Débito" value={preconsultaData.totales.tarjeta_debito.formatted} tone="bg-orange-500" />
                      <MethodTotal label="Tarjeta Crédito" value={preconsultaData.totales.tarjeta_credito.formatted} tone="bg-pink-500" />
                    </dl>
                    <div className="mt-4 flex items-baseline justify-between gap-3 rounded-xl bg-gray-900 text-white px-4 py-3.5">
                      <span className="text-sm text-gray-300">Total ventas del día</span>
                      <span className="font-display text-2xl font-bold">{preconsultaData.total_ventas.formatted}</span>
                    </div>
                  </div>
                </div>

                {/* Botón para hacer nueva consulta */}
                <div className="px-4 sm:px-5 py-2.5 border-t border-gray-200/70 flex justify-end">
                  <button
                    onClick={resetPreconsulta}
                    className="min-h-[40px] px-3 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 transition-colors"
                  >
                    Cambiar fecha / Nueva consulta
                  </button>
                </div>
              </div>
            )}
          </StepSection>

          {/* El resto del formulario solo se muestra si la preconsulta fue realizada */}
          {preconsultaRealizada && (
            <>
          {/* PASO 2 - Monedas y Billetes */}
          <StepSection id="paso-efectivo" number={2} title="Efectivo contado" description="Cantidad de monedas y billetes por denominación." reveal={1}>
            <div className="grid lg:grid-cols-2 gap-x-10 gap-y-8">
              <div>
                <h3 className="font-sans text-[13px] font-semibold text-gray-500 tracking-normal mb-2">Monedas</h3>
                <div className="divide-y divide-gray-100">
                  {Object.keys(coins).map((denom) => (
                    <div key={denom} className={LEDGER_ROW}>
                      <label htmlFor={`coin-${denom}`} className="font-display text-[15px] font-semibold text-gray-900">
                        ${parseInt(denom).toLocaleString()}
                      </label>
                      <input
                        id={`coin-${denom}`}
                        type="text"
                        inputMode="numeric"
                        value={coins[denom]}
                        onChange={(e) => setCoins({ ...coins, [denom]: handleNumericInput(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        maxLength="9"
                        aria-label={`Cantidad de monedas de $${parseInt(denom).toLocaleString()}`}
                        className={`${FIELD} h-11 text-center text-base font-semibold`}
                        placeholder="0"
                      />
                      <span className={`text-right text-sm font-medium ${(parseInt(coins[denom]) || 0) > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                        {formatCurrency(parseInt(denom) * (parseInt(coins[denom]) || 0))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-3 border-t-2 border-gray-900 flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-gray-700">Total Monedas</span>
                  <span className="font-display text-xl font-bold text-gray-900">{formatCurrency(totalCoins)}</span>
                </div>
              </div>

              <div>
                <h3 className="font-sans text-[13px] font-semibold text-gray-500 tracking-normal mb-2">Billetes</h3>
                <div className="divide-y divide-gray-100">
                  {Object.keys(bills).map((denom) => (
                    <div key={denom} className={LEDGER_ROW}>
                      <label htmlFor={`bill-${denom}`} className="font-display text-[15px] font-semibold text-gray-900">
                        ${parseInt(denom).toLocaleString()}
                      </label>
                      <input
                        id={`bill-${denom}`}
                        type="text"
                        inputMode="numeric"
                        value={bills[denom]}
                        onChange={(e) => setBills({ ...bills, [denom]: handleNumericInput(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        maxLength="9"
                        aria-label={`Cantidad de billetes de $${parseInt(denom).toLocaleString()}`}
                        className={`${FIELD} h-11 text-center text-base font-semibold`}
                        placeholder="0"
                      />
                      <span className={`text-right text-sm font-medium ${(parseInt(bills[denom]) || 0) > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                        {formatCurrency(parseInt(denom) * (parseInt(bills[denom]) || 0))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-3 border-t-2 border-gray-900 flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-gray-700">Total Billetes</span>
                  <span className="font-display text-xl font-bold text-gray-900">{formatCurrency(totalBills)}</span>
                </div>
              </div>
            </div>
          </StepSection>

          {/* Vitrina móvil de la escena 3D: las pilas del efectivo contado */}
          <div
            aria-hidden="true"
            data-scene-anchor="cash-window"
            data-scene-room="1"
            className="cash-vitrina h-36 -my-1"
          />

          {/* PASO 3 y 4 - Métodos de Pago y Ajustes (apilados: la columna derecha es la escena) */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5 items-start">
            {/* Métodos de Pago Registrados */}
            <StepSection id="paso-medios" number={3} title="Registro de Métodos de Pago" description="Lo que entró por transferencias y datáfono." reveal={2}>
              <div className="space-y-6">
                {/* Transferencias */}
                <fieldset>
                  <legend className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-3">
                    <span className="w-1 h-3.5 rounded-full bg-purple-600" aria-hidden="true" />
                    Transferencias (QR)
                  </legend>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="pago-nequi" className={LABEL}>Nequi</label>
                      <input
                        id="pago-nequi"
                        type="text"
                        inputMode="numeric"
                        value={formatNumberWithThousands(metodosPago.nequi_luz_helena)}
                        onChange={(e) => setMetodosPago({ ...metodosPago, nequi_luz_helena: handleNumericInput(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        maxLength="9"
                        className={`${FIELD} h-11 text-right`}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="pago-daviplata" className={LABEL}>Daviplata</label>
                      <input
                        id="pago-daviplata"
                        type="text"
                        inputMode="numeric"
                        value={formatNumberWithThousands(metodosPago.daviplata_jose)}
                        onChange={(e) => setMetodosPago({ ...metodosPago, daviplata_jose: handleNumericInput(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        maxLength="9"
                        className={`${FIELD} h-11 text-right`}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="pago-qr" className={LABEL}>Transferencias (QR)</label>
                      <input
                        id="pago-qr"
                        type="text"
                        inputMode="numeric"
                        value={formatNumberWithThousands(metodosPago.qr_julieth)}
                        onChange={(e) => setMetodosPago({ ...metodosPago, qr_julieth: handleNumericInput(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        maxLength="9"
                        className={`${FIELD} h-11 text-right`}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {totalTransferencias > 0 && (
                    <div className="mt-3 flex justify-between items-baseline text-sm animate-fade-in-scale">
                      <span className="text-gray-600">Total Transferencias (QR)</span>
                      <span className="font-display text-base font-bold text-gray-900">{formatCurrency(totalTransferencias)}</span>
                    </div>
                  )}
                </fieldset>

                {/* Datafono */}
                <div className="pt-5 border-t border-gray-100">
                <fieldset>
                  <legend className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-3">
                    <span className="w-1 h-3.5 rounded-full bg-orange-500" aria-hidden="true" />
                    Datafono
                  </legend>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="pago-addi" className={LABEL}>Addi (Datafono)</label>
                      <input
                        id="pago-addi"
                        type="text"
                        inputMode="numeric"
                        value={formatNumberWithThousands(metodosPago.addi_datafono)}
                        onChange={(e) => setMetodosPago({ ...metodosPago, addi_datafono: handleNumericInput(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        maxLength="9"
                        className={`${FIELD} h-11 text-right`}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="pago-debito" className={LABEL}>Tarjeta Débito (Datafono)</label>
                      <input
                        id="pago-debito"
                        type="text"
                        inputMode="numeric"
                        value={formatNumberWithThousands(metodosPago.tarjeta_debito)}
                        onChange={(e) => setMetodosPago({ ...metodosPago, tarjeta_debito: handleNumericInput(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        maxLength="9"
                        className={`${FIELD} h-11 text-right`}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="pago-credito" className={LABEL}>Tarjeta Crédito (Datafono)</label>
                      <input
                        id="pago-credito"
                        type="text"
                        inputMode="numeric"
                        value={formatNumberWithThousands(metodosPago.tarjeta_credito)}
                        onChange={(e) => setMetodosPago({ ...metodosPago, tarjeta_credito: handleNumericInput(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        maxLength="9"
                        className={`${FIELD} h-11 text-right`}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {totalDatafono > 0 && (
                    <div className="mt-3 flex justify-between items-baseline text-sm animate-fade-in-scale">
                      <span className="text-gray-600">Total Datafono</span>
                      <span className="font-display text-base font-bold text-gray-900">{formatCurrency(totalDatafono)}</span>
                    </div>
                  )}
                </fieldset>
                </div>
              </div>
            </StepSection>

            {/* Ajustes y Movimientos */}
            <StepSection id="paso-ajustes" number={4} title="Ajustes y Movimientos" description="Excedentes, gastos, préstamos y desfases del día." reveal={3}>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-semibold text-gray-700">
                    Excedentes <span className="font-normal text-gray-500">(opcional)</span>
                  </span>
                  {excedentes.length < 3 && (
                    <button
                      type="button"
                      onClick={agregarExcedente}
                      className="flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-semibold text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {excedentes.map((excedente) => (
                    <div key={excedente.id} className="animate-fade-in-scale p-2.5 bg-gray-50 rounded-xl ring-1 ring-gray-900/[0.04]">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 min-w-0">
                          <select
                            value={excedente.tipo}
                            onChange={(e) => actualizarTipoExcedente(excedente.id, e.target.value)}
                            aria-label="Tipo de excedente"
                            className={`${FIELD} h-11`}
                          >
                            {tiposExcedente.map(tipo => (
                              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                            ))}
                          </select>
                        </div>
                        {excedente.tipo === 'qr_transferencias' && (
                          <div className="flex-1 min-w-0">
                            <select
                              value={excedente.subtipo}
                              onChange={(e) => actualizarSubtipoExcedente(excedente.id, e.target.value)}
                              aria-label="Subtipo de transferencia del excedente"
                              className={`${FIELD} h-11`}
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
                            maxLength="9"
                            aria-label="Valor del excedente"
                            className={`${FIELD} h-11 flex-1 sm:w-32 text-right`}
                            placeholder="$0"
                          />
                          {excedentes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => eliminarExcedente(excedente.id)}
                              className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              aria-label="Quitar excedente"
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
                  <div className="mt-3 flex justify-between items-baseline text-sm">
                    <span className="text-gray-600">Total Excedentes</span>
                    <span className="font-display text-base font-bold text-gray-900">{formatCurrency(totalExcedentes)}</span>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-5 border-t border-gray-100">
                <div>
                  <label htmlFor="gastos-operativos" className={LABEL}>
                    Gastos Operativos
                  </label>
                  <input
                    id="gastos-operativos"
                    type="text"
                    inputMode="numeric"
                    value={formatNumberWithThousands(adjustments.gastos_operativos)}
                    onChange={(e) => setAdjustments({ ...adjustments, gastos_operativos: handleNumericInput(e.target.value) })}
                    onFocus={(e) => e.target.select()}
                    maxLength="9"
                    className={`${FIELD} h-11 text-right mb-2`}
                    placeholder="$0"
                  />
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={adjustments.gastos_operativos_nota}
                      onChange={(e) => setAdjustments({ ...adjustments, gastos_operativos_nota: e.target.value })}
                      aria-label="Nota explicativa de gastos operativos"
                      className={`${FIELD} h-11 pl-9 text-sm`}
                      placeholder="Nota: ej. Compra de papelería…"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="prestamos" className={LABEL}>
                    Préstamos
                  </label>
                  <input
                    id="prestamos"
                    type="text"
                    inputMode="numeric"
                    value={formatNumberWithThousands(adjustments.prestamos)}
                    onChange={(e) => setAdjustments({ ...adjustments, prestamos: handleNumericInput(e.target.value) })}
                    onFocus={(e) => e.target.select()}
                    maxLength="9"
                    className={`${FIELD} h-11 text-right mb-2`}
                    placeholder="$0"
                  />
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={adjustments.prestamos_nota}
                      onChange={(e) => setAdjustments({ ...adjustments, prestamos_nota: e.target.value })}
                      aria-label="Nota explicativa de préstamos"
                      className={`${FIELD} h-11 pl-9 text-sm`}
                      placeholder="Nota: ej. Préstamo a María…"
                    />
                  </div>
                </div>

                {/* Botón para mostrar/ocultar sección de desfases manualmente */}
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => setShowDesfaseSection(!showDesfaseSection)}
                    aria-expanded={showDesfaseSection}
                    className={`w-full flex items-center justify-between gap-3 min-h-[48px] px-4 rounded-xl text-sm font-medium transition-colors ${
                      showDesfaseSection ? 'bg-gray-100 text-gray-700 hover:bg-gray-200/70' : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {showDesfaseSection ? 'Ocultar sección de desfases' : '¿Necesitas registrar un desfase?'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDesfaseSection ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Sección de Desfases */}
                {showDesfaseSection && (
                  <div className="sm:col-span-2 animate-fade-in-scale origin-top rounded-xl ring-1 ring-amber-200 bg-amber-50/40 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] font-semibold text-gray-800">
                        Desfases en Caja
                      </span>
                      <button aria-label="Limpiar campos de desfases"
                        type="button"
                        onClick={limpiarDesfases}
                        className="flex items-center gap-1 h-9 px-3 text-xs font-semibold text-red-700 rounded-full hover:bg-red-50 transition-colors"
                        title="Limpiar campos de desfases"
                      >
                        <X className="w-3.5 h-3.5" />
                        Limpiar
                      </button>
                    </div>

                    {/* Alerta de desfase detectado */}
                    {desfaseSugerido && (
                      <div role="alert" className="mb-4 p-3.5 bg-amber-100/70 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-px" />
                        <div className="flex-1">
                          <h3 className="font-sans text-sm font-semibold text-amber-900 tracking-normal mb-0.5">
                            Desfase detectado
                          </h3>
                          <p className="text-sm text-amber-900/80">
                            {desfaseSugerido.mensaje}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Tipo de Desfase */}
                      <div>
                        <label htmlFor="desfase-tipo" className={LABEL}>
                          Tipo de Desfase
                        </label>
                        <select
                          id="desfase-tipo"
                          value={adjustments.desfase_tipo}
                          onChange={(e) => setAdjustments({ ...adjustments, desfase_tipo: e.target.value })}
                          className={`${FIELD} h-11`}
                          disabled={desfaseSugerido !== null}
                        >
                          <option value="">Seleccionar tipo…</option>
                          <option value="faltante_caja">Faltante en Caja</option>
                          <option value="sobrante_caja">Sobrante en Caja</option>
                        </select>
                      </div>

                      {/* Valor del Desfase */}
                      <div>
                        <label htmlFor="desfase-valor" className={LABEL}>
                          Valor del Desfase (COP)
                        </label>
                        <input
                          id="desfase-valor"
                          type="text"
                          inputMode="numeric"
                          value={formatNumberWithThousands(adjustments.desfase_valor)}
                          onChange={(e) => setAdjustments({ ...adjustments, desfase_valor: handleNumericInput(e.target.value) })}
                          onFocus={(e) => e.target.select()}
                          maxLength="9"
                          className={`${FIELD} h-11 text-right`}
                          placeholder="$0"
                          disabled={desfaseSugerido !== null}
                        />
                      </div>

                      {/* Nota Explicativa */}
                      <div>
                        <label htmlFor="desfase-nota" className={LABEL}>
                          Nota Explicativa (Responsable/Causa) *
                        </label>
                        <textarea
                          id="desfase-nota"
                          value={adjustments.desfase_nota}
                          onChange={(e) => setAdjustments({ ...adjustments, desfase_nota: e.target.value })}
                          className={`${FIELD} py-2.5 text-sm resize-none`}
                          placeholder="Ej: Faltante por error en vueltas - Responsable: María González"
                          rows="3"
                          minLength="4"
                          aria-describedby="desfase-nota-ayuda"
                        />
                        <p id="desfase-nota-ayuda" className="mt-1.5 text-xs text-gray-500">
                          Mínimo 4 caracteres. Explica la causa y responsable del desfase.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </StepSection>
          </div>

          {/* Base de Caja + Limpiar (fuera de la cinta para no saturarla en móvil) */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <label htmlFor="base-caja" className="text-sm text-gray-600 whitespace-nowrap font-medium">Base Caja</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                <input
                  id="base-caja"
                  type="text"
                  inputMode="numeric"
                  value={baseCaja.toLocaleString('es-CO')}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^\d]/g, '');
                    const parsedValue = parseInt(numericValue) || 0;
                    if (parsedValue >= 0 && parsedValue <= 10000000) {
                      setBaseCaja(parsedValue);
                    }
                  }}
                  onFocus={(e) => {
                    e.target.value = baseCaja.toString();
                    e.target.select();
                  }}
                  onBlur={(e) => {
                    const numericValue = e.target.value.replace(/[^\d]/g, '');
                    const parsedValue = parseInt(numericValue) || 450000;
                    setBaseCaja(parsedValue);
                    e.target.value = parsedValue.toLocaleString('es-CO');
                  }}
                  className={`${FIELD} h-11 w-36 pl-7 text-right font-semibold`}
                  placeholder="450000"
                  title="Base de caja personalizable según temporada"
                />
              </div>
            </div>

            <button
              onClick={handleReset}
              className="h-11 px-5 rounded-xl text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-200/70 transition-colors"
            >
              Limpiar
            </button>
          </div>

          {/* CINTA DE TOTAL: fija abajo mientras se diligencia el formulario */}
          <div className="sticky bottom-0 z-30 -mx-4 sm:mx-0 pt-2 pb-safe sm:pb-4 px-2 sm:px-0 bg-gradient-to-t from-paper via-paper/90 to-transparent">
            {/* En teléfonos de 320 px el total NUNCA se corta: se reduce la cifra,
                el relleno del botón y se oculta su ícono */}
            <div className="flex items-center gap-2 min-[360px]:gap-3 sm:gap-6 bg-gray-900 text-white rounded-2xl shadow-2xl pl-4 min-[360px]:pl-5 pr-2 py-2 sm:pl-7 sm:py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-[13px] text-gray-400 leading-tight">Total en Caja</p>
                <p className="font-display text-xl min-[360px]:text-2xl sm:text-3xl font-bold leading-tight whitespace-nowrap">{formatCurrency(totalGeneral)}</p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center justify-center gap-2 h-12 sm:h-14 px-3.5 min-[360px]:px-5 sm:px-8 rounded-xl bg-white text-gray-900 text-sm min-[360px]:text-[15px] font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    Procesando…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="hidden min-[360px]:block w-[18px] h-[18px]" />
                    Realizar Cierre
                  </>
                )}
              </button>
            </div>
          </div>
            </>
          )}
        </div>
        <CashSceneWindow step={activeStep} ready={preconsultaRealizada} />
        </div>

        {/* Modal de Éxito */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-[2px] animate-backdrop flex items-end sm:items-center justify-center z-[70] sm:p-4" role="dialog" aria-modal="true" aria-labelledby="dlg-exito" ref={successDialogRef}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-settle pb-sheet">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 id="dlg-exito" className="text-2xl font-bold text-gray-900 mb-2 leading-tight">¡Cierre Exitoso!</h3>
                <p className="text-gray-600 mb-6">
                  Los montos registrados coinciden con los datos de Alegra. El cierre se ha realizado correctamente.
                </p>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-emerald-600 text-white h-12 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Error (descarga de PDF/imagen) */}
        {errorModalMessage && (
          <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-[2px] animate-backdrop flex items-end sm:items-center justify-center z-[70] sm:p-4" role="dialog" aria-modal="true" aria-labelledby="dlg-error" ref={errorDialogRef}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-sheet pb-sheet max-h-[92dvh] overflow-y-auto overscroll-contain">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h3 id="dlg-error" className="text-2xl font-bold text-gray-900 mb-2 leading-tight">Ocurrió un error</h3>
                <p className="text-gray-600 mb-6">{errorModalMessage}</p>
                <button
                  onClick={() => setErrorModalMessage(null)}
                  className="w-full bg-red-600 text-white h-12 rounded-xl font-semibold hover:bg-red-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Carga */}
        {loading && (
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-[2px] animate-backdrop flex items-end sm:items-center justify-center z-[70] sm:p-4" role="alertdialog" aria-modal="true" aria-busy="true" aria-labelledby="dlg-carga" ref={loadingDialogRef}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-sheet pb-sheet">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                </div>
                <h3 id="dlg-carga" className="text-2xl font-bold text-gray-900 mb-2 leading-tight">Procesando…</h3>
                <p className="text-gray-600">
                  Validando cierre con Alegra y calculando distribución
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmación */}
        {showConfirmModal && confirmData && (
          <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-[2px] animate-backdrop flex items-end sm:items-center justify-center z-[70] sm:p-4" role="dialog" aria-modal="true" aria-labelledby="dlg-confirmar" ref={confirmDialogRef}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-sheet pb-sheet max-h-[92dvh] overflow-y-auto overscroll-contain">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <AlertCircle className="w-10 h-10 text-blue-600" />
                </div>
                <h3 id="dlg-confirmar" className="text-2xl font-bold text-gray-900 mb-2 leading-tight">Confirmar Cierre de Caja</h3>
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

                <div className="bg-gray-900 rounded-xl px-4 py-3.5 text-white">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Total en Caja</span>
                    <span className="font-display text-2xl font-bold">{formatCurrency(confirmData.totalGeneral)}</span>
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
                  className="flex-1 bg-gray-100 text-gray-800 h-12 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  className="flex-1 bg-gray-900 text-white h-12 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Advertencia */}
        {showWarningModal && results && results.validation && (
          <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-[2px] animate-backdrop flex items-end sm:items-center justify-center z-[70] sm:p-4" role="dialog" aria-modal="true" aria-labelledby="dlg-advertencia" ref={warningDialogRef}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl max-h-[92dvh] overflow-y-auto overscroll-contain animate-sheet pb-sheet">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                  <AlertCircle className="w-10 h-10 text-yellow-600" />
                </div>
                <h3 id="dlg-advertencia" className="text-2xl font-bold text-gray-900 mb-2 leading-tight">Diferencias Detectadas</h3>
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
                </div>
              )}

              {/* Sección de Desfase Detectado */}
              {results.validation.desfase_sugerido && results.validation.desfase_sugerido.detectado && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-5 mb-6 shadow-md">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-amber-500 rounded-full p-2 flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg mb-1">
                        Desfase detectado en efectivo
                      </h4>
                      <p className="text-sm text-gray-700 mb-3">
                        {results.validation.desfase_sugerido.mensaje}
                      </p>
                      <div className="bg-white rounded-lg p-3 border-2 border-amber-300">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Tipo:</span>
                            <span className="ml-2 font-semibold text-amber-900">
                              {results.validation.desfase_sugerido.tipo === 'faltante_caja' ? 'Faltante en Caja' : 'Sobrante en Caja'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Valor:</span>
                            <span className="ml-2 font-bold text-amber-900">
                              {results.validation.desfase_sugerido.valor_formatted}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-amber-100 rounded-lg border border-amber-300">
                        <p className="text-xs font-medium text-amber-900">
                          Para completar el cierre, registra este desfase en la sección "Desfases en Caja"
                          con una nota explicativa indicando el responsable o la causa del {results.validation.desfase_sugerido.tipo === 'faltante_caja' ? 'faltante' : 'sobrante'}.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumen General del Cierre */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-blue-600 rounded"></span>
                  Resumen General
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* QR */}
                  {results.metodos_pago_registrados.qr_julieth > 0 && (
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <div className="text-gray-600 mb-0.5">QR:</div>
                      <div className="font-bold text-blue-900">{formatCurrency(results.metodos_pago_registrados.qr_julieth)}</div>
                    </div>
                  )}

                  {/* Datafono Total */}
                  {(results.metodos_pago_registrados.tarjeta_debito > 0 || results.metodos_pago_registrados.tarjeta_credito > 0) && (
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <div className="text-gray-600 mb-0.5">Datafono:</div>
                      <div className="font-bold text-orange-900">{formatCurrency(results.metodos_pago_registrados.total_solo_tarjetas)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {results.metodos_pago_registrados.tarjeta_debito > 0 && `Déb: ${formatCurrency(results.metodos_pago_registrados.tarjeta_debito)}`}
                        {results.metodos_pago_registrados.tarjeta_debito > 0 && results.metodos_pago_registrados.tarjeta_credito > 0 && ' | '}
                        {results.metodos_pago_registrados.tarjeta_credito > 0 && `Créd: ${formatCurrency(results.metodos_pago_registrados.tarjeta_credito)}`}
                      </div>
                    </div>
                  )}

                  {/* Nequi */}
                  {results.metodos_pago_registrados.nequi_luz_helena > 0 && (
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <div className="text-gray-600 mb-0.5">Nequi:</div>
                      <div className="font-bold text-purple-900">{formatCurrency(results.metodos_pago_registrados.nequi_luz_helena)}</div>
                    </div>
                  )}

                  {/* Daviplata */}
                  {results.metodos_pago_registrados.daviplata_jose > 0 && (
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <div className="text-gray-600 mb-0.5">Daviplata:</div>
                      <div className="font-bold text-pink-900">{formatCurrency(results.metodos_pago_registrados.daviplata_jose)}</div>
                    </div>
                  )}

                  {/* Addi */}
                  {results.metodos_pago_registrados.addi_datafono > 0 && (
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <div className="text-gray-600 mb-0.5">Addi:</div>
                      <div className="font-bold text-blue-900">{formatCurrency(results.metodos_pago_registrados.addi_datafono)}</div>
                    </div>
                  )}

                  {/* Efectivo de Ventas */}
                  {results.alegra.results.cash.total > 0 && (
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <div className="text-gray-600 mb-0.5">Efectivo Ventas:</div>
                      <div className="font-bold text-green-900">{results.alegra.results.cash.formatted}</div>
                    </div>
                  )}

                  {/* Valor a Consignar */}
                  {results.cash_count.consignar.efectivo_para_consignar_final > 0 && (
                    <div className="bg-white rounded-lg p-2 border border-emerald-100 col-span-2">
                      <div className="text-gray-600 mb-0.5">Valor a Consignar:</div>
                      <div className="font-bold text-emerald-900 text-sm">{results.cash_count.consignar.efectivo_para_consignar_final_formatted}</div>
                    </div>
                  )}

                  {/* Excedentes */}
                  {results.cash_count.adjustments.excedente > 0 && (
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <div className="text-gray-600 mb-0.5">Excedentes:</div>
                      <div className="font-bold text-yellow-900">{results.cash_count.adjustments.excedente_formatted}</div>
                    </div>
                  )}

                  {/* Gastos Operativos */}
                  {results.cash_count.adjustments.gastos_operativos > 0 && (
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <div className="text-gray-600 mb-0.5">Gastos Operativos:</div>
                      <div className="font-bold text-red-900">{results.cash_count.adjustments.gastos_operativos_formatted}</div>
                    </div>
                  )}

                  {/* Préstamos */}
                  {results.cash_count.adjustments.prestamos > 0 && (
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <div className="text-gray-600 mb-0.5">Préstamos:</div>
                      <div className="font-bold text-indigo-900">{results.cash_count.adjustments.prestamos_formatted}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Desfases Registrados */}
              {results.desfases_detalle && results.desfases_detalle.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-6">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    Desfases Registrados
                  </h4>
                  <div className="space-y-2">
                    {results.desfases_detalle.map((desfase, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-amber-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-gray-900">{desfase.tipo}</span>
                          <span className="font-bold text-amber-900">{formatCurrency(desfase.valor)}</span>
                        </div>
                        {desfase.nota && (
                          <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 border border-gray-200">
                            <span className="font-medium">Nota:</span> {desfase.nota}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="flex-1 bg-gray-100 text-gray-800 h-12 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Revisar
                </button>
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="flex-1 bg-gray-900 text-white h-12 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
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
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Resultados del Cierre</h2>
                {results.alegra?.invoices_summary && (
                  <InvoicesSummaryBadge invoicesSummary={results.alegra.invoices_summary} variant="compact" />
                )}
              </div>

              {/* Alerta de Facturas Anuladas */}
              {results.alegra?.voided_invoices && (
                <div className="mb-4 sm:mb-6">
                  <VoidedInvoicesAlert
                    voidedInvoices={results.alegra.voided_invoices}
                    onViewDetails={() => setIsVoidedModalOpen(true)}
                  />
                </div>
              )}

              {/* Sección de Validación */}
              {results.validation && (
                <div className={`mb-4 sm:mb-6 p-4 rounded-xl border-2 ${results.validation.validation_status === 'success'
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
                      <h3 className={`text-lg font-semibold mb-2 ${results.validation.validation_status === 'success'
                        ? 'text-green-900'
                        : 'text-yellow-900'
                        }`}>
                        Estado de Validación
                      </h3>
                      <p className={`text-sm mb-3 ${results.validation.validation_status === 'success'
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
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Resumen de Cierre */}
              <div className="mb-4 sm:mb-6 bg-blue-50 rounded-xl p-4 sm:p-6 border-2 border-blue-200">
                <h3 className="text-lg sm:text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-600 rounded"></span>
                  Resumen del Cierre
                </h3>

                {/* Grid principal - 3 tarjetas destacadas */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-3">
                  {/* Total Venta del Día + Facturas Procesadas (Horizontal) */}
                  {(results.alegra?.total_sale || results.alegra?.invoices_summary) && (
                    <div className="bg-green-600 rounded-lg p-2.5 border border-green-400 shadow-sm text-white">
                      <div className="flex gap-3 items-center justify-between">
                        {/* Total Venta */}
                        {results.alegra?.total_sale && (
                          <div className="flex-1">
                            <div className="text-[10px] font-semibold mb-0.5 opacity-90">TOTAL VENTA DEL DÍA</div>
                            <div className="text-lg font-bold">
                              {results.alegra.total_sale.formatted}
                            </div>
                          </div>
                        )}

                        {/* Separador vertical */}
                        <div className="w-px h-12 bg-white/30"></div>

                        {/* Facturas */}
                        {results.alegra?.invoices_summary && (
                          <div className="flex-1">
                            <div className="text-[10px] font-semibold mb-0.5 opacity-90">FACTURAS</div>
                            <div className="text-lg font-bold mb-0.5">
                              {results.alegra.invoices_summary.total_invoices}
                            </div>
                            <div className="text-[9px] opacity-75">
                              ✓ {results.alegra.invoices_summary.active_invoices} activas
                              {results.alegra.invoices_summary.voided_invoices > 0 && (
                                <> • ✗ {results.alegra.invoices_summary.voided_invoices} anuladas</>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Efectivo de Ventas (Alegra) */}
                  {results.alegra.results.cash.total > 0 && (
                    <div className="bg-green-600 rounded-lg p-2.5 border border-green-400 shadow-sm text-white">
                      <div className="text-[10px] font-semibold mb-0.5 opacity-90">EFECTIVO VENTAS (ALEGRA)</div>
                      <div className="text-lg font-bold">
                        {results.alegra.results.cash.formatted}
                      </div>
                    </div>
                  )}

                  {/* Valor a Consignar */}
                  {results.cash_count.consignar.efectivo_para_consignar_final > 0 && (
                    <div className="bg-gray-900 rounded-lg p-2.5 border border-purple-400 shadow-sm text-white">
                      <div className="text-[10px] font-semibold mb-0.5 opacity-90">VALOR A CONSIGNAR</div>
                      <div className="text-lg font-bold">
                        {results.detalle_consignacion?.valor_consignar_formatted || results.cash_count.consignar.efectivo_para_consignar_final_formatted}
                      </div>
                      {/* Mostrar detalle desglosado si existe */}
                      {results.detalle_consignacion?.detalle && (
                        <div className="text-[11px] opacity-90 mt-1.5 font-mono leading-relaxed">
                          {results.detalle_consignacion.detalle}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Grid secundario - Métodos de pago y detalles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                  {/* Transferencias - Solo mostrar si hay al menos una transferencia */}
                  {(results.metodos_pago_registrados.nequi_luz_helena > 0 ||
                    results.metodos_pago_registrados.daviplata_jose > 0 ||
                    results.metodos_pago_registrados.qr_julieth > 0) && (
                      <div className="bg-white rounded-lg p-3 border border-purple-200 shadow-sm">
                        <div className="text-xs font-medium text-gray-600 mb-2">Transferencias</div>
                        <div className="space-y-1 text-xs">
                          {results.metodos_pago_registrados.nequi_luz_helena > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Nequi:</span>
                              <span className="font-semibold">{formatCurrency(results.metodos_pago_registrados.nequi_luz_helena)}</span>
                            </div>
                          )}
                          {results.metodos_pago_registrados.daviplata_jose > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Daviplata:</span>
                              <span className="font-semibold">{formatCurrency(results.metodos_pago_registrados.daviplata_jose)}</span>
                            </div>
                          )}
                          {results.metodos_pago_registrados.qr_julieth > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">QR:</span>
                              <span className="font-semibold">{formatCurrency(results.metodos_pago_registrados.qr_julieth)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1 border-t border-gray-200">
                            <span className="text-gray-700 font-medium">Total:</span>
                            <span className="font-bold text-purple-700">
                              {results.metodos_pago_registrados.total_transferencias_con_excedente_formatted || formatCurrency(results.metodos_pago_registrados.total_transferencias_registradas)}
                            </span>
                          </div>
                          {/* Mostrar detalle con excedentes si existe */}
                          {results.metodos_pago_registrados.detalle_transferencias && (
                            <div className="pt-1 mt-1 border-t border-purple-100">
                              <div className="text-xs text-gray-600 italic bg-purple-50 rounded p-2">
                                {results.metodos_pago_registrados.detalle_transferencias}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Datafono - Solo si hay tarjetas */}
                  {(results.metodos_pago_registrados.tarjeta_debito > 0 || results.metodos_pago_registrados.tarjeta_credito > 0) && (
                    <div className="bg-white rounded-lg p-3 border border-orange-100 shadow-sm">
                      <div className="text-xs font-medium text-gray-600 mb-2">Datafono</div>
                      <div className="space-y-1 text-xs">
                        {results.metodos_pago_registrados.tarjeta_debito > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">T. Débito:</span>
                            <span className="font-semibold">{formatCurrency(results.metodos_pago_registrados.tarjeta_debito)}</span>
                          </div>
                        )}
                        {results.metodos_pago_registrados.tarjeta_credito > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">T. Crédito:</span>
                            <span className="font-semibold">{formatCurrency(results.metodos_pago_registrados.tarjeta_credito)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-gray-200">
                          <span className="text-gray-700 font-medium">Total:</span>
                          <span className="font-bold text-orange-700">
                            {results.metodos_pago_registrados.total_datafono_con_excedente_formatted || formatCurrency(results.metodos_pago_registrados.total_solo_tarjetas)}
                          </span>
                        </div>
                        {/* Mostrar detalle con excedentes si existe */}
                        {results.metodos_pago_registrados.detalle_datafono && (
                          <div className="pt-1 mt-1 border-t border-orange-100">
                            <div className="text-xs text-gray-600 italic bg-orange-50 rounded p-2">
                              {results.metodos_pago_registrados.detalle_datafono}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Nequi */}
                  {results.metodos_pago_registrados.nequi_luz_helena > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-purple-100 shadow-sm">
                      <div className="text-xs font-medium text-gray-600 mb-1">Nequi</div>
                      <div className="text-lg font-bold text-purple-900">
                        {formatCurrency(results.metodos_pago_registrados.nequi_luz_helena)}
                      </div>
                    </div>
                  )}

                  {/* Daviplata */}
                  {results.metodos_pago_registrados.daviplata_jose > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-pink-100 shadow-sm">
                      <div className="text-xs font-medium text-gray-600 mb-1">Daviplata</div>
                      <div className="text-lg font-bold text-pink-900">
                        {formatCurrency(results.metodos_pago_registrados.daviplata_jose)}
                      </div>
                    </div>
                  )}

                  {/* Addi */}
                  {results.metodos_pago_registrados.addi_datafono > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                      <div className="text-xs font-medium text-gray-600 mb-1">Addi</div>
                      <div className="text-lg font-bold text-blue-900">
                        {formatCurrency(results.metodos_pago_registrados.addi_datafono)}
                      </div>
                    </div>
                  )}

                  {/* Excedentes */}
                  {results.cash_count.adjustments.excedente > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-yellow-100 shadow-sm">
                      <div className="text-xs font-medium text-gray-600 mb-2">Excedentes</div>
                      <div className="text-lg font-bold text-yellow-900 mb-2">
                        {results.cash_count.adjustments.excedente_formatted}
                      </div>
                      {results.excedentes_detalle && results.excedentes_detalle.length > 0 && (
                        <div className="space-y-1">
                          {results.excedentes_detalle.map((exc, idx) => (
                            <div key={idx} className="text-xs text-gray-600 italic">
                              • {exc.tipo}{exc.subtipo && ` (${exc.subtipo})`}: {formatCurrency(exc.valor)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gastos Operativos */}
                  {results.cash_count.adjustments.gastos_operativos > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-red-100 shadow-sm">
                      <div className="text-xs font-medium text-gray-600 mb-1">Gastos Operativos</div>
                      <div className="text-lg font-bold text-red-900">
                        {results.cash_count.adjustments.gastos_operativos_formatted}
                      </div>
                      {results.gastos_operativos_nota && (
                        <div className="text-xs text-gray-600 mt-2 italic">
                          Nota: {results.gastos_operativos_nota}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Préstamos */}
                  {results.cash_count.adjustments.prestamos > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-indigo-100 shadow-sm">
                      <div className="text-xs font-medium text-gray-600 mb-1">Préstamos</div>
                      <div className="text-lg font-bold text-indigo-900">
                        {results.cash_count.adjustments.prestamos_formatted}
                      </div>
                      {results.prestamos_nota && (
                        <div className="text-xs text-gray-600 mt-2 italic">
                          Nota: {results.prestamos_nota}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Desfases Registrados en el Cierre Exitoso */}
                {results.desfases_detalle && results.desfases_detalle.length > 0 && (
                  <div className="mt-4 bg-amber-50 border-2 border-amber-300 rounded-xl p-4 shadow-sm">
                    <h4 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      Desfases Registrados
                    </h4>
                    <div className="space-y-2">
                      {results.desfases_detalle.map((desfase, index) => (
                        <div key={index} className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-gray-900">{desfase.tipo}</span>
                            <span className="text-lg font-bold text-amber-900">{formatCurrency(desfase.valor)}</span>
                          </div>
                          {desfase.nota && (
                            <div className="text-xs text-gray-700 bg-amber-50 rounded p-2 border border-amber-200">
                              <span className="font-medium">Nota:</span> {desfase.nota}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
                        <div className="font-semibold">{results.alegra.results.cash.formatted}</div>
                      </div>
                    </div>

                    {/* Desfases si existen */}
                    {results.desfases_detalle && results.desfases_detalle.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-amber-200">
                        <div className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Desfases Registrados
                        </div>
                        <div className="space-y-2">
                          {results.desfases_detalle.map((desfase, index) => (
                            <div key={index} className="bg-amber-50 rounded p-2 border border-amber-200">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-gray-700">{desfase.tipo}</span>
                                <span className="text-sm font-bold text-amber-900">{formatCurrency(desfase.valor)}</span>
                              </div>
                              {desfase.nota && (
                                <div className="text-xs text-gray-600 italic">
                                  {desfase.nota}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Totales apilados */}
                <div className="flex flex-col gap-2 sm:gap-3 h-full">
                  {/* TOTAL VENTA DEL DÍA */}
                  <div className="bg-green-600 rounded-xl p-4 sm:p-6 text-white flex-1 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs sm:text-sm font-medium opacity-90">TOTAL VENTA DEL DÍA</div>
                      {results.alegra?.invoices_summary?.voided_invoices > 0 && (
                        <div className="bg-white/20 px-2 py-0.5 rounded text-xs">
                          {results.alegra.invoices_summary.active_invoices} facturas
                        </div>
                      )}
                    </div>
                    <div className="text-2xl sm:text-4xl font-bold">{results.alegra.total_sale.formatted}</div>
                    {results.alegra?.invoices_summary && (
                      <div className="text-xs opacity-75 mt-1">
                        {results.alegra.invoices_summary.voided_invoices > 0
                          ? `${results.alegra.invoices_summary.voided_invoices} factura(s) anulada(s) excluida(s)`
                          : `${results.alegra.invoices_summary.total_invoices} facturas procesadas`
                        }
                      </div>
                    )}
                  </div>

                  {/* Total a Consignar */}
                  <div className="bg-gray-900 rounded-xl p-4 sm:p-6 text-white flex-1 flex flex-col justify-center">
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
                      <div className={`mt-2 p-2 rounded-lg text-xs ${isBaseExacta(results.cash_count.base.base_status)
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : results.cash_count.base.base_status === 'sobrante'
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                        <div className="flex items-start gap-1">
                          {isBaseExacta(results.cash_count.base.base_status) ? (
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
                    <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-blue-900"><Wallet className="w-5 h-5 text-blue-600" aria-hidden="true" />Caja Base (450,000)</h3>
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
                    <div className="bg-emerald-50 rounded-xl p-4 sm:p-6 border-2 border-emerald-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-emerald-900"><Landmark className="w-5 h-5 text-emerald-600" aria-hidden="true" />Para Consignación</h3>
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
                  <div className="mt-4 bg-gray-900 rounded-xl p-4 text-white">
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

            {/* Selector y Botón de Descarga */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
              <div className="w-full sm:w-auto">
                <select
                  aria-label="Formato de descarga"
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value)}
                  disabled={generatingPDF || generatingImage}
                  className="w-full px-4 py-3 sm:py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-blue-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base cursor-pointer"
                >
                  <option value="jpeg">JPEG (Alta Calidad)</option>
                  <option value="png">PNG</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>

              <button
                onClick={handleDownload}
                disabled={generatingPDF || generatingImage}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {(generatingPDF || generatingImage) ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Descargar Reporte
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Modal de Facturas Anuladas */}
        {results && results.alegra?.voided_invoices && (
          <VoidedInvoicesModal
            isOpen={isVoidedModalOpen}
            onClose={() => setIsVoidedModalOpen(false)}
            voidedInvoices={results.alegra.voided_invoices}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;

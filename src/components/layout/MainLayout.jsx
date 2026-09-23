import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home,
  Package,
  TrendingUp,
  BarChart3,
  ShoppingBag,
  Clock,
  User,
  LogOut,
  FileText,
  ChevronDown,
  DollarSign,
  Calendar,
  BookOpen,
  ChevronRight,
  Target,
  Award,
  Users,
  Tag,
  Shirt,
  ClipboardList,
  Briefcase,
  Wallet,
  Menu,
  X,
  AlertTriangle
} from 'lucide-react';
import { getColombiaTimeString } from '../../utils/dateUtils';
import { canAccess } from '../../utils/auth';
import { useSalesComparison } from '../../hooks/useSalesComparison';
import { getApiDocsUrl, getPendingClosingDates } from '../../services/api';
import { formatDateStringToColombiaDate } from '../../utils/dateUtils';
import BrandMark from '../common/BrandMark';
import { usePublishSceneData, useSceneValue, experience } from '../../experience/store';

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(getColombiaTimeString());
  // Las métricas de este hook solo se muestran en /dashboard (ver "SECCIÓN DE MÉTRICAS"
  // más abajo) — se desactiva en cualquier otra ruta para no disparar ~9 peticiones a
  // Alegra en cada navegación (Estadísticas, Cuentas, etc.) cuando nunca se van a mostrar
  const isDashboardRoute = location.pathname === '/dashboard';
  // Hook consolidado que incluye estadísticas actuales Y comparaciones
  const {
    dailySales,
    monthlySales,
    inventoryTotal,
    billsOpenTotal,
    loadingInventory,
    loadingBills,
    dailyComparison,
    monthlyComparison,
    nextDayLastYear,
    previousDay,
    fullMonthLastYear, // Mes completo del año anterior (para meta mensual)
    loading: salesLoading
  } = useSalesComparison(isDashboardRoute);

  // Aviso fijo de cierres de caja pendientes (días pasados sin cierre registrado).
  // Se consulta al montar (MainLayout se remonta en cada navegación) y se
  // vuelve a consultar cuando Dashboard avisa que se completó un cierre
  // exitoso (evento 'cash-closing-success'), para que el aviso desaparezca
  // apenas se resuelva sin esperar a la próxima navegación.
  const [pendingClosingDates, setPendingClosingDates] = useState([]);

  const loadPendingClosingDates = async () => {
    try {
      const data = await getPendingClosingDates();
      setPendingClosingDates(data.missing_dates || []);
    } catch {
      // No bloquea el resto de la app si esto falla - el aviso simplemente no aparece.
    }
  };

  useEffect(() => {
    loadPendingClosingDates();
    const handler = () => loadPendingClosingDates();
    window.addEventListener('cash-closing-success', handler);
    return () => window.removeEventListener('cash-closing-success', handler);
  }, []);

  // Estados para dropdowns
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [statsDropdownOpen, setStatsDropdownOpen] = useState(false);
  const [gestionDropdownOpen, setGestionDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false);
  const [mobileGestionOpen, setMobileGestionOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const statsDropdownRef = useRef(null);
  const gestionDropdownRef = useRef(null);

  // Función para formatear moneda
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'Cargando...';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getColombiaTimeString());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (statsDropdownRef.current && !statsDropdownRef.current.contains(event.target)) {
        setStatsDropdownOpen(false);
      }
      if (gestionDropdownRef.current && !gestionDropdownRef.current.contains(event.target)) {
        setGestionDropdownOpen(false);
      }
    };

    // Escape cierra los menús; si el foco estaba dentro, vuelve a su botón
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      [userDropdownRef, statsDropdownRef, gestionDropdownRef].forEach((ref) => {
        if (ref.current?.contains(document.activeElement)) ref.current.querySelector('button')?.focus();
      });
      setUserDropdownOpen(false);
      setStatsDropdownOpen(false);
      setGestionDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Estructura de navegación
  const dashboardSection = [
    {
      id: 'dashboard',
      label: 'Cierre de Caja',
      path: '/dashboard',
      icon: Home,
      color: 'blue',
      roles: ['admin', 'sales']
    },
    {
      id: 'monthly-sales',
      label: 'Ventas Mensuales',
      path: '/monthly-sales',
      icon: ShoppingBag,
      color: 'purple',
      roles: ['sales']
    }
  ];

  const statsSection = [
    {
      id: 'ventas-totales',
      label: 'Totales de Ventas',
      description: 'Ventas agrupadas por día/mes',
      path: '/estadisticas-avanzadas/ventas-totales',
      icon: TrendingUp,
      color: 'purple',
      roles: ['admin']
    },
    {
      id: 'documentos-venta',
      label: 'Documentos de Venta',
      description: 'Facturas detalladas',
      path: '/estadisticas-avanzadas/documentos',
      icon: FileText,
      color: 'blue',
      roles: ['admin']
    },
    {
      id: 'analytics',
      label: 'Analytics Avanzado',
      description: 'Análisis inteligente de ventas',
      path: '/estadisticas-estandar/analytics',
      icon: BarChart3,
      color: 'orange',
      roles: ['admin']
    },
    {
      id: 'productos',
      label: 'Análisis de Productos',
      description: 'Reportes desde Alegra',
      path: '/estadisticas-estandar/productos',
      icon: ShoppingBag,
      color: 'green',
      roles: ['admin']
    },
    {
      id: 'inventario',
      label: 'Análisis de Inventario',
      description: 'Estado del inventario',
      path: '/estadisticas-estandar/inventario',
      icon: Package,
      color: 'teal',
      roles: ['admin']
    }
  ];

  const gestionSection = [
    {
      id: 'cuentas',
      label: 'Cuentas',
      description: 'Saldo por medio de pago, ajustes, transferencias y recompras',
      path: '/cuentas',
      icon: Wallet,
      color: 'teal',
      roles: ['admin']
    },
    {
      id: 'empleadas',
      label: 'Control de Empleadas',
      description: 'Ropa, préstamos, permisos, vacaciones, pagos',
      path: '/empleadas',
      icon: Shirt,
      color: 'pink',
      roles: ['admin', 'sales']
    },
    {
      id: 'notas-pendientes',
      label: 'Notas y Pendientes',
      description: 'Resurtido y tareas operativas',
      path: '/notas-pendientes',
      icon: ClipboardList,
      color: 'emerald',
      roles: ['admin', 'sales']
    }
  ];

  const visibleDashboardItems = dashboardSection.filter(item => canAccess(item.roles));
  const visibleStatsItems = statsSection.filter(item => canAccess(item.roles));
  const visibleGestionItems = gestionSection.filter(item => canAccess(item.roles));

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigation = (path) => {
    navigate(path);
    setStatsDropdownOpen(false);
    setGestionDropdownOpen(false);
    setMobileMenuOpen(false);
    setMobileStatsOpen(false);
    setMobileGestionOpen(false);
  };

  // Cerrar el menú móvil al cambiar de ruta (ej. tras un logout o navegación externa)
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileStatsOpen(false);
    setMobileGestionOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Borde/sombra del header solo cuando hay contenido desplazado debajo.
  // IntersectionObserver sobre un centinela: sin listeners de scroll.
  const topSentinelRef = useRef(null);
  const [headerRaised, setHeaderRaised] = useState(false);
  useEffect(() => {
    const el = topSentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setHeaderRaised(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const userName = user?.name || user?.email || 'Admin';
  const userInitials = userName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  const statsActive = statsDropdownOpen || location.pathname.includes('/estadisticas');
  const gestionActive = gestionDropdownOpen || isActive('/cuentas') || isActive('/cuentas-recompras') || isActive('/empleadas') || isActive('/notas-pendientes');

  // Estilo de los enlaces de la barra superior: texto + subrayado activo
  const navLinkClass = (active) =>
    `relative flex items-center gap-1.5 h-16 px-3 text-sm font-medium transition-colors ${
      active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
    }`;
  const activeRule = (show) => (
    <span
      aria-hidden="true"
      className={`absolute left-3 right-3 bottom-0 h-[2px] rounded-full bg-gray-900 origin-center transition-transform duration-200 ease-out ${
        show ? 'scale-x-100' : 'scale-x-0'
      }`}
    />
  );

  const dropdownPanel = (items) => (
    <div className="animate-pop absolute top-full right-0 mt-1 w-80 bg-white rounded-2xl shadow-xl ring-1 ring-gray-900/5 p-1.5 z-50">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
            className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start gap-3 ${
              active ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
          >
            <Icon className={`w-[18px] h-[18px] mt-0.5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={1.75} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-gray-900">{item.label}</span>
              <span className="block text-xs text-gray-500 leading-snug mt-0.5">{item.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );

  // --- Escena WebGL (solo lectura): avance hacia las metas que ya se muestran ---
  const sceneMetrics = useMemo(() => {
    const dayGoal = dailyComparison?.previous?.total > 0 ? dailyComparison.previous.total * 1.25 : null;
    const monthGoal = fullMonthLastYear?.total > 0 ? fullMonthLastYear.total * 1.25 : null;
    return {
      day: { progress: dayGoal ? dailySales / dayGoal : 0, done: dayGoal ? dailySales >= dayGoal : false, tone: 'amber', loading: salesLoading },
      month: { progress: monthGoal ? monthlySales / monthGoal : 0, done: monthGoal ? monthlySales >= monthGoal : false, tone: 'ink', loading: salesLoading },
    };
  }, [dailyComparison, fullMonthLastYear, dailySales, monthlySales, salesLoading]);
  usePublishSceneData('metrics', sceneMetrics);

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div ref={topSentinelRef} aria-hidden="true" className="absolute top-0 h-px w-px" />
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-gray-900 focus:text-white focus:text-sm focus:font-semibold"
      >
        Saltar al contenido
      </a>

      {/* HEADER */}
      <header
        className={`sticky top-0 z-50 bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/75 border-b transition-[border-color,box-shadow] duration-200 ${
          headerRaised ? 'border-gray-200 shadow-[0_6px_20px_-12px_rgb(22_23_27/0.18)]' : 'border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Marca */}
            <button
              onClick={() => handleNavigation('/dashboard')}
              // py/-my: área táctil de ~47 px sin mover el diseño (la marca mide 27 px)
              className="flex items-center gap-3 rounded-lg py-2.5 -my-2.5"
              aria-label="Ir al cierre de caja"
            >
              <BrandMark size="sm" />
              <span className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-[13px] font-semibold text-gray-900">Puerto Carreño</span>
                <span className="text-[11px] text-gray-500">Cierre y gestión</span>
              </span>
            </button>

            {/* Navegación (desktop) */}
            <nav className="hidden lg:flex items-center" aria-label="Principal">
              {visibleDashboardItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={navLinkClass(active)}
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.label}
                    {activeRule(active)}
                  </button>
                );
              })}

              {canAccess(['admin']) && visibleStatsItems.length > 0 && (
                <div ref={statsDropdownRef} className="relative">
                  <button
                    onClick={() => setStatsDropdownOpen(!statsDropdownOpen)}
                    className={navLinkClass(statsActive)}
                    aria-expanded={statsDropdownOpen}
                    aria-haspopup="menu"
                  >
                    Estadísticas
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${statsDropdownOpen ? 'rotate-180' : ''}`} />
                    {activeRule(location.pathname.includes('/estadisticas'))}
                  </button>
                  {statsDropdownOpen && dropdownPanel(visibleStatsItems)}
                </div>
              )}

              {visibleGestionItems.length > 0 && (
                <div ref={gestionDropdownRef} className="relative">
                  <button
                    onClick={() => setGestionDropdownOpen(!gestionDropdownOpen)}
                    className={navLinkClass(gestionActive)}
                    aria-expanded={gestionDropdownOpen}
                    aria-haspopup="menu"
                  >
                    Gestión
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${gestionDropdownOpen ? 'rotate-180' : ''}`} />
                    {activeRule(isActive('/cuentas') || isActive('/cuentas-recompras') || isActive('/empleadas') || isActive('/notas-pendientes'))}
                  </button>
                  {gestionDropdownOpen && dropdownPanel(visibleGestionItems)}
                </div>
              )}

              <a
                href={getApiDocsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={navLinkClass(false)}
              >
                Docs
                <BookOpen className="w-3.5 h-3.5 text-gray-400" />
              </a>
            </nav>

            {/* Reloj + usuario + menú móvil */}
            <div className="flex items-center gap-1 sm:gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-full bg-gray-100 text-[13px] text-gray-700" aria-label="Hora de Colombia">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium tabular-nums">{currentTime}</span>
              </div>

              <div ref={userDropdownRef} className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 rounded-full pl-1 pr-2 py-1 hover:bg-gray-100 transition-colors min-h-[44px]"
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="menu"
                  aria-label="Menú de usuario"
                >
                  <span className="w-9 h-9 rounded-full bg-gray-900 text-white text-xs font-semibold flex items-center justify-center tracking-wide">
                    {userInitials || <User className="w-4 h-4" />}
                  </span>
                  <span className="hidden md:block text-left leading-tight">
                    <span className="block text-[13px] font-semibold text-gray-900 max-w-[160px] truncate">{userName}</span>
                    <span className="block text-[11px] text-gray-500">{user?.role === 'admin' ? 'Administrador' : 'Ventas'}</span>
                  </span>
                  <ChevronDown className={`hidden sm:block w-4 h-4 text-gray-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {userDropdownOpen && (
                  <div className="animate-pop absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl ring-1 ring-gray-900/5 p-1.5 z-50">
                    <div className="px-3 py-2.5 mb-1 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || user?.email || 'Administrador KOAJ'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    {canAccess(['admin']) && (
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          navigate('/usuarios');
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-3 text-gray-700"
                      >
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">Gestionar usuarios</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigate('/codigos-koaj');
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-3 text-gray-700"
                    >
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium">Códigos KOAJ</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600 mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">Cerrar sesión</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden flex items-center justify-center w-11 h-11 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* MENÚ MÓVIL - reemplaza la nav horizontal por debajo de lg */}
        {mobileMenuOpen && (
          <div className="lg:hidden animate-fade-in-scale origin-top border-t border-gray-100 bg-white max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
            <div className="px-3 py-3 space-y-0.5">
              {visibleDashboardItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center gap-3 px-3 min-h-[48px] rounded-xl text-[15px] font-medium transition-colors ${
                      active ? 'bg-gray-900 text-white' : 'text-gray-800 hover:bg-gray-100'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                    {item.label}
                  </button>
                );
              })}

              {canAccess(['admin']) && visibleStatsItems.length > 0 && (
                <div>
                  <button
                    onClick={() => setMobileStatsOpen(!mobileStatsOpen)}
                    className={`w-full flex items-center justify-between gap-3 px-3 min-h-[48px] rounded-xl text-[15px] font-medium transition-colors ${
                      location.pathname.includes('/estadisticas') ? 'text-gray-900' : 'text-gray-800'
                    } hover:bg-gray-100`}
                    aria-expanded={mobileStatsOpen}
                  >
                    <span className="flex items-center gap-3">
                      <BarChart3 className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                      Estadísticas
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${mobileStatsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {mobileStatsOpen && (
                    <div className="animate-fade-in-scale origin-top ml-[21px] pl-4 border-l border-gray-200 space-y-0.5 pb-1">
                      {visibleStatsItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigation(item.path)}
                            className={`w-full text-left px-3 min-h-[44px] rounded-xl text-sm transition-colors ${
                              active ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {visibleGestionItems.length > 0 && (
                <div>
                  <button
                    onClick={() => setMobileGestionOpen(!mobileGestionOpen)}
                    className="w-full flex items-center justify-between gap-3 px-3 min-h-[48px] rounded-xl text-[15px] font-medium text-gray-800 hover:bg-gray-100 transition-colors"
                    aria-expanded={mobileGestionOpen}
                  >
                    <span className="flex items-center gap-3">
                      <Briefcase className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                      Gestión
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${mobileGestionOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {mobileGestionOpen && (
                    <div className="animate-fade-in-scale origin-top ml-[21px] pl-4 border-l border-gray-200 space-y-0.5 pb-1">
                      {visibleGestionItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigation(item.path)}
                            className={`w-full text-left px-3 min-h-[44px] rounded-xl text-sm transition-colors ${
                              active ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <a
                href={getApiDocsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 px-3 min-h-[48px] rounded-xl text-[15px] font-medium text-gray-800 hover:bg-gray-100 transition-colors"
              >
                <BookOpen className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                Docs
              </a>

              <div className="flex md:hidden items-center gap-3 px-3 pt-3 mt-2 border-t border-gray-100 text-sm text-gray-500">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium tabular-nums">{currentTime}</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* AVISO FIJO: cierres de caja de días pasados sin registrar. Se mantiene
          visible en cualquier página hasta que se haga el cierre de esa fecha
          (o el usuario navegue y ya no se detecte pendiente). */}
      {pendingClosingDates.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <button
              onClick={() => navigate(`/dashboard?date=${pendingClosingDates[0]}`)}
              className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-left group rounded-lg"
            >
              <span className="flex items-start gap-3 flex-1 min-w-0">
                <AlertTriangle className="w-[18px] h-[18px] text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-amber-900 font-medium">
                  {pendingClosingDates.length === 1
                    ? `No se registró el cierre de caja del ${formatDateStringToColombiaDate(pendingClosingDates[0])}.`
                    : `Hay ${pendingClosingDates.length} cierres de caja sin registrar, el más antiguo del ${formatDateStringToColombiaDate(pendingClosingDates[0])}.`}
                </span>
              </span>
              <span className="self-start sm:self-auto ml-8 sm:ml-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-900 text-amber-50 text-xs font-semibold group-hover:bg-amber-950 transition-colors whitespace-nowrap">
                Hacer el cierre ahora
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* SECCIÓN DE MÉTRICAS - Solo visible en Dashboard.
          En móvil las dos tarjetas se deslizan en horizontal (scroll-snap)
          para no empujar el formulario del cierre dos pantallas hacia abajo. */}
      {isActive('/dashboard') && (
        <section aria-label="Ventas de hoy y del mes" className="border-b border-gray-200/70">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 pt-5 pb-5 sm:pt-7 sm:pb-7">
            <div className="flex md:grid md:grid-cols-2 gap-3 md:gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-px-4 px-4 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* Venta del Día */}
              <article className="metric-card snap-start shrink-0 w-[86%] sm:w-[70%] md:w-auto bg-white rounded-2xl ring-1 ring-gray-900/[0.06] shadow-sm p-5 sm:p-6">
                <header className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-medium text-gray-500">Venta del día</p>
                  <DollarSign className="w-4 h-4 text-gray-300" />
                </header>

                {salesLoading ? (
                  <MetricSkeleton />
                ) : (
                  <div className="animate-fade-in-scale">
                    <p className="mt-2 font-display text-[2.5rem] sm:text-5xl font-bold text-gray-900 leading-none tracking-tight">
                      {formatCurrency(dailySales)}
                    </p>

                    {/* META DIARIA */}
                    {dailyComparison && dailyComparison.previous && dailyComparison.previous.total > 0 && (() => {
                      const metaDiaria = dailyComparison.previous.total * 1.25;
                      const progreso = (dailySales / metaDiaria) * 100;
                      const cumplida = dailySales >= metaDiaria;
                      const faltante = Math.max(0, metaDiaria - dailySales);
                      return (
                        <GoalMeter
                          label="Meta diaria (+25%)"
                          goal={formatCurrency(metaDiaria)}
                          progress={progreso}
                          done={cumplida}
                          missing={!cumplida && faltante > 0 ? formatCurrency(faltante) : null}
                          tone="amber"
                          scene="day"
                        />
                      );
                    })()}

                    {/* Fechas del año anterior con porcentajes */}
                    <dl className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
                      {dailyComparison && dailyComparison.previous && (() => {
                        const prevTotal = dailyComparison.previous.total || 0;
                        const currentTotal = dailySales || 0;
                        const percentage = prevTotal > 0
                          ? ((currentTotal - prevTotal) / prevTotal) * 100
                          : (currentTotal > 0 ? 100 : 0);
                        return (
                          <CompareRow
                            label={`Venta ${dailyComparison.previous.date}`}
                            value={dailyComparison.previous.formatted}
                            growth={percentage >= 0}
                            percent={Math.abs(Math.round(percentage * 100) / 100)}
                          />
                        );
                      })()}
                      {nextDayLastYear && nextDayLastYear.date && (() => {
                        const nextDayTotal = nextDayLastYear.total || 0;
                        const currentTotal = dailySales || 0;
                        const percentage = nextDayTotal > 0
                          ? ((currentTotal - nextDayTotal) / nextDayTotal) * 100
                          : (currentTotal > 0 ? 100 : 0);
                        return (
                          <CompareRow
                            label={`Venta ${nextDayLastYear.date}`}
                            value={nextDayLastYear.formatted}
                            growth={percentage >= 0}
                            percent={Math.abs(Math.round(percentage * 100) / 100)}
                          />
                        );
                      })()}
                    </dl>
                  </div>
                )}
              </article>

              {/* Venta del Mes */}
              <article className="metric-card snap-start shrink-0 w-[86%] sm:w-[70%] md:w-auto bg-white rounded-2xl ring-1 ring-gray-900/[0.06] shadow-sm p-5 sm:p-6">
                <header className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-medium text-gray-500">Venta del mes</p>
                  <Calendar className="w-4 h-4 text-gray-300" />
                </header>

                {salesLoading ? (
                  <MetricSkeleton />
                ) : (
                  <div className="animate-fade-in-scale">
                    <p className="mt-2 font-display text-[2.5rem] sm:text-5xl font-bold text-gray-900 leading-none tracking-tight">
                      {formatCurrency(monthlySales)}
                    </p>

                    {/* META MENSUAL - Basada en el mes COMPLETO del año anterior */}
                    {fullMonthLastYear && fullMonthLastYear.total > 0 && (() => {
                      const metaMensual = fullMonthLastYear.total * 1.25;
                      const progreso = (monthlySales / metaMensual) * 100;
                      const cumplida = monthlySales >= metaMensual;
                      const faltante = Math.max(0, metaMensual - monthlySales);
                      return (
                        <GoalMeter
                          label="Meta mensual (+25%)"
                          goal={formatCurrency(metaMensual)}
                          progress={progreso}
                          done={cumplida}
                          missing={!cumplida && faltante > 0 ? formatCurrency(faltante) : null}
                          tone="ink"
                          scene="month"
                        />
                      );
                    })()}

                    <dl className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
                      {/* Comparación con año anterior */}
                      {monthlyComparison && monthlyComparison.previous && (
                        <CompareRow
                          label={(() => {
                            const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                            const periodo = monthlyComparison.previous.period;
                            const partes = periodo.split('-');
                            if (partes.length >= 2) {
                              const year = partes[0];
                              const monthNum = parseInt(partes[1], 10);
                              const monthName = meses[monthNum - 1] || '';
                              return monthName ? `${monthName} ${year}` : year;
                            }
                            return periodo;
                          })()}
                          value={monthlyComparison.previous.formatted}
                          growth={monthlyComparison.isGrowth}
                          percent={Math.abs(monthlyComparison.percentageChange)}
                        />
                      )}

                      {/* Inventario Total - Solo Admin */}
                      {canAccess(['admin']) && (
                        <div className="flex items-center justify-between gap-3 text-[13px]">
                          <dt className="text-gray-500">Inventario total</dt>
                          <dd>
                            {loadingInventory || !inventoryTotal ? (
                              <span className="skeleton inline-block h-4 w-24 align-middle" aria-label="Cargando" />
                            ) : (
                              <span className="font-semibold text-gray-900">
                                {inventoryTotal.valueFormatted || formatCurrency(inventoryTotal.value)}
                              </span>
                            )}
                          </dd>
                        </div>
                      )}

                      {/* Cuentas Por Pagar - Solo Admin */}
                      {canAccess(['admin']) && (
                        <div className="flex items-center justify-between gap-3 text-[13px]">
                          <dt className="text-gray-500">Cuentas por pagar</dt>
                          <dd className="flex items-center gap-2">
                            {loadingBills || !billsOpenTotal ? (
                              <span className="skeleton inline-block h-4 w-24 align-middle" aria-label="Cargando" />
                            ) : (
                              <>
                                {billsOpenTotal.totalDocuments > 0 && (
                                  <span className="text-[11px] text-gray-500">
                                    {billsOpenTotal.totalDocuments} doc.
                                  </span>
                                )}
                                <span className="font-semibold text-red-700">
                                  {billsOpenTotal.amountFormatted || formatCurrency(billsOpenTotal.amount)}
                                </span>
                              </>
                            )}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </article>
            </div>
          </div>
        </section>
      )}

      {/* HORIZONTE DE DATOS - Estadísticas: la serie del módulo abierto, en partículas */}
      {(location.pathname.startsWith('/estadisticas') || location.pathname === '/monthly-sales') && <DataHorizon />}

      {/* CONTENIDO PRINCIPAL */}
      <main id="contenido" tabIndex={-1} className="flex-1 outline-none">
        <div className="page-enter max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Sistema de Gestión KOAJ Puerto Carreño</p>
          <p>Versión 2.0</p>
        </div>
      </footer>
    </div>
  );
};

/* --- Horizonte de datos (Fase 8) ------------------------------------------ */

const formatSeriesValue = (value, format) => {
  if (format === 'percent') return `${Number(value).toFixed(1)}%`;
  if (format === 'count') return Number(value).toLocaleString('es-CO');
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
};

/**
 * Franja transparente donde la escena WebGL dibuja la serie del módulo de
 * estadísticas abierto. Se abre solo cuando hay datos y, al pasar el cursor
 * (o el dedo), muestra el valor exacto de la columna.
 */
const DataHorizon = () => {
  const series = useSceneValue('series');
  const [hover, setHover] = useState(-1);
  const n = series?.values.length || 0;

  useEffect(() => () => { experience.hover = -1; }, []);
  useEffect(() => { setHover(-1); experience.hover = -1; }, [series?.key]);

  const onMove = (e) => {
    if (!n) return;
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * n)));
    setHover(i);
    experience.hover = i;
    experience.invalidate?.();
  };
  const onLeave = () => { setHover(-1); experience.hover = -1; experience.invalidate?.(); };

  const max = n ? Math.max(...series.values) : 0;

  return (
    <div className={`data-horizon grid transition-[grid-template-rows] duration-500 ease-out ${n ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} aria-hidden="true">
      <div className="overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[13px] font-semibold text-gray-900">{series?.label}</p>
            {n > 0 && <p className="text-xs text-gray-500">Máximo {formatSeriesValue(max, series.format)}</p>}
          </div>
          <div
            data-scene-anchor="data-horizon"
            className="relative h-28 sm:h-36 mt-2 touch-pan-y"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={onLeave}
          >
            {hover >= 0 && n > 0 && (
              <div
                className="absolute -top-1 -translate-x-1/2 -translate-y-full px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs whitespace-nowrap shadow-lg pointer-events-none"
                style={{ left: `${Math.min(92, Math.max(8, ((hover + 0.5) / n) * 100))}%` }}
              >
                <span className="text-gray-400">{series.labels[hover]}</span>
                <span className="ml-2 font-semibold">{formatSeriesValue(series.values[hover], series.format)}</span>
              </div>
            )}
            <span className="absolute left-0 right-0 bottom-0 h-px bg-gray-900/10" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- Piezas de presentación de las métricas ------------------------------ */

const MetricSkeleton = () => (
  <div className="mt-3 space-y-3" aria-busy="true" aria-label="Cargando ventas">
    <div className="skeleton h-11 w-3/4" />
    <div className="skeleton h-16 w-full rounded-xl" />
    <div className="skeleton h-4 w-full" />
    <div className="skeleton h-4 w-5/6" />
  </div>
);

const GOAL_TONES = {
  amber: { track: 'bg-amber-100', fill: 'bg-amber-500', text: 'text-amber-800' },
  ink: { track: 'bg-blue-100', fill: 'bg-blue-600', text: 'text-blue-700' },
};

const GoalMeter = ({ label, goal, progress, done, missing, tone, scene }) => {
  const t = done
    ? { track: 'bg-emerald-100', fill: 'bg-emerald-500', text: 'text-emerald-700' }
    : GOAL_TONES[tone];
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="flex items-center gap-1.5 font-medium text-gray-700">
          {done ? <Award className="w-3.5 h-3.5 text-emerald-600" /> : <Target className="w-3.5 h-3.5 text-gray-400" />}
          {label}
        </span>
        <span className="font-semibold text-gray-900">{goal}</span>
      </div>
      <div
        className="mt-2"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {/* Tanque de partículas (escena WebGL). La meta está al 80% del ancho. */}
        <div data-scene-anchor={`metric-${scene}`} className="metric-vessel relative" aria-hidden="true">
          <span className="absolute -top-1 -bottom-1 left-[80%] w-[1.5px] -translate-x-1/2 bg-gray-900/70 rounded-full" />
        </div>
        {/* Barra DOM: se ve solo sin escena (sin WebGL) */}
        <div className={`metric-bar h-1.5 rounded-full overflow-hidden ${t.track}`}>
          <div className={`animate-grow-x h-full rounded-full ${t.fill}`} style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-xs">
        <span className={`font-semibold ${t.text}`}>
          {Math.round(progress)}%{done && ' · cumplida'}
        </span>
        {missing && <span className="text-gray-500">Falta {missing}</span>}
      </div>
    </div>
  );
};

const CompareRow = ({ label, value, growth, percent }) => (
  <div className="flex items-center justify-between gap-3 text-[13px]">
    <dt className="text-gray-500">{label}</dt>
    <dd className="flex items-center gap-2">
      <span className="font-medium text-gray-700">{value}</span>
      <span
        className={`inline-flex items-center min-w-[64px] justify-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${
          growth ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}
      >
        {growth ? '↑' : '↓'} {percent}%
      </span>
    </dd>
  </div>
);

export default MainLayout;

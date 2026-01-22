import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { getColombiaTimeString } from '../../utils/dateUtils';
import { canAccess } from '../../utils/auth';
import { useSalesComparison } from '../../hooks/useSalesComparison';
import { getApiDocsUrl } from '../../services/api';

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(getColombiaTimeString());
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
    loading: salesLoading
  } = useSalesComparison();

  // Estados para dropdowns
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [statsDropdownOpen, setStatsDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const statsDropdownRef = useRef(null);

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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const visibleDashboardItems = dashboardSection.filter(item => canAccess(item.roles));
  const visibleStatsItems = statsSection.filter(item => canAccess(item.roles));

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigation = (path) => {
    navigate(path);
    setStatsDropdownOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER PRINCIPAL COMPACTO - 60px */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Breadcrumb */}
            <div className="flex items-center gap-4">
              {/* Logo KOAJ */}
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>

              {/* Breadcrumb */}
              <div className="hidden md:flex items-center gap-2 text-sm">
                <span className="font-semibold text-gray-900">Sistema KOAJ</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Puerto Carreño</span>
              </div>
            </div>

            {/* Navegación + Reloj + Usuario */}
            <div className="flex items-center gap-6">
              {/* Navegación Horizontal */}
              <nav className="hidden lg:flex items-center gap-1">
                {/* Cierre de Caja / Ventas Mensuales */}
                {visibleDashboardItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  // Colores por tipo de item
                  const iconColors = {
                    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
                    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' }
                  };
                  const colors = iconColors[item.color] || iconColors.blue;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.path)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      <div className={`w-7 h-7 ${colors.bg} rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${colors.icon}`} />
                      </div>
                      {item.label}
                    </button>
                  );
                })}

                {/* Estadísticas Dropdown */}
                {canAccess(['admin']) && visibleStatsItems.length > 0 && (
                  <div ref={statsDropdownRef} className="relative">
                    <button
                      onClick={() => setStatsDropdownOpen(!statsDropdownOpen)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${statsDropdownOpen || location.pathname.includes('/estadisticas')
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-indigo-600" />
                      </div>
                      Estadísticas
                      <ChevronDown className={`w-4 h-4 transition-transform ${statsDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {statsDropdownOpen && (
                      <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                        {visibleStatsItems.map((item) => {
                          const Icon = item.icon;
                          const colorConfig = {
                            purple: {
                              icon: 'text-purple-600',
                              bg: 'bg-purple-50',
                              hover: 'hover:bg-purple-100'
                            },
                            blue: {
                              icon: 'text-blue-600',
                              bg: 'bg-blue-50',
                              hover: 'hover:bg-blue-100'
                            },
                            orange: {
                              icon: 'text-orange-600',
                              bg: 'bg-orange-50',
                              hover: 'hover:bg-orange-100'
                            },
                            green: {
                              icon: 'text-green-600',
                              bg: 'bg-green-50',
                              hover: 'hover:bg-green-100'
                            },
                            teal: {
                              icon: 'text-teal-600',
                              bg: 'bg-teal-50',
                              hover: 'hover:bg-teal-100'
                            }
                          };

                          const colors = colorConfig[item.color] || colorConfig.blue;

                          return (
                            <button
                              key={item.id}
                              onClick={() => handleNavigation(item.path)}
                              className={`w-full text-left px-3 py-2.5 ${colors.hover} transition-colors flex items-start gap-3`}
                            >
                              <div className={`w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`w-4 h-4 ${colors.icon}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                                <div className="text-xs text-gray-500 leading-tight">{item.description}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Docs API */}
                <a
                  href={getApiDocsUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-7 h-7 bg-teal-50 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-teal-600" />
                  </div>
                  Docs
                </a>
              </nav>

              {/* Reloj */}
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-slate-600" />
                </div>
                <span className="font-medium">{currentTime}</span>
              </div>

              {/* Usuario Dropdown */}
              <div ref={userDropdownRef} className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
                >
                  <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">{user?.name || user?.email || 'Admin'}</p>
                    <p className="text-xs text-gray-500">{user?.role === 'admin' ? 'Administrador' : 'Ventas'}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {userDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name || user?.email || 'Administrador KOAJ'}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SECCIÓN DE MÉTRICAS - Solo visible en Dashboard */}
      {isActive('/dashboard') && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Venta del Día */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                    <DollarSign className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    {/* NIVEL 1: Título */}
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Venta del Día</h3>

                    {salesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex items-center gap-2 text-gray-400">
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                          <span className="text-sm">Cargando...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* NIVEL 1: Valor Principal - PROTAGONISTA */}
                        <div>
                          <p className="text-4xl font-bold text-gray-900 leading-none">
                            {formatCurrency(dailySales)}
                          </p>
                        </div>

                        {/* NIVEL 2: Fechas del año anterior con porcentajes */}
                        <div className="pt-3 mt-3 border-t border-gray-100 space-y-3">
                          {/* Fecha de hace un año */}
                          {dailyComparison && dailyComparison.previous && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Venta {dailyComparison.previous.date}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">{dailyComparison.previous.formatted}</span>
                                {(() => {
                                  const prevTotal = dailyComparison.previous.total || 0;
                                  const currentTotal = dailySales || 0;
                                  const percentage = prevTotal > 0
                                    ? ((currentTotal - prevTotal) / prevTotal) * 100
                                    : (currentTotal > 0 ? 100 : 0);
                                  const isGrowth = percentage >= 0;
                                  return (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                      isGrowth ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                      {isGrowth ? '↑' : '↓'} {Math.abs(Math.round(percentage * 100) / 100)}%
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                          {/* Día siguiente del año anterior */}
                          {nextDayLastYear && nextDayLastYear.date && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Venta {nextDayLastYear.date}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">{nextDayLastYear.formatted}</span>
                                {(() => {
                                  const nextDayTotal = nextDayLastYear.total || 0;
                                  const currentTotal = dailySales || 0;
                                  const percentage = nextDayTotal > 0
                                    ? ((currentTotal - nextDayTotal) / nextDayTotal) * 100
                                    : (currentTotal > 0 ? 100 : 0);
                                  const isGrowth = percentage >= 0;
                                  return (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                      isGrowth ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                      {isGrowth ? '↑' : '↓'} {Math.abs(Math.round(percentage * 100) / 100)}%
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Venta del Mes */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    {/* NIVEL 1: Título */}
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Venta del Mes</h3>

                    {salesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex items-center gap-2 text-gray-400">
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                          <span className="text-sm">Cargando...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* NIVEL 1: Valor Principal - PROTAGONISTA */}
                        <div>
                          <p className="text-4xl font-bold text-gray-900 leading-none">
                            {formatCurrency(monthlySales)}
                          </p>
                        </div>

                        {/* NIVEL 2: Comparación con año anterior */}
                        {monthlyComparison && monthlyComparison.previous && (
                          <div className="pt-2 mt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">
                                {(() => {
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
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">{monthlyComparison.previous.formatted}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  monthlyComparison.isGrowth ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                  {monthlyComparison.isGrowth ? '↑' : '↓'} {Math.abs(monthlyComparison.percentageChange)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* NIVEL 3: Inventario Total */}
                        <div className="pt-2 mt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Inventario Total</span>
                            {loadingInventory ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
                              </div>
                            ) : inventoryTotal ? (
                              <span className="text-sm font-bold text-purple-700">
                                {inventoryTotal.valueFormatted || formatCurrency(inventoryTotal.value)}
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* NIVEL 4: Cuentas Por Pagar */}
                        <div className="pt-2 mt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Cuentas Por Pagar</span>
                            {loadingBills ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                              </div>
                            ) : billsOpenTotal ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-red-700">
                                  {billsOpenTotal.amountFormatted || formatCurrency(billsOpenTotal.amount)}
                                </span>
                                {billsOpenTotal.totalDocuments > 0 && (
                                  <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {billsOpenTotal.totalDocuments} doc.
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} Sistema de Gestión KOAJ. Todos los derechos reservados.
            </p>
            <p className="text-xs text-gray-500">
              Versión 2.0 | Desarrollado con ❤️
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;

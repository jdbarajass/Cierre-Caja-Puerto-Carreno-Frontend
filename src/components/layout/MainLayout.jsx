import React, { useState, useEffect } from 'react';
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
  Zap,
  ChevronDown,
  DollarSign,
  Calendar
} from 'lucide-react';
import { getColombiaTimeString, getColombiaTodayString } from '../../utils/dateUtils';
import { canAccess } from '../../utils/auth';
import { useSalesStats } from '../../hooks/useSalesStats';
import SalesComparisonYoY from '../SalesComparisonYoY';

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(getColombiaTimeString());
  const { dailySales, monthlySales, loading: salesLoading } = useSalesStats();

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

  // Estado para menús desplegables
  const [expandedMenu, setExpandedMenu] = useState(null);

  const toggleMenu = (menuId) => {
    setExpandedMenu(expandedMenu === menuId ? null : menuId);
  };

  // Estructura de navegación con 3 secciones
  // Sección 1: Cierre de Caja (Admin y Sales)
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
      roles: ['sales'] // Solo sales, admin ve esto en otra sección si es necesario
    }
  ];

  // Sección 2: Estadísticas Avanzadas (Solo Admin - APIs directas)
  const advancedStatsSection = [
    {
      id: 'ventas-totales',
      label: 'Totales de Ventas',
      path: '/estadisticas-avanzadas/ventas-totales',
      icon: TrendingUp,
      color: 'purple',
      roles: ['admin']
    },
    {
      id: 'documentos-venta',
      label: 'Documentos de Venta',
      path: '/estadisticas-avanzadas/documentos',
      icon: FileText,
      color: 'blue',
      roles: ['admin']
    }
  ];

  // Sección 3: Estadísticas Estándar (Solo Admin - APIs documentadas)
  const standardStatsSection = [
    {
      id: 'analytics',
      label: 'Analytics',
      path: '/estadisticas-estandar/analytics',
      icon: BarChart3,
      color: 'orange',
      roles: ['admin']
    },
    {
      id: 'inventario',
      label: 'Inventario',
      path: '/estadisticas-estandar/inventario',
      icon: Package,
      color: 'teal',
      roles: ['admin']
    },
    {
      id: 'productos',
      label: 'Productos',
      path: '/estadisticas-estandar/productos',
      icon: ShoppingBag,
      color: 'green',
      roles: ['admin']
    }
  ];

  // Filtrar secciones según el rol del usuario
  const visibleDashboardItems = dashboardSection.filter(item => canAccess(item.roles));
  const visibleAdvancedStatsItems = advancedStatsSection.filter(item => canAccess(item.roles));
  const visibleStandardStatsItems = standardStatsSection.filter(item => canAccess(item.roles));


  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getActiveColor = (color) => {
    const colors = {
      blue: 'bg-blue-600 text-white',
      purple: 'bg-purple-600 text-white',
      green: 'bg-green-600 text-white',
      orange: 'bg-orange-600 text-white',
      teal: 'bg-teal-600 text-white'
    };
    return colors[color] || 'bg-gray-600 text-white';
  };

  const getHoverColor = (color) => {
    const colors = {
      blue: 'hover:bg-blue-50 hover:text-blue-700',
      purple: 'hover:bg-purple-50 hover:text-purple-700',
      green: 'hover:bg-green-50 hover:text-green-700',
      orange: 'hover:bg-orange-50 hover:text-orange-700',
      teal: 'hover:bg-teal-50 hover:text-teal-700'
    };
    return colors[color] || 'hover:bg-gray-50 hover:text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col">
      {/* Header Principal - Navegación */}
      <header className="bg-white shadow-lg border-b-4 border-gradient-to-r from-blue-500 to-purple-500 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Logo, Título y Ventas */}
          <div className="py-4 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              {/* Logo y Título */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Sistema de Gestión Koaj Puerto Carreño</h1>
                  <p className="text-xs text-gray-500">Panel de Control</p>
                </div>
              </div>

              {/* Ventas del Día y Mes */}
              <div className="flex items-center gap-4">
                {/* Venta del Día */}
                <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-lg border border-green-200">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Venta del Día</p>
                    {salesLoading ? (
                      <p className="text-sm font-bold text-green-700 animate-pulse">Cargando...</p>
                    ) : (
                      <p className="text-base font-bold text-green-700">{formatCurrency(dailySales)}</p>
                    )}
                  </div>
                </div>

                {/* Venta del Mes */}
                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-lg border border-blue-200">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Venta del Mes</p>
                    {salesLoading ? (
                      <p className="text-sm font-bold text-blue-700 animate-pulse">Cargando...</p>
                    ) : (
                      <p className="text-base font-bold text-blue-700">{formatCurrency(monthlySales)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Info de Usuario (Desktop) */}
              <div className="hidden lg:flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Usuario</p>
                  <p className="text-sm font-semibold text-gray-900">{user?.name || user?.email || 'Administrador'}</p>
                  {user?.role && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                      {user.role === 'admin' ? 'Administrador' : user.role === 'sales' ? 'Ventas' : user.role}
                    </span>
                  )}
                  <button
                    onClick={handleLogout}
                    className="mt-1 flex items-center gap-2 text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    Cerrar Sesión
                  </button>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
                  <User className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Navegación Principal - Todo en una línea horizontal */}
          <nav className="py-3">
            <div className="flex items-center gap-2 pb-2">
              {/* Botones principales (Cierre de Caja, Ventas Mensuales para Sales) */}
              {visibleDashboardItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${active
                      ? `${getActiveColor(item.color)} shadow-md transform scale-105`
                      : `text-gray-700 ${getHoverColor(item.color)} border border-gray-200`
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : ''}`} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}

              {/* Dropdown: Estadísticas Avanzadas (Solo Admin) */}
              {canAccess(['admin']) && (
                <div className="relative">
                  <button
                    onClick={() => toggleMenu('advanced')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${expandedMenu === 'advanced'
                      ? 'bg-yellow-500 text-white shadow-md'
                      : 'text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 border border-gray-200'
                      }`}
                  >
                    <Zap className={`w-4 h-4 ${expandedMenu === 'advanced' ? 'text-white' : ''}`} />
                    <span className="text-sm">⚡ Estadísticas Avanzadas</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenu === 'advanced' ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedMenu === 'advanced' && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] min-w-[280px]">
                      <div className="py-2">
                        <button
                          onClick={() => { handleNavigation('/estadisticas-avanzadas/ventas-totales'); toggleMenu('advanced'); }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                        >
                          <TrendingUp className="w-5 h-5 text-purple-600" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Totales de Ventas</div>
                            <div className="text-xs text-gray-500">Ventas agrupadas por día/mes</div>
                          </div>
                        </button>

                        <button
                          onClick={() => { handleNavigation('/estadisticas-avanzadas/documentos'); toggleMenu('advanced'); }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                        >
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Documentos de Venta</div>
                            <div className="text-xs text-gray-500">Facturas detalladas</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Dropdown: Estadísticas Estándar (Solo Admin) */}
              {canAccess(['admin']) && (
                <div className="relative">
                  <button
                    onClick={() => toggleMenu('standard')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${expandedMenu === 'standard'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200'
                      }`}
                  >
                    <BarChart3 className={`w-4 h-4 ${expandedMenu === 'standard' ? 'text-white' : ''}`} />
                    <span className="text-sm">📊 Estadísticas Estándar</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenu === 'standard' ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedMenu === 'standard' && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] min-w-[280px]">
                      <div className="py-2">
                        <button
                          onClick={() => { handleNavigation('/estadisticas-estandar/analytics'); toggleMenu('standard'); }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                        >
                          <TrendingUp className="w-5 h-5 text-orange-600" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Analytics Avanzado</div>
                            <div className="text-xs text-gray-500">Análisis inteligente de ventas</div>
                          </div>
                        </button>

                        <button
                          onClick={() => { handleNavigation('/estadisticas-estandar/productos'); toggleMenu('standard'); }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                        >
                          <Package className="w-5 h-5 text-green-600" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Análisis de Productos</div>
                            <div className="text-xs text-gray-500">Reportes desde Alegra</div>
                          </div>
                        </button>

                        <button
                          onClick={() => { handleNavigation('/estadisticas-estandar/inventario'); toggleMenu('standard'); }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                        >
                          <BarChart3 className="w-5 h-5 text-teal-600" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Análisis de Inventario</div>
                            <div className="text-xs text-gray-500">Estado del inventario</div>
                          </div>
                        </button>

                        <button
                          onClick={() => { handleNavigation('/monthly-sales'); toggleMenu('standard'); }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                        >
                          <ShoppingBag className="w-5 h-5 text-purple-600" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Ventas Mensuales</div>
                            <div className="text-xs text-gray-500">Reporte mensual</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Navbar Secundario - Reloj */}
      <div className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-center">
              {/* Reloj */}
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5 text-white" />
                <div>
                  <p className="text-sm font-semibold">{currentTime}</p>
                  <p className="text-xs text-white opacity-90">Hora de Colombia (UTC-5)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Comparación con Año Anterior */}
          <div className="mt-6">
            <SalesComparisonYoY date={getColombiaTodayString()} />
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} Sistema de Gestión. Todos los derechos reservados.
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

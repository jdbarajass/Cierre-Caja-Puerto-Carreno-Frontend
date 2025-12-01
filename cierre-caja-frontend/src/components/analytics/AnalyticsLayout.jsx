import React, { useState } from 'react';
import { BarChart3, Clock, Users, Trophy, RefreshCw, TrendingUp, ShoppingBag, LayoutDashboard } from 'lucide-react';
import AnalyticsDashboard from './AnalyticsDashboard';
import PeakHours from './PeakHours';
import TopCustomers from './TopCustomers';
import TopSellers from './TopSellers';
import CustomerRetention from './CustomerRetention';
import SalesTrends from './SalesTrends';
import CrossSelling from './CrossSelling';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const AnalyticsLayout = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

  // Establecer título de la página según la sección activa
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'dashboard':
        return 'Analytics - Dashboard Completo';
      case 'peak-hours':
        return 'Analytics - Horas Pico';
      case 'top-customers':
        return 'Analytics - Top Clientes';
      case 'top-sellers':
        return 'Analytics - Top Vendedoras';
      case 'retention':
        return 'Analytics - Retención de Clientes';
      case 'trends':
        return 'Analytics - Tendencias de Ventas';
      case 'cross-selling':
        return 'Analytics - Cross-Selling';
      default:
        return 'Analytics Avanzado';
    }
  };

  useDocumentTitle(getSectionTitle());

  const sections = [
    { id: 'dashboard', label: 'Dashboard Completo', icon: LayoutDashboard, description: 'Vista unificada de KPIs' },
    { id: 'peak-hours', label: 'Horas Pico', icon: Clock, description: 'Mejores horas de venta' },
    { id: 'top-customers', label: 'Top Clientes', icon: Users, description: 'Clientes que más compran' },
    { id: 'top-sellers', label: 'Top Vendedoras', icon: Trophy, description: 'Vendedoras destacadas' },
    { id: 'retention', label: 'Retención', icon: RefreshCw, description: 'Análisis RFM' },
    { id: 'trends', label: 'Tendencias', icon: TrendingUp, description: 'Patrones de venta' },
    { id: 'cross-selling', label: 'Cross-Selling', icon: ShoppingBag, description: 'Productos relacionados' }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AnalyticsDashboard />;
      case 'peak-hours':
        return <PeakHours />;
      case 'top-customers':
        return <TopCustomers />;
      case 'top-sellers':
        return <TopSellers />;
      case 'retention':
        return <CustomerRetention />;
      case 'trends':
        return <SalesTrends />;
      case 'cross-selling':
        return <CrossSelling />;
      default:
        return <AnalyticsDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header de Sección */}
      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 rounded-lg">
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analytics Avanzado</h2>
            <p className="text-sm text-gray-600">Análisis inteligente de ventas</p>
          </div>
        </div>
      </div>

      {/* Navegación de Subsecciones */}
      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-orange-700 border border-gray-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                <div className="text-left">
                  <div className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                    {section.label}
                  </div>
                  <div className={`text-xs ${isActive ? 'text-orange-100' : 'text-gray-500'}`}>
                    {section.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido de la Sección Activa */}
      <div>
        {renderSection()}
      </div>
    </div>
  );
};

export default AnalyticsLayout;

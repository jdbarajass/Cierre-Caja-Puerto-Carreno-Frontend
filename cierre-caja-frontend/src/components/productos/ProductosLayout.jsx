import React, { useState } from 'react';
import { ArrowLeft, BarChart3, TrendingUp, Package, FileBarChart, Ruler, Shirt, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardProductos from './DashboardProductos';
import TopProductos from './TopProductos';
import CategoriasProductos from './CategoriasProductos';
import AnalisisCompleto from './AnalisisCompleto';
import AnalisisPorTalla from './AnalisisPorTalla';
import AnalisisPorCategoriaTalla from './AnalisisPorCategoriaTalla';
import AnalisisPorDepartamentoTalla from './AnalisisPorDepartamentoTalla';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const ProductosLayout = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');

  // Establecer título de la página según la sección activa
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'dashboard':
        return 'Análisis de Productos - Resumen';
      case 'top-productos':
        return 'Análisis de Productos - Top Productos';
      case 'categorias':
        return 'Análisis de Productos - Categorías';
      case 'analisis-completo':
        return 'Análisis de Productos - Completo';
      case 'analisis-por-talla':
        return 'Análisis de Productos - Por Talla';
      case 'analisis-categoria-talla':
        return 'Análisis de Productos - Categoría y Talla';
      case 'analisis-departamento-talla':
        return 'Análisis de Productos - Departamento y Talla';
      default:
        return 'Análisis de Productos';
    }
  };

  useDocumentTitle(getSectionTitle());

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const sections = [
    { id: 'dashboard', label: 'Resumen', icon: BarChart3, description: 'Métricas principales' },
    { id: 'top-productos', label: 'Top Productos', icon: TrendingUp, description: 'Más vendidos' },
    { id: 'categorias', label: 'Categorías', icon: Package, description: 'Análisis por tipo' },
    { id: 'analisis-completo', label: 'Análisis Completo', icon: FileBarChart, description: 'Vista detallada' },
    { id: 'analisis-por-talla', label: 'Por Talla', icon: Ruler, description: 'Ventas por talla' },
    { id: 'analisis-categoria-talla', label: 'Categoría + Talla', icon: Shirt, description: 'Por categoría y talla' },
    { id: 'analisis-departamento-talla', label: 'Departamento + Talla', icon: Users, description: 'Por departamento y talla' }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardProductos />;
      case 'top-productos':
        return <TopProductos />;
      case 'categorias':
        return <CategoriasProductos />;
      case 'analisis-completo':
        return <AnalisisCompleto />;
      case 'analisis-por-talla':
        return <AnalisisPorTalla />;
      case 'analisis-categoria-talla':
        return <AnalisisPorCategoriaTalla />;
      case 'analisis-departamento-talla':
        return <AnalisisPorDepartamentoTalla />;
      default:
        return <DashboardProductos />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header Principal */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToDashboard}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                title="Volver al Dashboard"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-7 h-7 text-blue-600" />
                  Análisis de Productos
                </h1>
                <p className="text-sm text-gray-600">Sistema de reportes desde Alegra</p>
              </div>
            </div>

            {/* Botón Ventas Mensuales */}
            <button
              onClick={() => navigate('/monthly-sales')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-md"
            >
              <BarChart3 className="w-4 h-4" />
              Ver Ventas Mensuales
            </button>
          </div>
        </div>
      </div>

      {/* Navegación de Secciones */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  <div className="text-left">
                    <div className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                      {section.label}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                      {section.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido de la Sección Activa */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {renderSection()}
      </div>
    </div>
  );
};

export default ProductosLayout;

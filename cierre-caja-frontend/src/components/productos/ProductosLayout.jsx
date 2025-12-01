import React, { useState } from 'react';
import { BarChart3, TrendingUp, Package, FileBarChart, Ruler, Shirt, Users } from 'lucide-react';
import DashboardProductos from './DashboardProductos';
import TopProductos from './TopProductos';
import CategoriasProductos from './CategoriasProductos';
import AnalisisCompleto from './AnalisisCompleto';
import AnalisisPorTalla from './AnalisisPorTalla';
import AnalisisPorCategoriaTalla from './AnalisisPorCategoriaTalla';
import AnalisisPorDepartamentoTalla from './AnalisisPorDepartamentoTalla';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const ProductosLayout = () => {
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

  const sections = [
    { id: 'analisis-completo', label: 'Análisis Completo', icon: FileBarChart, description: 'Vista detallada' },
    { id: 'dashboard', label: 'Resumen', icon: BarChart3, description: 'Métricas principales' },
    { id: 'top-productos', label: 'Top Productos', icon: TrendingUp, description: 'Más vendidos' },
    { id: 'categorias', label: 'Categorías', icon: Package, description: 'Análisis por tipo' },
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
    <div className="space-y-6">
      {/* Header de Sección */}
      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <Package className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Análisis de Productos</h2>
            <p className="text-sm text-gray-600">Sistema de reportes desde Alegra</p>
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
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-green-50 hover:text-green-700 border border-gray-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                <div className="text-left">
                  <div className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                    {section.label}
                  </div>
                  <div className={`text-xs ${isActive ? 'text-green-100' : 'text-gray-500'}`}>
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

export default ProductosLayout;

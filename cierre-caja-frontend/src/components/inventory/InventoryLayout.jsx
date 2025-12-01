import React, { useState } from 'react';
import { LayoutDashboard, Package, AlertTriangle, TrendingUp, PieChart, Grid, Ruler, Upload, Database } from 'lucide-react';
import InventoryDashboard from './InventoryDashboard';
import DepartmentAnalysis from './DepartmentAnalysis';
import StockAlerts from './StockAlerts';
import ABCAnalysis from './ABCAnalysis';
import TopProducts from './TopProducts';
import CategorySizeAnalysis from './CategorySizeAnalysis';
import FileUploadInventory from './FileUploadInventory';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const InventoryLayout = () => {
  const [mainSection, setMainSection] = useState('cargar-archivo'); // 'cargar-archivo' o 'analisis'
  const [activeSubsection, setActiveSubsection] = useState('dashboard');

  // Establecer título de la página
  const getSectionTitle = () => {
    if (mainSection === 'cargar-archivo') {
      return 'Inventario - Cargar Archivo';
    }

    switch (activeSubsection) {
      case 'dashboard':
        return 'Inventario - Dashboard';
      case 'departamentos':
        return 'Inventario - Departamentos';
      case 'alertas':
        return 'Inventario - Alertas de Stock';
      case 'abc':
        return 'Inventario - Análisis ABC';
      case 'top-productos':
        return 'Inventario - Top Productos';
      case 'categorias-tallas':
        return 'Inventario - Categorías y Tallas';
      default:
        return 'Inventario';
    }
  };

  useDocumentTitle(getSectionTitle());

  const mainSections = [
    { id: 'cargar-archivo', label: 'Cargar Archivo', icon: Upload, description: 'Análisis de archivo' },
    { id: 'analisis', label: 'Análisis de Inventario', icon: Database, description: 'Consultar inventario actual' }
  ];

  const analysisSubsections = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Resumen ejecutivo' },
    { id: 'departamentos', label: 'Departamentos', icon: Grid, description: 'Por departamento' },
    { id: 'alertas', label: 'Alertas de Stock', icon: AlertTriangle, description: 'Stock bajo y sin stock' },
    { id: 'abc', label: 'Análisis ABC', icon: PieChart, description: 'Clasificación Pareto' },
    { id: 'top-productos', label: 'Top Productos', icon: TrendingUp, description: 'Mayor valor' },
    { id: 'categorias-tallas', label: 'Categorías y Tallas', icon: Ruler, description: 'Análisis detallado' }
  ];

  const handleMainSectionChange = (sectionId) => {
    setMainSection(sectionId);
    // Si cambia a análisis, resetear a dashboard
    if (sectionId === 'analisis') {
      setActiveSubsection('dashboard');
    }
  };

  const renderContent = () => {
    if (mainSection === 'cargar-archivo') {
      return <FileUploadInventory />;
    }

    // Renderizar subsecciones de análisis
    switch (activeSubsection) {
      case 'dashboard':
        return <InventoryDashboard />;
      case 'departamentos':
        return <DepartmentAnalysis />;
      case 'alertas':
        return <StockAlerts />;
      case 'abc':
        return <ABCAnalysis />;
      case 'top-productos':
        return <TopProducts />;
      case 'categorias-tallas':
        return <CategorySizeAnalysis />;
      default:
        return <InventoryDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header de Sección */}
      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-teal-500">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-100 rounded-lg">
            <Package className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Análisis de Inventario</h2>
            <p className="text-sm text-gray-600">Gestión y análisis de inventario desde Alegra</p>
          </div>
        </div>
      </div>

      {/* Navegación Principal - Nivel 1 */}
      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
        <div className="flex gap-3">
          {mainSections.map((section) => {
            const Icon = section.icon;
            const isActive = mainSection === section.id;

            return (
              <button
                key={section.id}
                onClick={() => handleMainSectionChange(section.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg whitespace-nowrap transition-all flex-1 ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-50 text-gray-700 hover:bg-teal-50 hover:text-teal-700 border border-gray-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                <div className="text-left">
                  <div className={`text-base font-bold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                    {section.label}
                  </div>
                  <div className={`text-xs ${isActive ? 'text-teal-100' : 'text-gray-500'}`}>
                    {section.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navegación Secundaria - Nivel 2 (solo cuando está en Análisis) */}
      {mainSection === 'analisis' && (
        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
            {analysisSubsections.map((subsection) => {
              const Icon = subsection.icon;
              const isActive = activeSubsection === subsection.id;

              return (
                <button
                  key={subsection.id}
                  onClick={() => setActiveSubsection(subsection.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-gray-50 text-gray-700 hover:bg-teal-50 hover:text-teal-700 border border-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  <div className="text-left">
                    <div className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                      {subsection.label}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-teal-100' : 'text-gray-500'}`}>
                      {subsection.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Contenido de la Sección Activa */}
      <div>
        {renderContent()}
      </div>
    </div>
  );
};

export default InventoryLayout;

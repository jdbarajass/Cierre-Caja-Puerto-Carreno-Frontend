import React, { useState } from 'react';
import { Zap, Package, TrendingUp, FileText } from 'lucide-react';
import DirectInventory from './DirectInventory';
import DirectSalesTotals from './DirectSalesTotals';
import DirectSalesDocuments from './DirectSalesDocuments';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const DirectStatsDashboard = () => {
  useDocumentTitle('Estadísticas Avanzadas');

  const [activeTab, setActiveTab] = useState('inventory');

  const tabs = [
    {
      id: 'inventory',
      label: 'Inventario',
      icon: Package,
      color: 'green',
      component: DirectInventory,
    },
    {
      id: 'sales-totals',
      label: 'Totales de Ventas',
      icon: TrendingUp,
      color: 'purple',
    },
    {
      id: 'sales-documents',
      label: 'Documentos',
      icon: FileText,
      color: 'blue',
    },
  ];

  const getTabColor = (color, isActive) => {
    if (isActive) {
      const colors = {
        green: 'bg-green-600 text-white',
        purple: 'bg-purple-600 text-white',
        blue: 'bg-blue-600 text-white',
      };
      return colors[color] || 'bg-gray-600 text-white';
    } else {
      const colors = {
        green: 'text-green-700 hover:bg-green-50',
        purple: 'text-purple-700 hover:bg-purple-50',
        blue: 'text-blue-700 hover:bg-blue-50',
      };
      return colors[color] || 'text-gray-700 hover:bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="bg-yellow-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-10 h-10" />
          <div>
            <h1 className="text-3xl font-bold">Estadísticas Avanzadas</h1>
            <p className="text-yellow-50 mt-1">
              APIs directas de Alegra - Consultas rápidas y completas
            </p>
          </div>
        </div>
      </div>

      {/* Información */}
      <div className="bg-blue-50 ring-1 ring-inset ring-blue-200 p-4 rounded-xl">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900">¿Qué son las Estadísticas Avanzadas?</h3>
            <p className="text-sm text-blue-700 mt-1">
              Estas estadísticas consultan directamente las APIs de Alegra, ofreciendo:
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>Respuestas más rápidas y eficientes</li>
              <li>Datos calculados directamente por Alegra</li>
              <li>Ideal para reportes y dashboards en tiempo real</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? `border-${tab.color}-600 ${getTabColor(tab.color, true)}`
                      : `border-transparent ${getTabColor(tab.color, false)}`
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenido de la Tab Activa */}
        <div className="p-6">
          {activeTab === 'inventory' && <DirectInventory />}
          {activeTab === 'sales-totals' && <DirectSalesTotals />}
          {activeTab === 'sales-documents' && <DirectSalesDocuments />}
        </div>
      </div>
    </div>
  );
};

export default DirectStatsDashboard;

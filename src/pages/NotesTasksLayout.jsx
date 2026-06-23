import React, { useState } from 'react';
import { ChevronRight, ShoppingBag, CheckSquare } from 'lucide-react';
import RestockSection from './RestockSection';
import OperationalTasksSection from './OperationalTasksSection';

const NotesTasksLayout = () => {
  const [activeTab, setActiveTab] = useState('restock');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <span>Sistema KOAJ</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Notas y Pendientes</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Notas y Pendientes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Checklist de resurtido y tareas operativas del local
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('restock')}
            className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors ${
              activeTab === 'restock'
                ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${activeTab === 'restock' ? 'bg-amber-100' : 'bg-gray-100'}`}>
              <ShoppingBag className={`w-3.5 h-3.5 ${activeTab === 'restock' ? 'text-amber-600' : 'text-gray-500'}`} />
            </div>
            Por Pedir / Resurtido
          </button>
          <button
            onClick={() => setActiveTab('operational')}
            className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors ${
              activeTab === 'operational'
                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${activeTab === 'operational' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
              <CheckSquare className={`w-3.5 h-3.5 ${activeTab === 'operational' ? 'text-emerald-600' : 'text-gray-500'}`} />
            </div>
            Tareas Operativas
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'restock' && <RestockSection />}
          {activeTab === 'operational' && <OperationalTasksSection />}
        </div>
      </div>
    </div>
  );
};

export default NotesTasksLayout;

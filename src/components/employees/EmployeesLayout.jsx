import React, { useState } from 'react';
import { isAdmin } from '../../utils/auth';
import { Shirt, DollarSign, Clock, Sun, CreditCard, ChevronRight, Search, X } from 'lucide-react';
import { EMPLOYEE_GROUPS } from '../../utils/employeeGroups';

import RopaSection from './RopaSection';
import PrestamosSection from './PrestamosSection';
import PermisosSection from './PermisosSection';
import VacacionesSection from './VacacionesSection';
import PagosSection from './PagosSection';

const TABS = [
  { id: 'ropa',       label: 'Ropa',        icon: Shirt,      color: 'pink'   },
  { id: 'prestamos',  label: 'Préstamos',   icon: DollarSign, color: 'amber'  },
  { id: 'permisos',   label: 'Permisos',    icon: Clock,      color: 'orange' },
  { id: 'vacaciones', label: 'Vacaciones',  icon: Sun,        color: 'teal'   },
  { id: 'pagos',      label: 'Pagos',       icon: CreditCard, color: 'green'  },
];

const COLOR_MAP = {
  pink:   { active: 'bg-pink-50 text-pink-700 border-b-2 border-pink-500',   icon: 'text-pink-500',   bg: 'bg-pink-50'   },
  amber:  { active: 'bg-amber-50 text-amber-700 border-b-2 border-amber-500', icon: 'text-amber-500', bg: 'bg-amber-50'  },
  orange: { active: 'bg-orange-50 text-orange-700 border-b-2 border-orange-500', icon: 'text-orange-500', bg: 'bg-orange-50' },
  teal:   { active: 'bg-teal-50 text-teal-700 border-b-2 border-teal-500',   icon: 'text-teal-500',   bg: 'bg-teal-50'   },
  green:  { active: 'bg-green-50 text-green-700 border-b-2 border-green-500', icon: 'text-green-500', bg: 'bg-green-50'  },
};

const EmployeesLayout = () => {
  const admin = isAdmin();
  const [activeTab, setActiveTab] = useState('ropa');
  const [filterNombre, setFilterNombre] = useState('');
  const [filterInput, setFilterInput] = useState('');

  const applyFilter = () => setFilterNombre(filterInput.trim());
  const clearFilter = () => { setFilterNombre(''); setFilterInput(''); };
  const quickFilter = (name) => { setFilterNombre(name); setFilterInput(name); };

  const visibleTabs = admin ? TABS : TABS.filter(t => t.id !== 'pagos');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <span>Sistema KOAJ</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Control de Empleadas</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Control de Empleadas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Registro de ropa, préstamos, permisos, vacaciones y pagos
        </p>
      </div>

      {/* Buscador / filtro por nombre */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">Filtro rápido:</span>
          <button onClick={clearFilter}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !filterNombre ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            Todas
          </button>
          {EMPLOYEE_GROUPS.map(g => (
            <button key={g.key} onClick={() => quickFilter(g.name)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterNombre === g.name ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {g.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="O escribe un nombre…"
              value={filterInput}
              onChange={e => setFilterInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilter()}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button onClick={applyFilter}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            Buscar
          </button>
          {filterNombre && (
            <span className="flex items-center gap-1 text-sm text-indigo-600 font-medium">
              Mostrando: <strong>{filterNombre}</strong>
              <button onClick={clearFilter} className="ml-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const colors = COLOR_MAP[tab.color];
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? colors.active : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}>
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${active ? colors.bg : 'bg-gray-100'}`}>
                  <Icon className={`w-3.5 h-3.5 ${active ? colors.icon : 'text-gray-500'}`} />
                </div>
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'ropa'       && <RopaSection       isAdmin={admin} filterNombre={filterNombre} />}
          {activeTab === 'prestamos'  && <PrestamosSection  isAdmin={admin} filterNombre={filterNombre} />}
          {activeTab === 'permisos'   && <PermisosSection   isAdmin={admin} filterNombre={filterNombre} />}
          {activeTab === 'vacaciones' && <VacacionesSection isAdmin={admin} filterNombre={filterNombre} />}
          {activeTab === 'pagos'      && admin && <PagosSection isAdmin={admin} filterNombre={filterNombre} />}
        </div>
      </div>
    </div>
  );
};

export default EmployeesLayout;

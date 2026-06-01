import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../utils/auth';
import { getUsers } from '../../services/usersService';
import { Shirt, DollarSign, Clock, Palmtree, CreditCard, Users, ChevronRight } from 'lucide-react';

import RopaSection from './RopaSection';
import PrestamosSection from './PrestamosSection';
import PermisosSection from './PermisosSection';
import VacacionesSection from './VacacionesSection';
import PagosSection from './PagosSection';

const TABS = [
  { id: 'ropa',       label: 'Ropa',            icon: Shirt,       color: 'pink'   },
  { id: 'prestamos',  label: 'Préstamos',        icon: DollarSign,  color: 'amber'  },
  { id: 'permisos',   label: 'Permisos',         icon: Clock,       color: 'orange' },
  { id: 'vacaciones', label: 'Vacaciones',       icon: Palmtree,    color: 'teal'   },
  { id: 'pagos',      label: 'Pagos',            icon: CreditCard,  color: 'green'  },
];

const COLOR_MAP = {
  pink:   { tab: 'border-pink-500 text-pink-600',   active: 'bg-pink-50 text-pink-700 border-b-2 border-pink-500',   icon: 'text-pink-500',  bg: 'bg-pink-50'  },
  amber:  { tab: 'border-amber-500 text-amber-600', active: 'bg-amber-50 text-amber-700 border-b-2 border-amber-500', icon: 'text-amber-500', bg: 'bg-amber-50' },
  orange: { tab: 'border-orange-500 text-orange-600', active: 'bg-orange-50 text-orange-700 border-b-2 border-orange-500', icon: 'text-orange-500', bg: 'bg-orange-50' },
  teal:   { tab: 'border-teal-500 text-teal-600',   active: 'bg-teal-50 text-teal-700 border-b-2 border-teal-500',   icon: 'text-teal-500',  bg: 'bg-teal-50'  },
  green:  { tab: 'border-green-500 text-green-600', active: 'bg-green-50 text-green-700 border-b-2 border-green-500', icon: 'text-green-500', bg: 'bg-green-50' },
};

const EmployeesLayout = () => {
  const { user } = useAuth();
  const admin = isAdmin();
  const [activeTab, setActiveTab] = useState('ropa');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  useEffect(() => {
    if (admin) {
      getUsers()
        .then(data => {
          const sales = (data.users || []).filter(u => u.role === 'sales' && u.is_active);
          setEmployees(sales);
          if (sales.length > 0) setSelectedEmployeeId(sales[0].id);
        })
        .catch(() => {});
    }
  }, [admin]);

  const visibleTabs = admin ? TABS : TABS.filter(t => t.id !== 'pagos');

  const sectionProps = {
    isAdmin: admin,
    selectedEmployeeId: admin ? selectedEmployeeId : null,
    currentUserId: user?.id,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
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

        {/* Selector de empleada (solo admin) */}
        {admin && employees.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Users className="w-4 h-4 text-indigo-500" />
            <select
              value={selectedEmployeeId || ''}
              onChange={e => setSelectedEmployeeId(Number(e.target.value))}
              className="text-sm font-medium text-gray-700 border-none outline-none bg-transparent pr-4"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const colors = COLOR_MAP[tab.color];
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? colors.active
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${active ? colors.bg : 'bg-gray-100'}`}>
                  <Icon className={`w-3.5 h-3.5 ${active ? colors.icon : 'text-gray-500'}`} />
                </div>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Panel activo */}
        <div className="p-6">
          {activeTab === 'ropa'       && <RopaSection       {...sectionProps} />}
          {activeTab === 'prestamos'  && <PrestamosSection  {...sectionProps} />}
          {activeTab === 'permisos'   && <PermisosSection   {...sectionProps} />}
          {activeTab === 'vacaciones' && <VacacionesSection {...sectionProps} />}
          {activeTab === 'pagos'      && admin && <PagosSection {...sectionProps} employees={employees} />}
        </div>
      </div>
    </div>
  );
};

export default EmployeesLayout;

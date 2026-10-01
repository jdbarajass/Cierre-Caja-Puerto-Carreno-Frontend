import React from 'react';
import { Store } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Selector de tienda (multi-tienda: KOAJ Carreño / KOAJ Primavera).
 *
 * Solo aparece si el usuario puede operar más de una tienda (hoy: el admin).
 * Al cambiar, toda la app vuelve a montar las páginas y recarga los datos de
 * la tienda elegida (ver ProtectedRoute y utils/activeStore.js).
 *
 * variant="header": control segmentado compacto para la barra superior.
 * variant="menu": filas grandes (táctiles) para el menú móvil.
 */
const StoreSwitcher = ({ variant = 'header', onSwitched }) => {
  const { stores, activeStore, switchStore } = useAuth();

  if (stores.length < 2) return null;

  const handleSelect = (code) => {
    if (code === activeStore?.code) return;
    switchStore(code);
    onSwitched?.();
  };

  if (variant === 'menu') {
    return (
      <div role="radiogroup" aria-label="Tienda" className="px-3 pt-1 pb-3 mb-1 border-b border-gray-100">
        <p className="px-0.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Tienda</p>
        <div className="grid grid-cols-2 gap-2">
          {stores.map((store) => {
            const active = store.code === activeStore?.code;
            return (
              <button
                key={store.code}
                role="radio"
                aria-checked={active}
                onClick={() => handleSelect(store.code)}
                className={`flex items-center justify-center gap-2 min-h-[48px] rounded-xl text-[15px] font-medium transition-colors ${
                  active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                <Store className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                {store.short_name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tienda"
      className="hidden md:flex items-center gap-0.5 p-0.5 h-9 rounded-full bg-gray-100"
    >
      {stores.map((store) => {
        const active = store.code === activeStore?.code;
        return (
          <button
            key={store.code}
            role="radio"
            aria-checked={active}
            title={store.name}
            onClick={() => handleSelect(store.code)}
            className={`h-8 px-3 rounded-full text-[13px] font-medium transition-colors ${
              active ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {store.short_name}
          </button>
        );
      })}
    </div>
  );
};

export default StoreSwitcher;

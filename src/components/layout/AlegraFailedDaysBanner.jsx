import React, { useEffect, useState } from 'react';
import { FAILED_DAYS_EVENT } from '../../utils/dataWarnings';
import SalesDataNotice from '../direct/SalesDataNotice';

/**
 * Aviso global: alguna consulta de esta pantalla quedó sin días porque Alegra
 * no respondió (Productos, Analytics, Ventas Mensuales, metas...). Se reinicia
 * al cambiar de página porque cada ruta monta su propio MainLayout.
 */
const AlegraFailedDaysBanner = () => {
  const [days, setDays] = useState([]);

  useEffect(() => {
    const onFailedDays = (event) => {
      setDays((prev) => Array.from(new Set([...prev, ...(event.detail || [])])).sort());
    };
    window.addEventListener(FAILED_DAYS_EVENT, onFailedDays);
    return () => window.removeEventListener(FAILED_DAYS_EVENT, onFailedDays);
  }, []);

  if (days.length === 0) return null;
  return (
    <div className="mb-6">
      <SalesDataNotice failedDays={days} />
    </div>
  );
};

export default AlegraFailedDaysBanner;

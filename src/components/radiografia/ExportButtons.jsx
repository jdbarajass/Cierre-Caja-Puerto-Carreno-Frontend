// Botones Excel / PDF de cada vista de la Radiografía (Fase 6 del plan del backend).
// El archivo lo arma el backend con las MISMAS cifras de la pantalla (?format=xlsx|pdf).
import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadRadiografia } from '../../services/radiografiaService';
import { getActiveStoreCode } from '../../utils/activeStore';

const ExportButtons = ({ url, view, period, allStores = false }) => {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const store = allStores ? null : getActiveStoreCode();

  const go = async (fmt) => {
    setBusy(fmt);
    setError('');
    try {
      await downloadRadiografia(url, fmt, `radiografia_${view}${store ? `_${store}` : ''}_${period}.${fmt}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {['xlsx', 'pdf'].map(fmt => (
        <button key={fmt} type="button" onClick={() => go(fmt)} disabled={!!busy}
          aria-label={`Descargar en ${fmt === 'xlsx' ? 'Excel' : 'PDF'}`}
          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 disabled:opacity-50">
          <Download className={`w-3.5 h-3.5 ${busy === fmt ? 'animate-bounce' : ''}`} aria-hidden="true" />
          {fmt === 'xlsx' ? 'Excel' : 'PDF'}
        </button>
      ))}
      {error && <span role="alert" className="text-xs text-red-700 ml-1">{error}</span>}
    </div>
  );
};

export default ExportButtons;

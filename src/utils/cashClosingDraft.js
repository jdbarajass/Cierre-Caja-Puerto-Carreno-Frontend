/**
 * Persistencia local (borrador) del cierre de caja en curso.
 *
 * Si se pierde la conexión o se recarga la página a mitad del conteo de
 * monedas/billetes, el trabajo ya ingresado no se pierde: se guarda en
 * localStorage (por tienda y fecha de cierre) y se ofrece restaurarlo.
 *
 * Solo se guardan valores ingresados por el usuario (conteo, métodos de
 * pago, ajustes, base de caja). NUNCA se guardan datos de Alegra
 * (preconsulta): esos siempre deben volver a consultarse al servidor.
 */
import { getActiveStoreCode, DEFAULT_STORE_CODE } from './activeStore';

const PREFIX = 'koaj_cierre_draft_';
const MAX_DRAFTS = 5;

// Multi-tienda: un borrador por tienda y fecha, para que el conteo a medias
// de una tienda nunca se restaure en la otra. Carreño conserva el formato de
// clave anterior (sin tienda) para no perder borradores existentes.
const keyFor = (date) => {
  const store = getActiveStoreCode();
  return store && store !== DEFAULT_STORE_CODE ? `${PREFIX}${store}_${date}` : `${PREFIX}${date}`;
};

const isDraftEmpty = (draft) => {
  if (!draft) return true;
  const hasValue = (obj) => Object.values(obj || {}).some((v) => v !== '' && v !== null && v !== undefined);
  const excedentesHaveValue = (draft.excedentes || []).some((e) => e.valor);
  return !hasValue(draft.coins) && !hasValue(draft.bills) && !hasValue(draft.metodosPago)
    && !hasValue(draft.adjustments) && !excedentesHaveValue;
};

export const saveDraft = (date, data) => {
  try {
    if (isDraftEmpty(data)) {
      clearDraft(date);
      return;
    }
    localStorage.setItem(keyFor(date), JSON.stringify({ ...data, savedAt: Date.now() }));
    pruneOldDrafts();
  } catch {
    // localStorage puede fallar (modo privado, cuota llena, etc.) - no es crítico
  }
};

export const loadDraft = (date) => {
  try {
    const raw = localStorage.getItem(keyFor(date));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearDraft = (date) => {
  try {
    localStorage.removeItem(keyFor(date));
  } catch {
    // no-op
  }
};

function pruneOldDrafts() {
  try {
    const draftKeys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
    if (draftKeys.length <= MAX_DRAFTS) return;

    const withTimestamps = draftKeys.map((k) => {
      try {
        const parsed = JSON.parse(localStorage.getItem(k));
        return { key: k, savedAt: parsed?.savedAt || 0 };
      } catch {
        return { key: k, savedAt: 0 };
      }
    });

    withTimestamps
      .sort((a, b) => a.savedAt - b.savedAt)
      .slice(0, withTimestamps.length - MAX_DRAFTS)
      .forEach((entry) => localStorage.removeItem(entry.key));
  } catch {
    // no-op
  }
}

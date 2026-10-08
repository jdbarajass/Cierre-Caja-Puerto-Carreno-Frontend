// Recordatorios del administrador (app/services/reminders.py del backend):
// al entrar a la plataforma, una ventana con lo que toca hacer (congelar la
// copia de facturas en diciembre, cerrar el mes, bajar el respaldo), los pasos
// y un botón que lleva al lugar exacto. Se muestra una vez por sesión y tienda;
// "Recordarme mañana" lo pospone y "Ya lo hice" lo quita para ese periodo.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, X, ArrowRight } from 'lucide-react';
import { getReminders, snoozeReminder, markReminderDone } from '../../services/remindersService';
import useDialog from '../../hooks/useDialog';

const sessionKey = (store) => `reminders_seen_${store || 'default'}`;

const readSeen = (store) => {
  try { return sessionStorage.getItem(sessionKey(store)) === '1'; } catch { return false; }
};
const writeSeen = (store) => {
  try { sessionStorage.setItem(sessionKey(store), '1'); } catch { /* sin sessionStorage: se vuelve a mostrar */ }
};

const RemindersPopup = ({ store }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const close = () => { writeSeen(store); setOpen(false); };
  const ref = useDialog(open, close);

  useEffect(() => {
    if (readSeen(store)) return undefined;
    let alive = true;
    getReminders().then(list => {
      if (alive && list.length) {
        setItems(list);
        setIndex(0);
        setOpen(true);
      }
    });
    return () => { alive = false; };
  }, [store]);

  if (!open || !items[index]) return null;
  const r = items[index];

  const next = () => {
    if (index + 1 < items.length) setIndex(index + 1);
    else close();
  };
  const act = async (fn) => {
    setBusy(true);
    try { await fn(); } catch { /* si falla, igual se pasa al siguiente: vuelve a salir la próxima vez */ }
    setBusy(false);
    next();
  };
  const go = () => {
    close();
    navigate(r.path);
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto">
      <div className="flex items-end sm:items-center justify-center min-h-full sm:p-4">
        <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-[2px] animate-backdrop" onClick={close} />
        <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dlg-reminder" tabIndex={-1}
          className="relative w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl sm:max-w-lg animate-sheet max-h-[92dvh] overflow-y-auto overscroll-contain">
          <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <BellRing className="w-5 h-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
                  Recordatorio{items.length > 1 && ` ${index + 1} de ${items.length}`}
                </p>
                <h3 id="dlg-reminder" className="text-lg font-semibold text-gray-900 leading-snug">{r.title}</h3>
              </div>
            </div>
            <button aria-label="Cerrar" onClick={close} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-5 pb-4 space-y-3">
            <p className="text-sm text-gray-700">{r.body}</p>
            <ol className="space-y-1.5">
              {r.steps.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-800">
                  <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[11px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <button onClick={go} disabled={busy}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {r.action_label} <ArrowRight className="w-4 h-4" />
            </button>
            <div className="flex gap-2">
              <button onClick={() => act(() => snoozeReminder(r.key, 1))} disabled={busy}
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Recordarme mañana
              </button>
              {r.done_label && (
                <button onClick={() => act(() => markReminderDone(r.key))} disabled={busy}
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  {r.done_label}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemindersPopup;

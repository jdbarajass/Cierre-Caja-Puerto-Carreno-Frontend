import { useEffect, useRef } from 'react';

// Pila de diálogos abiertos: Escape y Tab solo actúan sobre el de arriba
const stack = [];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accesibilidad de teclado para modales (Fase 13). Solo comportamiento de foco:
 * no cambia qué hace el modal.
 *  - Al abrir: guarda el foco anterior y lo mueve dentro del diálogo.
 *  - Tab / Shift+Tab: el foco no se escapa del diálogo.
 *  - Escape: llama a onClose (el mismo manejador del botón Cerrar/Cancelar).
 *    Sin onClose (p. ej. el modal de carga) Escape no hace nada.
 *  - Al cerrar: devuelve el foco al elemento que lo abrió.
 *
 *   const ref = useDialog(showModal, () => setShowModal(false));
 *   {showModal && <div ref={ref} role="dialog" aria-modal="true">…</div>}
 *
 * @param {boolean} open
 * @param {(() => void) | null} onClose
 */
const useDialog = (open, onClose = null) => {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    const previous = document.activeElement;
    const entry = { node };
    stack.push(entry);

    const focusables = () => [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);

    // Foco inicial: el primer campo si lo hay; si no, el diálogo mismo (así el
    // lector de pantalla anuncia el título sin disparar una acción por error)
    if (!node.contains(document.activeElement)) {
      const firstField = node.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])');
      if (firstField) firstField.focus({ preventScroll: true });
      else {
        if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
        node.focus({ preventScroll: true });
      }
    }

    const onKeyDown = (e) => {
      if (stack[stack.length - 1] !== entry) return;
      if (e.key === 'Escape' && onCloseRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const i = stack.indexOf(entry);
      if (i !== -1) stack.splice(i, 1);
      // Devolver el foco solo si sigue en la página y nadie lo movió a otro lado
      if (previous && previous.isConnected && typeof previous.focus === 'function' &&
          (document.activeElement === document.body || !document.activeElement || node.contains(document.activeElement))) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [open]);

  return ref;
};

export default useDialog;

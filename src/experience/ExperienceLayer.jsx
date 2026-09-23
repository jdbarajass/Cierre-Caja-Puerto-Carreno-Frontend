import { Component, lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { experience } from './store';
import { detectCapabilities, prefersReducedMotion } from './capabilities';

// three + @react-three/fiber viajan en un chunk aparte: no pesan en la
// primera carga ni retrasan el login o el formulario del cierre.
const ExperienceCanvas = lazy(() => import('./ExperienceCanvas'));

/** Si WebGL falla (contexto perdido, driver, etc.) la capa se retira en silencio. */
class SceneBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // La app sigue funcionando sin la escena: fallback = fondo estático.
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

SceneBoundary.propTypes = { children: PropTypes.node };

/**
 * Capa visual inmersiva. Se monta una sola vez (en App, dentro del Router) y
 * persiste entre rutas: las escenas cambian de estado, no se recrean.
 *
 * Nunca intercepta interacción: pointer-events: none y aria-hidden. El puntero
 * se lee a nivel de ventana con listeners pasivos.
 */
export default function ExperienceLayer() {
  const location = useLocation();
  const [caps] = useState(() => detectCapabilities());
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion());
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    experience.route = location.pathname;
  }, [location.pathname]);

  // Movimiento reducido en vivo (el usuario puede cambiarlo sin recargar)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    experience.reducedMotion = reducedMotion;
  }, [reducedMotion]);

  // Puntero y touch → coordenadas normalizadas, sin estado de React
  useEffect(() => {
    const onMove = (e) => {
      experience.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      experience.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      experience.pointer.active = true;
    };
    const onLeave = () => { experience.pointer.active = false; };
    // En táctil, al levantar el dedo la escena se relaja
    const onUp = (e) => { if (e.pointerType !== 'mouse') onLeave(); };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    // En táctil, al empezar a hacer scroll el navegador cancela el puntero
    // (pointercancel, no pointerup): sin esto la escena creería que el dedo
    // sigue ahí y dejaría un "hueco" fijo en las partículas
    window.addEventListener('pointercancel', onLeave, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onLeave);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, []);

  // Escribiendo en un campo: la escena cede el ritmo al teclado y al
  // formulario (~20 FPS en teléfono, ~30 FPS en escritorio) mientras el campo
  // tiene el foco. Medido: sin esto la escena sumaba latencia a las teclas.
  useEffect(() => {
    const isField = (el) => el?.matches?.('input, textarea, select, [contenteditable="true"]');
    const onIn = (e) => { if (isField(e.target)) { experience.typing = true; setTyping(true); } };
    const onOut = () => {
      // Al saltar de un campo a otro no se reactiva la escena entre medio
      setTimeout(() => {
        const still = isField(document.activeElement);
        experience.typing = still;
        setTyping(still);
      }, 0);
    };
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);

  // Giroscopio (opcional): inclinar el teléfono mueve levemente la cámara.
  // Solo donde NO se pide permiso (Android); en iOS nunca se muestra un aviso.
  useEffect(() => {
    const DOE = window.DeviceOrientationEvent;
    if (!caps.mobile || reducedMotion || !DOE || typeof DOE.requestPermission === 'function') return undefined;
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    const onTilt = (e) => {
      if (e.gamma == null || e.beta == null) return;
      experience.tilt.x = clamp(e.gamma / 30);
      experience.tilt.y = clamp((45 - e.beta) / 30);
      experience.tilt.active = true;
    };
    window.addEventListener('deviceorientation', onTilt, { passive: true });
    return () => {
      window.removeEventListener('deviceorientation', onTilt);
      experience.tilt.active = false;
    };
  }, [caps.mobile, reducedMotion]);

  // Montar la escena solo cuando la página YA cargó (load) y el navegador está
  // libre: el chunk 3D nunca compite con el JS, el CSS ni las fuentes de la
  // página (medido: en 3G adelantarla retrasaba el LCP del login ~130 ms). En
  // conexiones que el navegador reporta como lentas se espera un poco más.
  useEffect(() => {
    if (!caps.webgl || caps.saveData) return undefined;
    let idleId = null;
    let timerId = null;
    const slow = ['slow-2g', '2g', '3g'].includes(navigator.connection?.effectiveType);
    const start = () => setReady(true);
    const schedule = () => {
      timerId = setTimeout(() => {
        if ('requestIdleCallback' in window) idleId = window.requestIdleCallback(start, { timeout: 2000 });
        else start();
      }, slow ? 3500 : 0);
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    return () => {
      window.removeEventListener('load', schedule);
      clearTimeout(timerId);
      if (idleId !== null) window.cancelIdleCallback?.(idleId);
    };
  }, [caps]);

  if (!ready) return null;

  return (
    <div aria-hidden="true" className="experience-layer">
      <SceneBoundary>
        <Suspense fallback={null}>
          <ExperienceCanvas initialTier={caps.tier} reducedMotion={reducedMotion} route={location.pathname} typing={typing} typingFps={caps.mobile ? 20 : 30} />
        </Suspense>
      </SceneBoundary>
    </div>
  );
}

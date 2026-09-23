import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import PropTypes from 'prop-types';
import { experience } from './store';
import { damp, PHYSICS } from './motion';
import { textFormation, seriesFormation, teamFormation } from './formations';

/**
 * Lenguaje de la escena por contexto (sección 24 del Master Prompt):
 *   LOGIN → ambiente · CIERRE → proceso/ensamblaje · ESTADÍSTICAS → datos · …
 * Cada ruta define cómo se comporta el campo; el campo nunca se recrea, solo
 * cambia de estado, así la navegación se siente continua.
 */
const AMBIENT = {
  color: '#50545D', // grafito sobre papel
  opacity: 0.55,
  size: 2.2,
};

const STAGE_ANCHOR = '[data-scene-anchor="page-stage"]';

function anchorAspect(selector) {
  const r = document.querySelector(selector)?.getBoundingClientRect();
  return r && r.width > 0 && r.height > 0 ? r.height / r.width : null;
}

function sceneFor(route) {
  if (route === '/login') {
    return {
      formationKey: 'KOAJ',
      anchor: '[data-scene-anchor="login-mark"]',
      color: '#E2E3E6', // tiza sobre tinta
      opacity: 0.95,
      size: 2.4,
    };
  }
  if (route === '/codigos-koaj' || route === '/usuarios') {
    // EXPLORACIÓN: códigos → el término buscado en partículas;
    // usuarios → un cúmulo por persona con acceso
    return {
      formationKey: route === '/usuarios' ? 'team' : 'stage-text',
      anchor: STAGE_ANCHOR,
      color: '#3341C2',
      opacity: 0.9,
      size: 2.3,
      breath: 0.006,
      repel: 0.6,
    };
  }
  if (route.startsWith('/estadisticas') || route === '/monthly-sales') {
    // ESTADÍSTICAS → transformación de datos: la serie real del módulo
    // abierto se vuelve columnas de partículas en la franja "horizonte"
    return {
      formationKey: 'series',
      anchor: '[data-scene-anchor="data-horizon"]',
      color: '#3341C2',
      opacity: 0.9,
      size: 2.3,
      // Leer datos > jugar: columnas nítidas y el cursor apenas las perturba
      breath: 0.0022,
      repel: 0.18,
    };
  }
  if (['/cuentas', '/cuentas-recompras', '/empleadas', '/notas-pendientes'].includes(route)) {
    // GESTIÓN → flujo / conexiones: el ambiente deriva en corrientes
    return { ...AMBIENT, formationKey: null, anchor: null, flow: 0.55 };
  }
  return { ...AMBIENT, formationKey: null, anchor: null };
}

const SERIES_ANCHOR = '[data-scene-anchor="data-horizon"]';

/** Escribe cada frame el "guion" que consume BaseField. */
export function SceneDirector({ route, direction }) {
  const formations = useRef({});
  const lastErrorSeq = useRef(0);
  const lastRoute = useRef(route);
  const { invalidate } = useThree();

  const scene = sceneFor(route);

  // Cargar la forma que pide la ruta (asíncrono, se cachea)
  useEffect(() => {
    const key = scene.formationKey;
    if (!key || ['series', 'stage-text', 'team'].includes(key) || formations.current[key]) return;
    let alive = true;
    textFormation(key).then((f) => {
      if (!alive) return;
      formations.current[key] = f;
      invalidate();
    });
    return () => { alive = false; };
  }, [scene.formationKey, invalidate]);

  useEffect(() => { invalidate(); }, [route, invalidate]);

  const seriesFormationRef = useRef({ key: null, formation: null });
  const stageRef = useRef({ key: null, formation: null, pending: null });

  useFrame(() => {
    const d = direction.current;
    if (scene.formationKey === 'series') {
      // La forma se reconstruye solo si la serie cambió (otro módulo o período)
      const series = experience.data.series;
      const cache = seriesFormationRef.current;
      if (!series) {
        cache.key = null;
        cache.formation = null;
      } else if (series.key !== cache.key) {
        const el = document.querySelector(SERIES_ANCHOR);
        const r = el?.getBoundingClientRect();
        if (r && r.width > 0 && r.height > 0) {
          const aspect = Math.min(0.5, Math.max(0.12, r.height / r.width));
          cache.formation = { ...seriesFormation(series.values, aspect), anchor: SERIES_ANCHOR };
          cache.key = series.key;
          invalidate();
        }
      }
      d.formation = cache.formation;
    } else if (scene.formationKey === 'stage-text' || scene.formationKey === 'team') {
      // Formaciones de la franja "escenario" (Códigos KOAJ, Usuarios)
      const st = stageRef.current;
      const isTeam = scene.formationKey === 'team';
      const value = isTeam ? experience.data.team : experience.data.stageText;
      const key = value ? `${scene.formationKey}|${isTeam ? value.key : value}` : null;
      if (!key) {
        st.key = null;
        st.formation = null;
      } else if (key !== st.key && key !== st.pending) {
        const aspect = anchorAspect(STAGE_ANCHOR);
        if (aspect) {
          if (isTeam) {
            st.formation = { ...teamFormation(value.members, Math.min(0.5, Math.max(0.08, aspect))), anchor: STAGE_ANCHOR };
            st.key = key;
            invalidate();
          } else {
            st.pending = key;
            textFormation(value).then((f) => {
              if (st.pending !== key) return; // llegó otra búsqueda después
              st.formation = { ...f, anchor: STAGE_ANCHOR };
              st.key = key;
              st.pending = null;
              invalidate();
            });
          }
        }
      }
      d.formation = st.formation;
    } else {
      d.formation = scene.formationKey ? formations.current[scene.formationKey] || null : null;
    }
    d.anchor = scene.anchor;
    d.morph = scene.formationKey ? 1 : 0;
    d.color = scene.color;
    d.breath = scene.breath ?? 0.010;
    d.flow = scene.flow ?? 0;
    d.repel = scene.repel ?? 1;
    d.opacity = scene.opacity;
    d.size = scene.size;

    // Transición entre páginas: pulso de "warp" (el campo atraviesa la cámara)
    if (route !== lastRoute.current) {
      lastRoute.current = route;
      d.warp = 1;
    }

    // Señales de la página (solo lectura)
    d.pulse = experience.data.loginBusy ? 1 : 0;
    const errSeq = experience.data.loginErrorSeq || 0;
    if (errSeq !== lastErrorSeq.current) {
      lastErrorSeq.current = errSeq;
      if (errSeq) d.impulse = 0.45; // la palabra retrocede y se rearma
    }
  });

  return null;
}

SceneDirector.propTypes = {
  route: PropTypes.string.isRequired,
  direction: PropTypes.shape({ current: PropTypes.object }).isRequired,
};

/**
 * Conductor: lee el scroll y su velocidad (sin listeners de scroll) y mueve la
 * cámara con el puntero para dar profundidad real (parallax 3D).
 */
export function Conductor({ still }) {
  const prev = useRef(null);
  const { camera } = useThree();

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20) || 1 / 60;
    const y = window.scrollY / window.innerHeight;
    const s = experience.scroll;
    const v = prev.current === null ? 0 : (y - prev.current) / dt;
    prev.current = y;
    s.y = y;
    s.velocity = damp(s.velocity, v, 6, dt);

    if (still) return;
    const p = experience.pointer;
    const g = experience.tilt;
    // Cursor manda; si no hay, el giroscopio (teléfono inclinado) mueve la cámara
    const tx = p.active ? p.x * 0.35 : g.active ? g.x * 0.3 : 0;
    const ty = p.active ? p.y * 0.2 : g.active ? g.y * 0.18 : 0;
    camera.position.x = damp(camera.position.x, tx, PHYSICS.cameraSway, dt);
    camera.position.y = damp(camera.position.y, ty, PHYSICS.cameraSway, dt);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

Conductor.propTypes = { still: PropTypes.bool };

/** Con movimiento reducido (frameloop "demand") se re-dibuja al hacer scroll o cambiar tamaño. */
export function StillInvalidator() {
  const { invalidate } = useThree();
  useEffect(() => {
    experience.invalidate = invalidate;
    let raf = 0;
    const request = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => invalidate());
    };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    return () => {
      experience.invalidate = null;
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
    };
  }, [invalidate]);
  return null;
}

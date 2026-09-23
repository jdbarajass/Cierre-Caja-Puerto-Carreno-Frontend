import { useEffect, useMemo, useSyncExternalStore } from 'react';

/**
 * Estado compartido entre el DOM y la escena WebGL.
 *
 * Es un objeto mutable (no estado de React) a propósito: la escena lo lee en
 * cada frame dentro de useFrame, así que escribir aquí NUNCA provoca renders
 * de React. Teclear en el formulario del cierre no le cuesta nada a la escena
 * y viceversa.
 *
 * La escena solo LEE. Nada de lo que hay aquí vuelve a la lógica de negocio.
 */
export const experience = {
  route: '/',
  // Puntero normalizado a coordenadas de dispositivo (-1..1). `active` se apaga
  // cuando el puntero sale de la ventana o en táctil al soltar.
  pointer: { x: 0, y: 0, active: false },
  // Scroll leído por la escena en cada frame (nunca con listeners de scroll):
  // y = pantallas recorridas, velocity = pantallas/segundo (suavizada)
  scroll: { y: 0, velocity: 0 },
  // Datos que publican las páginas (solo lectura para la escena), p. ej.
  // { dailySales, dailyGoal } o el conteo de denominaciones del cierre.
  data: {},
  // Columna resaltada en la franja de estadísticas (-1 = ninguna)
  hover: -1,
  // Cuenta resaltada en la constelación de Gestión → Cuentas (-1 = ninguna)
  flowHover: -1,
  // Inclinación del teléfono (giroscopio), -1..1; solo donde no pide permiso
  tilt: { x: 0, y: 0, active: false },
  // Escribiendo en un campo en táctil: la escena baja su ritmo
  typing: false,
  // Nivel de calidad vigente: 'high' | 'medium' | 'low'
  quality: 'high',
  reducedMotion: false,
  // Lo registra el canvas: pide un frame nuevo (necesario con movimiento
  // reducido, donde la escena solo se dibuja cuando algo cambia)
  invalidate: null,
};

// Solo en desarrollo: inspeccionar la escena desde la consola / pruebas
if (import.meta.env.DEV && typeof window !== 'undefined') window.__koajExperience = experience;

// Suscriptores por clave: para la poca UI DOM que necesita reaccionar a un
// dato publicado (p. ej. el rótulo de la franja de estadísticas)
const listeners = new Map();

function notify(key) {
  listeners.get(key)?.forEach((cb) => cb());
}

function subscribe(key, cb) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(cb);
  return () => listeners.get(key)?.delete(cb);
}

/**
 * Publica un dato de la página para que la escena lo use.
 * Se retira automáticamente al desmontar la página.
 *
 *   usePublishSceneData('dailySales', dailySales);
 */
export function usePublishSceneData(key, value) {
  useEffect(() => {
    experience.data[key] = value;
    experience.invalidate?.();
    notify(key);
  }, [key, value]);

  useEffect(() => () => {
    delete experience.data[key];
    notify(key);
  }, [key]);
}

/** Lee un dato publicado desde un componente DOM (re-renderiza al cambiar). */
export function useSceneValue(key) {
  return useSyncExternalStore(
    (cb) => subscribe(key, cb),
    () => experience.data[key],
  );
}

/**
 * Publica una serie de datos para la franja de estadísticas (Fase 8).
 * Solo lectura: toma la respuesta YA cargada por el módulo y no la altera.
 *
 *   useSceneSeries('Ventas por hora', data?.hourly_breakdown, (h) => h.total_revenue, (h) => h.hour_range, 'money');
 */
export function useSceneSeries(label, items, getValue, getLabel, format = 'money') {
  const values = Array.isArray(items) && items.length ? items.map((it) => Number(getValue(it)) || 0) : null;
  const labels = values ? items.map((it) => String(getLabel(it) ?? '')) : null;
  // Firma estable: solo se republica si los valores cambian de verdad
  const signature = values ? `${label}|${values.join(',')}|${labels.join('¦')}` : '';
  const series = useMemo(
    () => (values ? { key: signature, label, values, labels, format } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature],
  );
  usePublishSceneData('series', series);
}

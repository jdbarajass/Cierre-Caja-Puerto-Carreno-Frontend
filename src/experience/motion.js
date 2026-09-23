/**
 * Sistema de movimiento global (Fase 3).
 *
 * Un solo lenguaje físico para la escena WebGL y la interfaz DOM. Los valores
 * de DOM reflejan los tokens CSS de src/index.css (--ease-out, etc.) para que
 * un modal, un menú y la escena "se muevan igual".
 *
 * Todo es independiente del framerate: el mismo gesto se siente igual a 30 o
 * a 120 FPS.
 */

/** Tokens de interfaz (espejo de index.css). Segundos. */
export const MOTION = {
  duration: {
    press: 0.16, // botón presionado
    popover: 0.18, // menús desplegables
    modal: 0.24, // diálogos desktop
    sheet: 0.32, // hoja inferior móvil
    reveal: 0.42, // un paso del cierre que se desbloquea
  },
  ease: {
    out: 'cubic-bezier(0.23, 1, 0.32, 1)', // entradas, respuesta a acciones
    inOut: 'cubic-bezier(0.77, 0, 0.175, 1)', // movimiento en pantalla
    drawer: 'cubic-bezier(0.32, 0.72, 0, 1)', // hojas / cajones
  },
  stagger: 0.06,
};

/**
 * Constantes físicas de la escena. `lambda` = qué tan rápido persigue un valor
 * a su objetivo (1/s). Más alto = más nervioso; más bajo = más pesado.
 */
export const PHYSICS = {
  pointer: 8, // el campo sigue al cursor con un leve retraso (inercia)
  pointerRelease: 3, // al soltar/salir, la perturbación se relaja despacio
  scroll: 6, // parallax: suave pero sin sentirse "arrastrado"
  cameraSway: 2.5, // la cámara acompaña al cursor, pesada
  assemble: 2.2, // partículas que se ensamblan en una forma
  disperse: 3.2, // se sueltan más rápido de lo que se arman (salida > entrada)
  color: 2.5, // cambio de ambiente entre rutas
};

/** Aproximación exponencial hacia `target`. */
export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/**
 * Resorte críticamente amortiguado (sin rebote) para un valor escalar.
 * `state` = { value, velocity }. Devuelve el mismo objeto mutado. Mantiene la
 * velocidad si el objetivo cambia a mitad de camino: es interrumpible.
 */
export function spring(state, target, stiffness, dt) {
  const omega = Math.sqrt(stiffness);
  const x = state.value - target;
  const exp = Math.exp(-omega * dt);
  const temp = (state.velocity + omega * x) * dt;
  state.velocity = (state.velocity - omega * temp) * exp;
  state.value = target + (x + temp) * exp;
  return state;
}

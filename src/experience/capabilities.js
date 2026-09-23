/**
 * Detección de capacidades del dispositivo para decidir si se monta la escena
 * y con qué calidad arranca. Todo es de solo lectura y sin efectos laterales
 * (el contexto WebGL de prueba se libera de inmediato).
 */

export const QUALITY_TIERS = {
  // count: partículas del campo base · dpr: rango de resolución del canvas
  high: { count: 7000, dpr: [1, 1.75] },
  medium: { count: 3500, dpr: [1, 1.25] },
  low: { count: 1400, dpr: [0.75, 1] },
};

export const TIER_ORDER = ['low', 'medium', 'high'];

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const QUALITY_KEY = 'koaj.quality';

function readForcedQuality() {
  try {
    const param = new URLSearchParams(window.location.search).get('quality');
    if (param === 'auto') localStorage.removeItem(QUALITY_KEY);
    else if (param && QUALITY_TIERS[param]) localStorage.setItem(QUALITY_KEY, param);
    const saved = localStorage.getItem(QUALITY_KEY);
    return saved && QUALITY_TIERS[saved] ? saved : null;
  } catch {
    // Almacenamiento bloqueado (modo privado estricto): solo vale el parámetro
    const param = new URLSearchParams(window.location.search).get('quality');
    return param && QUALITY_TIERS[param] ? param : null;
  }
}

export function detectCapabilities() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const saveData = Boolean(nav.connection?.saveData);
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const small = window.innerWidth < 768;
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory || 4; // GB; Safari no lo expone

  let tier = 'high';
  if (coarse || small || cores <= 4 || memory <= 4) tier = 'medium';
  if (cores <= 2 || memory <= 2) tier = 'low';

  // Forzar un nivel en un equipo concreto (también en producción), p. ej. el PC
  // lento de la tienda: abrir la app una vez con ?quality=low (o medium/high)
  // y el navegador lo recuerda. ?quality=auto vuelve a la detección automática.
  const forced = readForcedQuality();
  if (forced) tier = forced;

  return {
    webgl: supportsWebGL(),
    saveData,
    mobile: Boolean(coarse || small),
    tier,
  };
}

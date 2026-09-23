import { Vector3 } from 'three';

/**
 * Formaciones: formas que las partículas pueden adoptar.
 *
 * Una formación es una nube de puntos NORMALIZADA (ancho = 1, centrada en 0).
 * La escena la escala y la ubica sobre un "ancla" DOM (principio "un canvas,
 * muchas ventanas"): la composición la sigue definiendo el layout HTML.
 */

const cache = new Map();

/**
 * Muestrea el texto dibujado con la fuente de la marca y devuelve los puntos
 * donde hay tinta. Se cachea por texto.
 * @returns {Promise<{ points: Float32Array, aspect: number }>} aspect = alto/ancho
 */
export async function textFormation(text, { weight = 800, family = '"Schibsted Grotesk Variable"', step = 3 } = {}) {
  const key = `${text}|${weight}|${family}|${step}`;
  if (cache.has(key)) return cache.get(key);

  const size = 200;
  const font = `${weight} ${size}px ${family}, "Segoe UI", sans-serif`;
  try {
    await document.fonts.load(font);
  } catch {
    // Si la fuente no carga, se usa la de respaldo: la forma sigue siendo legible
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.font = font;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0.14em'; // como la marca KOAJ
  const pad = 12;
  const width = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const height = Math.ceil(size * 0.95);
  canvas.width = width;
  canvas.height = height;
  // Cambiar el tamaño del canvas reinicia el contexto: se vuelve a configurar
  ctx.font = font;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0.14em';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(text, pad, height / 2 + size * 0.04);

  const data = ctx.getImageData(0, 0, width, height).data;
  const pts = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (data[(y * width + x) * 4 + 3] > 140) {
        pts.push(x / width - 0.5, -(y / height - 0.5) * (height / width));
      }
    }
  }
  const result = { points: new Float32Array(pts), aspect: height / width };
  cache.set(key, result);
  return result;
}

/**
 * Formación de columnas a partir de una serie de valores reales (Fase 8).
 * Los puntos se reparten dentro de cada columna en proporción a su área, así
 * la densidad es uniforme. Devuelve también la cantidad de columnas para que
 * el shader sepa a cuál pertenece cada partícula (resaltado al pasar el cursor).
 * @param {number[]} values
 * @param {number} aspect alto/ancho de la ventana donde se dibujará
 */
export function seriesFormation(values, aspect, samples = 9000) {
  const n = values.length;
  const max = Math.max(...values.map((v) => Math.abs(v)), 1);
  const slot = 1 / n;
  const barW = slot * (n > 40 ? 0.9 : 0.72);
  const heights = values.map((v) => Math.max(0.015, Math.abs(v) / max) * aspect * 0.92);
  const areas = heights.map((h) => h * barW);
  const total = areas.reduce((a, b) => a + b, 0);
  const pts = [];
  for (let s = 0; s < samples; s++) {
    // Columna elegida en proporción a su área (densidad uniforme)
    let r = Math.random() * total;
    let i = 0;
    while (r > areas[i] && i < n - 1) { r -= areas[i]; i++; }
    const x = -0.5 + slot * (i + 0.5) + (Math.random() - 0.5) * barW;
    const y = -aspect / 2 + Math.random() * heights[i];
    pts.push(x, y);
  }
  return { points: new Float32Array(pts), aspect, bars: n };
}

/**
 * Formación "equipo" (Fase 10, Usuarios): un cúmulo de partículas por persona
 * con acceso. Administradores = cúmulo grande; ventas = mediano; usuarios
 * inactivos = cúmulo tenue (pocas partículas). Datos reales de la página.
 * @param {{ role: string, active: boolean }[]} team
 */
export function teamFormation(team, aspect, samples = 7000) {
  const n = team.length;
  const slot = 1 / n;
  const base = Math.min(slot * 0.34, aspect * 0.42);
  const clusters = team.map((m, i) => {
    const r = base * (m.role === 'admin' ? 1 : 0.62);
    return { cx: -0.5 + slot * (i + 0.5), r, weight: r * r * (m.active ? 1 : 0.28) };
  });
  const total = clusters.reduce((a, c) => a + c.weight, 0) || 1;
  const pts = [];
  clusters.forEach((c) => {
    const k = Math.round((c.weight / total) * samples);
    for (let j = 0; j < k; j++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(Math.random()) * c.r; // densidad uniforme en el disco
      pts.push(c.cx + Math.cos(ang) * rad, Math.sin(ang) * rad);
    }
  });
  return { points: new Float32Array(pts), aspect };
}

/**
 * Convierte el rectángulo de un elemento DOM a coordenadas de mundo sobre el
 * plano z = 0. Proyección exacta: se lanza un rayo desde la cámara por cada
 * borde del rectángulo y se intersecta con el plano. Así la forma queda bien
 * anclada aunque la cámara se mueva y gire con el cursor (parallax).
 */
const _v = new Vector3();
const _dir = new Vector3();

function ndcToPlane(nx, ny, camera, target) {
  _v.set(nx, ny, 0.5).unproject(camera);
  _dir.copy(_v).sub(camera.position).normalize();
  const t = -camera.position.z / _dir.z;
  return target.copy(camera.position).addScaledVector(_dir, t);
}

const _a = new Vector3();
const _b = new Vector3();

export function anchorToWorld(el, camera, out, { clipTop = null } = {}) {
  const raw = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // clipTop: usar solo la parte VISIBLE del ancla (entre clipTop y el borde
  // inferior de la pantalla), para no centrar la forma fuera de vista
  const r = clipTop === null ? raw : (() => {
    const top = Math.max(raw.top, clipTop);
    const bottom = Math.min(raw.bottom, vh);
    return { left: raw.left, right: raw.right, width: raw.width, top, bottom: Math.max(bottom, top), height: Math.max(0, bottom - top) };
  })();

  // Bordes de la ventana en coordenadas normalizadas de pantalla (-1..1)
  out.ndc = {
    left: (r.left / vw) * 2 - 1,
    right: (r.right / vw) * 2 - 1,
    top: -((r.top / vh) * 2 - 1),
    bottom: -((r.bottom / vh) * 2 - 1),
  };
  camera.updateMatrixWorld();
  const cx = (out.ndc.left + out.ndc.right) / 2;
  const cy = (out.ndc.top + out.ndc.bottom) / 2;
  ndcToPlane(out.ndc.left, cy, camera, _a);
  ndcToPlane(out.ndc.right, cy, camera, _b);
  out.w = _a.distanceTo(_b);
  ndcToPlane(cx, out.ndc.top, camera, _a);
  ndcToPlane(cx, out.ndc.bottom, camera, _b);
  out.h = _a.distanceTo(_b);
  ndcToPlane(cx, cy, camera, _a);
  out.x = _a.x;
  out.y = _a.y;
  out.visible = r.bottom > 0 && r.top < vh && r.width > 0 && r.height > 0;
  return out;
}

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { experience } from '../store';
import { damp, PHYSICS } from '../motion';
import { anchorToWorld } from '../formations';

/**
 * Campo de partículas persistente: el "sustrato" de toda la experiencia.
 *
 * Libre: deriva orgánica por ruido, parallax por profundidad con el scroll,
 * repulsión del puntero con inercia.
 * Formado: las partículas "formables" (≈78%) se ensamblan en una formación
 * (texto, pilas, gráficas…) ubicada sobre un ancla DOM. Cada partícula llega
 * en su propio momento (morph escalonado), así la forma se arma y se desarma
 * de manera orgánica en vez de aparecer de golpe.
 *
 * `direction` es un ref mutable que escribe SceneDirector cada frame:
 *   { formation, anchor, morph, color, opacity, size, pulse }
 */

const FIELD = { x: 10, y: 7, zNear: 2.5, zFar: -7 };

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uMorph;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uAspect;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform vec3 uAnchor;
  uniform float uAnchorScale;
  uniform float uPulse;
  uniform float uWarp;
  uniform float uSwap;
  uniform float uBars;
  uniform float uHover;
  uniform float uBreath;
  uniform float uRepel;
  uniform float uFlow;
  attribute vec3 aTarget;
  attribute vec3 aPrev;
  attribute float aSeed;
  varying float vAlpha;
  varying float vHover;

  void main() {
    // --- Estado libre -------------------------------------------------------
    vec3 free = position;
    float t = uTime * 0.12 + aSeed * 6.2831;
    free.x += sin(t + free.y * 0.35) * 0.20;
    free.y += cos(t * 0.9 + free.x * 0.30) * 0.20;
    free.z += sin(t * 0.7 + (free.x + free.y) * 0.2) * 0.30;
    float depth = clamp((free.z - ${FIELD.zFar.toFixed(1)}) / ${(FIELD.zNear - FIELD.zFar).toFixed(1)}, 0.0, 1.0);
    float span = ${(FIELD.y * 2).toFixed(1)};
    free.y = mod(free.y + uScroll * (0.6 + depth * 1.8) + span * 0.5, span) - span * 0.5;

    // Gestión → "flujo": el campo deriva en corrientes horizontales (más
    // rápido lo cercano), una conexión continua detrás de las tablas
    float spanX = ${(FIELD.x * 2).toFixed(1)};
    free.x = mod(free.x + uFlow * (0.25 + depth * 0.9) + spanX * 0.5, spanX) - spanX * 0.5;

    // Warp al navegar: el campo se abre desde el centro y avanza hacia la cámara
    free.xy *= 1.0 + uWarp * (0.12 + depth * 0.3);
    free.z += uWarp * (0.8 + depth * 2.4);

    // --- Estado formado -----------------------------------------------------
    // Cambio de forma (p. ej. otra gráfica): cada partícula viaja desde su
    // posición anterior a la nueva en su propio momento, con un arco en z
    float sd = fract(aSeed * 3.71) * 0.4;
    float sw = smoothstep(sd, sd + 0.6, uSwap);
    vec3 tgt = mix(aPrev, aTarget, sw);
    tgt.z += sin(sw * 3.14159) * 0.06;
    // Columna bajo el cursor: sube y se resalta
    float bar = floor((aTarget.x + 0.5) * uBars);
    float isHover = uBars > 0.0 ? 1.0 - step(0.5, abs(bar - uHover)) : 0.0;
    tgt.y += isHover * sw * 0.012;
    vec3 formed = uAnchor + tgt * uAnchorScale;
    float breath = uBreath + uPulse * 0.022;
    formed.x += sin(uTime * 0.9 + aSeed * 40.0) * breath * uAnchorScale;
    formed.y += cos(uTime * 0.8 + aSeed * 31.0) * breath * uAnchorScale;
    formed.z += sin(uTime * 0.6 + aSeed * 17.0) * 0.08;

    // Morph escalonado: cada partícula formable llega en su propio momento
    float formable = step(aSeed, 0.78);
    float delay = fract(aSeed * 7.13) * 0.45;
    float m = smoothstep(delay, delay + 0.55, uMorph) * formable;
    vec3 p = mix(free, formed, m);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Repulsión del puntero en espacio de pantalla (más fuerte sobre la forma)
    vec2 ndc = gl_Position.xy / gl_Position.w;
    vec2 d = ndc - uPointer;
    d.x *= uAspect;
    float dist = length(d);
    float radius = mix(0.32, 0.22, m);
    float f = smoothstep(radius, 0.0, dist) * uPointerStrength * mix(1.0, uRepel, m);
    vec2 push = (d / max(dist, 1e-4)) * f * mix(0.07, 0.11, m);
    push.x /= uAspect;
    gl_Position.xy += push * gl_Position.w;

    float sizeBoost = mix(0.55 + depth * 1.5, 1.35, m) * (1.0 + uWarp * 1.1);
    // Tope de tamaño: durante el warp las partículas se acercan mucho a la cámara
    gl_PointSize = min(uSize * uPixelRatio * sizeBoost * (8.0 / -mv.z), 22.0 * uPixelRatio);
    vAlpha = mix(0.18 + depth * 0.6, 0.95, m) + f * 0.5 + uWarp * 0.55;
    vHover = isHover * m;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHoverColor;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vHover;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.15, r) * vAlpha * uOpacity;
    gl_FragColor = vec4(mix(uColor, uHoverColor, vHover), a);
  }
`;

function buildAttributes(count) {
  const position = new Float32Array(count * 3);
  const target = new Float32Array(count * 3);
  const prev = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    position.set([
      (Math.random() * 2 - 1) * FIELD.x,
      (Math.random() * 2 - 1) * FIELD.y,
      FIELD.zFar + Math.random() * (FIELD.zNear - FIELD.zFar),
    ], i * 3);
    seed[i] = Math.random();
  }
  return { position, target, prev, seed };
}

/**
 * Reparte los puntos de la formación entre las partículas (con leve
 * profundidad). Antes guarda la forma actual en `aPrev` para que el cambio de
 * forma sea un viaje continuo y no un salto.
 */
function applyFormation(attr, prevAttr, points, count) {
  const n = points.length / 2;
  if (!n) return;
  const arr = attr.array;
  prevAttr.array.set(arr);
  prevAttr.needsUpdate = true;
  for (let i = 0; i < count; i++) {
    const k = Math.floor(Math.random() * n) * 2;
    arr[i * 3] = points[k] + (Math.random() - 0.5) * 0.004;
    arr[i * 3 + 1] = points[k + 1] + (Math.random() - 0.5) * 0.004;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
  }
  attr.needsUpdate = true;
}

export default function BaseField({ count, direction, still }) {
  const materialRef = useRef();
  const geometryRef = useRef();
  const appliedFormation = useRef(null);
  const anchorEl = useRef({ selector: null, el: null });
  const world = useRef({ x: 0, y: 0, w: 1, h: 1, visible: false });
  const { size, viewport, camera, invalidate } = useThree();
  const attrs = useMemo(() => buildAttributes(count), [count]);

  // Al cambiar la cantidad de partículas (calidad adaptativa) se re-aplica la forma
  useEffect(() => { appliedFormation.current = null; }, [count]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uMorph: { value: 0 },
    uSize: { value: 2.2 },
    uPixelRatio: { value: 1 },
    uAspect: { value: 1 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uPointerStrength: { value: 0 },
    uAnchor: { value: new THREE.Vector3(0, 0, 0) },
    uAnchorScale: { value: 1 },
    uPulse: { value: 0 },
    uWarp: { value: 0 },
    uSwap: { value: 1 },
    uBars: { value: 0 },
    uHover: { value: -1 },
    uBreath: { value: 0.010 },
    uRepel: { value: 1 },
    uFlow: { value: 0 },
    uHoverColor: { value: new THREE.Color('#16171B') },
    uColor: { value: new THREE.Color('#50545D') },
    uOpacity: { value: 0 },
  }), []);

  const targetColor = useMemo(() => new THREE.Color(), []);
  const flowSpeed = useRef(0);

  useFrame((_, rawDt) => {
    const u = materialRef.current?.uniforms;
    const dir = direction.current;
    if (!u || !dir) return;
    const dt = still ? 1 : Math.min(rawDt, 1 / 20);

    u.uPixelRatio.value = viewport.dpr;
    u.uAspect.value = size.width / size.height;

    // Formación: se escribe en la geometría una sola vez por forma
    const attr = geometryRef.current?.attributes.aTarget;
    const prevAttr = geometryRef.current?.attributes.aPrev;
    if (attr && prevAttr && dir.formation && appliedFormation.current !== dir.formation) {
      const previous = appliedFormation.current;
      applyFormation(attr, prevAttr, dir.formation.points, count);
      // Solo hay "viaje" entre dos formas del mismo lugar (p. ej. dos gráficas)
      u.uSwap.value = previous && previous.anchor === dir.formation.anchor && !still ? 0 : 1;
      appliedFormation.current = dir.formation;
      if (still) invalidate();
    }
    u.uSwap.value = damp(u.uSwap.value, 1, 1.4, dt);
    u.uBars.value = dir.formation?.bars || 0;
    u.uHover.value = experience.hover;
    u.uBreath.value = damp(u.uBreath.value, dir.breath ?? 0.010, 3, dt);
    u.uRepel.value = damp(u.uRepel.value, dir.repel ?? 1, 3, dt);
    // uFlow acumula desplazamiento (no velocidad): así la corriente no salta
    flowSpeed.current = damp(flowSpeed.current, dir.flow ?? 0, 1.5, dt);
    if (!still) u.uFlow.value += flowSpeed.current * dt;

    // Ancla DOM → mundo (la forma sigue al layout, también al hacer scroll)
    if (dir.anchor !== anchorEl.current.selector) {
      anchorEl.current = { selector: dir.anchor, el: dir.anchor ? document.querySelector(dir.anchor) : null };
    } else if (dir.anchor && !anchorEl.current.el?.isConnected) {
      anchorEl.current.el = document.querySelector(dir.anchor);
    }
    const el = anchorEl.current.el;
    let morphTarget = dir.formation && appliedFormation.current ? dir.morph : 0;
    if (el) {
      anchorToWorld(el, camera, world.current);
      const aspect = dir.formation?.aspect || 0.3;
      // La forma cabe en el ancla (ancho y alto)
      const scale = Math.min(world.current.w, world.current.h / aspect) * 0.92;
      u.uAnchor.value.set(world.current.x, world.current.y, 0);
      u.uAnchorScale.value = scale;
      if (!world.current.visible) morphTarget = 0;
    } else {
      morphTarget = 0;
    }

    // Ambiente (color, opacidad, tamaño)
    targetColor.set(dir.color);
    u.uColor.value.lerp(targetColor, 1 - Math.exp(-PHYSICS.color * dt));
    u.uOpacity.value = damp(u.uOpacity.value, dir.opacity, PHYSICS.color, dt);
    u.uSize.value = damp(u.uSize.value, dir.size, PHYSICS.color, dt);
    u.uPulse.value = damp(u.uPulse.value, dir.pulse, 3, dt);

    // Ensamblar es más lento que dispersar (entrada deliberada, salida ágil)
    const lambda = morphTarget > u.uMorph.value ? PHYSICS.assemble : PHYSICS.disperse;
    u.uMorph.value = still ? morphTarget : damp(u.uMorph.value, morphTarget, lambda, dt);
    // Impulso físico (p. ej. error de login): la forma retrocede y se rearma
    if (dir.impulse) {
      u.uMorph.value = Math.min(u.uMorph.value, dir.impulse);
      dir.impulse = 0;
    }

    // Pulso de warp (transición entre páginas): sube de golpe y se asienta
    if (dir.warp) {
      u.uWarp.value = still ? 0 : 1;
      dir.warp = 0;
    }
    u.uWarp.value = damp(u.uWarp.value, 0, 2.6, dt);

    if (still) return; // movimiento reducido: sin deriva ni puntero

    u.uTime.value += dt;
    u.uScroll.value = damp(u.uScroll.value, experience.scroll.y, PHYSICS.scroll, dt);

    const p = experience.pointer;
    u.uPointer.value.x = damp(u.uPointer.value.x, p.x, PHYSICS.pointer, dt);
    u.uPointer.value.y = damp(u.uPointer.value.y, p.y, PHYSICS.pointer, dt);
    u.uPointerStrength.value = damp(u.uPointerStrength.value, p.active ? 1 : 0, p.active ? PHYSICS.pointer : PHYSICS.pointerRelease, dt);
  });

  return (
    <points key={count} frustumCulled={false}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[attrs.position, 3]} />
        <bufferAttribute attach="attributes-aTarget" args={[attrs.target, 3]} />
        <bufferAttribute attach="attributes-aPrev" args={[attrs.prev, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[attrs.seed, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

BaseField.propTypes = {
  count: PropTypes.number.isRequired,
  direction: PropTypes.shape({ current: PropTypes.object }).isRequired,
  still: PropTypes.bool,
};

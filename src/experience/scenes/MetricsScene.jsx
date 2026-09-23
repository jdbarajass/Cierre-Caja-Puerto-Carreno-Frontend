import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { experience } from '../store';
import { damp } from '../motion';
import { anchorToWorld } from '../formations';
import { QUALITY_TIERS } from '../capabilities';

/**
 * Métricas del día y del mes: "datos" (Fase 6).
 *
 * Cada meta es un "tanque" de partículas dentro de su ventana DOM
 * (`[data-scene-anchor="metric-day" | "metric-month"]`). El nivel del líquido
 * es el avance real frente a la meta (+25%), que la página ya calcula y
 * publica en `experience.data.metrics`. La meta está al 80% del ancho: si se
 * cumple, el líquido la sobrepasa, se vuelve verde y burbujea.
 *
 * Todo el movimiento vive en el shader: ola de superficie, oleaje con la
 * velocidad del scroll y perturbación del puntero con inercia.
 */

const GOAL_AT = 0.8; // posición de la meta dentro del tanque (0..1)

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uLevel;
  uniform float uSlosh;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform float uDone;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute vec3 aRand;
  varying float vLiquid;
  varying float vFizz;
  varying float vDepth;
  varying float vEdge;

  void main() {
    // Posición base en la caja unitaria [-0.5, 0.5]
    vec3 p = aRand - 0.5;
    float t = uTime;

    // Superficie del líquido: el nivel avanza en X, con ola vertical
    float wave = sin(p.y * 9.0 + t * 2.2) * 0.012 + sin(p.y * 17.0 - t * 3.1) * 0.006;
    float surface = uLevel + wave * (1.0 + uSlosh * 4.0);
    float liquid = step(aRand.x, surface);

    // Líquido: leve agitación; polvo (lo que falta): deriva lenta
    float jitter = liquid > 0.5 ? 0.004 : 0.02;
    p.x += sin(t * 0.8 + aRand.y * 40.0) * jitter;
    p.y += cos(t * 0.7 + aRand.x * 35.0) * jitter * 2.0;

    // Meta cumplida: burbujas que suben dentro del líquido
    float fizz = uDone * liquid * step(0.92, fract(aRand.z * 13.0));
    p.y += fizz * (fract(t * 0.35 + aRand.x * 7.0) - 0.5) * 0.6;

    // Puntero: aparta las partículas (coordenadas locales 0..1)
    vec2 local = aRand.xy;
    vec2 d = local - uPointer;
    d.x *= 6.0; // la ventana es muy ancha: se compensa para un radio redondo
    float f = smoothstep(0.35, 0.0, length(d)) * uPointerStrength;
    p.y += sign(d.y + 1e-4) * f * 0.25;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // Borde de la superficie (menisco): partículas junto al nivel, más brillantes
    float edge = liquid * smoothstep(0.035, 0.0, surface - aRand.x);
    gl_PointSize = uSize * uPixelRatio * (liquid > 0.5 ? 1.0 : 0.6) * (0.65 + aRand.z * 0.6) * (1.0 + edge * 0.6);
    vLiquid = liquid;
    vFizz = fizz;
    vDepth = aRand.z;
    vEdge = edge;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uLiquidColor;
  uniform vec3 uDustColor;
  uniform float uPresence;
  varying float vLiquid;
  varying float vFizz;
  varying float vDepth;
  varying float vEdge;

  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    // Volumen: las partículas del fondo del tanque son más oscuras y tenues
    vec3 liquid = uLiquidColor * mix(0.55, 1.1, vDepth) + vEdge * 0.35;
    vec3 color = mix(uDustColor, liquid, vLiquid);
    float alpha = mix(0.16, mix(0.45, 1.0, vDepth), vLiquid) + vFizz * 0.4 + vEdge * 0.3;
    gl_FragColor = vec4(color, smoothstep(0.5, 0.2, r) * alpha * uPresence);
  }
`;

const TONES = {
  amber: '#F59E0B',
  ink: '#3341C2',
  done: '#10B981',
  dust: '#9A9DA6',
};

function Vessel({ id, count, still }) {
  const points = useRef();
  const el = useRef(null);
  const world = useRef({ x: 0, y: 0, w: 1, h: 1, visible: false });
  const state = useRef({ level: 0, presence: 0, slosh: 0 });
  const { camera, viewport } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const rand = new Float32Array(count * 3);
    for (let i = 0; i < rand.length; i++) rand[i] = Math.random();
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 3));
    // `position` es obligatorio para three; el shader usa aRand
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);

  // La geometría se crea a mano (no en JSX): R3F no la libera sola. Sin esto
  // cada visita al Dashboard dejaba geometrías huérfanas en la GPU.
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uLevel: { value: 0 },
    uSlosh: { value: 0 },
    uPointer: { value: new THREE.Vector2(-9, -9) },
    uPointerStrength: { value: 0 },
    uDone: { value: 0 },
    uSize: { value: 2.4 },
    uPixelRatio: { value: 1 },
    uPresence: { value: 0 },
    uLiquidColor: { value: new THREE.Color(TONES.ink) },
    uDustColor: { value: new THREE.Color(TONES.dust) },
  }), []);

  const target = useMemo(() => new THREE.Color(), []);

  useFrame((_, rawDt) => {
    const u = uniforms;
    const s = state.current;
    const dt = still ? 1 : Math.min(rawDt, 1 / 20);
    const metric = experience.data.metrics?.[id];

    if (!el.current?.isConnected) el.current = document.querySelector(`[data-scene-anchor="metric-${id}"]`);
    const node = el.current;
    const show = Boolean(node && metric && node.offsetHeight > 0);
    if (show) anchorToWorld(node, camera, world.current);
    s.presence = damp(s.presence, show && world.current.visible ? 1 : 0, 4, dt);
    if (!points.current) return;
    points.current.visible = s.presence > 0.01;
    if (!points.current.visible) return;

    const w = world.current;
    points.current.position.set(w.x, w.y, 0);
    points.current.scale.set(w.w, w.h, Math.min(w.h, 0.3));

    // Nivel = avance real hacia la meta (la meta vive en GOAL_AT)
    const progress = metric?.loading ? 0 : Math.max(0, metric?.progress || 0);
    const level = Math.min(1, progress * GOAL_AT);
    // Llenado deliberado (lento) la primera vez: es el momento de la métrica
    s.level = damp(s.level, level, still ? 50 : 1.6, dt);
    u.uLevel.value = s.level;
    u.uDone.value = damp(u.uDone.value, metric?.done ? 1 : 0, 2, dt);

    target.set(metric?.done ? TONES.done : TONES[metric?.tone] || TONES.ink);
    u.uLiquidColor.value.lerp(target, 1 - Math.exp(-3 * dt));
    u.uPresence.value = s.presence;
    u.uPixelRatio.value = viewport.dpr;
    u.uSize.value = Math.max(1.6, Math.min(3.2, (w.h / 0.12) * 1.2));

    if (still) return;
    u.uTime.value += dt;
    // Oleaje con la velocidad del scroll (física: el tanque se sacude)
    s.slosh = damp(s.slosh, Math.min(1, Math.abs(experience.scroll.velocity) * 0.8), 3, dt);
    u.uSlosh.value = s.slosh;

    // Puntero en coordenadas locales de la ventana (0..1)
    const p = experience.pointer;
    const n = w.ndc;
    if (n) {
      const lx = (p.x - n.left) / (n.right - n.left);
      const ly = (p.y - n.bottom) / (n.top - n.bottom);
      const inside = p.active && lx > -0.05 && lx < 1.05 && ly > -0.6 && ly < 1.6;
      u.uPointer.value.set(damp(u.uPointer.value.x, lx, 10, dt), damp(u.uPointer.value.y, ly, 10, dt));
      u.uPointerStrength.value = damp(u.uPointerStrength.value, inside ? 1 : 0, inside ? 8 : 3, dt);
    }
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false} visible={false}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

Vessel.propTypes = {
  id: PropTypes.oneOf(['day', 'month']).isRequired,
  count: PropTypes.number.isRequired,
  still: PropTypes.bool,
};

export default function MetricsScene({ active, tier, still }) {
  if (!active) return null;
  // Menos partículas por tanque en calidad baja
  const count = Math.round(QUALITY_TIERS[tier].count * 0.45);
  return (
    <>
      <Vessel id="day" count={count} still={still} />
      <Vessel id="month" count={count} still={still} />
    </>
  );
}

MetricsScene.propTypes = {
  active: PropTypes.bool.isRequired,
  tier: PropTypes.oneOf(['high', 'medium', 'low']).isRequired,
  still: PropTypes.bool,
};

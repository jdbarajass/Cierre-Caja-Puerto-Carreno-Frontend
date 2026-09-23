import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { experience } from '../store';
import { damp } from '../motion';
import { anchorToWorld } from '../formations';
import { QUALITY_TIERS } from '../capabilities';

/**
 * Gestión → Cuentas: "movimiento financiero" (Fase 9).
 *
 * Constelación de cuentas dentro de `[data-scene-anchor="flow-window"]`. La
 * página publica en `experience.data.flow` los nodos YA calculados en el DOM
 * (posición normalizada, saldo real, color de la cuenta) y el centro "Total
 * Recompras". Cada cuenta envía una corriente de partículas al centro con
 * densidad proporcional a su saldo. Saldo negativo: la corriente va al revés
 * y en ámbar. Las cuentas que el backend excluye del total (AHORRO) orbitan
 * aparte, sin corriente: la escena no mezcla lo que el negocio separa.
 */

const MAX_NODES = 10;
const AMBER = new THREE.Color('#F59E0B');

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uNodes[${MAX_NODES}];
  uniform vec3 uColors[${MAX_NODES}];
  uniform vec2 uHub;
  uniform float uHover;
  uniform float uAspect;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uAmber;
  attribute float aNode;
  attribute float aT;
  attribute vec2 aJit;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Partícula sin cuenta asignada: fuera de pantalla (int(-1) redondearía a 0)
    if (aNode < -0.5) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vColor = vec3(0.0);
      vAlpha = 0.0;
      return;
    }
    int i = int(aNode + 0.5);
    vec3 node = uNodes[i];
    vec2 a = node.xy;
    vec2 b = uHub;
    float dir = node.z;
    float t = fract(aT + uTime * 0.11 * (0.7 + aSeed * 0.6));
    vec2 pos;
    float ends = 1.0;

    if (abs(dir) < 0.5) {
      // Cuenta aparte (no suma al total): órbita alrededor de su nodo
      float ang = aT * 6.2831 + uTime * 0.35 * (0.5 + aSeed);
      float rad = 0.02 + aSeed * 0.035;
      pos = a + vec2(cos(ang) * rad / uAspect, sin(ang) * rad);
    } else {
      // Corriente curva nodo → centro (o al revés si el saldo es negativo)
      float tt = dir > 0.0 ? t : 1.0 - t;
      vec2 ab = b - a;
      vec2 perp = normalize(vec2(-ab.y, ab.x));
      vec2 c = (a + b) * 0.5 + perp * 0.10 * sign(a.x - b.x + 0.0001);
      pos = mix(mix(a, c, tt), mix(c, b, tt), tt);
      // La corriente se ensancha en el medio y se afina en los extremos
      pos += aJit * vec2(0.014 / uAspect, 0.014) * (1.0 - abs(tt * 2.0 - 1.0)) * 2.2;
      ends = smoothstep(0.0, 0.08, tt) * smoothstep(1.0, 0.9, tt);
    }

    vec3 p = vec3(pos.x - 0.5, 0.5 - pos.y, aJit.x * 0.04);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float hovered = 1.0 - step(0.5, abs(aNode - uHover));
    vColor = dir < -0.5 ? uAmber : uColors[i];
    vAlpha = (0.35 + 0.65 * ends) * (uHover < -0.5 ? 1.0 : mix(0.35, 1.25, hovered));
    gl_PointSize = uSize * uPixelRatio * (0.7 + aSeed * 0.6) * (1.0 + hovered * 0.5);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uPresence;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    gl_FragColor = vec4(vColor, smoothstep(0.5, 0.15, r) * vAlpha * uPresence);
  }
`;

/** Reparte las partículas entre las cuentas en proporción a su saldo real. */
function assignStreams(nodes, count, attr) {
  const flowing = nodes.map((n) => (n.detached ? 0 : Math.abs(n.value)));
  const apart = nodes.map((n) => (n.detached ? Math.abs(n.value) : 0));
  const sumF = flowing.reduce((a, b) => a + b, 0) || 1;
  const sumA = apart.reduce((a, b) => a + b, 0) || 1;
  const budgetF = Math.round(count * 0.86);
  const budgetA = count - budgetF;
  const quotas = nodes.map((n, i) => {
    if (!n.value) return 0;
    const q = n.detached ? (apart[i] / sumA) * budgetA : (flowing[i] / sumF) * budgetF;
    return Math.max(14, Math.round(q)); // toda cuenta con saldo se ve
  });
  const arr = attr.array;
  let k = 0;
  quotas.forEach((q, i) => {
    for (let j = 0; j < q && k < count; j++) arr[k++] = i;
  });
  while (k < count) arr[k++] = -1; // sobrantes: ocultas
  attr.needsUpdate = true;
}

export default function FlowScene({ active, tier, still }) {
  const points = useRef();
  const el = useRef(null);
  const world = useRef({ x: 0, y: 0, w: 1, h: 1, visible: false });
  const state = useRef({ presence: 0, key: '' });
  const { camera, viewport } = useThree();
  const count = Math.round(QUALITY_TIERS[tier].count * 0.4);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const node = new Float32Array(count).fill(-1);
    const t = new Float32Array(count);
    const jit = new Float32Array(count * 2);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      t[i] = Math.random();
      jit[i * 2] = Math.random() * 2 - 1;
      jit[i * 2 + 1] = Math.random() * 2 - 1;
      seed[i] = Math.random();
    }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aNode', new THREE.BufferAttribute(node, 1));
    g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
    g.setAttribute('aJit', new THREE.BufferAttribute(jit, 2));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count]);

  useEffect(() => { state.current.key = ''; }, [count]);
  // Geometría creada a mano: se libera al salir de Cuentas (R3F no lo hace)
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uNodes: { value: Array.from({ length: MAX_NODES }, () => new THREE.Vector3(0.5, 0.5, 0)) },
    uColors: { value: Array.from({ length: MAX_NODES }, () => new THREE.Color('#6C707A')) },
    uHub: { value: new THREE.Vector2(0.5, 0.8) },
    uHover: { value: -1 },
    uAspect: { value: 3 },
    uSize: { value: 2.4 },
    uPixelRatio: { value: 1 },
    uAmber: { value: AMBER },
    uPresence: { value: 0 },
  }), []);

  useFrame((_, rawDt) => {
    const s = state.current;
    const u = uniforms;
    const dt = still ? 1 : Math.min(rawDt, 1 / 20);
    const flow = experience.data.flow;

    if (!el.current?.isConnected) el.current = document.querySelector('[data-scene-anchor="flow-window"]');
    const show = Boolean(active && flow && el.current && el.current.offsetHeight > 0);
    if (show) anchorToWorld(el.current, camera, world.current);
    s.presence = show && world.current.visible ? damp(s.presence, 1, 3, dt) : 0;
    if (!points.current) return;
    points.current.visible = s.presence > 0.01;
    if (!points.current.visible) return;

    // Nodos: solo se reparten las partículas cuando cambian los saldos
    const nodes = flow.nodes.slice(0, MAX_NODES);
    if (flow.key !== s.key) {
      assignStreams(nodes, count, geometry.attributes.aNode);
      s.key = flow.key;
    }
    nodes.forEach((n, i) => {
      u.uNodes.value[i].set(n.u, n.v, n.detached ? 0 : n.value < 0 ? -1 : 1);
      u.uColors.value[i].set(n.color);
    });
    u.uHub.value.set(flow.hub.u, flow.hub.v);
    u.uHover.value = experience.flowHover ?? -1;

    const w = world.current;
    points.current.position.set(w.x, w.y, 0);
    points.current.scale.set(w.w, w.h, Math.min(w.h, 1));
    u.uAspect.value = w.w / Math.max(w.h, 0.0001);
    u.uPixelRatio.value = viewport.dpr;
    u.uPresence.value = s.presence;
    if (!still) u.uTime.value += dt;
  });

  if (!active) return null;
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

FlowScene.propTypes = {
  active: PropTypes.bool.isRequired,
  tier: PropTypes.oneOf(['high', 'medium', 'low']).isRequired,
  still: PropTypes.bool,
};

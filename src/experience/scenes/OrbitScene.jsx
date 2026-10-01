import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { damp } from '../motion';
import { anchorToWorld } from '../formations';

/**
 * Login: un sistema solar pequeño y tenue DETRÁS de la palabra KOAJ (el
 * "universo" de la portada). Solo presentación: no lee ni publica datos.
 *
 * - Sol con brillo + 8 planetas con su color real; Saturno con anillo.
 * - Velocidades proporcionales a las reales pero comprimidas (ω ∝ 1/√periodo):
 *   con las reales Neptuno tardaría 165 vueltas de la Tierra y se vería quieto.
 * - Distancias comprimidas (√) para que todo quepa detrás del logo.
 * - Plano orbital inclinado: las órbitas se ven como elipses en perspectiva.
 * - Se dibuja antes que las letras (renderOrder) y con poca opacidad, para no
 *   competir con KOAJ ni con el formulario.
 * - Movimiento reducido: un solo cuadro quieto.
 *
 * Costo: 3 llamadas de dibujo (órbitas, planetas, sol) y < 600 vértices.
 */

const ANCHOR = '[data-scene-anchor="login-mark"]';

// periodo en años terrestres; size en px (antes del pixel ratio)
const PLANETS = [
  { name: 'Mercurio', period: 0.24, color: '#A8A8A8', size: 3.0 },
  { name: 'Venus', period: 0.62, color: '#E8C27A', size: 4.2 },
  { name: 'Tierra', period: 1.0, color: '#5B9BE6', size: 4.4 },
  { name: 'Marte', period: 1.88, color: '#D2602F', size: 3.6 },
  { name: 'Júpiter', period: 11.86, color: '#D9B38C', size: 7.0 },
  { name: 'Saturno', period: 29.46, color: '#E6D29E', size: 6.2 },
  { name: 'Urano', period: 84.0, color: '#A6DCE4', size: 5.0 },
  { name: 'Neptuno', period: 164.8, color: '#5A7BE0', size: 5.0 },
];

const EARTH_ORBIT_SECONDS = 26; // una vuelta de la Tierra en la animación
const TILT_X = -1.12; // inclinación del plano orbital (rad)
const TILT_Z = 0.18;
const ORBIT_SEGMENTS = 72;
const RING_SEGMENTS = 40;
const SATURN = 5;

// Radio de cada órbita relativo a la más externa (raíz de la distancia real en UA)
const AU = [0.39, 0.72, 1.0, 1.52, 5.2, 9.58, 19.2, 30.05];
const RADII = AU.map((d) => 0.16 + 0.84 * (Math.sqrt(d) - Math.sqrt(AU[0])) / (Math.sqrt(AU[7]) - Math.sqrt(AU[0])));

const pointVertex = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const pointFragment = /* glsl */ `
  uniform float uPresence;
  varying vec3 vColor;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    // Disco con borde suave y un leve sombreado (luz desde el sol)
    float body = smoothstep(0.5, 0.38, r);
    gl_FragColor = vec4(vColor * (0.85 + 0.3 * (0.5 - r)), body * 0.82 * uPresence);
  }
`;

const sunFragment = /* glsl */ `
  uniform float uPresence;
  uniform float uPulse;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float core = smoothstep(0.32, 0.18, r);
    float glow = pow(1.0 - r, 2.4) * (0.55 + 0.1 * uPulse);
    vec3 color = mix(vec3(1.0, 0.62, 0.18), vec3(1.0, 0.93, 0.7), core);
    gl_FragColor = vec4(color, (core + glow) * uPresence);
  }
`;

const sunVertex = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uSize;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * uPixelRatio;
  }
`;

/** Círculos de las órbitas + anillo de Saturno, como segmentos sueltos. */
function buildOrbits() {
  const pts = [];
  RADII.forEach((r) => {
    for (let i = 0; i < ORBIT_SEGMENTS; i++) {
      const a0 = (i / ORBIT_SEGMENTS) * Math.PI * 2;
      const a1 = ((i + 1) / ORBIT_SEGMENTS) * Math.PI * 2;
      pts.push(Math.cos(a0) * r, Math.sin(a0) * r, 0, Math.cos(a1) * r, Math.sin(a1) * r, 0);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

function buildRing() {
  const pts = [];
  for (let i = 0; i < RING_SEGMENTS; i++) {
    const a0 = (i / RING_SEGMENTS) * Math.PI * 2;
    const a1 = ((i + 1) / RING_SEGMENTS) * Math.PI * 2;
    pts.push(Math.cos(a0), Math.sin(a0), 0, Math.cos(a1), Math.sin(a1), 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

function buildPlanets() {
  const g = new THREE.BufferGeometry();
  const color = new THREE.Color();
  const colors = new Float32Array(PLANETS.length * 3);
  const sizes = new Float32Array(PLANETS.length);
  PLANETS.forEach((p, i) => {
    color.set(p.color);
    colors.set([color.r, color.g, color.b], i * 3);
    sizes[i] = p.size;
  });
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PLANETS.length * 3), 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  return g;
}

export default function OrbitScene({ active, still }) {
  const group = useRef();
  const planets = useRef();
  const ring = useRef();
  const el = useRef(null);
  const world = useRef({ x: 0, y: 0, w: 1, h: 1, visible: false });
  const state = useRef({ presence: 0, time: 0 });
  const { camera, viewport } = useThree();

  const orbitGeometry = useMemo(buildOrbits, []);
  const ringGeometry = useMemo(buildRing, []);
  const planetGeometry = useMemo(buildPlanets, []);
  const sunGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    return g;
  }, []);
  // Geometrías creadas a mano: se liberan al salir del login (R3F no lo hace)
  useEffect(() => () => {
    [orbitGeometry, ringGeometry, planetGeometry, sunGeometry].forEach((g) => g.dispose());
  }, [orbitGeometry, ringGeometry, planetGeometry, sunGeometry]);

  // Ángulo inicial distinto por planeta (estable entre recargas)
  const phases = useMemo(() => PLANETS.map((_, i) => (i * 2.39996) % (Math.PI * 2)), []);

  const planetUniforms = useMemo(() => ({ uPixelRatio: { value: 1 }, uPresence: { value: 0 } }), []);
  const sunUniforms = useMemo(() => ({
    uPixelRatio: { value: 1 }, uPresence: { value: 0 }, uPulse: { value: 0 }, uSize: { value: 26 },
  }), []);
  const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({
    color: '#C6CDF7', transparent: true, opacity: 0, depthWrite: false,
  }), []);
  const ringMaterial = useMemo(() => new THREE.LineBasicMaterial({
    color: '#E6D29E', transparent: true, opacity: 0, depthWrite: false,
  }), []);
  useEffect(() => () => { lineMaterial.dispose(); ringMaterial.dispose(); }, [lineMaterial, ringMaterial]);

  useFrame((_, rawDt) => {
    const s = state.current;
    const dt = still ? 1 : Math.min(rawDt, 1 / 20);
    if (!el.current?.isConnected) el.current = document.querySelector(ANCHOR);
    const show = Boolean(active && el.current && el.current.offsetHeight > 0);
    if (show) anchorToWorld(el.current, camera, world.current);
    // Aparece despacio después de que las letras empiezan a formarse
    s.presence = show && world.current.visible ? damp(s.presence, 1, 0.9, dt) : 0;
    if (!group.current) return;
    group.current.visible = s.presence > 0.01;
    if (!group.current.visible) return;
    if (!still) s.time += dt;

    // Tamaño: un poco más alto que las letras, centrado detrás de ellas
    const w = world.current;
    const radius = Math.min(w.h * 0.62, w.w * 0.34);
    group.current.position.set(w.x, w.y, -1.5);
    group.current.scale.setScalar(radius);

    const pos = planetGeometry.attributes.position.array;
    const base = (Math.PI * 2) / EARTH_ORBIT_SECONDS;
    PLANETS.forEach((p, i) => {
      const angle = phases[i] + s.time * base / Math.sqrt(p.period);
      pos[i * 3] = Math.cos(angle) * RADII[i];
      pos[i * 3 + 1] = Math.sin(angle) * RADII[i];
      pos[i * 3 + 2] = 0;
    });
    planetGeometry.attributes.position.needsUpdate = true;

    // Anillo de Saturno: sigue al planeta, inclinado respecto al plano orbital
    if (ring.current) {
      ring.current.position.set(pos[SATURN * 3], pos[SATURN * 3 + 1], 0);
      ring.current.scale.set(0.055, 0.022, 1);
    }

    const ratio = viewport.dpr;
    planetUniforms.uPixelRatio.value = ratio;
    planetUniforms.uPresence.value = s.presence;
    sunUniforms.uPixelRatio.value = ratio;
    sunUniforms.uPresence.value = s.presence * 0.9;
    sunUniforms.uPulse.value = still ? 0 : Math.sin(s.time * 1.3);
    lineMaterial.opacity = 0.09 * s.presence;
    ringMaterial.opacity = 0.55 * s.presence;
  });

  if (!active) return null;
  return (
    <group ref={group} rotation={[TILT_X, 0, TILT_Z]} visible={false}>
      <lineSegments geometry={orbitGeometry} material={lineMaterial} renderOrder={-3} frustumCulled={false} />
      <points geometry={sunGeometry} renderOrder={-2} frustumCulled={false}>
        <shaderMaterial vertexShader={sunVertex} fragmentShader={sunFragment} uniforms={sunUniforms}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <lineSegments ref={ring} geometry={ringGeometry} material={ringMaterial} renderOrder={-2} frustumCulled={false} />
      <points ref={planets} geometry={planetGeometry} renderOrder={-1} frustumCulled={false}>
        <shaderMaterial vertexShader={pointVertex} fragmentShader={pointFragment} uniforms={planetUniforms}
          transparent depthWrite={false} />
      </points>
    </group>
  );
}

OrbitScene.propTypes = {
  active: PropTypes.bool.isRequired,
  still: PropTypes.bool,
};

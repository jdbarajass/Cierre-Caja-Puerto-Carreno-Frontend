import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { experience } from '../store';
import { damp } from '../motion';
import { anchorToWorld } from '../formations';

/**
 * Cierre de caja: "proceso / ensamblaje" (Fase 5).
 *
 * Una escena 3D real dentro de la "ventana" DOM `[data-scene-anchor="cash-window"]`
 * (panel sticky en desktop, franja en móvil). Todo lo que se ve sale de datos
 * que la página YA tiene y publica en `experience.data.cash` (solo lectura):
 *
 *   Sala 0 · Fecha: totales de Alegra por medio de pago (preconsulta).
 *   Sala 1 · Efectivo: pilas de billetes y monedas por denominación que crecen
 *            y caen en su lugar mientras se digita el conteo.
 *   Sala 2 · Medios/ajustes: Alegra vs registrado (transferencias, datáfono) y
 *            ajustes (excedentes, gastos, préstamos) separados de la caja.
 *   Cierre: al enviar todo se comprime; con la respuesta del backend se asienta
 *           (validado) o queda separado (diferencias). Antes de enviar NO se
 *           colorea "cuadra / no cuadra": ese veredicto es del backend.
 *
 * El scroll por los pasos desplaza la escena entre salas (storytelling por
 * scroll) y el cursor la inclina con inercia.
 */

const BILLS = [2000, 5000, 10000, 20000, 50000, 100000];
const COINS = [50, 100, 200, 500, 1000];
const MAX_UNITS = 40; // tope visual por pila (el número exacto está en el DOM)
const ROOM_GAP = 1.35; // separación vertical entre salas (unidades locales)
const STEP_ROOM = { 'paso-fecha': 0, 'paso-efectivo': 1, 'paso-medios': 2, 'paso-ajustes': 2 };

// Paleta estricta del sistema: tinta y grafito; color solo para categorías
const COLORS = {
  bills: ['#9A9DA6', '#7E828C', '#6C707A', '#50545D', '#3B3E46', '#16171B'],
  coin: '#B7BAC1',
  efectivo: '#3341C2',
  transferencia: '#7B3F86',
  debito: '#F97316',
  credito: '#EC4899',
  alegra: '#CACCD1',
  ok: '#10B981',
  diff: '#F59E0B',
};

const BILL = { w: 0.105, h: 0.014, d: 0.05, gap: 0.004 };
const COIN = { r: 0.024, h: 0.011, gap: 0.003 };

// Sombra de contacto: disco con degradado radial (shader), ancla las piezas al "piso"
const shadowMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: { uOpacity: { value: 0.22 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform float uOpacity; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.086, 0.09, 0.105, smoothstep(1.0, 0.0, d) * uOpacity); }',
});
const shadowGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

function ContactShadow({ width, depth, x = 0 }) {
  return <mesh geometry={shadowGeometry} material={shadowMaterial} position={[x, -0.002, 0]} scale={[width, 1, depth]} renderOrder={-1} />;
}

ContactShadow.propTypes = { width: PropTypes.number, depth: PropTypes.number, x: PropTypes.number };

function findWindow() {
  const els = document.querySelectorAll('[data-scene-anchor="cash-window"]');
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * Crea el buffer de color por instancia ANTES del primer render: three.js
 * decide si el material usa color por instancia al compilarlo.
 */
function initInstances(mesh) {
  if (!mesh || mesh.instanceColor) return;
  const white = new THREE.Color('#ffffff');
  const hidden = new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001);
  for (let i = 0; i < mesh.count; i++) {
    mesh.setColorAt(i, white);
    mesh.setMatrixAt(i, hidden);
  }
}

/** Pilas instanciadas: una InstancedMesh por tipo, animación por instancia. */
function useStacks(denoms) {
  const count = denoms.length * MAX_UNITS;
  const state = useMemo(() => ({
    y: new Float32Array(count).fill(0.6), // posición actual (caen desde arriba)
    s: new Float32Array(count), // escala actual (0 = oculta)
    settledKey: null, // firma del último estado asentado (ver updateStacks)
  }), [count]);
  return { count, state };
}

export default function CashScene({ active, still }) {
  const root = useRef();
  const tilt = useRef();
  const pan = useRef();
  const billsMesh = useRef();
  const coinsMesh = useRef();
  const bars = useRef([]);
  const adjustments = useRef([]);
  const { camera, gl, scene } = useThree();

  // Rendimiento: precompilar los shaders de las pilas y columnas mientras el
  // navegador está libre. Sin esto three.js los compilaba de forma síncrona
  // la PRIMERA vez que aparecían (primera tecla del conteo, primer monto de
  // QR): ~100 ms de bloqueo justo en esa tecla. La escena se hace visible solo
  // durante la llamada (mismo tick, nunca se llega a dibujar) para que las
  // luces cuenten igual que en uso real.
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      const r = root.current;
      if (cancelled || !r) return;
      const prevRoot = r.visible;
      const prevRooms = rooms.current.map((g) => g?.visible);
      r.visible = true;
      rooms.current.forEach((g) => { if (g) g.visible = true; });
      try {
        if (gl.compileAsync) gl.compileAsync(scene, camera).catch(() => {});
        else gl.compile(scene, camera);
      } finally {
        r.visible = prevRoot;
        rooms.current.forEach((g, i) => { if (g) g.visible = prevRooms[i]; });
      }
    };
    const id = 'requestIdleCallback' in window ? window.requestIdleCallback(run, { timeout: 2000 }) : setTimeout(run, 800);
    return () => {
      cancelled = true;
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(id); else clearTimeout(id);
    };
  }, [gl, scene, camera]);

  const world = useRef({ x: 0, y: 0, w: 1, h: 1, visible: false });
  const el = useRef(null);
  const anim = useRef({ presence: 0, room: 0, compress: 0, settle: 0, spread: 0, rotY: 0, rotX: 0 });

  const billStacks = useStacks(BILLS);
  const coinStacks = useStacks(COINS);
  const rooms = useRef([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  // Colores preasignados: nada se crea dentro del loop de render
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const okColor = useMemo(() => new THREE.Color(COLORS.ok), []);
  const diffColor = useMemo(() => new THREE.Color(COLORS.diff), []);

  const billGeo = useMemo(() => new THREE.BoxGeometry(BILL.w, BILL.h, BILL.d), []);
  const coinGeo = useMemo(() => new THREE.CylinderGeometry(COIN.r, COIN.r, COIN.h, 20), []);
  const barGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(0.11, 1, 0.07);
    g.translate(0, 0.5, 0); // crece desde la base
    return g;
  }, []);

  useFrame((_, rawDt) => {
    const a = anim.current;
    const dt = still ? 1 : Math.min(rawDt, 1 / 20);
    const cash = experience.data.cash;

    // Ventana DOM (cambia entre desktop y móvil)
    if (!el.current?.isConnected || el.current.getBoundingClientRect().width === 0) el.current = findWindow();
    const visible = active && cash && el.current;
    // Solo la parte visible de la ventana (debajo del header de 64px)
    if (visible) anchorToWorld(el.current, camera, world.current, { clipTop: 64 });

    // Al salir de la página desaparece de inmediato (no queda flotando sobre la página nueva)
    a.presence = visible && world.current.visible ? damp(a.presence, 1, 4, dt) : 0;
    if (!root.current) return;
    root.current.visible = a.presence > 0.01;
    if (!root.current.visible || !cash) return;

    // Ubicar y escalar la escena dentro de la ventana
    const w = world.current;
    const portrait = w.h > w.w * 1.1;
    const fit = portrait ? Math.min(w.w * 1.15, w.h * 0.95) : Math.min(w.w * 0.62, w.h * 1.25);
    root.current.position.set(w.x, w.y, 0);
    root.current.scale.setScalar(fit * (0.85 + a.presence * 0.15));

    // Sala activa según el paso visible: la escena se desplaza (storytelling por scroll)
    // La vitrina móvil fija su sala (data-scene-room); en desktop manda el paso visible
    const forced = el.current.dataset.sceneRoom;
    const targetRoom = forced !== undefined ? Number(forced) : STEP_ROOM[cash.step] ?? 0;
    a.room = damp(a.room, targetRoom, 3, dt);

    // Estado del cierre (del backend)
    const compressT = cash.submitting ? 1 : 0;
    a.compress = damp(a.compress, compressT, 5, dt);
    a.settle = damp(a.settle, cash.outcome === 'ok' ? 1 : 0, 2, dt);
    a.spread = damp(a.spread, cash.outcome === 'diff' ? 1 : 0, 2, dt);

    // Cursor sobre la ventana → inclinación con inercia; velocidad del scroll → cabeceo
    const p = experience.pointer;
    const n = w.ndc;
    const over = p.active && n && p.x > n.left && p.x < n.right && p.y < n.top && p.y > n.bottom;
    a.rotY = damp(a.rotY, -0.45 + (over ? p.x * 0.35 : 0), 3, dt);
    a.rotX = damp(a.rotX, 0.32 - experience.scroll.velocity * 0.08 + (over ? -p.y * 0.12 : 0), 4, dt);

    // La ventana suele estar a un lado de la pantalla: se gira la escena hacia
    // la cámara para verla de frente (sin la perspectiva lateral)
    const facing = Math.atan2(w.x - camera.position.x, camera.position.z);
    // Pivote de rotación = centro de la ventana; las salas se desplazan dentro
    if (pan.current) pan.current.position.y = a.room * ROOM_GAP;
    if (tilt.current) {
      tilt.current.rotation.set(a.rotX, a.rotY + facing * 0.9 + a.settle * Math.PI * 0.08, 0);
      tilt.current.scale.set(1, 1 - a.compress * 0.35, 1);
    }
    // Las salas vecinas se desvanecen: solo la activa ocupa la ventana
    rooms.current.forEach((g, i) => {
      if (!g) return;
      const v = Math.max(0, 1 - Math.abs(i - a.room) * 1.4);
      g.visible = v > 0.02;
      g.scale.setScalar(0.7 + v * 0.3);
    });

    // --- Sala 1: pilas de efectivo ---------------------------------------
    const updateStacks = (mesh, stacks, denoms, counts, geom, xStart, spacing, colorFor) => {
      if (!mesh) return;
      // Rendimiento: con la sala del efectivo oculta, o con las pilas ya
      // asentadas y sin cambios (conteos, separación, color), no se recalculan
      // las ~440 matrices en cada frame
      if (rooms.current[1] && !rooms.current[1].visible) return;
      const { state } = stacks;
      const key = `${denoms.map((d) => counts?.[d] || 0).join(',')}|${a.spread.toFixed(3)}|${a.settle.toFixed(3)}`;
      if (state.settledKey === key) return;
      let moving = 0;
      for (let c = 0; c < denoms.length; c++) {
        const units = Math.min(parseInt(counts?.[denoms[c]], 10) || 0, MAX_UNITS);
        for (let k = 0; k < MAX_UNITS; k++) {
          const i = c * MAX_UNITS + k;
          const on = k < units;
          const ty = k * (geom.h + geom.gap);
          // Las unidades nuevas caen desde arriba; las que sobran se encogen
          const py = state.y[i];
          const ps = state.s[i];
          state.y[i] = on ? damp(py, ty, 7, dt) : damp(py, ty + 0.25, 3, dt);
          state.s[i] = damp(ps, on ? 1 : 0, on ? 9 : 6, dt);
          moving = Math.max(moving, Math.abs(state.y[i] - py), Math.abs(state.s[i] - ps));
          const spreadX = a.spread * (c - (denoms.length - 1) / 2) * 0.03;
          // Leve desorden orgánico en cada unidad, para que parezca papel apilado
          dummy.position.set(xStart + c * spacing + spreadX + Math.sin(i * 12.9) * 0.004, state.y[i], Math.cos(i * 7.3) * 0.004);
          dummy.rotation.set(0, Math.sin(i * 3.1) * 0.08, 0);
          dummy.scale.setScalar(Math.max(state.s[i], 0.0001));
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          tmpColor.set(colorFor(c));
          if (a.settle > 0.01) tmpColor.lerp(okColor, a.settle * 0.35);
          if (a.spread > 0.01) tmpColor.lerp(diffColor, a.spread * 0.45);
          mesh.setColorAt(i, tmpColor);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      // Nada se movió en este frame: se omite hasta que algo cambie
      state.settledKey = moving < 1e-5 ? key : null;
    };
    updateStacks(billsMesh.current, billStacks, BILLS, cash.bills, BILL, -0.34, 0.135, (c) => COLORS.bills[c]);
    updateStacks(coinsMesh.current, coinStacks, COINS, cash.coins, COIN, -0.24, 0.12, () => COLORS.coin);

    // --- Salas 0 y 2: columnas proporcionales a montos reales -------------
    const setBar = (mesh, value, max) => {
      if (!mesh) return;
      const target = max > 0 ? Math.max(0.02, (value / max) * 0.55) : 0.02;
      mesh.scale.y = damp(mesh.scale.y, target, 5, dt);
    };
    const pre = cash.preconsulta;
    const preMax = pre ? Math.max(pre.efectivo, pre.transferencia, pre.debito, pre.credito, 1) : 1;
    const b = bars.current;
    setBar(b[0], pre?.efectivo || 0, preMax);
    setBar(b[1], pre?.transferencia || 0, preMax);
    setBar(b[2], pre?.debito || 0, preMax);
    setBar(b[3], pre?.credito || 0, preMax);

    const alegraCards = (pre?.debito || 0) + (pre?.credito || 0);
    const cmpMax = Math.max(pre?.transferencia || 0, cash.registrado.transferencias, alegraCards, cash.registrado.datafono, 1);
    setBar(b[4], pre?.transferencia || 0, cmpMax);
    setBar(b[5], cash.registrado.transferencias, cmpMax);
    setBar(b[6], alegraCards, cmpMax);
    setBar(b[7], cash.registrado.datafono, cmpMax);

    // Ajustes: bloques que salen de la caja (se separan hacia afuera)
    const adj = [cash.ajustes.excedentes, cash.ajustes.gastos, cash.ajustes.prestamos];
    const adjMax = Math.max(...adj, 1);
    adjustments.current.forEach((m, i) => {
      if (!m) return;
      const on = adj[i] > 0;
      const s = on ? 0.35 + (adj[i] / adjMax) * 0.65 : 0.0001;
      m.scale.setScalar(damp(m.scale.x, s, 6, dt));
      m.position.x = damp(m.position.x, on ? 0.34 + i * 0.09 : 0.2, 4, dt);
    });
  });

  return (
    <group ref={root} visible={false}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 4, 3]} intensity={1.6} />
      <directionalLight position={[-3, 1, -2]} intensity={0.4} color="#C6CDF7" />

      <group ref={tilt}>
      <group ref={pan}>
        {/* Sala 0: Alegra por medio de pago */}
        <group ref={(g) => { rooms.current[0] = g; }} position={[0, -0.28, 0]}>
          <ContactShadow width={0.8} depth={0.35} />
          {[COLORS.efectivo, COLORS.transferencia, COLORS.debito, COLORS.credito].map((c, i) => (
            <mesh key={c} ref={(m) => { bars.current[i] = m; }} geometry={barGeo} position={[-0.24 + i * 0.16, 0, 0]} scale={[1, 0.02, 1]}>
              <meshStandardMaterial color={c} roughness={0.45} metalness={0.05} />
            </mesh>
          ))}
        </group>

        {/* Sala 1: efectivo contado (billetes atrás, monedas adelante) */}
        <group ref={(g) => { rooms.current[1] = g; }} position={[0, -ROOM_GAP - 0.22, 0]}>
          <ContactShadow width={0.95} depth={0.45} />
          <instancedMesh ref={(m) => { billsMesh.current = m; initInstances(m); }} args={[billGeo, null, billStacks.count]} position={[0, 0, -0.06]}>
            <meshStandardMaterial roughness={0.7} metalness={0.02} />
          </instancedMesh>
          <instancedMesh ref={(m) => { coinsMesh.current = m; initInstances(m); }} args={[coinGeo, null, coinStacks.count]} position={[0, 0, 0.12]}>
            <meshStandardMaterial roughness={0.3} metalness={0.65} />
          </instancedMesh>
        </group>

        {/* Sala 2: registrado vs Alegra + ajustes */}
        <group ref={(g) => { rooms.current[2] = g; }} position={[-0.06, -2 * ROOM_GAP - 0.26, 0]}>
          <ContactShadow width={0.95} depth={0.4} x={0.06} />
          {[
            [COLORS.alegra, -0.24], [COLORS.transferencia, -0.12],
            [COLORS.alegra, 0.04], [COLORS.debito, 0.16],
          ].map(([c, x], i) => (
            <mesh key={i} ref={(m) => { bars.current[4 + i] = m; }} geometry={barGeo} position={[x, 0, 0]} scale={[1, 0.02, 1]}>
              <meshStandardMaterial color={c} roughness={0.5} transparent opacity={c === COLORS.alegra ? 0.75 : 1} />
            </mesh>
          ))}
          {[0, 1, 2].map((i) => (
            <mesh key={`adj-${i}`} ref={(m) => { adjustments.current[i] = m; }} position={[0.2, 0.03 + i * 0.07, 0.05]} scale={0.0001}>
              <boxGeometry args={[0.07, 0.05, 0.05]} />
              <meshStandardMaterial color={['#50545D', '#EF4444', '#3341C2'][i]} roughness={0.6} />
            </mesh>
          ))}
        </group>
      </group>
      </group>
    </group>
  );
}

CashScene.propTypes = {
  active: PropTypes.bool.isRequired,
  still: PropTypes.bool,
};

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import PropTypes from 'prop-types';
import { experience } from './store';
import { QUALITY_TIERS, TIER_ORDER } from './capabilities';
import BaseField from './scenes/BaseField';
import CashScene from './scenes/CashScene';
import MetricsScene from './scenes/MetricsScene';
import FlowScene from './scenes/FlowScene';
import { SceneDirector, Conductor, StillInvalidator } from './SceneDirector';

/**
 * Baja la calidad un nivel si el FPS promedio cae por debajo del umbral.
 * Solo baja (nunca sube) para no oscilar entre niveles.
 */
function QualityGovernor({ tier, onDowngrade, route }) {
  const acc = useRef({ time: 0, frames: 0, strikes: 0, warmup: 3 });
  // Calentamiento tras montar y tras cada cambio de página: la carga de la
  // página (React montando el formulario, peticiones) no es culpa de la escena
  useEffect(() => {
    Object.assign(acc.current, { time: 0, frames: 0, strikes: 0, warmup: 3 });
  }, [route]);
  useFrame((_, dt) => {
    const a = acc.current;
    if (a.warmup > 0) { a.warmup -= dt; return; }
    a.time += dt;
    a.frames += 1;
    if (a.time < 2) return; // ventana de medición de 2 s
    const fps = a.frames / a.time;
    a.time = 0;
    a.frames = 0;
    a.strikes = fps < 45 ? a.strikes + 1 : 0;
    // Dos ventanas seguidas lentas: bajar un nivel
    if (a.strikes >= 2 && tier !== 'low') {
      a.strikes = 0;
      onDowngrade(TIER_ORDER[TIER_ORDER.indexOf(tier) - 1]);
    }
  });
  return null;
}

QualityGovernor.propTypes = {
  route: PropTypes.string,
  tier: PropTypes.string.isRequired,
  onDowngrade: PropTypes.func.isRequired,
};

/** Mientras se escribe en un campo: la escena se dibuja a ritmo reducido. */
function TypingThrottle({ fps }) {
  const { invalidate } = useThree();
  useEffect(() => {
    const id = setInterval(() => invalidate(), 1000 / fps);
    return () => clearInterval(id);
  }, [invalidate, fps]);
  return null;
}

TypingThrottle.propTypes = { fps: PropTypes.number.isRequired };

export default function ExperienceCanvas({ initialTier, reducedMotion, route, typing = false, typingFps = 20 }) {
  const [tier, setTier] = useState(initialTier);
  // Guion que escribe SceneDirector y lee BaseField en cada frame
  const direction = useRef({ morph: 0, color: '#50545D', opacity: 0.55, size: 2.2, pulse: 0 });

  // Marca en <html> que la escena está activa (oculta los respaldos DOM)
  useEffect(() => {
    document.documentElement.classList.add('has-scene');
    return () => document.documentElement.classList.remove('has-scene');
  }, []);
  const [hidden, setHidden] = useState(typeof document !== 'undefined' && document.hidden);

  useEffect(() => {
    experience.quality = tier;
  }, [tier]);

  // Pestaña oculta: se detiene el render (cero consumo de GPU)
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const q = QUALITY_TIERS[tier];
  // Movimiento reducido: un solo frame estático (se re-dibuja solo al cambiar tamaño)
  const frameloop = hidden ? 'never' : reducedMotion || typing ? 'demand' : 'always';

  return (
    <Canvas
      dpr={q.dpr}
      frameloop={frameloop}
      camera={{ position: [0, 0, 10], fov: 45, near: 0.1, far: 60 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false, depth: false }}
      // R3F fija pointer-events: auto en su contenedor; la capa nunca debe capturar eventos
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        // Solo en desarrollo: contadores del renderer para medir rendimiento
        if (import.meta.env.DEV) window.__koajGL = gl;
      }}
    >
      {!reducedMotion && !typing && <QualityGovernor tier={tier} onDowngrade={setTier} route={route} />}
      {reducedMotion && <StillInvalidator />}
      {typing && !reducedMotion && <TypingThrottle fps={typingFps} />}
      <SceneDirector route={route} direction={direction} />
      <Conductor still={reducedMotion} />
      <BaseField count={q.count} direction={direction} still={reducedMotion} />
      <CashScene active={route === '/dashboard'} still={reducedMotion} />
      <MetricsScene active={route === '/dashboard'} tier={tier} still={reducedMotion} />
      <FlowScene active={route === '/cuentas'} tier={tier} still={reducedMotion} />
    </Canvas>
  );
}

ExperienceCanvas.propTypes = {
  initialTier: PropTypes.oneOf(['high', 'medium', 'low']).isRequired,
  reducedMotion: PropTypes.bool.isRequired,
  route: PropTypes.string.isRequired,
  typing: PropTypes.bool,
  typingFps: PropTypes.number,
};

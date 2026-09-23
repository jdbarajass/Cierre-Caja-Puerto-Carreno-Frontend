import PropTypes from 'prop-types';
import BrandMark from './BrandMark';

/**
 * Pantalla de carga de la app (carga diferida de rutas y verificación de
 * sesión). Marca + barra indeterminada fina, en vez de un spinner genérico.
 */
const AppLoader = ({ label = 'Cargando…' }) => (
  <div className="min-h-[100dvh] bg-paper flex items-center justify-center" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-5 animate-fade-in-scale">
      <BrandMark size="md" />
      <div className="w-28 h-[3px] rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-gray-900 animate-[loader-slide_1.1s_cubic-bezier(0.77,0,0.175,1)_infinite]" />
      </div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
    </div>
  </div>
);

AppLoader.propTypes = {
  label: PropTypes.string,
};

export default AppLoader;

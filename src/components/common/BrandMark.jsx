import PropTypes from 'prop-types';

/**
 * Marca tipográfica KOAJ. Un solo lugar para el logotipo de la app
 * (header, login, pantallas de estado) en vez de repetir estilos inline.
 */
const SIZES = {
  sm: 'text-[15px] tracking-[0.32em] px-2.5 py-1.5 rounded-lg',
  md: 'text-xl tracking-[0.34em] px-3.5 py-2 rounded-xl',
  lg: 'text-4xl sm:text-5xl tracking-[0.3em] px-6 py-4 rounded-2xl',
};

const BrandMark = ({ size = 'sm', inverted = false, className = '' }) => (
  <span
    className={`inline-flex items-center justify-center font-display font-extrabold leading-none select-none ${SIZES[size]} ${
      inverted ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'
    } ${className}`}
    aria-label="KOAJ"
  >
    {/* El tracking amplio agrega espacio tras la última letra: se compensa */}
    <span className="-mr-[0.3em]">KOAJ</span>
  </span>
);

BrandMark.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  inverted: PropTypes.bool,
  className: PropTypes.string,
};

export default BrandMark;

import React from 'react';

// Puesto en un ranking (1, 2, 3...). Reemplaza las medallas emoji: mismo
// significado oro / plata / bronce con los tonos del sistema, se ve igual en
// cualquier dispositivo y lo lee bien un lector de pantalla ("Puesto 1").
// Es el mismo círculo numerado que ya usaba la tabla de Top Productos.
const TONES = {
  1: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  2: 'bg-gray-100 text-gray-800 border-gray-300',
  3: 'bg-orange-100 text-orange-800 border-orange-300',
};
const OTHER = 'bg-blue-100 text-blue-800 border-blue-300';

const SIZES = {
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-2xl',
};

const RankBadge = ({ rank, size = 'md', className = '' }) => (
  <span
    className={`inline-flex items-center justify-center rounded-full border-2 font-bold tabular-nums ${TONES[rank] || OTHER} ${SIZES[size] || SIZES.md} ${className}`}
    aria-label={`Puesto ${rank}`}
    role="img"
  >
    <span aria-hidden="true">{rank}</span>
  </span>
);

export default RankBadge;

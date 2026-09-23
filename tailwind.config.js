/** @type {import('tailwindcss').Config} */

// Sistema visual "Arqueo" (2026-09-23).
// Las escalas de color REEMPLAZAN (no extienden) a las de Tailwind para que las
// ~4.500 clases ya escritas en los componentes (bg-gray-*, text-blue-*, ...)
// hereden la nueva identidad sin tocar la lógica de cada pantalla:
//  - gray            -> grafito frío (neutros de toda la app)
//  - blue / indigo   -> tinta (único acento de marca)
//  - purple / violet -> ciruela (categoría secundaria, p. ej. transferencias)
// green / red / amber / orange / emerald / teal / pink se mantienen: son
// semántica (cuadra / no cuadra / advertencia) o códigos de categoría.
// Todos los valores son hex (no oklch/color-mix): html2canvas, que genera el
// PDF/JPEG del cierre, no soporta funciones de color modernas.

const graphite = {
  50: '#F7F7F8',
  100: '#EFEFF1',
  200: '#E2E3E6',
  300: '#CACCD1',
  400: '#9A9DA6',
  500: '#6C707A',
  600: '#50545D',
  700: '#3B3E46',
  800: '#25272D',
  900: '#16171B',
  950: '#0D0E11',
};

const ink = {
  50: '#F0F2FD',
  100: '#E1E5FB',
  200: '#C6CDF7',
  300: '#9EA9F0',
  400: '#6F7DE4',
  500: '#4A58D6',
  600: '#3341C2',
  700: '#2A34A0',
  800: '#252E80',
  900: '#222A66',
  950: '#151A3D',
};

const plum = {
  50: '#F8F3F9',
  100: '#F0E4F2',
  200: '#E1C9E5',
  300: '#CBA2D2',
  400: '#AE74B8',
  500: '#93529E',
  600: '#7B3F86',
  700: '#66346E',
  800: '#552D5B',
  900: '#472A4C',
  950: '#2A142D',
};

// Familias semánticas con el tono 600 desplazado un paso (600 = 700 original,
// 700 = 800, 800 = 900): con los valores por defecto de Tailwind el texto
// *-600 sobre blanco y el texto blanco sobre fondos *-600 NO llegan a 4.5:1
// (WCAG AA). Así los montos, insignias y botones de color pasan en toda la app
// sin tocar cada componente. 50-500 se conservan (fondos suaves, puntos,
// barras). Medido con la auditoría de la Fase 13.
const semantic = {
  green: { 50: '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0', 300: '#86EFAC', 400: '#4ADE80', 500: '#22C55E', 600: '#15803D', 700: '#166534', 800: '#14532D', 900: '#0F3D22', 950: '#052E16' },
  emerald: { 50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7', 400: '#34D399', 500: '#10B981', 600: '#047857', 700: '#065F46', 800: '#064E3B', 900: '#053A2C', 950: '#022C22' },
  teal: { 50: '#F0FDFA', 100: '#CCFBF1', 200: '#99F6E4', 300: '#5EEAD4', 400: '#2DD4BF', 500: '#14B8A6', 600: '#0F766E', 700: '#115E59', 800: '#134E4A', 900: '#0E3B38', 950: '#042F2E' },
  orange: { 50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 300: '#FDBA74', 400: '#FB923C', 500: '#F97316', 600: '#C2410C', 700: '#9A3412', 800: '#7C2D12', 900: '#5F220E', 950: '#431407' },
  amber: { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D', 400: '#FBBF24', 500: '#F59E0B', 600: '#B45309', 700: '#92400E', 800: '#78350F', 900: '#5C290C', 950: '#451A03' },
  yellow: { 50: '#FEFCE8', 100: '#FEF9C3', 200: '#FEF08A', 300: '#FDE047', 400: '#FACC15', 500: '#EAB308', 600: '#A16207', 700: '#854D0E', 800: '#713F12', 900: '#57300E', 950: '#422006' },
  red: { 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5', 400: '#F87171', 500: '#EF4444', 600: '#B91C1C', 700: '#991B1B', 800: '#7F1D1D', 900: '#631616', 950: '#450A0A' },
  pink: { 50: '#FDF2F8', 100: '#FCE7F3', 200: '#FBCFE8', 300: '#F9A8D4', 400: '#F472B6', 500: '#EC4899', 600: '#BE185D', 700: '#9D174D', 800: '#831843', 900: '#661333', 950: '#500724' },
};

const shadowTint = '22 23 27';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: graphite,
        slate: graphite,
        blue: ink,
        indigo: ink,
        purple: plum,
        violet: plum,
        ink,
        graphite,
        plum,
        ...semantic,
        paper: '#F3F4F6',
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'Geist', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        display: ['"Schibsted Grotesk Variable"', '"Schibsted Grotesk"', '"Geist Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // Controles 10px, paneles 16-18px, contenedores grandes 22px
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.375rem',
      },
      boxShadow: {
        sm: `0 1px 2px rgb(${shadowTint} / 0.06)`,
        DEFAULT: `0 1px 3px rgb(${shadowTint} / 0.08), 0 1px 2px rgb(${shadowTint} / 0.04)`,
        md: `0 4px 12px -2px rgb(${shadowTint} / 0.08), 0 2px 4px -2px rgb(${shadowTint} / 0.05)`,
        lg: `0 1px 2px rgb(${shadowTint} / 0.04), 0 8px 24px -10px rgb(${shadowTint} / 0.12)`,
        xl: `0 2px 4px rgb(${shadowTint} / 0.04), 0 20px 40px -14px rgb(${shadowTint} / 0.18)`,
        '2xl': `0 4px 8px rgb(${shadowTint} / 0.05), 0 32px 64px -20px rgb(${shadowTint} / 0.28)`,
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
}

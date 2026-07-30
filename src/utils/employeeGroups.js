// Agrupa registros de "Control de Empleadas" por empleada (Mónica / Rita) de forma
// independiente de mayúsculas o tildes, para poder llevar totales separados por persona.

const DIACRITICS_RE = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

export const normalize = (s) =>
  (s || '').toString().trim().toLowerCase().normalize('NFD').replace(DIACRITICS_RE, '');

export const EMPLOYEE_GROUPS = [
  { key: 'monica', label: 'Mónica', match: n => n.includes('monica') },
  { key: 'rita',   label: 'Rita',   match: n => n.includes('rita')   },
];

export const groupKeyFor = (nombre) => {
  const n = normalize(nombre);
  const found = EMPLOYEE_GROUPS.find(g => g.match(n));
  return found ? found.key : 'otras';
};

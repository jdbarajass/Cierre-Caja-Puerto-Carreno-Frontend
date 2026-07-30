// Agrupa registros de "Control de Empleadas" por empleada (Mónica / Rita) de forma
// independiente de mayúsculas o tildes, para poder llevar totales separados por persona.
// También expone la lista canónica de nombres para el selector obligatorio de los
// formularios, evitando que variantes escritas a mano (ej: "monika", "MONICA") sigan
// entrando a la base de datos.

const DIACRITICS_RE = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

export const normalize = (s) =>
  (s || '').toString().trim().toLowerCase().normalize('NFD').replace(DIACRITICS_RE, '');

// "match" es intencionalmente laxo para poder agrupar correctamente registros históricos
// que se escribieron con variantes o errores de tipeo (ej: "monika vargas", "MONICA").
export const EMPLOYEE_GROUPS = [
  { key: 'monica', label: 'Mónica', name: 'Mónica Vargas', match: n => n.includes('monic') || n.includes('monik') },
  { key: 'rita',   label: 'Rita',   name: 'Rita Infante',  match: n => n.includes('rita') },
];

// Nombres canónicos para el <select> obligatorio de "Nombre empleada" en los formularios.
export const EMPLOYEE_NAMES = EMPLOYEE_GROUPS.map(g => g.name);

export const groupKeyFor = (nombre) => {
  const n = normalize(nombre);
  const found = EMPLOYEE_GROUPS.find(g => g.match(n));
  return found ? found.key : 'otras';
};

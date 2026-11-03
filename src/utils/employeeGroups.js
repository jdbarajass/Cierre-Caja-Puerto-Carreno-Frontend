// Agrupa registros de "Control de Empleadas" por empleada de forma independiente de
// mayúsculas o tildes, para poder llevar totales separados por persona.
// También expone la lista canónica de nombres para el selector obligatorio de los
// formularios, evitando que variantes escritas a mano (ej: "monika", "MONICA") sigan
// entrando a la base de datos.
//
// Multi-tienda: cada tienda tiene sus propias empleadas (Carreño: Mónica y Rita;
// Primavera: Yesica y Daniela). Las listas dependen de la tienda activa; al cambiar
// de tienda las páginas se vuelven a montar (ver ProtectedRoute) y las leen de nuevo.
import { getActiveStoreCode, DEFAULT_STORE_CODE } from './activeStore';

const DIACRITICS_RE = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

export const normalize = (s) =>
  (s || '').toString().trim().toLowerCase().normalize('NFD').replace(DIACRITICS_RE, '');

// "match" es intencionalmente laxo para poder agrupar correctamente registros históricos
// que se escribieron con variantes o errores de tipeo (ej: "monika vargas", "MONICA").
// En Primavera van solo los nombres: si luego se agregan apellidos, los registros
// viejos siguen agrupando (y el filtro del backend es por "contiene").
export const EMPLOYEE_GROUPS_BY_STORE = {
  carreno: [
    { key: 'monica', label: 'Mónica', name: 'Mónica Vargas', match: n => n.includes('monic') || n.includes('monik') },
    { key: 'rita',   label: 'Rita',   name: 'Rita Infante',  match: n => n.includes('rita') },
  ],
  primavera: [
    { key: 'yesica',  label: 'Yesica',  name: 'Yesica',  match: n => n.includes('yesic') || n.includes('yessic') || n.includes('jesic') },
    { key: 'daniela', label: 'Daniela', name: 'Daniela', match: n => n.includes('daniel') },
  ],
};

export const getEmployeeGroups = (storeCode = getActiveStoreCode()) =>
  EMPLOYEE_GROUPS_BY_STORE[storeCode] || EMPLOYEE_GROUPS_BY_STORE[DEFAULT_STORE_CODE];

// Nombres canónicos para el <select> obligatorio de "Nombre empleada" en los formularios.
export const getEmployeeNames = (storeCode) => getEmployeeGroups(storeCode).map(g => g.name);

export const groupKeyFor = (nombre, storeCode) => {
  const n = normalize(nombre);
  const found = getEmployeeGroups(storeCode).find(g => g.match(n));
  return found ? found.key : 'otras';
};

// Acumulador vacío por empleada de la tienda, para que las tarjetas salgan aunque no
// haya registros.
export const emptyByEmployee = (makeEmpty, storeCode) =>
  getEmployeeGroups(storeCode).reduce((acc, g) => { acc[g.key] = makeEmpty(); return acc; }, {});

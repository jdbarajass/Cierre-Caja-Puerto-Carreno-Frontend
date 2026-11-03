// Piezas comunes de los filtros de tablas "como en Excel" (Cuentas → Gastos,
// Cuentas Recompras, Ajustes de inventario). Filtran en el navegador lo que ya
// está cargado: no cambian lo que se guarda ni los totales del mes.

const DIACRITICS_RE = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

/** Texto en minúsculas y sin tildes, para comparar ("Herrajería" = "herrajeria"). */
export const searchable = (s) =>
  (s == null ? '' : String(s)).toLowerCase().normalize('NFD').replace(DIACRITICS_RE, '');

/**
 * ¿Están todas las palabras de `query` en alguno de los `fields`? Sin tildes ni
 * mayúsculas y en cualquier orden ("carreño herrajeria" encuentra
 * "Herrajería de Carreño"). Sin búsqueda, todo coincide.
 */
export const textMatches = (query, fields) => {
  const words = searchable(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = searchable(fields.filter(f => f != null).join(' '));
  return words.every(w => haystack.includes(w));
};

/** ¿La fecha 'AAAA-MM-DD' está entre `from` y `to` (incluidos; vacíos = sin límite)? */
export const inDateRange = (date, from, to) => {
  if (!from && !to) return true;
  if (!date) return false;
  const d = String(date).slice(0, 10);
  return (!from || d >= from) && (!to || d <= to);
};

/** ¿Hay algún filtro puesto? */
export const anyFilter = (filters) => Object.values(filters).some(v => v !== '' && v != null && v !== false);

/**
 * Almacena un valor de forma segura en sessionStorage con cifrado básico
 * @param {string} key - La clave
 * @param {any} value - El valor a guardar
 */
export const secureSetItem = (key, value) => {
  try {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

    // Cifrado básico con Base64 (mejor que nada, pero no es criptográficamente seguro)
    const encoded = btoa(unescape(encodeURIComponent(valueStr)));

    sessionStorage.setItem(key, encoded);
  } catch (error) {
    console.error('Error al guardar en storage:', error);
  }
};

/**
 * Obtiene un valor del almacenamiento seguro
 * @param {string} key - La clave
 * @returns {any} - El valor almacenado o null
 */
export const secureGetItem = (key) => {
  try {
    const encoded = sessionStorage.getItem(key);

    if (!encoded) {
      return null;
    }

    // Decodificar
    const decoded = decodeURIComponent(escape(atob(encoded)));

    // Intentar parsear como JSON, si falla retornar como string
    try {
      return JSON.parse(decoded);
    } catch {
      return decoded;
    }
  } catch (error) {
    console.error('Error al leer del storage:', error);
    return null;
  }
};

/**
 * Elimina un valor del almacenamiento
 * @param {string} key - La clave a eliminar
 */
export const secureRemoveItem = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error('Error al eliminar del storage:', error);
  }
};

/**
 * Limpia todo el almacenamiento
 */
export const secureClearAll = () => {
  try {
    sessionStorage.clear();
  } catch (error) {
    console.error('Error al limpiar storage:', error);
  }
};

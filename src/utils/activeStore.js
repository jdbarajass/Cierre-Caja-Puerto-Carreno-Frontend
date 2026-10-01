/**
 * Multi-tienda (KOAJ Carreño / KOAJ Primavera): tienda activa de la sesión.
 *
 * Las tiendas que puede operar el usuario llegan del backend en el login
 * (y en /auth/verify) como `user.stores`. La tienda activa se guarda en el
 * almacenamiento de sesión y SIEMPRE se valida contra esa lista: si deja de
 * ser válida, se cae a la tienda asignada al usuario.
 *
 * authenticatedFetch (services/api.js) manda la tienda activa en el header
 * X-Store de cada petición. Sin tienda (sesión vieja sin `stores`), no se
 * manda header y el backend usa la tienda asignada al usuario.
 */
import { secureGetItem, secureSetItem, secureRemoveItem } from './secureStorage';
import { getUser } from './auth';

const ACTIVE_STORE_KEY = 'activeStore';

// Tienda original: conserva formatos de claves locales previos al multi-tienda
// (ej. borradores del cierre).
export const DEFAULT_STORE_CODE = 'carreno';

export const getUserStores = (user = getUser()) => user?.stores || [];

export const getActiveStoreCode = (user = getUser()) => {
  const stores = getUserStores(user);
  if (stores.length === 0) return null;

  const saved = secureGetItem(ACTIVE_STORE_KEY);
  if (stores.some((s) => s.code === saved)) return saved;
  if (stores.some((s) => s.code === user?.store_code)) return user.store_code;
  return stores[0].code;
};

export const getActiveStore = (user = getUser()) => {
  const code = getActiveStoreCode(user);
  return getUserStores(user).find((s) => s.code === code) || null;
};

export const setActiveStoreCode = (code) => secureSetItem(ACTIVE_STORE_KEY, code);

export const clearActiveStore = () => secureRemoveItem(ACTIVE_STORE_KEY);

/**
 * Nombre de la tienda para mostrar en la interfaz, sin la marca
 * ("KOAJ Puerto Carreño" -> "Puerto Carreño"). Sin tienda conocida (sesión
 * vieja todavía cargando sus tiendas) se muestra la tienda original.
 */
export const storeDisplayName = (store) =>
  (store?.name || 'KOAJ Puerto Carreño').replace(/^KOAJ\s+/i, '');

import { useEffect } from 'react';
import { getActiveStore, storeDisplayName } from '../utils/activeStore';

/**
 * Hook personalizado para cambiar el título del documento (pestaña del navegador)
 * @param {string} title - El título que se mostrará en la pestaña
 */
const useDocumentTitle = (title) => {
  useEffect(() => {
    // Multi-tienda: la pestaña dice en qué tienda se está trabajando
    const baseTitle = `Sistema de Cierre ${storeDisplayName(getActiveStore())}`;
    const fullTitle = title ? `${title} - ${baseTitle}` : baseTitle;

    document.title = fullTitle;

    // Cleanup: restaurar el título base cuando el componente se desmonte
    return () => {
      document.title = baseTitle;
    };
  }, [title]);
};

export default useDocumentTitle;

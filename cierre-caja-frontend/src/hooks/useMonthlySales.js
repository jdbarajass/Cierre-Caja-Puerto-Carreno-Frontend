import { useState, useEffect } from 'react';
import logger from '../utils/logger';

// URLs de los backends (mismo orden de prioridad que en api.js)
const API_LOCALS = [
  'http://10.28.168.57:5000',
  'http://localhost:5000'
];
const API_DEPLOYED = 'https://cierre-caja-api.onrender.com';

/**
 * Detecta si el frontend está corriendo en un entorno local
 * @returns {boolean} - true si es local, false si está desplegado
 */
const isLocalEnvironment = () => {
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.') ||
    hostname.startsWith('172.17.') ||
    hostname.startsWith('172.18.') ||
    hostname.startsWith('172.19.') ||
    hostname.startsWith('172.2') ||
    hostname.startsWith('172.30.') ||
    hostname.startsWith('172.31.')
  );
};

/**
 * Hook personalizado para obtener las ventas mensuales desde el backend
 * Este endpoint NO requiere autenticación según la documentación
 * @param {string} startDate - Fecha de inicio en formato YYYY-MM-DD (opcional)
 * @param {string} endDate - Fecha de fin en formato YYYY-MM-DD (opcional)
 * @returns {Object} { data, loading, error, refetch }
 */
export const useMonthlySales = (startDate = null, endDate = null) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMonthlySales = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construir URL con parámetros opcionales
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const endpoint = `/api/monthly_sales${
        params.toString() ? '?' + params.toString() : ''
      }`;

      logger.info('Intentando obtener ventas mensuales:', endpoint);

      // Detectar si estamos en entorno local o desplegado
      const isLocal = isLocalEnvironment();
      let response = null;
      let lastError = null;

      if (isLocal) {
        logger.info('Frontend en entorno LOCAL - Prioridad: backends locales');

        // ENTORNO LOCAL: Intentar con backends locales primero
        for (const localApi of API_LOCALS) {
          try {
            const url = `${localApi}${endpoint}`;
            logger.info('Intentando con:', url);

            response = await fetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              logger.info('Conectado exitosamente con:', localApi);
              break;
            }
          } catch (err) {
            logger.warn(`Error con ${localApi}:`, err.message);
            lastError = err;
          }
        }

        // Si no funcionó ningún backend local, intentar con el desplegado como fallback
        if (!response || !response.ok) {
          logger.warn('Backends locales no disponibles, intentando con backend desplegado como fallback...');
          try {
            const url = `${API_DEPLOYED}${endpoint}`;
            logger.info('Intentando con backend desplegado:', url);

            response = await fetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
          } catch (err) {
            logger.error('Error con backend desplegado:', err.message);
            throw new Error('No se pudo conectar con ningún servidor');
          }
        }
      } else {
        // ENTORNO DESPLEGADO: Solo usar backend desplegado
        logger.info('Frontend en entorno DESPLEGADO - Usando solo backend desplegado');
        try {
          const url = `${API_DEPLOYED}${endpoint}`;
          logger.info('Conectando con backend desplegado:', url);

          response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } catch (err) {
          logger.error('Error con backend desplegado:', err.message);
          throw new Error('No se pudo conectar con el servidor');
        }
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al obtener ventas mensuales');
      }

      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlySales();
  }, [startDate, endDate]);

  // Función para refrescar los datos manualmente
  const refetch = () => {
    fetchMonthlySales();
  };

  return { data, loading, error, refetch };
};

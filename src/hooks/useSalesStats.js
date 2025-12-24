import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../services/api';
import logger from '../utils/logger';
import { getColombiaTodayString, getColombiaDate } from '../utils/dateUtils';

/**
 * Hook para obtener estadísticas de ventas del día y del mes actual
 * Se actualiza automáticamente cada 13 minutos
 */
export const useSalesStats = () => {
  const [salesStats, setSalesStats] = useState({
    dailySales: null,
    monthlySales: null,
    loading: true,
    error: null
  });

  const fetchSalesStats = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 8000; // 8 segundos de espera entre reintentos

    try {
      // Obtener fecha actual en Colombia usando la utilidad correcta
      const today = getColombiaTodayString(); // YYYY-MM-DD en hora de Colombia

      // Obtener el primer día del mes actual en Colombia
      const colombiaDate = getColombiaDate();
      const year = colombiaDate.getFullYear();
      const month = String(colombiaDate.getMonth() + 1).padStart(2, '0');
      const startDate = `${year}-${month}-01`;

      logger.info('📊 Obteniendo estadísticas de ventas (quick-summary)', { today, startDate, retryCount });
      console.log('📅 Fechas:', { today, startDate });

      // Si es un reintento, mostrar mensaje al usuario
      if (retryCount > 0) {
        console.log(`🔄 Reintento ${retryCount}/${MAX_RETRIES} - El servidor se está iniciando...`);
        setSalesStats(prev => ({
          ...prev,
          loading: true,
          error: `Servidor iniciando... Intento ${retryCount}/${MAX_RETRIES}`
        }));
      }

      // Timeout más largo para dar tiempo al servidor a iniciarse (60 segundos)
      const SALES_TIMEOUT = 60000;

      // Peticiones en paralelo usando el nuevo endpoint rápido
      const [dailyResponse, monthlyResponse] = await Promise.all([
        // Ventas del día (mismo día como from y to)
        authenticatedFetch(`/api/sales/quick-summary?from=${today}&to=${today}`, {
          method: 'GET',
        }, SALES_TIMEOUT)
          .then(async res => {
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              console.error('❌ Error en ventas del día:', errorData);
              return null;
            }
            const data = await res.json();
            console.log('✅ Ventas del día (quick):', data);
            return data;
          })
          .catch(err => {
            console.error('❌ Error fetching ventas del día:', err);
            return null;
          }),

        // Ventas del mes
        authenticatedFetch(`/api/sales/quick-summary?from=${startDate}&to=${today}`, {
          method: 'GET',
        }, SALES_TIMEOUT)
          .then(async res => {
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              console.error('❌ Error en ventas del mes:', errorData);
              return null;
            }
            const data = await res.json();
            console.log('✅ Ventas del mes (quick):', data);
            return data;
          })
          .catch(err => {
            console.error('❌ Error fetching ventas del mes:', err);
            return null;
          })
      ]);

      // Procesar ventas del día (nueva estructura de respuesta)
      const dailySales = dailyResponse?.total_sales || 0;
      console.log('💰 Venta del día procesada:', dailySales, `(${dailyResponse?.document_count || 0} documentos)`);

      // Procesar ventas del mes (nueva estructura de respuesta)
      const monthlySales = monthlyResponse?.total_sales || 0;
      console.log('💰 Venta del mes procesada:', monthlySales, `(${monthlyResponse?.document_count || 0} documentos)`);

      // Detectar si el servidor está en cold start (ambas respuestas son null o zero)
      const isColdStart = (!dailyResponse && !monthlyResponse) || (dailySales === 0 && monthlySales === 0 && retryCount === 0);

      // Si es cold start y no hemos alcanzado el máximo de reintentos, reintentar
      if (isColdStart && retryCount < MAX_RETRIES) {
        console.log(`⏳ Servidor posiblemente en cold start. Esperando ${RETRY_DELAY/1000} segundos antes de reintentar...`);
        setSalesStats({
          dailySales: 0,
          monthlySales: 0,
          loading: true,
          error: `El servidor se está iniciando. Reintentando en ${RETRY_DELAY/1000} segundos... (${retryCount + 1}/${MAX_RETRIES})`
        });

        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

        // Reintentar
        return fetchSalesStats(retryCount + 1);
      }

      // Si llegamos aquí, o tenemos datos válidos o alcanzamos el máximo de reintentos
      setSalesStats({
        dailySales,
        monthlySales,
        loading: false,
        error: null
      });

      logger.info('✅ Estadísticas de ventas actualizadas', { dailySales, monthlySales });

    } catch (error) {
      console.error('❌ Error general al obtener estadísticas:', error);
      logger.error('Error al obtener estadísticas de ventas', error);

      // Si es un error de red/timeout y no hemos alcanzado el máximo de reintentos
      if (retryCount < MAX_RETRIES && (error.name === 'TypeError' || error.message.includes('timeout') || error.message.includes('network'))) {
        console.log(`⏳ Error de conexión. Esperando ${RETRY_DELAY/1000} segundos antes de reintentar...`);
        setSalesStats(prev => ({
          ...prev,
          loading: true,
          error: `Conectando al servidor... Reintentando en ${RETRY_DELAY/1000} segundos... (${retryCount + 1}/${MAX_RETRIES})`
        }));

        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

        // Reintentar
        return fetchSalesStats(retryCount + 1);
      }

      // Si alcanzamos el máximo de reintentos o es otro tipo de error
      setSalesStats(prev => ({
        ...prev,
        loading: false,
        error: retryCount >= MAX_RETRIES
          ? 'El servidor no responde. Por favor, intenta nuevamente en unos minutos.'
          : error.message
      }));
    }
  };

  useEffect(() => {
    // Cargar datos inicialmente
    fetchSalesStats();

    // Actualizar cada 13 minutos
    const interval = setInterval(() => {
      fetchSalesStats();
    }, 13 * 60 * 1000); // 13 minutos

    return () => clearInterval(interval);
  }, []);

  return salesStats;
};

export default useSalesStats;

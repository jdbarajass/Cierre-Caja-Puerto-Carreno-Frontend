import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../services/api';
import logger from '../utils/logger';
import { getColombiaTodayString, getColombiaDate } from '../utils/dateUtils';

/**
 * Hook consolidado para obtener TODAS las estadísticas de ventas
 * Incluye ventas actuales Y comparación año sobre año
 * Optimizado para reducir peticiones concurrentes y duplicadas
 * Usa el endpoint rápido /api/sales/quick-summary
 */
export const useSalesComparison = () => {
  const [comparison, setComparison] = useState({
    // Estadísticas actuales (antes en useSalesStats)
    dailySales: null,
    monthlySales: null,
    // Comparaciones año sobre año
    dailyComparison: null,
    monthlyComparison: null,
    nextDayLastYear: null,
    previousDay: null, // Día anterior (ayer)
    loading: true,
    error: null
  });

  const fetchComparison = async () => {
    try {
      // Obtener fecha actual en Colombia
      const today = getColombiaTodayString(); // YYYY-MM-DD
      const colombiaDate = getColombiaDate();

      // Calcular fecha del año anterior (mismo día y mes)
      const previousYearDate = new Date(colombiaDate);
      previousYearDate.setFullYear(colombiaDate.getFullYear() - 1);
      const previousYear = previousYearDate.getFullYear();
      const previousMonth = String(previousYearDate.getMonth() + 1).padStart(2, '0');
      const previousDay = String(previousYearDate.getDate()).padStart(2, '0');
      const todayLastYear = `${previousYear}-${previousMonth}-${previousDay}`;

      // Calcular día siguiente del año anterior
      const nextDayLastYearDate = new Date(previousYearDate);
      nextDayLastYearDate.setDate(nextDayLastYearDate.getDate() + 1);
      const nextDayYear = nextDayLastYearDate.getFullYear();
      const nextDayMonth = String(nextDayLastYearDate.getMonth() + 1).padStart(2, '0');
      const nextDayDay = String(nextDayLastYearDate.getDate()).padStart(2, '0');
      const nextDayLastYear = `${nextDayYear}-${nextDayMonth}-${nextDayDay}`;

      // Calcular día anterior (ayer)
      const previousDayDate = new Date(colombiaDate);
      previousDayDate.setDate(previousDayDate.getDate() - 1);
      const prevYear = previousDayDate.getFullYear();
      const prevMonth = String(previousDayDate.getMonth() + 1).padStart(2, '0');
      const prevDay = String(previousDayDate.getDate()).padStart(2, '0');
      const yesterday = `${prevYear}-${prevMonth}-${prevDay}`;

      // Obtener el primer día del mes actual y año anterior
      const currentYear = colombiaDate.getFullYear();
      const currentMonth = String(colombiaDate.getMonth() + 1).padStart(2, '0');
      const startOfMonth = `${currentYear}-${currentMonth}-01`;
      const startOfMonthLastYear = `${previousYear}-${previousMonth}-01`;

      logger.info('📊 Obteniendo estadísticas de ventas (optimizado - grupos secuenciales)', {
        today,
        yesterday,
        todayLastYear,
        nextDayLastYear,
        startOfMonth,
        startOfMonthLastYear
      });

      // No especificar timeout personalizado - usar timeout adaptativo de api.js
      // (45s para primera conexión, 15s después)

      // ✅ GRUPO 1 (PRIORITARIO): Datos actuales - 2 peticiones en paralelo
      // Estos datos se muestran inmediatamente en la UI
      logger.info('🔄 Grupo 1: Obteniendo datos actuales (día y mes)...');
      const [currentDayResponse, currentMonthResponse] = await Promise.all([
        // Día actual
        authenticatedFetch(`/api/sales/quick-summary?from=${today}&to=${today}`, {
          method: 'GET',
        }).then(res => res.ok ? res.json() : null).catch(() => null),

        // Mes actual
        authenticatedFetch(`/api/sales/quick-summary?from=${startOfMonth}&to=${today}`, {
          method: 'GET',
        }).then(res => res.ok ? res.json() : null).catch(() => null)
      ]);
      logger.info('✅ Grupo 1 completado');

      // ✅ GRUPO 2 (SECUNDARIO): Datos del año anterior y ayer - 4 peticiones en paralelo
      // Estos datos son para comparación, menos críticos
      logger.info('🔄 Grupo 2: Obteniendo datos año anterior y día anterior (comparación)...');
      logger.info(`📅 Petición día siguiente año anterior: /api/sales/quick-summary?from=${nextDayLastYear}&to=${nextDayLastYear}`);
      logger.info(`📅 Petición día anterior (ayer): /api/sales/quick-summary?from=${yesterday}&to=${yesterday}`);
      const [previousDayResponse, nextDayLastYearResponse, yesterdayResponse, previousMonthResponse] = await Promise.all([
        // Mismo día año anterior
        authenticatedFetch(`/api/sales/quick-summary?from=${todayLastYear}&to=${todayLastYear}`, {
          method: 'GET',
        }).then(res => res.ok ? res.json() : null).catch(() => null),

        // Día siguiente del año anterior
        authenticatedFetch(`/api/sales/quick-summary?from=${nextDayLastYear}&to=${nextDayLastYear}`, {
          method: 'GET',
        }).then(res => res.ok ? res.json() : null).catch(() => null),

        // Día anterior (ayer)
        authenticatedFetch(`/api/sales/quick-summary?from=${yesterday}&to=${yesterday}`, {
          method: 'GET',
        }).then(res => res.ok ? res.json() : null).catch(() => null),

        // Mismo mes año anterior
        authenticatedFetch(`/api/sales/quick-summary?from=${startOfMonthLastYear}&to=${todayLastYear}`, {
          method: 'GET',
        }).then(res => res.ok ? res.json() : null).catch(() => null)
      ]);
      logger.info('✅ Grupo 2 completado');

      // Procesar datos del día
      const currentDayTotal = currentDayResponse?.total_sales || 0;
      const previousDayTotal = previousDayResponse?.total_sales || 0;
      const dayDifference = currentDayTotal - previousDayTotal;
      const dayPercentageChange = previousDayTotal > 0
        ? ((currentDayTotal - previousDayTotal) / previousDayTotal) * 100
        : (currentDayTotal > 0 ? 100 : 0);

      // Procesar datos del mes
      const currentMonthTotal = currentMonthResponse?.total_sales || 0;
      const previousMonthTotal = previousMonthResponse?.total_sales || 0;
      const monthDifference = currentMonthTotal - previousMonthTotal;
      const monthPercentageChange = previousMonthTotal > 0
        ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
        : (currentMonthTotal > 0 ? 100 : 0);

      // Procesar datos del día siguiente del año anterior
      const nextDayTotal = nextDayLastYearResponse?.total_sales || 0;

      logger.info('📅 Día siguiente del año anterior:', {
        fecha: nextDayLastYear,
        respuesta: nextDayLastYearResponse,
        total: nextDayTotal
      });

      // Procesar datos del día anterior (ayer)
      const yesterdayTotal = yesterdayResponse?.total_sales || 0;

      logger.info('📅 Día anterior (ayer):', {
        fecha: yesterday,
        respuesta: yesterdayResponse,
        total: yesterdayTotal
      });

      // Formatear moneda
      const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      };

      setComparison({
        // Estadísticas actuales (para reemplazar useSalesStats)
        dailySales: currentDayTotal,
        monthlySales: currentMonthTotal,
        // Comparaciones año sobre año
        dailyComparison: {
          current: {
            date: today,
            total: currentDayTotal,
            formatted: formatCurrency(currentDayTotal)
          },
          previous: {
            date: todayLastYear,
            total: previousDayTotal,
            formatted: formatCurrency(previousDayTotal)
          },
          difference: dayDifference,
          differenceFormatted: formatCurrency(Math.abs(dayDifference)),
          percentageChange: Math.round(dayPercentageChange * 100) / 100,
          isGrowth: dayDifference >= 0
        },
        monthlyComparison: {
          current: {
            period: `${startOfMonth} a ${today}`,
            total: currentMonthTotal,
            formatted: formatCurrency(currentMonthTotal)
          },
          previous: {
            period: `${startOfMonthLastYear} a ${todayLastYear}`,
            total: previousMonthTotal,
            formatted: formatCurrency(previousMonthTotal)
          },
          difference: monthDifference,
          differenceFormatted: formatCurrency(Math.abs(monthDifference)),
          percentageChange: Math.round(monthPercentageChange * 100) / 100,
          isGrowth: monthDifference >= 0
        },
        nextDayLastYear: {
          date: nextDayLastYear,
          total: nextDayTotal,
          formatted: formatCurrency(nextDayTotal)
        },
        previousDay: {
          date: yesterday,
          total: yesterdayTotal,
          formatted: formatCurrency(yesterdayTotal)
        },
        loading: false,
        error: null
      });

      logger.info('✅ Comparación año sobre año actualizada');

    } catch (error) {
      logger.error('Error al obtener comparación año sobre año', error);
      setComparison(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  useEffect(() => {
    // Cargar datos inicialmente
    fetchComparison();

    // Actualizar cada 13 minutos (igual que useSalesStats)
    const interval = setInterval(() => {
      fetchComparison();
    }, 13 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return comparison;
};

export default useSalesComparison;

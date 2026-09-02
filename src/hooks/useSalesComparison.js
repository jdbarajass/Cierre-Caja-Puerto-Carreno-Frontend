import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../services/api';
import logger from '../utils/logger';
import { getColombiaTodayString, getColombiaDate } from '../utils/dateUtils';

/**
 * Hook consolidado para obtener TODAS las estadísticas del dashboard
 * Incluye:
 * - Ventas actuales (día y mes)
 * - Comparación año sobre año
 * - Inventario total (asíncrono e independiente)
 *
 * Optimizado para reducir peticiones concurrentes y duplicadas
 * Usa endpoints rápidos de Alegra (/api/sales/quick-summary y /api/inventory/quick-total)
 *
 * @param {boolean} enabled - Si es false, no se realiza ninguna petición (útil para
 * evitar llamadas innecesarias a Alegra cuando los datos no se van a mostrar, ej.
 * en rutas donde el layout que consume este hook no renderiza las métricas)
 */
export const useSalesComparison = (enabled = true) => {
  const [comparison, setComparison] = useState({
    // Estadísticas actuales
    dailySales: null,
    monthlySales: null,
    inventoryTotal: null,
    billsOpenTotal: null,
    loadingInventory: true,
    loadingBills: true,
    // Comparaciones año sobre año
    dailyComparison: null,
    monthlyComparison: null,
    nextDayLastYear: null,
    previousDay: null,
    fullMonthLastYear: null, // Mes completo del año anterior (para meta mensual)
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

      // Calcular el último día del mes del año anterior (para la meta mensual)
      const lastDayOfMonthLastYear = new Date(previousYear, parseInt(previousMonth), 0);
      const endOfMonthLastYear = `${previousYear}-${previousMonth}-${String(lastDayOfMonthLastYear.getDate()).padStart(2, '0')}`;

      logger.info('📊 Obteniendo estadísticas de ventas (optimizado - grupos secuenciales)', {
        today,
        yesterday,
        todayLastYear,
        nextDayLastYear,
        startOfMonth,
        startOfMonthLastYear,
        endOfMonthLastYear
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

      // 📦 INVENTARIO (ASÍNCRONO INDEPENDIENTE): Se lanza sin bloquear otras peticiones
      // Se actualiza cuando esté listo, sin afectar las ventas
      logger.info('📦 Lanzando petición de inventario (asíncrono)...');
      authenticatedFetch(`/api/inventory/quick-total?to_date=${today}`, {
        method: 'GET',
      })
        .then(async res => {
          if (res.ok) {
            const data = await res.json();
            setComparison(prev => ({
              ...prev,
              inventoryTotal: {
                value: data?.total_value || 0,
                valueFormatted: data?.total_value_formatted,
                toDate: data?.to_date
              },
              loadingInventory: false
            }));
            logger.info('✅ Inventario total actualizado:', data?.total_value_formatted);
          } else {
            setComparison(prev => ({ ...prev, inventoryTotal: null, loadingInventory: false }));
            logger.error('❌ Error obteniendo inventario total');
          }
        })
        .catch(err => {
          setComparison(prev => ({ ...prev, inventoryTotal: null, loadingInventory: false }));
          logger.error('❌ Error en petición de inventario:', err);
        });

      // 💳 CUENTAS POR PAGAR (ASÍNCRONO INDEPENDIENTE): Se lanza sin bloquear otras peticiones
      logger.info('💳 Lanzando petición de cuentas por pagar (asíncrono)...');
      authenticatedFetch(`/api/bills/open-totals?from_date=${startOfMonth}&to_date=${today}`, {
        method: 'GET',
      })
        .then(async res => {
          if (res.ok) {
            const data = await res.json();
            setComparison(prev => ({
              ...prev,
              billsOpenTotal: {
                amount: data?.missing_amount || 0,
                amountFormatted: data?.missing_amount_formatted,
                totalDocuments: data?.total_documents || 0,
                fromDate: data?.from_date,
                toDate: data?.to_date
              },
              loadingBills: false
            }));
            logger.info('✅ Cuentas por pagar actualizadas:', data?.missing_amount_formatted);
          } else {
            setComparison(prev => ({ ...prev, billsOpenTotal: null, loadingBills: false }));
            logger.error('❌ Error obteniendo cuentas por pagar');
          }
        })
        .catch(err => {
          setComparison(prev => ({ ...prev, billsOpenTotal: null, loadingBills: false }));
          logger.error('❌ Error en petición de cuentas por pagar:', err);
        });

      // ✅ GRUPO 2 (SECUNDARIO): Datos del año anterior y ayer - 5 peticiones en paralelo
      // Estos datos son para comparación, menos críticos
      logger.info('🔄 Grupo 2: Obteniendo datos año anterior y día anterior (comparación)...');
      logger.info(`📅 Petición día siguiente año anterior: /api/sales/quick-summary?from=${nextDayLastYear}&to=${nextDayLastYear}`);
      logger.info(`📅 Petición día anterior (ayer): /api/sales/quick-summary?from=${yesterday}&to=${yesterday}`);
      logger.info(`📅 Petición mes COMPLETO año anterior (para meta): /api/sales/quick-summary?from=${startOfMonthLastYear}&to=${endOfMonthLastYear}`);
      const [previousDayResponse, nextDayLastYearResponse, yesterdayResponse, previousMonthResponse, fullMonthLastYearResponse] = await Promise.all([
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

        // Mismo mes año anterior (hasta el mismo día - para comparación)
        authenticatedFetch(`/api/sales/quick-summary?from=${startOfMonthLastYear}&to=${todayLastYear}`, {
          method: 'GET',
        }).then(res => res.ok ? res.json() : null).catch(() => null),

        // Mes COMPLETO año anterior (para calcular la meta mensual)
        authenticatedFetch(`/api/sales/quick-summary?from=${startOfMonthLastYear}&to=${endOfMonthLastYear}`, {
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

      // Procesar mes COMPLETO del año anterior (para meta mensual)
      const fullMonthLastYearTotal = fullMonthLastYearResponse?.total_sales || 0;

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

      setComparison(prev => ({
        ...prev, // Preservar inventoryTotal, billsOpenTotal, loadingInventory, loadingBills
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
        // Mes COMPLETO del año anterior (para calcular meta mensual)
        fullMonthLastYear: {
          period: `${startOfMonthLastYear} a ${endOfMonthLastYear}`,
          total: fullMonthLastYearTotal,
          formatted: formatCurrency(fullMonthLastYearTotal)
        },
        loading: false,
        error: null
      }));

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
    if (!enabled) {
      return;
    }

    // Cargar datos inicialmente
    fetchComparison();

    // Actualizar cada 13 minutos (igual que useSalesStats)
    const interval = setInterval(() => {
      fetchComparison();
    }, 13 * 60 * 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  return comparison;
};

export default useSalesComparison;

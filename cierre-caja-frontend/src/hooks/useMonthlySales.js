import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../services/api';

/**
 * Hook personalizado para obtener las ventas mensuales desde el backend
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

      const endpoint = `/monthly_sales${
        params.toString() ? '?' + params.toString() : ''
      }`;

      const response = await authenticatedFetch(endpoint);
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

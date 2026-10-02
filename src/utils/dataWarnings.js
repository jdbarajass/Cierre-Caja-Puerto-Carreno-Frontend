/**
 * Días que Alegra no entregó al armar una respuesta del backend (header
 * X-Alegra-Failed-Days, ver AlegraClient.get_all_invoices_in_range). Lo leen
 * todas las peticiones (authenticatedFetch) y lo muestra AlegraFailedDaysBanner.
 */
export const FAILED_DAYS_EVENT = 'alegra-failed-days';

export const parseFailedDaysHeader = (value) =>
  String(value || '').split(',').map((d) => d.trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

export const reportAlegraFailedDays = (response) => {
  const days = parseFailedDaysHeader(response?.headers?.get?.('X-Alegra-Failed-Days'));
  if (days.length > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FAILED_DAYS_EVENT, { detail: days }));
  }
};

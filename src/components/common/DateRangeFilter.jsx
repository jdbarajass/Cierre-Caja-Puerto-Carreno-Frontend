import React from 'react';
import { Calendar, Search } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * Componente reutilizable para filtros de rango de fechas
 * @param {string} fromDate - Fecha de inicio
 * @param {string} toDate - Fecha de fin
 * @param {function} onFromDateChange - Callback cuando cambia la fecha de inicio
 * @param {function} onToDateChange - Callback cuando cambia la fecha de fin
 * @param {function} onSubmit - Callback cuando se hace submit del formulario
 * @param {boolean} loading - Si está cargando datos
 */
const DateRangeFilter = ({
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    onSubmit,
    loading = false,
    children
}) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit) {
            onSubmit();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-wrap items-end gap-4">
                {/* Fecha Desde */}
                <div className="flex-1 min-w-[200px]">
                    <label htmlFor="fromDate" className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Fecha Desde
                    </label>
                    <input
                        id="fromDate"
                        type="date"
                        value={fromDate}
                        onChange={(e) => onFromDateChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                        required
                    />
                </div>

                {/* Fecha Hasta */}
                <div className="flex-1 min-w-[200px]">
                    <label htmlFor="toDate" className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Fecha Hasta
                    </label>
                    <input
                        id="toDate"
                        type="date"
                        value={toDate}
                        onChange={(e) => onToDateChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                        required
                    />
                </div>

                {/* Campos adicionales (opcional) */}
                {children}

                {/* Botón de búsqueda */}
                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Cargando...
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4" />
                                Consultar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
};

DateRangeFilter.propTypes = {
    fromDate: PropTypes.string.isRequired,
    toDate: PropTypes.string.isRequired,
    onFromDateChange: PropTypes.func.isRequired,
    onToDateChange: PropTypes.func.isRequired,
    onSubmit: PropTypes.func,
    loading: PropTypes.bool,
    children: PropTypes.node
};

export default DateRangeFilter;

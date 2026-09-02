import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Loader2, AlertCircle, ChevronLeft, ChevronRight, User, CreditCard } from 'lucide-react';
import { getSalesDocuments } from '../../services/directApiService';
import { getColombiaTodayString } from '../../utils/dateUtils';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const DirectSalesDocuments = () => {
  useDocumentTitle('Documentos de Venta - Estadísticas Avanzadas');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [metadata, setMetadata] = useState(null);

  // Filtros
  const [fromDate, setFromDate] = useState(getColombiaTodayString());
  const [toDate, setToDate] = useState(getColombiaTodayString());
  const [limit, setLimit] = useState(30);
  const [currentStart, setCurrentStart] = useState(0);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        from: fromDate,
        to: toDate,
        limit,
        start: currentStart,
      };

      const response = await getSalesDocuments(params);

      if (response.success) {
        setDocuments(response.data || []);
        setMetadata(response.metadata || null);
      } else {
        throw new Error(response.error || 'Error al obtener documentos de ventas');
      }
    } catch (err) {
      setError(err.message);
      setDocuments([]);
      setMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  // Cargar documentos al montar y cuando cambien los filtros
  useEffect(() => {
    if (fromDate && toDate) {
      fetchDocuments();
    }
  }, [fromDate, toDate, limit, currentStart]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    // Alegra devuelve `datetime` como "YYYY-MM-DD HH:MM:SS" en hora local de Colombia
    // (a diferencia de `date`, que es solo la fecha "YYYY-MM-DD" y JS interpreta como
    // medianoche UTC, corriendo la fecha un dia hacia atras al mostrarla en Colombia UTC-5)
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePreviousPage = () => {
    setCurrentStart(prev => Math.max(0, prev - limit));
  };

  const handleNextPage = () => {
    setCurrentStart(prev => prev + limit);
  };

  const totalSales = documents.reduce((sum, doc) => sum + (doc.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Documentos de Venta</h1>
        </div>
        <p className="text-blue-50">
          Consulta detallada de facturas y documentos de ventas
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fecha Desde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Desde
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentStart(0);
              }}
              max={toDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Hasta
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentStart(0);
              }}
              min={fromDate}
              max={getColombiaTodayString()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Límite */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Documentos por página
            </label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setCurrentStart(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>10 documentos</option>
              <option value={30}>30 documentos</option>
              <option value={50}>50 documentos</option>
              <option value={100}>100 documentos</option>
            </select>
          </div>
        </div>

        {/* Resumen */}
        {!loading && documents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Total Documentos</p>
              <p className="text-2xl font-bold text-blue-600">{documents.length}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Total Ventas</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Error al cargar documentos</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando documentos de venta...</p>
        </div>
      )}

      {/* Lista de Documentos */}
      {!loading && !error && documents.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID / Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc, index) => (
                  <tr key={doc.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{doc.number_template?.number || doc.id}
                      </div>
                      {doc.number_template?.id && (
                        <div className="text-xs text-gray-500">
                          ID: {doc.id}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(doc.datetime || doc.date)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-gray-900 font-medium">
                            {doc.client?.name || 'Cliente sin nombre'}
                          </div>
                          {doc.client?.identification && (
                            <div className="text-xs text-gray-500">
                              {doc.client.identification}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {doc.seller?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                      {formatCurrency(doc.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        doc.status === 'open'
                          ? 'bg-green-100 text-green-800'
                          : doc.status === 'closed'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doc.status === 'open' ? 'Abierto' : doc.status === 'closed' ? 'Cerrado' : doc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-sm font-bold text-gray-900">
                    TOTAL ({documents.length} documentos)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-bold">
                    {formatCurrency(totalSales)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Paginación */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando desde el resultado {currentStart + 1}
              {metadata && metadata.total_items && ` de ${metadata.total_items} totales`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentStart === 0}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                onClick={handleNextPage}
                disabled={documents.length < limit}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sin resultados */}
      {!loading && !error && documents.length === 0 && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron documentos</h3>
          <p className="text-gray-600">
            No hay documentos de venta para el rango de fechas seleccionado
          </p>
        </div>
      )}
    </div>
  );
};

export default DirectSalesDocuments;

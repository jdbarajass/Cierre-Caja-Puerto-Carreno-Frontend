import React from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, RefreshCw } from 'lucide-react';
import logger from '../../utils/logger';

/**
 * Error Boundary para capturar errores de React
 * Muestra una UI de fallback cuando ocurre un error
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log el error
    logger.error('Error capturado por Error Boundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Aquí podrías enviar el error a un servicio de logging
    // como Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // Opcionalmente recargar la página
    // window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // UI de fallback personalizable
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
            <div className="flex flex-col items-center text-center">
              {/* Ícono de error */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>

              {/* Título */}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Ups! Algo salió mal
              </h1>

              {/* Descripción */}
              <p className="text-gray-600 mb-6">
                Lo sentimos, ha ocurrido un error inesperado. Por favor, intenta nuevamente.
              </p>

              {/* Detalles del error (solo en desarrollo) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="w-full mb-6 p-4 bg-red-50 rounded-lg text-left">
                  <p className="text-xs font-mono text-red-800 break-words">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs font-semibold text-red-700 cursor-pointer">
                        Ver stack trace
                      </summary>
                      <pre className="text-xs mt-2 text-red-700 overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Botón de reintentar */}
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                <RefreshCw className="w-5 h-5" />
                Reintentar
              </button>

              {/* Enlace de ayuda */}
              <p className="mt-4 text-sm text-gray-500">
                Si el problema persiste,{' '}
                <a
                  href="mailto:soporte@koaj.com"
                  className="text-blue-600 hover:underline"
                >
                  contacta a soporte
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

export default ErrorBoundary;

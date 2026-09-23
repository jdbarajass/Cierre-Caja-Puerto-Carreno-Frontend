import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, Home, ArrowLeft } from 'lucide-react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { getUser } from '../utils/auth';

const Unauthorized = () => {
    const navigate = useNavigate();
    const user = getUser();

    // Establecer título de la página
    useDocumentTitle('Acceso Denegado');

    return (
        <div className="min-h-[100dvh] flex items-end sm:items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl ring-1 ring-gray-900/[0.06] shadow-xl p-7 sm:p-8 animate-fade-in-scale">
                    {/* Icono de Acceso Denegado */}
                    <div className="flex justify-center mb-6">
                        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                            <ShieldOff className="w-7 h-7 text-red-600" strokeWidth={1.75} />
                        </div>
                    </div>

                    {/* Título */}
                    <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
                        Acceso Denegado
                    </h1>

                    {/* Mensaje */}
                    <p className="text-gray-600 text-center mb-2">
                        No tienes permisos para acceder a esta sección del sistema.
                    </p>

                    {/* Información del usuario */}
                    {user && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <p className="text-sm text-gray-700 text-center">
                                <span className="font-medium">Usuario:</span> {user.name || user.email}
                            </p>
                            <p className="text-sm text-gray-700 text-center mt-1">
                                <span className="font-medium">Rol:</span>{' '}
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                                    {user.role === 'admin' ? 'Administrador' : user.role === 'sales' ? 'Ventas' : user.role}
                                </span>
                            </p>
                        </div>
                    )}

                    <p className="text-sm text-gray-500 text-center mb-6">
                        Si crees que esto es un error, contacta al administrador del sistema.
                    </p>

                    {/* Botones */}
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold h-12 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Volver Atrás
                        </button>

                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold h-12 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <Home className="w-5 h-5" />
                            Ir al Dashboard
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center">
                            Sistema de Gestión de Cierre de Caja
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import Login from './components/Login';
import MainLayout from './components/layout/MainLayout';

// Lazy loading del Dashboard, MonthlySales, ProductosLayout, AnalyticsLayout e InventoryLayout para reducir el bundle inicial
const Dashboard = lazy(() => import('./components/Dashboard'));
const MonthlySales = lazy(() => import('./components/MonthlySales'));
const ProductosLayout = lazy(() => import('./components/productos/ProductosLayout'));
const AnalyticsLayout = lazy(() => import('./components/analytics/AnalyticsLayout'));
const InventoryLayout = lazy(() => import('./components/inventory/InventoryLayout'));

// Componente de carga
const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600 font-medium">Cargando...</p>
    </div>
  </div>
);

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/monthly-sales"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <MonthlySales />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/productos"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ProductosLayout />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <AnalyticsLayout />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventario"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <InventoryLayout />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
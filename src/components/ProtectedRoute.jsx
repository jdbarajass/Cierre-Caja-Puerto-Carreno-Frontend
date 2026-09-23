import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canAccess } from '../utils/auth';
import AppLoader from './common/AppLoader';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading } = useAuth();

  // Mostrar un loader mientras se verifica la autenticación
  if (loading) {
    return <AppLoader label="Verificando sesión…" />;
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Si se especifican roles permitidos, verificar si el usuario tiene acceso
  if (allowedRoles && !canAccess(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Si está autenticado y tiene el rol correcto (o no se requiere rol específico), mostrar el contenido
  return children;
};

export default ProtectedRoute;

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Key,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX
} from 'lucide-react';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword
} from '../services/usersService';
import useDocumentTitle from '../hooks/useDocumentTitle';

const UsersManagement = () => {
  useDocumentTitle('Gestionar Usuarios');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estado para modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'reset-password'
  const [selectedUser, setSelectedUser] = useState(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'sales',
    is_active: true
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Cargar usuarios al montar
  useEffect(() => {
    loadUsers();
  }, []);

  // Limpiar mensajes despues de 5 segundos
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getUsers();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'sales',
      is_active: true
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
      is_active: user.is_active
    });
    setFormError('');
    setShowModal(true);
  };

  const openResetPasswordModal = (user) => {
    setModalMode('reset-password');
    setSelectedUser(user);
    setFormData({
      ...formData,
      password: ''
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setFormError('');
    setShowPassword(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const validateForm = () => {
    if (modalMode === 'reset-password') {
      if (!formData.password) {
        setFormError('La nueva contrasena es requerida');
        return false;
      }
      if (formData.password.length < 8) {
        setFormError('La contrasena debe tener al menos 8 caracteres');
        return false;
      }
      return true;
    }

    if (!formData.email) {
      setFormError('El email es requerido');
      return false;
    }
    if (!formData.name) {
      setFormError('El nombre es requerido');
      return false;
    }
    if (modalMode === 'create' && !formData.password) {
      setFormError('La contrasena es requerida');
      return false;
    }
    if (formData.password && formData.password.length < 8) {
      setFormError('La contrasena debe tener al menos 8 caracteres');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) return;

    try {
      setFormLoading(true);

      if (modalMode === 'create') {
        await createUser(formData);
        setSuccess('Usuario creado exitosamente');
      } else if (modalMode === 'edit') {
        const updateData = {
          email: formData.email,
          name: formData.name,
          role: formData.role,
          is_active: formData.is_active
        };
        await updateUser(selectedUser.id, updateData);
        setSuccess('Usuario actualizado exitosamente');
      } else if (modalMode === 'reset-password') {
        await resetPassword(selectedUser.id, formData.password);
        setSuccess('Contrasena reseteada exitosamente');
      }

      closeModal();
      loadUsers();
    } catch (err) {
      setFormError(err.message || 'Error al procesar la solicitud');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Desea desactivar al usuario ${user.name}?`)) {
      return;
    }

    try {
      await deleteUser(user.id);
      setSuccess('Usuario desactivado exitosamente');
      loadUsers();
    } catch (err) {
      setError(err.message || 'Error al desactivar usuario');
    }
  };

  const handleReactivate = async (user) => {
    try {
      await updateUser(user.id, { is_active: true });
      setSuccess('Usuario reactivado exitosamente');
      loadUsers();
    } catch (err) {
      setError(err.message || 'Error al reactivar usuario');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Gestionar Usuarios
          </h1>
          <p className="text-gray-600 mt-1">
            Administra los usuarios del sistema
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
            {(error.includes('sesion') || error.includes('Sesion') || error.includes('401')) && (
              <p className="text-xs text-red-600 mt-1">
                Por favor cierre sesion e inicie nuevamente.
              </p>
            )}
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-3 text-gray-600">Cargando usuarios...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay usuarios registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha Creacion
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Shield className="w-3.5 h-3.5" />
                        )}
                        {user.role === 'admin' ? 'Administrador' : 'Ventas'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Activo
                          </>
                        ) : (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            Inactivo
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openResetPasswordModal(user)}
                          className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Resetear Contrasena"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        {user.is_active ? (
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Desactivar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(user)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Reactivar"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={closeModal}
            ></div>

            {/* Modal content */}
            <div className="relative bg-white rounded-xl shadow-xl transform transition-all sm:max-w-lg sm:w-full">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalMode === 'create' && 'Crear Usuario'}
                  {modalMode === 'edit' && 'Editar Usuario'}
                  {modalMode === 'reset-password' && 'Resetear Contrasena'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                {formError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{formError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {modalMode !== 'reset-password' && (
                    <>
                      {/* Email */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="usuario@ejemplo.com"
                        />
                      </div>

                      {/* Nombre */}
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="Nombre completo"
                        />
                      </div>

                      {/* Rol */}
                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                          Rol
                        </label>
                        <select
                          id="role"
                          name="role"
                          value={formData.role}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          <option value="sales">Ventas</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>

                      {/* Estado (solo en edicion) */}
                      {modalMode === 'edit' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="is_active"
                            name="is_active"
                            checked={formData.is_active}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                            Usuario activo
                          </label>
                        </div>
                      )}
                    </>
                  )}

                  {/* Contrasena (en crear y reset) */}
                  {(modalMode === 'create' || modalMode === 'reset-password') && (
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        {modalMode === 'reset-password' ? 'Nueva Contrasena' : 'Contrasena'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="Minimo 8 caracteres"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Minimo 8 caracteres, incluir mayuscula, minuscula y numero
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={formLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    disabled={formLoading}
                  >
                    {formLoading && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {modalMode === 'create' && 'Crear Usuario'}
                    {modalMode === 'edit' && 'Guardar Cambios'}
                    {modalMode === 'reset-password' && 'Resetear Contrasena'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;

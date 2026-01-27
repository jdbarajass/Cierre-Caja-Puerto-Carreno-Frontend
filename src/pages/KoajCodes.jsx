import { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Search,
  BookOpen,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Plus,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import {
  getKoajCodes,
  getCodeGuide,
  createKoajCode,
  updateKoajCode,
  deleteKoajCode
} from '../services/koajCodesService';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { isAdmin } from '../utils/auth';

const KoajCodes = () => {
  useDocumentTitle('Codigos KOAJ');

  const [codes, setCodes] = useState([]);
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('todos');
  const [showGuide, setShowGuide] = useState(true);

  // Estado para modal CRUD
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit'
  const [selectedCode, setSelectedCode] = useState(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    code: '',
    category: '',
    description: '',
    applies_to: 'todos'
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Verificar si el usuario es admin
  const userIsAdmin = isAdmin();

  // Cargar datos al montar
  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Cargar códigos y guía en paralelo
      const [codesResponse, guideResponse] = await Promise.all([
        getKoajCodes(),
        getCodeGuide()
      ]);

      setCodes(codesResponse.codes || []);
      setGuide(guideResponse.guide || null);
    } catch (err) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar códigos basado en búsqueda y género
  const filteredCodes = useMemo(() => {
    return codes.filter(code => {
      // Filtrar por búsqueda
      const matchesSearch = !searchTerm ||
        code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.category.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtrar por género
      const matchesGender = filterGender === 'todos' ||
        code.applies_to === filterGender ||
        code.applies_to === 'todos';

      return matchesSearch && matchesGender;
    });
  }, [codes, searchTerm, filterGender]);

  // Mapeo de género a texto legible
  const genderLabels = {
    'todos': 'Todos',
    'hombre': 'Hombre',
    'mujer': 'Mujer',
    'niño': 'Nino',
    'niña': 'Nina'
  };

  // Colores por género
  const genderColors = {
    'todos': 'bg-gray-100 text-gray-800',
    'hombre': 'bg-blue-100 text-blue-800',
    'mujer': 'bg-pink-100 text-pink-800',
    'niño': 'bg-green-100 text-green-800',
    'niña': 'bg-purple-100 text-purple-800'
  };

  // Funciones del modal
  const openCreateModal = () => {
    setModalMode('create');
    setSelectedCode(null);
    setFormData({
      code: '',
      category: '',
      description: '',
      applies_to: 'todos'
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (code) => {
    setModalMode('edit');
    setSelectedCode(code);
    setFormData({
      code: code.code,
      category: code.category,
      description: code.description || '',
      applies_to: code.applies_to || 'todos'
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCode(null);
    setFormError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = () => {
    if (!formData.code.trim()) {
      setFormError('El codigo es requerido');
      return false;
    }
    if (!formData.category.trim()) {
      setFormError('La categoria es requerida');
      return false;
    }
    // Validar que el código sea numérico
    if (!/^\d+$/.test(formData.code.trim())) {
      setFormError('El codigo debe contener solo numeros');
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

      const dataToSend = {
        code: formData.code.trim(),
        category: formData.category.trim(),
        description: formData.description.trim() || null,
        applies_to: formData.applies_to
      };

      if (modalMode === 'create') {
        await createKoajCode(dataToSend);
        setSuccess('Codigo creado exitosamente');
      } else if (modalMode === 'edit') {
        await updateKoajCode(selectedCode.id, dataToSend);
        setSuccess('Codigo actualizado exitosamente');
      }

      closeModal();
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error al procesar la solicitud');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (code) => {
    if (!window.confirm(`¿Desea eliminar el codigo ${code.code} - ${code.category}?`)) {
      return;
    }

    try {
      await deleteKoajCode(code.id);
      setSuccess('Codigo eliminado exitosamente');
      loadData();
    } catch (err) {
      setError(err.message || 'Error al eliminar codigo');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-7 h-7 text-blue-600" />
            Codigos y Precios KOAJ
          </h1>
          <p className="text-gray-600 mt-1">
            Guia de lectura de codigos de barras y catalogo de categorias
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          {userIsAdmin && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Codigo
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-3 text-gray-600">Cargando informacion...</p>
        </div>
      ) : (
        <>
          {/* Guía de lectura de códigos - Colapsable */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Como leer el codigo de barras
                  </h2>
                  <p className="text-sm text-gray-500">
                    Estructura y ejemplos de interpretacion
                  </p>
                </div>
              </div>
              {showGuide ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showGuide && guide && (
              <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                {/* Estructura del código */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Estructura del codigo:
                  </h3>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                    <code className="text-lg font-mono font-bold text-blue-800">
                      {guide.structure}
                    </code>
                  </div>
                </div>

                {/* Ejemplo */}
                {guide.example && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Ejemplo:
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="font-mono text-xl font-bold text-gray-900 tracking-wider">
                        {guide.example.barcode}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <span className="text-xs text-gray-500 uppercase">Prefijo</span>
                          <p className="font-semibold text-gray-900">{guide.example.breakdown.prefix}</p>
                          <p className="text-xs text-gray-600">{guide.example.interpretation.prefix}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <span className="text-xs text-blue-600 uppercase">Genero</span>
                          <p className="font-semibold text-blue-900">{guide.example.breakdown.gender}</p>
                          <p className="text-xs text-blue-700">{guide.example.interpretation.gender}</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                          <span className="text-xs text-purple-600 uppercase">Categoria</span>
                          <p className="font-semibold text-purple-900">{guide.example.breakdown.category_code}</p>
                          <p className="text-xs text-purple-700">{guide.example.interpretation.category}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <span className="text-xs text-green-600 uppercase">Precio</span>
                          <p className="font-semibold text-green-900">{guide.example.breakdown.price}</p>
                          <p className="text-xs text-green-700">{guide.example.interpretation.price}</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                          <span className="text-xs text-orange-600 uppercase">Talla</span>
                          <p className="font-semibold text-orange-900">{guide.example.breakdown.size}</p>
                          <p className="text-xs text-orange-700">{guide.example.interpretation.size}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prefijos y Tallas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Prefijos de género */}
                  {guide.gender_prefixes && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Prefijos de Genero
                      </h3>
                      <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                        {guide.gender_prefixes.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3">
                            <span className="font-mono font-bold text-gray-900">{item.code}</span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              genderColors[item.gender.toLowerCase()] || genderColors['todos']
                            }`}>
                              {item.gender}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Códigos de tallas */}
                  {guide.size_codes && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Codigos de Tallas
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {guide.size_codes.map((item, index) => (
                            <div key={index} className="bg-white rounded-lg p-2 text-center border border-gray-200">
                              <span className="font-mono font-bold text-gray-900 text-sm">{item.code}</span>
                              <span className="text-gray-400 mx-1">=</span>
                              <span className="text-xs text-gray-600">{item.size}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notas */}
                {guide.notes && guide.notes.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Notas importantes:</h3>
                    <ul className="space-y-2">
                      {guide.notes.map((note, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-blue-500 mt-0.5">•</span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabla de códigos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Filtros */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Búsqueda */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por codigo o categoria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Filtro por género */}
                <div className="sm:w-48">
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="todos">Todos los generos</option>
                    <option value="hombre">Hombre</option>
                    <option value="mujer">Mujer</option>
                    <option value="niño">Nino</option>
                    <option value="niña">Nina</option>
                  </select>
                </div>
              </div>

              {/* Contador de resultados */}
              <div className="mt-3 text-sm text-gray-500">
                Mostrando {filteredCodes.length} de {codes.length} codigos
              </div>
            </div>

            {/* Tabla */}
            {filteredCodes.length === 0 ? (
              <div className="p-12 text-center">
                <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No se encontraron codigos con los filtros aplicados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                        Codigo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                        Aplica a
                      </th>
                      {userIsAdmin && (
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                          Acciones
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCodes.map((code) => (
                      <tr key={code.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-lg text-blue-600">
                            {code.code}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">
                            {code.category}
                          </span>
                          {code.description && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {code.description}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            genderColors[code.applies_to] || genderColors['todos']
                          }`}>
                            {genderLabels[code.applies_to] || code.applies_to}
                          </span>
                        </td>
                        {userIsAdmin && (
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(code)}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(code)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal CRUD */}
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
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-600" />
                  {modalMode === 'create' ? 'Crear Nuevo Codigo' : 'Editar Codigo'}
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
                  {/* Código */}
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                      Codigo *
                    </label>
                    <input
                      type="text"
                      id="code"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                      placeholder="Ej: 42"
                      maxLength={10}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Solo numeros (maximo 10 digitos)
                    </p>
                  </div>

                  {/* Categoría */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria *
                    </label>
                    <input
                      type="text"
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Ej: Bermudas"
                      maxLength={100}
                    />
                  </div>

                  {/* Descripción */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Descripcion (opcional)
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                      placeholder="Descripcion adicional del codigo..."
                    />
                  </div>

                  {/* Aplica a */}
                  <div>
                    <label htmlFor="applies_to" className="block text-sm font-medium text-gray-700 mb-1">
                      Aplica a
                    </label>
                    <select
                      id="applies_to"
                      name="applies_to"
                      value={formData.applies_to}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="todos">Todos</option>
                      <option value="hombre">Hombre</option>
                      <option value="mujer">Mujer</option>
                      <option value="niño">Nino</option>
                      <option value="niña">Nina</option>
                    </select>
                  </div>
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
                    {modalMode === 'create' ? 'Crear Codigo' : 'Guardar Cambios'}
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

export default KoajCodes;

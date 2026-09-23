import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import { useAuth } from '../contexts/AuthContext';
import { loginSchema } from '../utils/validationSchemas';
import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import BrandMark from './common/BrandMark';
import { experience, usePublishSceneData } from '../experience/store';

const Login = () => {
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [retryInfo, setRetryInfo] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Establecer título de la página
  useDocumentTitle('Iniciar Sesión');

  // --- Solo presentación (escena WebGL) ----------------------------------
  // Ambiente oscuro mientras se está en el login
  useEffect(() => {
    document.documentElement.classList.add('theme-login');
    return () => document.documentElement.classList.remove('theme-login');
  }, []);
  // Mientras conecta, la palabra "respira"; ante un error, retrocede y se rearma
  usePublishSceneData('loginBusy', Boolean(retryInfo));
  useEffect(() => {
    if (serverError) experience.data.loginErrorSeq = (experience.data.loginErrorSeq || 0) + 1;
  }, [serverError]);

  const handleSubmit = async (values, { setSubmitting }) => {
    setServerError('');
    setRetryInfo(null);

    try {
      const result = await login(values.email, values.password, (info) => {
        setRetryInfo(info);
      });

      if (result.success) {
        navigate('/');
      } else {
        setServerError(result.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      setServerError('Error al iniciar sesión. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
      setRetryInfo(null);
    }
  };

  const fieldClass = (hasError) =>
    `block w-full h-12 px-4 rounded-xl border bg-white text-gray-900 placeholder:text-gray-300 outline-none focus:ring-4 disabled:bg-gray-50 ${
      hasError
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
        : 'border-gray-200 hover:border-gray-300 focus:border-gray-900 focus:ring-gray-900/10'
    }`;

  return (
    <div className="min-h-[100dvh] flex flex-col lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Panel de marca: transparente, la escena WebGL se dibuja detrás
          (fondo oscuro del body vía .theme-login) */}
      <aside className="relative overflow-hidden text-white px-6 pt-8 pb-8 sm:px-10 lg:px-14 lg:py-14 flex flex-col lg:min-h-[100dvh]">
        {/* Rayado de libro de caja: textura sutil, sin imágenes */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 39px, #ffffff 39px 40px)' }}
        />
        <p className="relative text-sm text-gray-400">Puerto Carreño</p>

        {/* Ancla de la escena: aquí las partículas forman la palabra KOAJ.
            Sin WebGL (o antes de que cargue) se ve la marca en DOM. */}
        <div
          data-scene-anchor="login-mark"
          className="relative flex-1 min-h-[22dvh] sm:min-h-[26dvh] my-6 lg:my-10 flex items-center justify-center"
        >
          <BrandMark size="lg" inverted className="scene-fallback" />
        </div>

        <div className="relative animate-rise">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.02] tracking-tight">
            Cierre de caja
          </h1>
          <p className="mt-3 max-w-sm text-base sm:text-lg text-gray-400 leading-relaxed">
            Sistema de Cierre de Caja y Arqueo Diario, conciliado con Alegra.
          </p>
        </div>

        <p className="relative hidden lg:block mt-10 text-xs text-gray-400">Sistema de Gestión de Cierre de Caja v5.0</p>
      </aside>

      {/* Formulario */}
      <main className="flex-1 bg-paper flex items-start lg:items-center justify-center px-5 sm:px-10 py-10 lg:py-14 lg:rounded-l-[2rem] lg:shadow-2xl">
        <div className="w-full max-w-sm animate-rise" style={{ '--i': 1 }}>
          <h2 className="text-2xl font-bold text-gray-900">Iniciar sesión</h2>
          <p className="mt-1.5 text-sm text-gray-500">Inicia sesión para acceder al sistema.</p>

          {/* Server Error Message */}
          {serverError && (
            <div role="alert" className="mt-6 bg-red-50 ring-1 ring-red-200 rounded-xl p-3.5 flex items-start gap-3 animate-fade-in-scale">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-px" />
              <p className="text-sm text-red-800">{serverError}</p>
            </div>
          )}

          {/* Retry Info Message */}
          {retryInfo && (
            <div role="status" className="mt-6 bg-white ring-1 ring-gray-900/[0.06] rounded-xl p-4 animate-fade-in-scale">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-px"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{retryInfo.message}</p>
                  {retryInfo.isWaiting && (
                    <p className="text-xs text-gray-500 mt-1">
                      Esto puede tardar hasta un minuto la primera vez del día. No cierres esta ventana.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full w-full bg-gray-900 rounded-full origin-left transition-transform duration-500 ease-out"
                  style={{ transform: `scaleX(${Math.min(1, retryInfo.attempt / retryInfo.maxAttempts)})` }}
                ></div>
              </div>
            </div>
          )}

          {/* Formik Form */}
          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={loginSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, isSubmitting, isValid, dirty }) => (
              <Form className="mt-8 space-y-5">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <Field
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    spellCheck={false}
                    className={fieldClass(errors.email && touched.email)}
                    placeholder="usuario@ejemplo.com"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.email && touched.email)}
                    aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
                  />
                  {errors.email && touched.email && (
                    <p id="email-error" className="mt-1.5 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Field
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className={`${fieldClass(errors.password && touched.password)} pr-12`}
                      placeholder="Mínimo 8 caracteres"
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.password && touched.password)}
                      aria-describedby={errors.password && touched.password ? 'password-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                      disabled={isSubmitting}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && touched.password && (
                    <p id="password-error" className="mt-1.5 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || (!isValid && dirty)}
                  className="w-full h-12 !mt-7 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Iniciando sesión…
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Iniciar sesión
                    </>
                  )}
                </button>
              </Form>
            )}
          </Formik>

          <p className="mt-10 text-xs text-gray-400 lg:hidden">Sistema de Gestión de Cierre de Caja v5.0</p>
        </div>
      </main>
    </div>
  );
};

export default Login;

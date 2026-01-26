import * as Yup from 'yup';

/**
 * Schema de validación para login
 */
export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Formato de email inválido')
    .required('El email es requerido')
    .max(255, 'El email no puede exceder 255 caracteres'),
  password: Yup.string()
    .required('La contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres'),
});

/**
 * Schema de validación para crear usuario
 */
export const createUserSchema = Yup.object().shape({
  email: Yup.string()
    .email('Formato de email inválido')
    .required('El email es requerido')
    .max(255, 'El email no puede exceder 255 caracteres'),
  password: Yup.string()
    .required('La contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .matches(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
    .matches(/[a-z]/, 'La contraseña debe contener al menos una minúscula')
    .matches(/\d/, 'La contraseña debe contener al menos un número'),
  name: Yup.string()
    .required('El nombre es requerido')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  role: Yup.string()
    .required('El rol es requerido')
    .oneOf(['admin', 'sales'], 'Rol inválido'),
});

/**
 * Schema de validación para editar usuario
 */
export const updateUserSchema = Yup.object().shape({
  email: Yup.string()
    .email('Formato de email inválido')
    .max(255, 'El email no puede exceder 255 caracteres'),
  name: Yup.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  role: Yup.string()
    .oneOf(['admin', 'sales'], 'Rol inválido'),
  is_active: Yup.boolean(),
});

/**
 * Schema de validación para cambiar contraseña
 */
export const changePasswordSchema = Yup.object().shape({
  currentPassword: Yup.string()
    .required('La contraseña actual es requerida'),
  newPassword: Yup.string()
    .required('La nueva contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .matches(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
    .matches(/[a-z]/, 'La contraseña debe contener al menos una minúscula')
    .matches(/\d/, 'La contraseña debe contener al menos un número'),
  confirmPassword: Yup.string()
    .required('Confirme la nueva contraseña')
    .oneOf([Yup.ref('newPassword')], 'Las contraseñas no coinciden'),
});

/**
 * Schema de validación para resetear contraseña
 */
export const resetPasswordSchema = Yup.object().shape({
  newPassword: Yup.string()
    .required('La nueva contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .matches(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
    .matches(/[a-z]/, 'La contraseña debe contener al menos una minúscula')
    .matches(/\d/, 'La contraseña debe contener al menos un número'),
});

/**
 * Schema de validación para cierre de caja
 */
export const cashClosingSchema = Yup.object().shape({
  date: Yup.date()
    .required('La fecha es requerida')
    .max(new Date(), 'La fecha no puede ser futura'),
  base_objetivo: Yup.number()
    .nullable()
    .min(1, 'La base objetivo debe ser mayor a 0'),
  excedente: Yup.number()
    .min(0, 'El excedente no puede ser negativo'),
  gastos_operativos: Yup.number()
    .min(0, 'Los gastos operativos no pueden ser negativos'),
  prestamos: Yup.number()
    .min(0, 'Los préstamos no pueden ser negativos'),
});

/**
 * Schema de validación para rangos de fechas
 */
export const dateRangeSchema = Yup.object().shape({
  startDate: Yup.date()
    .required('La fecha de inicio es requerida')
    .max(new Date(), 'La fecha de inicio no puede ser futura'),
  endDate: Yup.date()
    .required('La fecha de fin es requerida')
    .max(new Date(), 'La fecha de fin no puede ser futura')
    .min(
      Yup.ref('startDate'),
      'La fecha de fin debe ser posterior a la fecha de inicio'
    ),
});

/**
 * Función helper para validar un valor individual
 * @param {Yup.Schema} schema - Schema de Yup
 * @param {any} value - Valor a validar
 * @returns {Promise<{isValid: boolean, error?: string}>}
 */
export const validateField = async (schema, value) => {
  try {
    await schema.validate(value);
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
};

/**
 * Función helper para validar un objeto completo
 * @param {Yup.Schema} schema - Schema de Yup
 * @param {object} values - Objeto a validar
 * @returns {Promise<{isValid: boolean, errors?: object}>}
 */
export const validateForm = async (schema, values) => {
  try {
    await schema.validate(values, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    const errors = {};
    if (error.inner) {
      error.inner.forEach((err) => {
        if (!errors[err.path]) {
          errors[err.path] = err.message;
        }
      });
    }
    return { isValid: false, errors };
  }
};

export default {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  resetPasswordSchema,
  cashClosingSchema,
  dateRangeSchema,
  validateField,
  validateForm,
};

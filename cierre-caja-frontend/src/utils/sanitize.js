import DOMPurify from 'dompurify';

/**
 * Sanitiza texto para prevenir ataques XSS
 * @param {string} input - El texto a sanitizar
 * @returns {string} - Texto limpio y seguro
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }

  // Configuración estricta de DOMPurify
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No permitir ningún tag HTML
    ALLOWED_ATTR: [], // No permitir ningún atributo
    KEEP_CONTENT: true, // Mantener el contenido de texto
  }).trim();
};

/**
 * Sanitiza email
 * @param {string} email - Email a sanitizar
 * @returns {string} - Email limpio
 */
export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') {
    return '';
  }

  return email
    .trim()
    .toLowerCase()
    .replace(/[<>\"';()]/g, ''); // Remover caracteres peligrosos
};

/**
 * Sanitiza números
 * @param {string|number} input - Número a sanitizar
 * @returns {string} - Número como string limpio
 */
export const sanitizeNumber = (input) => {
  const numStr = String(input);
  return numStr.replace(/[^0-9.-]/g, '');
};

/**
 * Sanitiza HTML de forma segura para renderizado
 * @param {string} html - HTML a sanitizar
 * @returns {string} - HTML seguro
 */
export const sanitizeHTML = (html) => {
  if (typeof html !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'p', 'br'],
    ALLOWED_ATTR: ['class'],
  });
};

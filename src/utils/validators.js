import validator from 'validator';
import DOMPurify from 'dompurify';

/**
 * Sanitize text input with max length
 * @param {string} input - Raw text input
 * @param {number} maxLength - Maximum allowed length (default: 500)
 * @returns {string} Sanitized text
 */
export const sanitizeText = (input, maxLength = 500) => {
  if (!input || typeof input !== 'string') return '';

  // Remove any HTML tags
  const cleaned = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });

  // Trim whitespace and limit length
  return validator.trim(cleaned).substring(0, maxLength);
};

/**
 * Validate and sanitize email
 * @param {string} email - Email address to validate
 * @returns {string|null} Sanitized email or null if invalid
 */
export const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null;

  const normalized = validator.normalizeEmail(email, {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false
  });

  if (!normalized || !validator.isEmail(normalized)) {
    return null;
  }

  return normalized.toLowerCase();
};

/**
 * Sanitize phone number
 * @param {string} phone - Phone number
 * @returns {string} Cleaned phone number (digits and + only)
 */
export const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';

  // Keep only digits, +, spaces, hyphens, and parentheses
  const cleaned = phone.replace(/[^\d\+\s\-\(\)]/g, '');

  return validator.trim(cleaned).substring(0, 20);
};

/**
 * Validate and sanitize URL
 * @param {string} url - URL to validate
 * @returns {string|null} Sanitized URL or null if invalid
 */
export const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  const trimmed = validator.trim(url);

  // Check if it's a valid URL
  if (!validator.isURL(trimmed, {
    protocols: ['http', 'https'],
    require_protocol: false,
    require_valid_protocol: true,
    allow_underscores: true
  })) {
    return null;
  }

  // Add https:// if no protocol
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }

  return trimmed;
};

/**
 * Validate and sanitize numeric input
 * @param {any} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number|null} Valid number or null
 */
export const sanitizeNumber = (value, min = null, max = null) => {
  const num = Number(value);

  if (!Number.isFinite(num)) return null;

  if (min !== null && num < min) return min;
  if (max !== null && num > max) return max;

  return num;
};

/**
 * Sanitize notes/description fields (allows no HTML for security)
 * @param {string} input - Raw text input
 * @param {number} maxLength - Maximum allowed length (default: 5000)
 * @returns {string} Sanitized text
 */
export const sanitizeNotes = (input, maxLength = 5000) => {
  if (!input || typeof input !== 'string') return '';

  // Strip all HTML tags completely
  const cleaned = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });

  return validator.trim(cleaned).substring(0, maxLength);
};

/**
 * Validate academy ID format
 * @param {string} academyId - Academy ID to validate
 * @returns {boolean} True if valid
 */
export const isValidAcademyId = (academyId) => {
  if (!academyId || typeof academyId !== 'string') return false;

  // Firebase document IDs: alphanumeric and length constraints
  return validator.isAlphanumeric(academyId, 'en-US', { ignore: '_-' })
    && academyId.length >= 10
    && academyId.length <= 100;
};

/**
 * Sanitize filename for upload
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export const sanitizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return 'unnamed';

  // Get extension
  const parts = filename.split('.');
  const ext = parts.length > 1 ? parts.pop() : '';
  const name = parts.join('.');

  // Remove special characters, keep only alphanumeric, dash, underscore
  const cleanName = name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);

  // Validate extension (whitelist common safe extensions)
  const safeExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];
  const cleanExt = ext.toLowerCase();

  if (!safeExtensions.includes(cleanExt)) {
    return `${cleanName}.txt`; // Default to text if unknown extension
  }

  return `${cleanName}.${cleanExt}`;
};

/**
 * Validate file type using magic bytes (file signature)
 * @param {ArrayBuffer} buffer - File buffer
 * @param {string} expectedType - Expected MIME type
 * @returns {boolean} True if file type matches
 */
export const validateFileType = (buffer, expectedType) => {
  if (!buffer || !(buffer instanceof ArrayBuffer)) return false;

  const uint = new Uint8Array(buffer.slice(0, 4));
  const bytes = [];
  uint.forEach((byte) => {
    bytes.push(byte.toString(16).padStart(2, '0'));
  });
  const hex = bytes.join('').toUpperCase();

  // Magic bytes for common file types
  const signatures = {
    'image/jpeg': ['FFD8FFE0', 'FFD8FFE1', 'FFD8FFE2', 'FFD8FFE3', 'FFD8FFE8'],
    'image/png': ['89504E47'],
    'image/gif': ['47494638'],
    'application/pdf': ['25504446'],
  };

  if (signatures[expectedType]) {
    return signatures[expectedType].some(sig => hex.startsWith(sig));
  }

  // If we don't have signature for this type, reject for security
  return false;
};

/**
 * Sanitize currency value
 * @param {any} value - Currency value
 * @returns {number} Valid currency amount (0 or positive)
 */
export const sanitizeCurrency = (value) => {
  const num = sanitizeNumber(value, 0);
  if (num === null) return 0;

  // Round to 2 decimal places
  return Math.round(num * 100) / 100;
};

/**
 * Validate localStorage data before use
 * @param {string} key - localStorage key
 * @param {Function} validator - Validation function
 * @returns {any|null} Validated data or null
 */
export const getValidatedLocalStorage = (key, validatorFn) => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;

    return validatorFn(value) ? value : null;
  } catch (err) {
    console.error('localStorage validation error:', err);
    return null;
  }
};

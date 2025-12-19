/**
 * Formatting utilities for dates, currency, numbers, etc.
 * Centralizes all formatting logic to avoid duplication
 */

import { DEFAULT_CURRENCY } from '../config/constants';

// ==================== DATE FORMATTING ====================

/**
 * Safely convert various date formats to JavaScript Date object
 * Handles Firestore timestamps, ISO strings, and Date objects
 * @param {*} d - Date in various formats
 * @returns {Date|null}
 */
export const toDateSafe = (d) => {
  if (!d) return null;

  // Already a Date object
  if (d instanceof Date) {
    return isNaN(d.getTime()) ? null : d;
  }

  // Firestore Timestamp (has seconds property)
  if (d?.seconds) {
    return new Date(d.seconds * 1000);
  }

  // String or number
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Format date to short format (MM/DD/YYYY)
 * @param {*} date - Date to format
 * @returns {string}
 */
export const formatDateShort = (date) => {
  const d = toDateSafe(date);
  if (!d) return 'N/A';

  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();

  return `${month}/${day}/${year}`;
};

/**
 * Format date to long format (Month DD, YYYY)
 * @param {*} date - Date to format
 * @returns {string}
 */
export const formatDateLong = (date) => {
  const d = toDateSafe(date);
  if (!d) return 'N/A';

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format date with time (MM/DD/YYYY HH:MM)
 * @param {*} date - Date to format
 * @returns {string}
 */
export const formatDateTime = (date) => {
  const d = toDateSafe(date);
  if (!d) return 'N/A';

  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format date to ISO string (YYYY-MM-DD)
 * @param {*} date - Date to format
 * @returns {string}
 */
export const formatDateISO = (date) => {
  const d = toDateSafe(date);
  if (!d) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Get relative time (e.g., "2 days ago", "in 3 hours")
 * @param {*} date - Date to format
 * @returns {string}
 */
export const formatRelativeTime = (date) => {
  const d = toDateSafe(date);
  if (!d) return 'N/A';

  const now = new Date();
  const diffMs = now - d;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return formatDateShort(d);
};

/**
 * Calculate age from birthdate
 * @param {*} birthdate - Birth date
 * @returns {number|null}
 */
export const calculateAge = (birthdate) => {
  const d = toDateSafe(birthdate);
  if (!d) return null;

  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const monthDiff = today.getMonth() - d.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) {
    age--;
  }

  return age;
};

// ==================== CURRENCY FORMATTING ====================

/**
 * Format number as currency
 * @param {number} value - Value to format
 * @param {string} currency - Currency code (default: USD)
 * @param {string} locale - Locale for formatting (default: undefined = user's locale)
 * @returns {string}
 */
export const formatCurrency = (value, currency = DEFAULT_CURRENCY, locale = undefined) => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || DEFAULT_CURRENCY
    }).format(value || 0);
  } catch (error) {
    // Fallback if currency code is invalid
    console.warn('Currency formatting error:', error);
    return `${currency || '$'}${Number(value || 0).toFixed(2)}`;
  }
};

/**
 * Format number as currency with academy settings
 * @param {number} value - Value to format
 * @param {Object} academy - Academy object with currency setting
 * @returns {string}
 */
export const formatAcademyCurrency = (value, academy) => {
  const currency = academy?.currency || DEFAULT_CURRENCY;
  return formatCurrency(value, currency);
};

// ==================== NUMBER FORMATTING ====================

/**
 * Format number with thousand separators
 * @param {number} value - Value to format
 * @returns {string}
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat().format(value);
};

/**
 * Format number as percentage
 * @param {number} value - Value to format (0-100)
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string}
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
};

/**
 * Format decimal as percentage (0-1 to 0%-100%)
 * @param {number} value - Decimal value (0-1)
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string}
 */
export const formatDecimalAsPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0%';
  return formatPercentage(value * 100, decimals);
};

/**
 * Format file size (bytes to human readable)
 * @param {number} bytes - File size in bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// ==================== PHONE FORMATTING ====================

/**
 * Format phone number (basic US format)
 * @param {string} phone - Phone number
 * @returns {string}
 */
export const formatPhone = (phone) => {
  if (!phone) return '';

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phone; // Return as-is if not standard length
};

// ==================== NAME FORMATTING ====================

/**
 * Format name to title case
 * @param {string} name - Name to format
 * @returns {string}
 */
export const formatName = (name) => {
  if (!name) return '';

  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string}
 */
export const getInitials = (name) => {
  if (!name) return '';

  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Format full name from first and last name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string}
 */
export const formatFullName = (firstName, lastName) => {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.join(' ');
};

// ==================== EMAIL FORMATTING ====================

/**
 * Mask email for privacy (e.g., j***@example.com)
 * @param {string} email - Email to mask
 * @returns {string}
 */
export const maskEmail = (email) => {
  if (!email) return '';

  const [localPart, domain] = email.split('@');
  if (!domain) return email;

  const visibleChars = Math.min(1, localPart.length);
  const masked = localPart.charAt(0) + '*'.repeat(localPart.length - visibleChars);

  return `${masked}@${domain}`;
};

// ==================== TEXT FORMATTING ====================

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string}
 */
export const truncateText = (text, maxLength, suffix = '...') => {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  return text.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * Pluralize word based on count
 * @param {number} count - Count
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional, defaults to singular + 's')
 * @returns {string}
 */
export const pluralize = (count, singular, plural = null) => {
  if (count === 1) return singular;
  return plural || `${singular}s`;
};

/**
 * Format count with label (e.g., "5 players", "1 player")
 * @param {number} count - Count
 * @param {string} singular - Singular label
 * @param {string} plural - Plural label (optional)
 * @returns {string}
 */
export const formatCountLabel = (count, singular, plural = null) => {
  return `${formatNumber(count)} ${pluralize(count, singular, plural)}`;
};

// ==================== STATUS FORMATTING ====================

/**
 * Format payment status for display
 * @param {string} status - Payment status
 * @returns {string}
 */
export const formatPaymentStatus = (status) => {
  const statusMap = {
    'pending': 'Pending',
    'paid': 'Paid',
    'overdue': 'Overdue',
    'cancelled': 'Cancelled',
    'refunded': 'Refunded'
  };

  return statusMap[status] || status;
};

/**
 * Get status color class
 * @param {string} status - Status
 * @returns {string}
 */
export const getStatusColorClass = (status) => {
  const colorMap = {
    'pending': 'status-pending',
    'paid': 'status-paid',
    'overdue': 'status-overdue',
    'cancelled': 'status-cancelled',
    'refunded': 'status-refunded',
    'active': 'status-active',
    'inactive': 'status-inactive'
  };

  return colorMap[status] || 'status-default';
};

// ==================== BILLING FREQUENCY ====================

/**
 * Format billing frequency for display
 * @param {string} frequency - Billing frequency
 * @returns {string}
 */
export const formatBillingFrequency = (frequency) => {
  const frequencyMap = {
    'monthly': 'Monthly',
    'quarterly': 'Quarterly',
    'semi-annual': 'Semi-Annual',
    'annual': 'Annual',
    'one-time': 'One-Time'
  };

  return frequencyMap[frequency] || frequency;
};

/**
 * Application-wide constants
 * Centralizes all hardcoded values for easier maintenance and configuration
 */

// ==================== USER ROLES & PERMISSIONS ====================

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member'
};

export const VALID_ROLES = [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER];

export const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: {
    canEditSettings: true,
    canManageTeam: true,
    canDeleteAcademy: true,
    canViewFinances: true,
    canManagePlayers: true,
    canManagePlans: true
  },
  [ROLES.ADMIN]: {
    canEditSettings: true,
    canManageTeam: true,
    canDeleteAcademy: false,
    canViewFinances: true,
    canManagePlayers: true,
    canManagePlans: true
  },
  [ROLES.MEMBER]: {
    canEditSettings: false,
    canManageTeam: false,
    canDeleteAcademy: false,
    canViewFinances: false,
    canManagePlayers: true,
    canManagePlans: false
  }
};

// ==================== ACADEMY CONFIGURATION ====================

export const ACADEMY_CATEGORIES = [
  'Soccer',
  'Basketball',
  'Tennis',
  'Volleyball',
  'Baseball',
  'Swimming',
  'Martial Arts',
  'Dance',
  'Gymnastics',
  'Other'
];

export const DEFAULT_LABELS = {
  STUDENT_SINGULAR: 'Student',
  STUDENT_PLURAL: 'Students',
  TUTOR_SINGULAR: 'Tutor',
  TUTOR_PLURAL: 'Tutors',
  GROUP_SINGULAR: 'Group',
  GROUP_PLURAL: 'Groups',
  CLASS_SINGULAR: 'Class',
  CLASS_PLURAL: 'Classes',
  LOCATION_SINGULAR: 'Location',
  LOCATION_PLURAL: 'Locations'
};

export const DEFAULT_CURRENCY = 'USD';

// ==================== FILE UPLOAD LIMITS ====================

export const FILE_UPLOAD = {
  // Image files
  MAX_IMAGE_SIZE: 2 * 1024 * 1024, // 2MB
  MAX_IMAGE_WIDTH: 3000,
  MAX_IMAGE_HEIGHT: 3000,
  MIN_IMAGE_SIZE: 100, // 100 bytes

  // Document files
  MAX_DOCUMENT_SIZE: 5 * 1024 * 1024, // 5MB

  // Allowed extensions
  ALLOWED_IMAGE_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  ALLOWED_DOCUMENT_EXTENSIONS: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'],

  // Combined
  get ALLOWED_EXTENSIONS() {
    return [...this.ALLOWED_IMAGE_EXTENSIONS, ...this.ALLOWED_DOCUMENT_EXTENSIONS];
  },

  // MIME types
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
};

// ==================== EXTERNAL APIs ====================

export const EXTERNAL_APIS = {
  CURRENCY: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json',
  COUNTRIES: 'https://restcountries.com/v3.1/all?fields=name,cca2'
};

// ==================== FIRESTORE COLLECTIONS ====================

export const COLLECTIONS = {
  ACADEMIES: 'academies',
  USERS: 'users',
  MEMBERSHIPS: 'memberships',
  INVITATIONS: 'invites', // Keeping 'invites' (matches existing Firestore collection)

  // Academy subcollections (use with getAcademyCollection helper)
  PLAYERS: 'players',
  TUTORS: 'tutors',
  GROUPS: 'groups',
  CLASSES: 'classes',
  TIERS: 'tiers',
  PRODUCTS: 'products',
  TRIALS: 'trials',
  MEMBERS: 'members',
  PAYMENTS: 'payments',
  SUBSCRIPTIONS: 'subscriptions',
  LOCATIONS: 'locations'
};

// ==================== PAYMENT & BILLING ====================

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

export const BILLING_FREQUENCY = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  SEMI_ANNUAL: 'semi-annual',
  ANNUAL: 'annual',
  ONE_TIME: 'one-time'
};

// ==================== UI CONFIGURATION ====================

export const SIDEBAR_WIDTH = {
  EXPANDED: '240px',
  COLLAPSED: '60px'
};

export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  INFO: 4000
};

export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1440
};

// ==================== DATE & TIME ====================

export const DATE_FORMATS = {
  SHORT: 'MM/DD/YYYY',
  LONG: 'MMMM DD, YYYY',
  WITH_TIME: 'MM/DD/YYYY HH:mm',
  ISO: 'YYYY-MM-DD'
};

// ==================== VALIDATION RULES ====================

export const VALIDATION = {
  EMAIL_MAX_LENGTH: 254,
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  PHONE_MIN_LENGTH: 7,
  PHONE_MAX_LENGTH: 20,
  ACADEMY_NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500
};

// ==================== DEFAULT VALUES ====================

export const DEFAULTS = {
  PAGINATION_LIMIT: 50,
  SEARCH_DEBOUNCE: 300, // milliseconds
  RETRY_ATTEMPTS: 3,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

// ==================== FEATURE FLAGS ====================

export const FEATURES = {
  ENABLE_TRIALS: true,
  ENABLE_CLASSES: true,
  ENABLE_ATTENDANCE: true,
  ENABLE_NOTIFICATIONS: false, // Not implemented yet
  ENABLE_ANALYTICS: true
};

// ==================== ERROR MESSAGES ====================

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  INVALID_INPUT: 'Invalid input. Please check your data.',
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed.',
  INVALID_FILE_TYPE: 'Invalid file type.',
  GENERIC_ERROR: 'An error occurred. Please try again.'
};

// ==================== IMAGE COMPRESSION ====================

/**
 * Image compression settings for different sizes
 * Used when uploading player photos and other images
 */
export const IMAGE_COMPRESSION = {
  THUMBNAIL: {
    maxWidthOrHeight: 72,
    quality: 0.8, // Lower quality for small thumbnails
    fileType: 'image/jpeg',
    useWebWorker: true
  },
  MEDIUM: {
    maxWidthOrHeight: 200,
    quality: 0.85, // Medium quality for previews
    fileType: 'image/jpeg',
    useWebWorker: true
  },
  ORIGINAL: {
    maxWidthOrHeight: 800,
    quality: 0.9, // High quality for main images
    fileType: 'image/jpeg',
    useWebWorker: true
  }
};

// Image size suffixes for filenames
export const IMAGE_SIZE_SUFFIXES = {
  THUMBNAIL: '_thumb',
  MEDIUM: '_medium',
  ORIGINAL: ''
};

// ==================== FIREBASE STORAGE PATHS ====================

/**
 * Helper functions to generate consistent Firebase Storage paths
 * Ensures all file uploads follow the same naming convention
 */
export const STORAGE_PATHS = {
  /**
   * Generate path for player photos
   * @param {string} academyId - Academy ID
   * @param {string} timestamp - Timestamp for uniqueness
   * @param {string} filename - Base filename (sanitized)
   * @param {string} size - 'thumbnail', 'medium', or 'original'
   * @returns {string} Storage path
   */
  playerPhoto: (academyId, timestamp, filename, size = 'original') => {
    const suffix = IMAGE_SIZE_SUFFIXES[size.toUpperCase()] || '';
    return `academies/${academyId}/player_photos/${timestamp}_${filename}${suffix}.jpg`;
  },

  /**
   * Generate path for academy branding logo
   * @param {string} academyId - Academy ID
   * @param {string} timestamp - Timestamp for uniqueness
   * @param {string} filename - Original filename (sanitized)
   * @returns {string} Storage path
   */
  brandingLogo: (academyId, timestamp, filename) => {
    return `academies/${academyId}/branding/logo_${timestamp}_${filename}`;
  },

  /**
   * Generate path for payment receipts
   * @param {string} academyId - Academy ID
   * @param {string} studentId - Student/Player ID
   * @param {string} timestamp - Timestamp for uniqueness
   * @param {string} filename - Original filename (sanitized)
   * @returns {string} Storage path
   */
  paymentReceipt: (academyId, studentId, timestamp, filename) => {
    return `academies/${academyId}/payment_receipts/${studentId}/${timestamp}_${filename}`;
  }
};

// ==================== PAGINATION ====================

/**
 * Pagination settings for different data types
 */
export const PAGINATION = {
  PAYMENT_ITEMS_PER_PAGE: 10,
  PLAYERS_PER_PAGE: 20,
  GROUPS_PER_PAGE: 15,
  TIERS_PER_PAGE: 20,
  DEFAULT_PAGE_SIZE: 20
};

// ==================== CACHE DURATIONS ====================

/**
 * Cache duration settings for different data types
 * All values in milliseconds
 */
export const CACHE = {
  CURRENCY_CACHE_DURATION: 7 * 24 * 60 * 60 * 1000, // 1 week
  ACADEMY_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  USER_CACHE_DURATION: 10 * 60 * 1000, // 10 minutes
  REFERENCE_DATA_DURATION: 15 * 60 * 1000 // 15 minutes (for tiers, groups, etc.)
};

// ==================== LOCALIZATION ====================

/**
 * Default locale and helper to get browser locale
 */
export const DEFAULT_LOCALE = 'en-US';

/**
 * Get the appropriate locale, preferring browser locale
 * @returns {string} Locale string (e.g., 'en-US', 'es-ES')
 */
export const getDefaultLocale = () => {
  return navigator?.language || DEFAULT_LOCALE;
};

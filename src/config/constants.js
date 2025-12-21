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
  CLASS_PLURAL: 'Classes'
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
  SUBSCRIPTIONS: 'subscriptions'
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

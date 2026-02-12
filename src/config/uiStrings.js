/**
 * Centralized UI Strings
 * All user-facing text should use these constants for consistency and easier i18n in the future
 */

/**
 * Common action strings
 */
export const ACTIONS = {
  // Primary actions
  ADD: 'Add',
  EDIT: 'Edit',
  DELETE: 'Delete',
  SAVE: 'Save',
  CANCEL: 'Cancel',
  CLOSE: 'Close',

  // Navigation
  BACK: 'Back',
  NEXT: 'Next',
  CONTINUE: 'Continue',

  // Data operations
  SEARCH: 'Search',
  FILTER: 'Filter',
  SORT: 'Sort',
  DOWNLOAD: 'Download',
  EXPORT: 'Export',
  IMPORT: 'Import',
  UPLOAD: 'Upload',

  // Confirmation
  CONFIRM: 'Confirm',
  YES: 'Yes',
  NO: 'No',
  OK: 'OK',

  // State changes
  SUBMIT: 'Submit',
  CREATE: 'Create',
  UPDATE: 'Update',
  REMOVE: 'Remove',
  ARCHIVE: 'Archive',
  RESTORE: 'Restore',
};

/**
 * Loading and status messages
 */
export const STATUS = {
  LOADING: 'Loading...',
  SAVING: 'Saving...',
  UPLOADING: 'Uploading...',
  PROCESSING: 'Processing...',
  DELETING: 'Deleting...',

  SUCCESS: 'Success',
  ERROR: 'Error',
  WARNING: 'Warning',
  INFO: 'Info',

  NO_DATA: 'No data available',
  NO_RESULTS: 'No results found',
  EMPTY_STATE: 'Nothing here yet',
};

/**
 * Common navigation and UI elements
 */
export const NAVIGATION = {
  BACK_TO: (label) => `Back to ${label}`,
  ADD_NEW: (label) => `Add New ${label}`,
  EDIT_ITEM: (label) => `Edit ${label}`,
  DELETE_ITEM: (label) => `Delete ${label}`,
  VIEW_ALL: (label) => `View All ${label}`,

  HOME: 'Home',
  DASHBOARD: 'Dashboard',
  SETTINGS: 'Settings',
  PROFILE: 'Profile',
  LOGOUT: 'Logout',
};

/**
 * Common error messages
 */
export const ERRORS = {
  NOT_FOUND: (type) => `${type} not found`,
  PERMISSION_DENIED: (type) => `You don't have permission to edit this ${type.toLowerCase()}`,
  LOADING_FAILED: (type) => `Failed to load ${type.toLowerCase()}`,
  SAVE_FAILED: (type) => `Failed to save ${type.toLowerCase()}`,
  DELETE_FAILED: (type) => `Failed to delete ${type.toLowerCase()}`,

  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_PHONE: 'Invalid phone number',
  FILE_TOO_LARGE: 'File is too large',
  INVALID_FILE_TYPE: 'Invalid file type',

  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
};

/**
 * Success messages
 */
export const SUCCESS = {
  CREATED: (type) => `${type} created successfully`,
  UPDATED: (type) => `${type} updated successfully`,
  DELETED: (type) => `${type} deleted successfully`,
  SAVED: (type) => `${type} saved successfully`,
  UPLOADED: (type) => `${type} uploaded successfully`,

  GENERIC: 'Operation completed successfully',
};

/**
 * Confirmation messages
 */
export const CONFIRMATIONS = {
  DELETE: (type) => `Are you sure you want to delete this ${type.toLowerCase()}?`,
  DISCARD: 'Are you sure you want to discard your changes?',
  LEAVE_PAGE: 'You have unsaved changes. Are you sure you want to leave?',
  ARCHIVE: (type) => `Are you sure you want to archive this ${type.toLowerCase()}?`,
};

/**
 * Empty state messages
 */
export const EMPTY_STATES = {
  NO_ITEMS: (type) => `No ${type.toLowerCase()} created yet`,
  GET_STARTED: (action, type) => `Click "${action}" to get started`,

  NO_STUDENTS: 'No students registered yet',
  NO_GROUPS: 'No groups created yet',
  NO_PLANS: 'No plans created yet',
  NO_PAYMENTS: 'No payments recorded yet',
};

/**
 * Form labels
 */
export const FORM_LABELS = {
  NAME: 'Name',
  EMAIL: 'Email',
  PHONE: 'Phone',
  ADDRESS: 'Address',
  DESCRIPTION: 'Description',
  DATE: 'Date',
  TIME: 'Time',
  PRICE: 'Price',
  STATUS: 'Status',
  NOTES: 'Notes',

  FIRST_NAME: 'First Name',
  LAST_NAME: 'Last Name',
  BIRTHDAY: 'Birthday',
  AGE: 'Age',

  SEARCH_PLACEHOLDER: 'Search...',
};

/**
 * Common placeholders
 */
export const PLACEHOLDERS = {
  SEARCH: 'Search...',
  SELECT: 'Select...',
  ENTER: (field) => `Enter ${field.toLowerCase()}...`,
  CHOOSE: (field) => `Choose ${field.toLowerCase()}...`,
  TYPE_HERE: 'Type here...',
};

/**
 * Time and date related strings
 */
export const TIME = {
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  TOMORROW: 'Tomorrow',
  THIS_WEEK: 'This Week',
  THIS_MONTH: 'This Month',
  THIS_YEAR: 'This Year',

  DAYS_AGO: (n) => `${n} day${n !== 1 ? 's' : ''} ago`,
  HOURS_AGO: (n) => `${n} hour${n !== 1 ? 's' : ''} ago`,
  MINUTES_AGO: (n) => `${n} minute${n !== 1 ? 's' : ''} ago`,
};

/**
 * Pluralization helper
 */
export const pluralize = (count, singular, plural = null) => {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
};

/**
 * Get UI strings with dynamic academy labels
 * This allows strings to adapt to academy-specific terminology
 */
export const getUIStringsWithAcademy = (academy = {}) => ({
  STUDENT_SINGULAR: academy?.studentLabelSingular || 'Student',
  STUDENT_PLURAL: academy?.studentLabelPlural || 'Students',
  TUTOR_SINGULAR: academy?.tutorLabelSingular || 'Tutor',
  TUTOR_PLURAL: academy?.tutorLabelPlural || 'Tutors',
  GROUP_SINGULAR: academy?.groupLabelSingular || 'Group',
  GROUP_PLURAL: academy?.groupLabelPlural || 'Groups',

  // Pre-built common phrases with academy labels
  ADD_STUDENT: `Add New ${academy?.studentLabelSingular || 'Student'}`,
  BACK_TO_STUDENTS: `Back to ${academy?.studentLabelPlural || 'Students'}`,
  NO_STUDENTS_YET: `No ${academy?.studentLabelPlural?.toLowerCase() || 'students'} registered yet`,
  EDIT_STUDENT: `Edit ${academy?.studentLabelSingular || 'Student'}`,
});

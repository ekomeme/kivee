/**
 * Application Theme Configuration
 * Centralized color system for consistent UI and easier theming
 *
 * This file defines the complete color palette used throughout the application.
 * All hardcoded colors should reference these constants for consistency.
 */

// ==================== CORE BRAND COLORS ====================

/**
 * Primary brand colors
 * Used for main actions, active states, and primary UI elements
 */
export const PRIMARY = {
  MAIN: '#03090A',        // Primary black - main buttons, active states
  HOVER: '#4F5354',       // Hover state for primary elements
  LIGHT: '#F2F3F3',       // Light background variant
};

// ==================== STATUS COLORS ====================

/**
 * Semantic colors for status indicators and feedback
 * Used for success, error, warning, and info states
 */
export const STATUS = {
  // Success/Active states
  SUCCESS: '#10b981',           // Green - active badges, success messages
  SUCCESS_LIGHT: '#d1fae5',     // Light green background
  SUCCESS_DARK: '#065f46',      // Dark green text on light backgrounds

  // Error/Danger states
  ERROR: '#ef4444',             // Red - error messages, delete buttons
  ERROR_HOVER: '#dc2626',       // Darker red for hover states
  ERROR_LIGHT: '#fee2e2',       // Light red background (red-100)
  ERROR_DARK: '#991b1b',        // Dark red text

  // Warning states
  WARNING: '#f59e0b',           // Amber - warning messages
  WARNING_LIGHT: '#fef3c7',     // Light amber background
  WARNING_DARK: '#92400e',      // Dark amber text

  // Info/Action states
  INFO: '#3b82f6',              // Blue - informational elements
  INFO_HOVER: '#2563eb',        // Darker blue for actions
  INFO_LIGHT: '#dbeafe',        // Light blue background
  INFO_DARK: '#1e40af',         // Dark blue text

  // Overdue/Critical
  OVERDUE: '#f03d3d',           // Bright red for overdue payments
};

// ==================== NEUTRAL/GRAY SCALE ====================

/**
 * Gray scale for text, borders, backgrounds, and UI hierarchy
 * Based on Tailwind's gray palette
 */
export const GRAY = {
  50: '#f9fafb',    // Lightest - hover backgrounds, subtle fills
  100: '#f3f4f6',   // Very light - table hover, card backgrounds
  200: '#e5e7eb',   // Light - borders, dividers
  300: '#d1d5db',   // Medium light - inactive borders, cancel buttons
  400: '#9ca3af',   // Medium - placeholder text
  500: '#6b7280',   // Medium dark - secondary text, icons
  600: '#4b5563',   // Dark - body text alternatives
  700: '#374151',   // Darker - headings, emphasis
  800: '#1f2937',   // Very dark - primary headings
  900: '#111827',   // Darkest - high emphasis text
};

// ==================== SEMANTIC COLORS ====================

/**
 * Background colors for major UI sections
 */
export const BACKGROUND = {
  APP: '#ffffff',           // Main app background
  SECTION: '#ffffff',       // Section/card backgrounds
  HOVER: GRAY[100],        // Hover state backgrounds
  ACTIVE: GRAY[50],        // Active/selected state backgrounds

  // Sidebar specific
  SIDEBAR_START: '#F2F3F3', // Sidebar gradient start
  SIDEBAR_END: '#FFFFFF',   // Sidebar gradient end
};

/**
 * Text colors by hierarchy and context
 */
export const TEXT = {
  PRIMARY: '#03090A',       // Primary text - headings, important content
  SECONDARY: '#4F5354',     // Secondary text - body copy
  MUTED: GRAY[500],         // Muted text - helper text, timestamps
  DISABLED: GRAY[400],      // Disabled state text
  ON_DARK: '#FFFFFF',       // Text on dark backgrounds
  ON_PRIMARY: '#FFFFFF',    // Text on primary color backgrounds
};

/**
 * Border colors for various UI elements
 */
export const BORDER = {
  DEFAULT: '#E6E6E6',       // Default border color
  LIGHT: GRAY[200],         // Light borders for subtle divisions
  MEDIUM: GRAY[300],        // Medium borders for inputs
  DARK: GRAY[400],          // Dark borders for emphasis
  FOCUS: PRIMARY.MAIN,      // Border color on focus
  ERROR: STATUS.ERROR,      // Border color for errors
};

// ==================== COMPONENT-SPECIFIC COLORS ====================

/**
 * Button color variants
 */
export const BUTTON = {
  // Primary button
  PRIMARY_BG: PRIMARY.MAIN,
  PRIMARY_HOVER: PRIMARY.HOVER,
  PRIMARY_TEXT: TEXT.ON_PRIMARY,

  // Secondary button
  SECONDARY_BG: GRAY[200],
  SECONDARY_HOVER: GRAY[300],
  SECONDARY_TEXT: GRAY[800],

  // Danger/Delete button
  DANGER_BG: STATUS.ERROR,
  DANGER_HOVER: STATUS.ERROR_HOVER,
  DANGER_TEXT: TEXT.ON_PRIMARY,

  // Action button (blue)
  ACTION_BG: STATUS.INFO_HOVER,
  ACTION_HOVER: STATUS.INFO_DARK,
  ACTION_TEXT: TEXT.ON_PRIMARY,

  // Disabled state
  DISABLED_BG: GRAY[200],
  DISABLED_TEXT: TEXT.DISABLED,
};

/**
 * Badge/Pill colors
 */
export const BADGE = {
  // Active/Success badge
  SUCCESS_BG: STATUS.SUCCESS_LIGHT,
  SUCCESS_TEXT: STATUS.SUCCESS_DARK,

  // Inactive/Error badge
  ERROR_BG: STATUS.ERROR_LIGHT,
  ERROR_TEXT: STATUS.ERROR_DARK,

  // Warning badge
  WARNING_BG: STATUS.WARNING_LIGHT,
  WARNING_TEXT: STATUS.WARNING_DARK,

  // Info badge
  INFO_BG: STATUS.INFO_LIGHT,
  INFO_TEXT: STATUS.INFO_DARK,

  // Neutral badge
  NEUTRAL_BG: GRAY[100],
  NEUTRAL_TEXT: GRAY[700],
};

/**
 * Table colors
 */
export const TABLE = {
  HEADER_TEXT: GRAY[500],
  ROW_HOVER: GRAY[100],
  ROW_ACTIVE: GRAY[50],
  BORDER: BORDER.DEFAULT,
  STRIPE: GRAY[50],         // For striped tables if needed
};

/**
 * Modal/Overlay colors
 */
export const OVERLAY = {
  BACKDROP: 'rgba(0, 0, 0, 0.5)',   // Semi-transparent black
  BACKGROUND: BACKGROUND.SECTION,
  BORDER: BORDER.DEFAULT,
};

/**
 * Form input colors
 */
export const INPUT = {
  BACKGROUND: '#ffffff',
  BORDER: BORDER.MEDIUM,
  BORDER_FOCUS: BORDER.FOCUS,
  BORDER_ERROR: BORDER.ERROR,
  TEXT: TEXT.PRIMARY,
  PLACEHOLDER: TEXT.MUTED,
  DISABLED_BG: GRAY[100],
  DISABLED_TEXT: TEXT.DISABLED,
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get Tailwind class names for common color combinations
 * Useful when you need to apply colors via className
 */
export const getTailwindClasses = {
  /**
   * Primary button classes
   */
  primaryButton: 'bg-primary hover:bg-primary-hover text-white',

  /**
   * Secondary button classes
   */
  secondaryButton: 'bg-gray-200 hover:bg-gray-300 text-gray-800',

  /**
   * Danger button classes
   */
  dangerButton: 'bg-red-500 hover:bg-red-600 text-white',

  /**
   * Success badge classes
   */
  successBadge: 'bg-green-100 text-green-800',

  /**
   * Error badge classes
   */
  errorBadge: 'bg-red-100 text-red-800',

  /**
   * Table row hover classes
   */
  tableRowHover: 'hover:bg-gray-100',
};

/**
 * Get CSS variable reference
 * For use in inline styles or CSS-in-JS
 *
 * @param {string} varName - CSS variable name (without --)
 * @returns {string} CSS variable reference
 *
 * @example
 * getCSSVar('color-primary') // returns 'var(--color-primary)'
 */
export const getCSSVar = (varName) => `var(--${varName})`;

/**
 * Convert hex color to rgba with opacity
 * Useful for creating transparent variants
 *
 * @param {string} hex - Hex color code
 * @param {number} alpha - Opacity (0-1)
 * @returns {string} RGBA color string
 *
 * @example
 * hexToRgba('#03090A', 0.5) // returns 'rgba(3, 9, 10, 0.5)'
 */
export const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ==================== UNIFIED THEME EXPORT ====================

/**
 * Complete theme object
 * Import this for access to all theme values
 */
export const THEME = {
  PRIMARY,
  STATUS,
  GRAY,
  BACKGROUND,
  TEXT,
  BORDER,
  BUTTON,
  BADGE,
  TABLE,
  OVERLAY,
  INPUT,
};

/**
 * Default export for convenience
 */
export default THEME;

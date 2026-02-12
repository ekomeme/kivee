/**
 * Application Routes Configuration
 * Centralized routing paths for consistent navigation throughout the app
 */

export const ROUTES = {
  // Authentication
  HOME: '/',
  SIGN_IN: '/sign-in',

  // Students/Players
  STUDENTS: '/students',
  STUDENT_NEW: '/students/new',
  STUDENT_DETAIL: (id) => `/students/${id}`,
  STUDENT_EDIT: (id) => `/students/${id}/edit`,

  // Plans & Offers
  PLANS: '/plans',
  PLAN_TIERS: '/plans/tiers',
  PLAN_TIER_NEW: '/plans/tiers/new',
  PLAN_TIER_EDIT: (id) => `/plans/tiers/${id}/edit`,
  PLAN_PRODUCTS: '/plans/products',
  PLAN_TRIALS: '/plans/trials',

  // Groups & Classes
  GROUPS: '/groups',
  GROUP_DETAIL: (id) => `/groups/${id}`,
  GROUP_NEW: '/groups/new',
  GROUP_EDIT: (id) => `/groups/${id}/edit`,

  // Schedule
  SCHEDULE: '/schedule',

  // Finances
  FINANCES: '/finances',

  // Settings & Admin
  SETTINGS: '/settings',
  ADMIN: '/admin',

  // Dashboard
  DASHBOARD: '/',
};

/**
 * Helper function to check if current path matches a route pattern
 * @param {string} pathname - Current pathname
 * @param {string} routePattern - Route pattern to match (can include :id)
 * @returns {boolean}
 */
export const isCurrentRoute = (pathname, routePattern) => {
  if (typeof routePattern === 'function') {
    // For dynamic routes, check if pathname starts with the base
    return false; // Cannot check function routes directly
  }
  return pathname === routePattern;
};

/**
 * Helper to extract ID from detail routes
 * @param {string} pathname - Current pathname
 * @param {string} baseRoute - Base route (e.g., '/students')
 * @returns {string|null} - Extracted ID or null
 */
export const extractIdFromRoute = (pathname, baseRoute) => {
  const pattern = new RegExp(`^${baseRoute}/([^/]+)$`);
  const match = pathname.match(pattern);
  return match ? match[1] : null;
};

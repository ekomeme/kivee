/**
 * Permission and role-based access control utilities
 */

import { ROLES, VALID_ROLES, ROLE_PERMISSIONS } from '../config/constants';

/**
 * Check if a role is valid
 * @param {string} role - The role to validate
 * @returns {boolean}
 */
export const isValidRole = (role) => {
  return VALID_ROLES.includes(role);
};

/**
 * Check if a membership has a valid role
 * @param {Object} membership - The membership object
 * @returns {boolean}
 */
export const hasValidMembership = (membership) => {
  if (!membership || !membership.role) {
    return false;
  }
  return isValidRole(membership.role);
};

/**
 * Check if user has one of the required roles
 * @param {Object} membership - The membership object
 * @param {string[]} requiredRoles - Array of required roles
 * @returns {boolean}
 */
export const hasRole = (membership, requiredRoles = VALID_ROLES) => {
  if (!membership || !membership.role) {
    return false;
  }
  return requiredRoles.includes(membership.role);
};

/**
 * Check if user is owner
 * @param {Object} membership - The membership object
 * @returns {boolean}
 */
export const isOwner = (membership) => {
  return membership?.role === ROLES.OWNER;
};

/**
 * Check if user is admin or owner
 * @param {Object} membership - The membership object
 * @returns {boolean}
 */
export const isAdminOrOwner = (membership) => {
  return hasRole(membership, [ROLES.OWNER, ROLES.ADMIN]);
};

/**
 * Check if user has specific permission
 * @param {Object} membership - The membership object
 * @param {string} permission - The permission to check (e.g., 'canEditSettings')
 * @returns {boolean}
 */
export const hasPermission = (membership, permission) => {
  if (!membership || !membership.role) {
    return false;
  }

  const rolePermissions = ROLE_PERMISSIONS[membership.role];
  if (!rolePermissions) {
    return false;
  }

  return rolePermissions[permission] === true;
};

/**
 * Check if user can edit academy settings
 * @param {Object} membership - The membership object
 * @returns {boolean}
 */
export const canEditSettings = (membership) => {
  return hasPermission(membership, 'canEditSettings');
};

/**
 * Check if user can manage team members
 * @param {Object} membership - The membership object
 * @returns {boolean}
 */
export const canManageTeam = (membership) => {
  return hasPermission(membership, 'canManageTeam');
};

/**
 * Check if user can delete academy
 * @param {Object} membership - The membership object
 * @returns {boolean}
 */
export const canDeleteAcademy = (membership) => {
  return hasPermission(membership, 'canDeleteAcademy');
};

/**
 * Check if user can view finances
 * @param {Object} membership - The membership object
 * @returns {boolean}
 */
export const canViewFinances = (membership) => {
  return hasPermission(membership, 'canViewFinances');
};

/**
 * Check if user can manage players
 * @param {Object} membership - The membership object
 * @returns {boolean}
 */
export const canManagePlayers = (membership) => {
  return hasPermission(membership, 'canManagePlayers');
};

/**
 * Check if user can manage plans (tiers, products, trials)
 * @param {Object} membership - The membership object
 * @returns {boolean}
 */
export const canManagePlans = (membership) => {
  return hasPermission(membership, 'canManagePlans');
};

/**
 * Check if user owns the academy (direct ownership check)
 * @param {Object} academy - The academy object
 * @param {Object} user - The user object
 * @returns {boolean}
 */
export const ownsAcademy = (academy, user) => {
  if (!academy || !user) {
    return false;
  }
  return academy.ownerId === user.uid;
};

/**
 * Get role display name
 * @param {string} role - The role
 * @returns {string}
 */
export const getRoleDisplayName = (role) => {
  const roleNames = {
    [ROLES.OWNER]: 'Owner',
    [ROLES.ADMIN]: 'Admin',
    [ROLES.MEMBER]: 'Member'
  };
  return roleNames[role] || 'Unknown';
};

/**
 * Get all permissions for a role
 * @param {string} role - The role
 * @returns {Object|null}
 */
export const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || null;
};

/**
 * Check if role can be assigned by current user
 * Owners can assign any role, Admins can assign Member role only
 * @param {Object} membership - Current user's membership
 * @param {string} roleToAssign - The role to assign
 * @returns {boolean}
 */
export const canAssignRole = (membership, roleToAssign) => {
  if (!membership || !membership.role) {
    return false;
  }

  if (membership.role === ROLES.OWNER) {
    return true; // Owners can assign any role
  }

  if (membership.role === ROLES.ADMIN) {
    return roleToAssign === ROLES.MEMBER; // Admins can only assign Member role
  }

  return false; // Members cannot assign roles
};

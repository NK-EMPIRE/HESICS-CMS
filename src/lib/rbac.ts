import { PermissionKey, UserHierarchy } from './types';

// Hierarchy-based permission map
// founder (stealth master root) > admin > officer > employee > intern
export const HIERARCHY_PERMISSIONS: Record<UserHierarchy, PermissionKey[]> = {
  founder: [
    'org:admin',
    'clients:read',
    'clients:write',
    'clients:delete',
    'deals:read',
    'deals:write',
    'invoices:read',
    'invoices:write',
    'finance:read',
    'finance:write',
    'team:manage',
    'team:invite',
  ],
  admin: [
    'org:admin',
    'clients:read',
    'clients:write',
    'clients:delete',
    'deals:read',
    'deals:write',
    'invoices:read',
    'invoices:write',
    'finance:read',
    'finance:write',
    'team:manage',
    'team:invite',
  ],
  officer: [
    'clients:read',
    'clients:write',
    'deals:read',
    'deals:write',
    'invoices:read',
    'invoices:write',
    'finance:read',
  ],
  employee: [
    'clients:read',
    'clients:write',
    'deals:read',
    'deals:write',
    'invoices:read',
  ],
  intern: [
    'clients:read',
    'deals:read',
  ],
};

// Role-specific permission overrides (layered on top of hierarchy)
export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  'role-founder': HIERARCHY_PERMISSIONS['founder'],
  'role-admin': HIERARCHY_PERMISSIONS['admin'],
  'role-officer': HIERARCHY_PERMISSIONS['officer'],
  'role-sales': [
    'clients:read',
    'clients:write',
    'deals:read',
    'deals:write',
    'invoices:read',
    'invoices:write',
  ],
  'role-finance': [
    'invoices:read',
    'invoices:write',
    'finance:read',
    'finance:write',
    'clients:read',
  ],
  'role-design': [
    'clients:read',
    'deals:read',
  ],
  'role-employee': HIERARCHY_PERMISSIONS['employee'],
  'role-intern': HIERARCHY_PERMISSIONS['intern'],
};

export function getPermissionsForRole(roleId: string): PermissionKey[] {
  return ROLE_PERMISSIONS[roleId] || HIERARCHY_PERMISSIONS['intern'];
}

export function hasPermission(roleId: string, permission: PermissionKey): boolean {
  const perms = getPermissionsForRole(roleId);
  return perms.includes(permission);
}

export function isMasterRoot(email?: string): boolean {
  return (email || '').trim().toLowerCase() === 'hesics1@gmail.com';
}

export function isFounder(hierarchy: UserHierarchy): boolean {
  return hierarchy === 'founder';
}

export function isAdminOrAbove(hierarchy: UserHierarchy): boolean {
  return hierarchy === 'founder' || hierarchy === 'admin';
}

/**
 * Checks if actor can manage target user.
 * - Founder / Master root: can manage everyone, including admins.
 * - Admin: can ONLY manage users strictly below admin (officer, employee, intern).
 */
export function canManageUser(
  actorHierarchy: UserHierarchy,
  targetHierarchy: UserHierarchy,
  actorEmail?: string
): boolean {
  if (actorHierarchy === 'founder' || isMasterRoot(actorEmail)) {
    return true;
  }
  const order: UserHierarchy[] = ['intern', 'employee', 'officer', 'admin', 'founder'];
  const actorLevel = order.indexOf(actorHierarchy);
  const targetLevel = order.indexOf(targetHierarchy);

  // Admins cannot manage other admins or the root account
  return actorLevel > targetLevel;
}

/**
 * Checks which role tiers an actor is allowed to create or assign.
 * - Master Root / Founder: can create/assign any role, including Admin.
 * - Admin: can ONLY create/assign roles below Admin (Officer, Employee, Intern).
 */
export function getAllowedRoleTiers(actorHierarchy: UserHierarchy, actorEmail?: string): UserHierarchy[] {
  if (actorHierarchy === 'founder' || isMasterRoot(actorEmail)) {
    return ['admin', 'officer', 'employee', 'intern'];
  }
  if (actorHierarchy === 'admin') {
    return ['officer', 'employee', 'intern'];
  }
  return [];
}
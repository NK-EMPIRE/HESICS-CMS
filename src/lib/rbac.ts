import { PermissionKey, UserHierarchy } from './types';

// Hierarchy-based permission map
// founder > admin > employee > intern
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
  'role-intern': [
    'clients:read',
    'deals:read',
  ],
};

export function getPermissionsForRole(roleId: string): PermissionKey[] {
  return ROLE_PERMISSIONS[roleId] || HIERARCHY_PERMISSIONS['intern'];
}

export function hasPermission(roleId: string, permission: PermissionKey): boolean {
  const perms = getPermissionsForRole(roleId);
  return perms.includes(permission);
}

export function isFounder(hierarchy: UserHierarchy): boolean {
  return hierarchy === 'founder';
}

export function isAdminOrAbove(hierarchy: UserHierarchy): boolean {
  return hierarchy === 'founder' || hierarchy === 'admin';
}

export function canManageUser(
  actorHierarchy: UserHierarchy,
  targetHierarchy: UserHierarchy
): boolean {
  const order: UserHierarchy[] = ['intern', 'employee', 'admin', 'founder'];
  const actorLevel = order.indexOf(actorHierarchy);
  const targetLevel = order.indexOf(targetHierarchy);
  // Can manage users strictly below your own level only
  return actorLevel > targetLevel;
}

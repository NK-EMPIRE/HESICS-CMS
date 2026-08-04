import { PermissionKey, User } from './types';
import { INITIAL_USERS } from './mockData';

// Map of role IDs to granted permission keys
export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  'role-founder': [
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
  ],
  'role-cofounder': [
    'clients:read',
    'clients:write',
    'deals:read',
    'deals:write',
    'invoices:read',
    'invoices:write',
    'finance:read',
    'finance:write',
    // Note: team:manage excluded for cofounder by default spec
  ],
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
  ],
  'role-intern': [
    'clients:read',
    'deals:read',
  ],
};

export const USER_ROLE_MAP: Record<string, string> = {
  'usr-founder-01': 'role-founder',
  'usr-ops-02': 'role-cofounder',
  'usr-ops-03': 'role-cofounder',
};

export function getActiveUserPermissions(userId: string): PermissionKey[] {
  const roleId = USER_ROLE_MAP[userId] || 'role-intern';
  return ROLE_PERMISSIONS[roleId] || [];
}

export function hasPermission(userId: string, permission: PermissionKey): boolean {
  const userPermissions = getActiveUserPermissions(userId);
  return userPermissions.includes(permission);
}

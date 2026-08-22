import { PermissionKey, UserHierarchy } from "./types";

// Hierarchy-based permission map
// founder (stealth master root / Admin) > superadmin > admin > officer > employee > intern
export const HIERARCHY_PERMISSIONS: Record<UserHierarchy, PermissionKey[]> = {
  founder: [
    "org:admin",
    "clients:read",
    "clients:write",
    "clients:delete",
    "deals:read",
    "deals:write",
    "invoices:read",
    "invoices:write",
    "finance:read",
    "finance:write",
    "team:manage",
    "team:invite",
  ],
  superadmin: [
    "org:admin",
    "superadmin:vault",
    "clients:read",
    "clients:write",
    "clients:delete",
    "deals:read",
    "deals:write",
    "invoices:read",
    "invoices:write",
    "finance:read",
    "finance:write",
    "team:manage",
    "team:invite",
  ],
  admin: [
    "org:admin",
    "clients:read",
    "clients:write",
    "clients:delete",
    "deals:read",
    "deals:write",
    "invoices:read",
    "invoices:write",
    "finance:read",
    "finance:write",
    "team:manage",
    "team:invite",
  ],
  officer: [
    "clients:read",
    "clients:write",
    "deals:read",
    "deals:write",
    "invoices:read",
    "invoices:write",
    "finance:read",
  ],
  employee: [
    "clients:read",
    "clients:write",
    "deals:read",
    "deals:write",
    "invoices:read",
  ],
  intern: ["clients:read", "deals:read"],
};

// Role-specific permission overrides (layered on top of hierarchy)
export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  "role-founder": HIERARCHY_PERMISSIONS["founder"],
  "role-superadmin": HIERARCHY_PERMISSIONS["superadmin"],
  "role-admin": HIERARCHY_PERMISSIONS["admin"],
  "role-officer": HIERARCHY_PERMISSIONS["officer"],
  "role-sales": [
    "clients:read",
    "clients:write",
    "deals:read",
    "deals:write",
    "invoices:read",
    "invoices:write",
  ],
  "role-finance": [
    "invoices:read",
    "invoices:write",
    "finance:read",
    "finance:write",
    "clients:read",
  ],
  "role-design": ["clients:read", "deals:read"],
  "role-employee": HIERARCHY_PERMISSIONS["employee"],
  "role-intern": HIERARCHY_PERMISSIONS["intern"],
};

export function getPermissionsForRole(roleId: string): PermissionKey[] {
  return ROLE_PERMISSIONS[roleId] || HIERARCHY_PERMISSIONS["intern"];
}

export function hasPermission(
  roleId: string,
  permission: PermissionKey,
  userHierarchy?: UserHierarchy,
  userEmail?: string,
): boolean {
  if (permission === "superadmin:vault") {
    return userHierarchy === "superadmin" || roleId === "role-superadmin";
  }
  if (isMasterRoot(userEmail) || userHierarchy === "founder") {
    return true;
  }
  const perms = getPermissionsForRole(roleId);
  return perms.includes(permission);
}

export const canPerform = hasPermission;

export function isMasterRoot(email?: string): boolean {
  return (email || "").trim().toLowerCase() === "hesics1@gmail.com";
}

export function isFounder(hierarchy: UserHierarchy): boolean {
  return hierarchy === "founder";
}

export function isSuperadmin(
  hierarchy?: UserHierarchy,
  email?: string,
): boolean {
  return hierarchy === "superadmin";
}

export function isAdminOrAbove(hierarchy: UserHierarchy): boolean {
  return (
    hierarchy === "founder" ||
    hierarchy === "superadmin" ||
    hierarchy === "admin"
  );
}

export function canManageUser(
  actorHierarchy: UserHierarchy,
  targetHierarchy: UserHierarchy,
  actorEmail?: string,
): boolean {
  if (actorHierarchy === "founder" || isMasterRoot(actorEmail)) {
    return true;
  }
  const order: UserHierarchy[] = [
    "intern",
    "employee",
    "officer",
    "admin",
    "superadmin",
    "founder",
  ];
  const actorLevel = order.indexOf(actorHierarchy);
  const targetLevel = order.indexOf(targetHierarchy);

  return actorLevel > targetLevel;
}

export function getAllowedRoleTiers(
  actorHierarchy: UserHierarchy,
  actorEmail?: string,
): UserHierarchy[] {
  if (isMasterRoot(actorEmail)) {
    return ["superadmin", "admin", "officer", "employee", "intern"];
  }
  if (actorHierarchy === "superadmin") {
    return ["admin", "officer", "employee", "intern"];
  }
  if (actorHierarchy === "admin" || actorHierarchy === "founder") {
    return ["officer", "employee", "intern"];
  }
  return [];
}

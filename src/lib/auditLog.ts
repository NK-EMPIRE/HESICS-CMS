export type AuditAction =
  | 'client.created' | 'client.updated' | 'client.deleted'
  | 'deal.created' | 'deal.updated' | 'deal.deleted' | 'deal.stage_changed'
  | 'invoice.created' | 'invoice.updated' | 'invoice.status_changed' | 'invoice.deleted'
  | 'quotation.created' | 'quotation.updated' | 'quotation.status_changed' | 'quotation.deleted'
  | 'income.created' | 'income.deleted'
  | 'expense.created' | 'expense.deleted'
  | 'user.invited' | 'user.deactivated' | 'user.reactivated' | 'user.removed'
  | 'role.created' | 'role.updated'
  | 'service.created' | 'service.updated' | 'service.deleted'
  | 'vault.created' | 'vault.deleted' | 'vault.updated'
  | 'auth.login' | 'auth.logout'
  | 'org.updated';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  actor_email: string;
  actor_role: string;
  action: AuditAction;
  category: 'CRM' | 'Billing' | 'Finance' | 'Team' | 'Security' | 'Settings';
  entity_type: string;
  entity_id: string;
  entity_label?: string;
  details?: Record<string, unknown>;
}

export type AuditEntry = AuditLogEntry;

const AUDIT_KEY = 'hesics_v3_audit_log';
const MAX_ENTRIES = 1000;

function loadLog(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLog(entries: AuditLogEntry[]): void {
  try {
    const trimmed = entries.slice(0, MAX_ENTRIES);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore storage errors */
  }
}

function getCategoryForAction(action: AuditAction): AuditLogEntry['category'] {
  if (action.startsWith('client.') || action.startsWith('deal.')) return 'CRM';
  if (action.startsWith('invoice.') || action.startsWith('quotation.')) return 'Billing';
  if (action.startsWith('income.') || action.startsWith('expense.')) return 'Finance';
  if (action.startsWith('user.') || action.startsWith('role.')) return 'Team';
  if (action.startsWith('auth.') || action.startsWith('vault.')) return 'Security';
  return 'Settings';
}

export function logAudit(
  userId: string,
  userName: string,
  action: AuditAction,
  entityType: string,
  entityId: string,
  entityLabel?: string,
  details?: Record<string, unknown>,
  actorEmail: string = 'user@hesics.com',
  actorRole: string = 'Executive'
): AuditLogEntry {
  const entries = loadLog();
  const entry: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    user_id: userId,
    user_name: userName,
    actor_email: actorEmail,
    actor_role: actorRole,
    action,
    category: getCategoryForAction(action),
    entity_type: entityType,
    entity_id: entityId,
    entity_label: entityLabel,
    details,
  };
  saveLog([entry, ...entries]);
  return entry;
}

export function getAuditLog(limit = 500): AuditLogEntry[] {
  return loadLog().slice(0, limit);
}

export function clearAuditLog(): void {
  localStorage.removeItem(AUDIT_KEY);
}

export function formatAuditAction(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    'client.created': 'Created client account',
    'client.updated': 'Updated client profile',
    'client.deleted': 'Deleted client account',
    'deal.created': 'Created deal opportunity',
    'deal.updated': 'Updated deal parameters',
    'deal.deleted': 'Deleted deal opportunity',
    'deal.stage_changed': 'Moved pipeline stage',
    'invoice.created': 'Issued tax invoice',
    'invoice.updated': 'Updated tax invoice',
    'invoice.status_changed': 'Changed invoice status',
    'invoice.deleted': 'Deleted invoice',
    'quotation.created': 'Created commercial quotation',
    'quotation.updated': 'Updated commercial quotation',
    'quotation.status_changed': 'Changed quotation status',
    'quotation.deleted': 'Deleted quotation',
    'income.created': 'Recorded revenue inflow',
    'income.deleted': 'Deleted revenue record',
    'expense.created': 'Recorded expenditure',
    'expense.deleted': 'Deleted expense record',
    'user.invited': 'Provisioned team member',
    'user.deactivated': 'Deactivated team member',
    'user.reactivated': 'Reactivated team member',
    'user.removed': 'Removed team member',
    'role.created': 'Created custom role',
    'role.updated': 'Updated role parameters',
    'service.created': 'Added HESICS catalog service',
    'service.updated': 'Updated service rate',
    'service.deleted': 'Removed service from catalog',
    'vault.created': 'Created private vault record',
    'vault.updated': 'Updated private vault item',
    'vault.deleted': 'Deleted private vault item',
    'auth.login': 'Authenticated into session',
    'auth.logout': 'Signed out of session',
    'org.updated': 'Updated organization & tax settings',
  };
  return labels[action] || action;
}

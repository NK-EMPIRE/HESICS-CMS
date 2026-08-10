// Audit Log — tracks every write operation with who/what/when/diff
// Stored in localStorage (will migrate to Supabase audit_log table when connected)

export type AuditAction =
  | 'client.created' | 'client.updated' | 'client.deleted'
  | 'deal.created' | 'deal.updated' | 'deal.deleted' | 'deal.stage_changed'
  | 'invoice.created' | 'invoice.updated' | 'invoice.status_changed'
  | 'quotation.created' | 'quotation.updated'
  | 'income.created' | 'income.deleted'
  | 'expense.created' | 'expense.deleted'
  | 'user.invited' | 'user.deactivated' | 'user.removed'
  | 'org.updated';

export interface AuditEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  entity_label?: string;  // human readable (client name, invoice #, etc.)
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

const AUDIT_KEY = 'hesics_v3_audit_log';
const MAX_ENTRIES = 500;

function loadLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLog(entries: AuditEntry[]): void {
  try {
    // Keep only latest MAX_ENTRIES
    const trimmed = entries.slice(0, MAX_ENTRIES);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore storage errors */
  }
}

export function logAudit(
  userId: string,
  userName: string,
  action: AuditAction,
  entityType: string,
  entityId: string,
  entityLabel?: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): void {
  const entries = loadLog();
  const entry: AuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    user_id: userId,
    user_name: userName,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_label: entityLabel,
    before,
    after,
  };
  saveLog([entry, ...entries]);
}

export function getAuditLog(limit = 100): AuditEntry[] {
  return loadLog().slice(0, limit);
}

export function clearAuditLog(): void {
  localStorage.removeItem(AUDIT_KEY);
}

// Format action label for display
export function formatAuditAction(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    'client.created': 'Added client',
    'client.updated': 'Updated client',
    'client.deleted': 'Deleted client',
    'deal.created': 'Created deal',
    'deal.updated': 'Updated deal',
    'deal.deleted': 'Deleted deal',
    'deal.stage_changed': 'Moved deal stage',
    'invoice.created': 'Created invoice',
    'invoice.updated': 'Updated invoice',
    'invoice.status_changed': 'Changed invoice status',
    'quotation.created': 'Created quotation',
    'quotation.updated': 'Updated quotation',
    'income.created': 'Logged income',
    'income.deleted': 'Deleted income entry',
    'expense.created': 'Logged expense',
    'expense.deleted': 'Deleted expense',
    'user.invited': 'Invited team member',
    'user.deactivated': 'Deactivated user',
    'user.removed': 'Removed user',
    'org.updated': 'Updated org settings',
  };
  return labels[action] || action;
}

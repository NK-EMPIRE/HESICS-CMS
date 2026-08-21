import { Organization, User, Role, Client, Deal, Activity, Quotation, Invoice } from './types';

export const INITIAL_ORG: Organization = {
  id: 'org-hesics-001',
  name: 'HESICS',
  gstin: '33AAAAA0000A1Z5',
  entity_type: 'pvt_ltd',
  created_at: new Date().toISOString(),
  // Brand: Make It Simple. | hesics1@gmail.com | +91 78679 99298
};

// Standard role definitions
export const INITIAL_ROLES: Role[] = [
  {
    id: 'role-superadmin',
    org_id: 'org-hesics-001',
    name: 'Superadmin',
    description: 'Executive governance authority with isolated Private Vault, ledger & tasks.',
    hierarchy_level: 'superadmin',
  },
  {
    id: 'role-admin',
    org_id: 'org-hesics-001',
    name: 'Admin',
    description: 'Full administrative access across CRM, Finance, and team operations.',
    hierarchy_level: 'admin',
  },
  {
    id: 'role-officer',
    org_id: 'org-hesics-001',
    name: 'Operations Officer',
    description: 'Elevated operational access: CRM pipeline, quotations, invoices, and activity logs.',
    hierarchy_level: 'officer',
  },
  {
    id: 'role-sales',
    org_id: 'org-hesics-001',
    name: 'Sales Executive',
    description: 'CRM access: clients, deals, and quotations.',
    hierarchy_level: 'employee',
  },
  {
    id: 'role-finance',
    org_id: 'org-hesics-001',
    name: 'Finance Manager',
    description: 'Invoices, taxation, and finance logs.',
    hierarchy_level: 'employee',
  },
  {
    id: 'role-intern',
    org_id: 'org-hesics-001',
    name: 'Intern',
    description: 'Read-only access to client directory and deal pipeline.',
    hierarchy_level: 'intern',
  },
];

export const INITIAL_USERS: User[] = [];
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_DEALS: Deal[] = [];
export const INITIAL_ACTIVITIES: Activity[] = [];
export const INITIAL_QUOTATIONS: Quotation[] = [];
export const INITIAL_INVOICES: Invoice[] = [];

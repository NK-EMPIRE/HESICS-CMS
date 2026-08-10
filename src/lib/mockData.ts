import { Organization, User, Role, Client, Deal, Activity, Quotation, Invoice } from './types';

export const INITIAL_ORG: Organization = {
  id: 'org-hesics-001',
  name: 'HESICS',
  gstin: '33AAAAA0000A1Z5',
  entity_type: 'pvt_ltd',
  created_at: new Date().toISOString(),
};

// Role definitions with hierarchy
export const INITIAL_ROLES: Role[] = [
  {
    id: 'role-founder',
    org_id: 'org-hesics-001',
    name: 'Founder & Owner',
    description: 'Absolute control over all org data, settings, and permissions.',
    hierarchy_level: 'founder',
  },
  {
    id: 'role-admin',
    org_id: 'org-hesics-001',
    name: 'Admin',
    description: 'Full operational access including team management. Cannot remove founder.',
    hierarchy_level: 'admin',
  },
  {
    id: 'role-sales',
    org_id: 'org-hesics-001',
    name: 'Sales Executive',
    description: 'CRM access: clients, deals, quotations. No financial data.',
    hierarchy_level: 'employee',
  },
  {
    id: 'role-finance',
    org_id: 'org-hesics-001',
    name: 'Finance Manager',
    description: 'Invoices and finance module. No CRM write access.',
    hierarchy_level: 'employee',
  },
  {
    id: 'role-design',
    org_id: 'org-hesics-001',
    name: 'Design & Creative',
    description: 'Client directory read access. Primarily for project context.',
    hierarchy_level: 'employee',
  },
  {
    id: 'role-intern',
    org_id: 'org-hesics-001',
    name: 'Intern',
    description: 'Read-only access to clients and deals pipeline.',
    hierarchy_level: 'intern',
  },
];

// Org Hierarchy:
// Peer Sheik Mydeen → Founder (owns the org)
// Naveen Karthick (NK) → Admin (co-admin)
// Employees/Interns can be added under them

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-founder-01',
    org_id: 'org-hesics-001',
    name: 'Peer Sheik Mydeen',
    email: 'peer@hesics.com',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PeerSheik',
    hierarchy: 'founder',
    role_id: 'role-founder',
    role_name: 'Founder & Owner',
    department: 'Leadership',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr-admin-02',
    org_id: 'org-hesics-001',
    name: 'Naveen Karthick (NK)',
    email: 'nk@hesics.com',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NaveenNK',
    hierarchy: 'admin',
    role_id: 'role-admin',
    role_name: 'Admin',
    department: 'Operations',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

// Clean empty collections — zero fake dummy data
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_DEALS: Deal[] = [];
export const INITIAL_ACTIVITIES: Activity[] = [];
export const INITIAL_QUOTATIONS: Quotation[] = [];
export const INITIAL_INVOICES: Invoice[] = [];

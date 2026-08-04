import { Organization, User, Role, Client, Deal, Activity, Quotation, Invoice } from './types';

export const INITIAL_ORG: Organization = {
  id: 'org-hesics-001',
  name: 'Hesics OS',
  gstin: '33AAAAA0000A1Z5',
  entity_type: 'pvt_ltd',
  created_at: new Date().toISOString(),
};

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-founder-01',
    org_id: 'org-hesics-001',
    name: 'Peer Sheik Mydeen',
    email: 'founder@hesicsaura.com',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Peer',
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr-ops-02',
    org_id: 'org-hesics-001',
    name: 'Naveen Karthick (NK)',
    email: 'nk@hesicsaura.com',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Naveen',
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr-ops-03',
    org_id: 'org-hesics-001',
    name: 'Sheik',
    email: 'sheik@hesicsaura.com',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sheik',
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_ROLES: Role[] = [
  { id: 'role-founder', org_id: 'org-hesics-001', name: 'Founder' },
  { id: 'role-cofounder', org_id: 'org-hesics-001', name: 'Co-founder / Ops' },
  { id: 'role-sales', org_id: 'org-hesics-001', name: 'Sales Executive' },
  { id: 'role-finance', org_id: 'org-hesics-001', name: 'Finance Manager' },
  { id: 'role-intern', org_id: 'org-hesics-001', name: 'Intern' },
];

// Clean empty collections — zero fake dummy data
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_DEALS: Deal[] = [];
export const INITIAL_ACTIVITIES: Activity[] = [];
export const INITIAL_QUOTATIONS: Quotation[] = [];
export const INITIAL_INVOICES: Invoice[] = [];

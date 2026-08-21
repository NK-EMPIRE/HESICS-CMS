export type EntityType = 'proprietorship' | 'partnership' | 'llp' | 'pvt_ltd' | 'other';

export interface CustomTemplate {
  id: string;
  name: string;
  type: 'invoice' | 'quotation';
  file_name: string;
  data_url?: string;
  created_at: string;
}

export interface HesicsService {
  id: string;
  name: string;
  category: string;
  default_rate: number;
  description?: string;
  deliverables?: string[];
  is_active: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  tagline?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  is_tax_enabled?: boolean;
  default_invoice_template?: string;
  default_quotation_template?: string;
  custom_templates?: CustomTemplate[];
  entity_type?: EntityType;
  logo_url?: string;
  created_at: string;
}

// Hierarchy: founder (stealth master root) > superadmin > admin > officer > employee > intern
export type UserHierarchy = 'founder' | 'superadmin' | 'admin' | 'officer' | 'employee' | 'intern';

export interface User {
  id: string;
  org_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  hierarchy: UserHierarchy;   // org-level access tier
  role_id: string;            // maps to a Role
  role_name?: string;         // display name, derived from roles
  department?: string;
  is_active: boolean;
  created_at: string;
}

export interface Role {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  hierarchy_level: UserHierarchy;
}

export type PermissionKey =
  | 'clients:read'
  | 'clients:write'
  | 'clients:delete'
  | 'deals:read'
  | 'deals:write'
  | 'invoices:read'
  | 'invoices:write'
  | 'finance:read'
  | 'finance:write'
  | 'team:manage'
  | 'team:invite'
  | 'org:admin'
  | 'superadmin:vault';

export interface Permission {
  id: string;
  key: PermissionKey;
  description?: string;
}

export type ClientSource = 'referral' | 'instagram' | 'cold_dm' | 'website' | 'other';
export type ClientStatus = 'lead' | 'active' | 'churned';

export interface Client {
  id: string;
  org_id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  source?: ClientSource;
  status: ClientStatus;
  primary_service?: string;
  gstin?: string;
  industry?: string;
  notes?: string;
  tags?: string[];
  owner_id?: string;
  owner_name?: string;
  total_revenue?: number;
  created_at: string;
  updated_at: string;
}

export type DealStage = 'new' | 'contacted' | 'quoted' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Deal {
  id: string;
  org_id: string;
  client_id: string;
  client_name?: string;
  title: string;
  value: number;
  currency?: string;
  owner_id?: string;
  stage: DealStage;
  expected_close_date?: string;
  probability?: number;
  owner_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type ActivityType = 'call' | 'meeting' | 'email' | 'note' | 'task' | 'dm';

export interface Activity {
  id: string;
  org_id: string;
  client_id: string;
  client_name?: string;
  deal_id?: string;
  deal_title?: string;
  type: ActivityType;
  title?: string;
  notes?: string;
  outcome?: string;
  author_id?: string;
  author_name?: string;
  due_date?: string;
  follow_up_date?: string;
  is_completed?: boolean;
  created_at: string;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  rate?: number;
  tax_rate: number;
  amount: number;
  hsn_code?: string;
}

export interface Quotation {
  id: string;
  org_id: string;
  client_id: string;
  client_name: string;
  client_email?: string;
  deal_id?: string;
  quote_number?: string;
  quotation_number?: string;
  template_id?: string;
  issue_date?: string;
  expiry_date?: string;
  valid_until?: string;
  status: QuotationStatus;
  items?: LineItem[];
  line_items: LineItem[];
  subtotal: number;
  tax_rate?: number;
  tax: number;
  discount?: number;
  total: number;
  notes?: string;
  terms?: string;
  created_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  org_id: string;
  client_id: string;
  client_name: string;
  client_email?: string;
  quotation_id?: string;
  deal_id?: string;
  invoice_number: string;
  template_id?: string;
  issue_date?: string;
  due_date: string;
  paid_at?: string;
  status: InvoiceStatus;
  items?: LineItem[];
  line_items: LineItem[];
  subtotal: number;
  tax_rate?: number;
  tax: number;
  discount?: number;
  total: number;
  notes?: string;
  terms?: string;
  created_at: string;
}

export type IncomeSourceType = 'invoice' | 'direct' | 'other';

export interface IncomeEntry {
  id: string;
  org_id: string;
  source_type: IncomeSourceType;
  source_id?: string;
  client_name?: string;
  amount: number;
  currency: string;
  category: string;
  received_at: string;
  payment_method?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export type ExpenseCategory =
  | 'rent'
  | 'salary'
  | 'software'
  | 'marketing'
  | 'travel'
  | 'office'
  | 'legal'
  | 'other';

export interface ExpenseEntry {
  id: string;
  org_id: string;
  category: string | ExpenseCategory;
  amount: number;
  currency: string;
  vendor?: string;
  gst_paid: number;
  is_recurring?: boolean;
  date?: string;
  spent_at?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface PrivateVaultItem {
  id: string;
  type: 'income' | 'expense' | 'client' | 'note' | 'task';
  title: string;
  amount?: number;
  category?: string;
  client_contact?: string;
  due_date?: string;
  is_completed?: boolean;
  content?: string;
  created_at: string;
}

// ── Client Agreements ──────────────────────────────────────────────────────────
export type AgreementStatus = 'pending' | 'signed' | 'expired' | 'cancelled';

export interface ClientAgreement {
  id: string;
  org_id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_company?: string;
  scope: string[];          // list of deliverables / scope items
  pan_card?: string;
  aadhaar_number?: string;
  kyc_doc_url?: string;     // ID proof image data URL
  photo_url?: string;       // client selfie/photo data URL
  signature_url?: string;   // signature canvas data URL
  status: AgreementStatus;
  sign_link: string;        // public URL for client signing
  pdf_data_url?: string;    // generated PDF stored as base64
  created_at: string;
  signed_at?: string;
  expires_at?: string;
}

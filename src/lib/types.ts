export type EntityType = 'proprietorship' | 'partnership' | 'pvt_ltd' | 'other';

export interface Organization {
  id: string;
  name: string;
  gstin?: string;
  entity_type?: EntityType;
  logo_url?: string;
  created_at: string;
}

export interface User {
  id: string;
  org_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface Role {
  id: string;
  org_id: string;
  name: string;
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
  | 'team:manage';

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
  phone?: string;
  email?: string;
  source: ClientSource;
  status: ClientStatus;
  owner_id?: string;
  created_at: string;
  updated_at: string;
}

export type DealStage = 'new' | 'contacted' | 'quoted' | 'negotiation' | 'won' | 'lost';

export interface Deal {
  id: string;
  org_id: string;
  client_id: string;
  client_name?: string;
  company_name?: string;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expected_close_date?: string;
  owner_id?: string;
  owner_name?: string;
  created_at: string;
  updated_at: string;
}

export type ActivityType = 'call' | 'dm' | 'email' | 'meeting';

export interface Activity {
  id: string;
  org_id: string;
  client_id?: string;
  client_name?: string;
  deal_id?: string;
  deal_title?: string;
  type: ActivityType;
  outcome?: string;
  follow_up_date?: string;
  author_id: string;
  author_name?: string;
  created_at: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface Quotation {
  id: string;
  org_id: string;
  client_id: string;
  client_name?: string;
  client_email?: string;
  deal_id?: string;
  quote_number: string;
  line_items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: QuotationStatus;
  valid_until?: string;
  pdf_url?: string;
  created_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  org_id: string;
  client_id: string;
  client_name?: string;
  client_email?: string;
  deal_id?: string;
  quotation_id?: string;
  invoice_number: string;
  line_items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  due_date?: string;
  paid_at?: string;
  pdf_url?: string;
  created_at: string;
}

// Phase 2 Finance Types
export type ExpenseCategory = 'software' | 'marketing' | 'salary' | 'travel' | 'equipment' | 'other';
export type IncomeSourceType = 'invoice' | 'product_sale' | 'subscription' | 'other';

export interface IncomeEntry {
  id: string;
  org_id: string;
  source_type: IncomeSourceType;
  source_id?: string;
  client_name?: string;
  amount: number;
  currency: string;
  category?: string;
  received_at: string;
  payment_method?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface ExpenseEntry {
  id: string;
  org_id: string;
  category: ExpenseCategory;
  vendor?: string;
  amount: number;
  currency: string;
  gst_paid: number;
  is_recurring?: boolean;
  receipt_url?: string;
  spent_at: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface TaxRecord {
  id: string;
  org_id: string;
  period: string;
  gross_income: number;
  total_expenses: number;
  taxable_income: number;
  gst_collected: number;
  gst_paid: number;
  gst_payable: number;
  status: 'draft' | 'filed';
  created_at: string;
}

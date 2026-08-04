-- ==========================================================
-- Hesics OS — Phase 1 Supabase PostgreSQL Schema & Seeds
-- ==========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Core Tables
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gstin text,
  entity_type text check (entity_type in ('proprietorship', 'partnership', 'pvt_ltd', 'other')),
  logo_url text,
  created_at timestamptz default now()
);

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  description text
);

create table if not exists role_permissions (
  role_id uuid references roles(id) on delete cascade,
  permission_id uuid references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists user_roles (
  user_id uuid references users(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  role_id uuid references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  action text not null, -- 'create', 'update', 'delete'
  entity_type text not null,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz default now()
);

-- 2. CRM Tables
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  company_name text,
  phone text,
  email text,
  source text default 'referral', -- referral/instagram/cold_dm/website/other
  status text default 'lead', -- lead/active/churned
  owner_id uuid references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  value numeric(12,2) default 0.00,
  currency text default 'INR',
  stage text default 'new', -- new/contacted/quoted/negotiation/won/lost
  probability int default 20,
  expected_close_date date,
  owner_id uuid references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  deal_id uuid references deals(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  deal_id uuid references deals(id) on delete cascade,
  type text not null, -- call/dm/email/meeting
  outcome text,
  follow_up_date date,
  author_id uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  quote_number text not null,
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) default 0.00,
  tax numeric(12,2) default 0.00,
  total numeric(12,2) default 0.00,
  status text default 'draft', -- draft/sent/accepted/rejected
  valid_until date,
  pdf_url text,
  created_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  quotation_id uuid references quotations(id) on delete set null,
  invoice_number text not null,
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) default 0.00,
  tax numeric(12,2) default 0.00,
  total numeric(12,2) default 0.00,
  status text default 'draft', -- draft/sent/paid/overdue
  due_date date,
  paid_at timestamptz,
  pdf_url text,
  created_at timestamptz default now()
);

-- 3. Indexes
create index if not exists idx_clients_org_status on clients (org_id, owner_id, status);
create index if not exists idx_deals_org_stage on deals (org_id, stage, owner_id);
create index if not exists idx_activities_org_followup on activities (org_id, follow_up_date);
create index if not exists idx_invoices_org_status on invoices (org_id, status, due_date);

-- 4. Seed Permissions
insert into permissions (key, description) values
  ('clients:read', 'View clients directory and client details'),
  ('clients:write', 'Create and edit client profiles'),
  ('clients:delete', 'Delete clients from directory'),
  ('deals:read', 'View sales deals and Kanban pipeline'),
  ('deals:write', 'Create, move, and edit deals'),
  ('invoices:read', 'View quotations and invoices'),
  ('invoices:write', 'Create, edit, convert, and manage quotations/invoices'),
  ('finance:read', 'View financial summaries and tax reports'),
  ('finance:write', 'Manage income and expense records'),
  ('team:manage', 'Manage team members, assign roles, and modify RBAC permissions')
on conflict (key) do nothing;

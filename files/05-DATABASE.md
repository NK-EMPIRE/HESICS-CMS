# Hesics OS — Database Schema (PostgreSQL / Supabase)

## Conventions
- All tables: `id uuid primary key default gen_random_uuid()`
- All tables (except global seeds): `org_id uuid not null references organizations(id)`
- All tables: `created_at timestamptz default now()`, `updated_at timestamptz default now()` (via trigger)
- Money fields: `numeric(12,2)`, always paired with `currency text default 'INR'`
- RLS enabled on every table, default-deny, explicit policies per role/permission

---

## Core

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gstin text,
  entity_type text, -- proprietorship/partnership/pvt_ltd
  logo_url text,
  created_at timestamptz default now()
);

create table users (
  id uuid primary key references auth.users(id),
  org_id uuid not null references organizations(id),
  name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  name text not null -- Founder, Sales, Editor, Finance, Intern
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null -- clients:read, finance:write, team:manage, etc.
);

create table role_permissions (
  role_id uuid references roles(id),
  permission_id uuid references permissions(id),
  primary key (role_id, permission_id)
);

create table user_roles (
  user_id uuid references users(id),
  org_id uuid references organizations(id),
  role_id uuid references roles(id),
  primary key (user_id, role_id)
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  user_id uuid references users(id),
  action text not null, -- 'create','update','delete'
  entity_type text not null,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz default now()
);
```

## CRM

```sql
create table clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  name text not null,
  company_name text,
  phone text,
  email text,
  source text, -- referral/instagram/cold_dm/website
  status text default 'lead', -- lead/active/churned
  owner_id uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  client_id uuid not null references clients(id),
  title text not null,
  value numeric(12,2),
  currency text default 'INR',
  stage text default 'new', -- new/contacted/quoted/negotiation/won/lost
  probability int,
  expected_close_date date,
  owner_id uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  client_id uuid references clients(id),
  deal_id uuid references deals(id),
  author_id uuid references users(id),
  content text not null,
  created_at timestamptz default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  client_id uuid references clients(id),
  deal_id uuid references deals(id),
  type text, -- call/dm/email/meeting
  outcome text,
  follow_up_date date,
  author_id uuid references users(id),
  created_at timestamptz default now()
);

create table quotations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  client_id uuid not null references clients(id),
  deal_id uuid references deals(id),
  quote_number text not null,
  line_items jsonb not null default '[]',
  subtotal numeric(12,2),
  tax numeric(12,2),
  total numeric(12,2),
  status text default 'draft', -- draft/sent/accepted/rejected
  valid_until date,
  pdf_url text,
  created_at timestamptz default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  client_id uuid not null references clients(id),
  deal_id uuid references deals(id),
  quotation_id uuid references quotations(id),
  invoice_number text not null,
  line_items jsonb not null default '[]',
  subtotal numeric(12,2),
  tax numeric(12,2),
  total numeric(12,2),
  status text default 'draft', -- draft/sent/paid/overdue
  due_date date,
  paid_at timestamptz,
  pdf_url text,
  created_at timestamptz default now()
);
```

## Finance

```sql
create table income_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  source_type text not null, -- invoice/product_sale/subscription/other
  source_id uuid,
  amount numeric(12,2) not null,
  currency text default 'INR',
  category text,
  received_at date not null,
  payment_method text,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table expense_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  category text not null, -- software/marketing/salary/travel/equipment/other
  vendor text,
  amount numeric(12,2) not null,
  currency text default 'INR',
  gst_paid numeric(12,2) default 0,
  is_recurring boolean default false,
  receipt_url text,
  spent_at date not null,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table tax_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  period text not null, -- '2026-Q2'
  gross_income numeric(12,2),
  total_expenses numeric(12,2),
  taxable_income numeric(12,2),
  gst_collected numeric(12,2),
  gst_paid numeric(12,2),
  gst_payable numeric(12,2),
  estimated_income_tax numeric(12,2),
  status text default 'draft', -- draft/filed
  created_at timestamptz default now()
);
```

## Digital Products

```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  name text not null,
  type text, -- digital_product/course/template/service
  price numeric(12,2),
  currency text default 'INR',
  status text default 'draft', -- draft/live/archived
  created_at timestamptz default now()
);

create table funnels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  product_id uuid not null references products(id),
  name text,
  stages jsonb default '["landing_view","checkout_start","purchase"]'
);

create table funnel_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  funnel_id uuid not null references funnels(id),
  session_id text,
  stage text not null,
  utm_source text,
  utm_medium text,
  occurred_at timestamptz default now()
);

create table sales (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  product_id uuid not null references products(id),
  client_id uuid references clients(id),
  amount numeric(12,2) not null,
  payment_method text,
  occurred_at timestamptz default now()
);
```

## SaaS Tracking

```sql
create table saas_products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  name text not null, -- Settla, first-selfie-studio
  stage text default 'mvp', -- mvp/beta/live
  pricing_model text,
  launched_at date
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  saas_product_id uuid not null references saas_products(id),
  client_id uuid references clients(id),
  plan text,
  mrr_amount numeric(12,2),
  status text default 'trial', -- active/churned/trial
  started_at date,
  churned_at date
);

create table saas_metrics_snapshot (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  saas_product_id uuid not null references saas_products(id),
  date date not null,
  mrr numeric(12,2),
  active_users int,
  churn_count int
);
```

## Indexes (add these — you WILL filter by these constantly)

```sql
create index on clients (org_id, owner_id, status);
create index on deals (org_id, stage, owner_id);
create index on activities (org_id, follow_up_date);
create index on invoices (org_id, status, due_date);
create index on income_entries (org_id, received_at);
create index on expense_entries (org_id, spent_at, category);
create index on funnel_events (org_id, funnel_id, stage);
create index on subscriptions (org_id, saas_product_id, status);
```

## RLS Policy Pattern (example — replicate per table)

```sql
alter table clients enable row level security;

create policy "org members can read clients"
on clients for select
using (
  org_id in (select org_id from users where id = auth.uid())
  and exists (
    select 1 from user_roles ur
    join role_permissions rp on rp.role_id = ur.role_id
    join permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid() and p.key = 'clients:read'
  )
);
-- Repeat for insert/update/delete with respective permission keys
```

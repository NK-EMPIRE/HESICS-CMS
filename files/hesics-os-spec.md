# Hesics OS — Business Operating System
Founder: Peer Sheik Mydeen | Core team: NK + Sheik | Built to scale with team

## 0. Reality Check
The moment you add "income tracker, expense tracker, tax calc, digital product funnels, SaaS tracking, multi-member" — this stops being a CRM and becomes an internal ERP. That's a different architecture decision: you need **modular, multi-tenant-ready design from day 1**, or you'll be rewriting the DB schema every time you add a feature. Also — don't build all 6 modules simultaneously. You'll ship nothing. Sequence matters. I'll tell you the order at the end.

---

## 1. System Architecture (Modular, Built to Scale)

```
HESICS OS
├── Core (shared across everything)
│   ├── Auth & Org (multi-user, roles, permissions)
│   ├── Client/Contact Directory
│   └── Activity/Audit Log (who did what, when — critical once team grows)
│
├── Module: CRM
│   ├── Pipeline/Deals
│   ├── Outreach tracker
│   └── Quotation → Invoice
│
├── Module: Finance
│   ├── Income tracker (linked to invoices + product sales)
│   ├── Expense tracker
│   ├── Tax calculator (GST for India)
│   └── P&L dashboard
│
├── Module: Digital Products
│   ├── Product catalog (courses, templates, etc.)
│   ├── Sales funnel tracker (landing page → checkout → purchase)
│   └── Revenue per product
│
├── Module: SaaS Tracking
│   ├── Product registry (Settla, first-selfie-studio, etc.)
│   ├── Subscription/MRR tracker
│   └── Usage/health metrics (optional, later)
│
└── Module: Team/HR (once you're 4-5+ people)
    ├── Role assignment
    ├── Task/project tracking per member
    └── Commission/payout tracking (if freelancers/affiliates involved)
```

**Why modular matters:** each module is its own set of tables + its own routes, but they all reference the same `organizations`, `users`, and `clients` core. This means when you add a member, or add a 7th module in 6 months, you're not touching existing modules. This is how real SaaS companies (and internal tools at companies like Zoho, who are literally from Tamil Nadu and built an empire doing exactly this) structure it.

---

## 2. RBAC — Built for Team Growth (not just 2 people)

Don't hardcode "owner/member." Use a permission-based system from day 1:

```
roles
  id, org_id, name (e.g. "Founder", "Sales", "Editor", "Finance", "Intern")

permissions (seed these, don't let users invent them)
  clients:read, clients:write, clients:delete
  deals:read, deals:write
  finance:read, finance:write        ← lock this down hard
  invoices:read, invoices:write
  products:read, products:write
  team:manage

role_permissions
  role_id, permission_key

user_roles
  user_id, org_id, role_id
```

**Practical setup for you right now:**
- Peer Sheik Mydeen (Founder) — all permissions
- You + Sheik (Co-founders/Ops) — all except `team:manage` maybe, your call
- Future editor/intern — `clients:read`, `deals:write`, no `finance:*` access

This is the #1 thing people skip and regret. When you're 6 people and an intern can see your bank-level income data because you were lazy with permissions — that's on you, not the intern.

---

## 3. Full Data Model (Postgres/Supabase)

### Core
```
organizations (id, name, gstin, logo_url, created_at)
users (id, org_id, name, email, avatar_url, created_at)
roles (id, org_id, name)
permissions (id, key)
role_permissions (role_id, permission_id)
user_roles (user_id, org_id, role_id)
audit_log (id, org_id, user_id, action, entity_type, entity_id, meta jsonb, created_at)
```

### CRM (as before)
```
clients (id, org_id, name, company_name, phone, email, source, status, owner_id, created_at)
deals (id, org_id, client_id, title, value, stage, probability, expected_close_date, owner_id)
notes (id, org_id, client_id, deal_id, author_id, content, created_at)
activities (id, org_id, client_id, deal_id, type, outcome, follow_up_date, author_id, created_at)
quotations (id, org_id, client_id, deal_id, quote_number, line_items jsonb, subtotal, tax, total, status, valid_until, pdf_url)
invoices (id, org_id, client_id, deal_id, quotation_id, invoice_number, line_items jsonb, subtotal, tax, total, status, due_date, paid_at, pdf_url)
```

### Finance
```
income_entries
  id, org_id, source_type (invoice/product_sale/saas_subscription/other),
  source_id (nullable FK), amount, currency, category, 
  received_at, payment_method, notes, created_by

expense_entries
  id, org_id, category (software/marketing/salary/travel/equipment/other),
  vendor, amount, currency, gst_paid, is_recurring, 
  receipt_url, spent_at, notes, created_by

tax_records
  id, org_id, period (e.g. "2026-Q2"), 
  gross_income, total_expenses, taxable_income,
  gst_collected, gst_paid, gst_payable,
  estimated_income_tax, status (draft/filed), created_at
```

Tax calc logic (India-specific, since you're TN-based):
- GST: 18% on most services (agency work) — track output GST (collected from clients) vs input GST (paid on expenses) → net payable
- Income tax: depends on entity type (are you registered as proprietorship/partnership/Pvt Ltd? This changes slabs — flag this as a question, don't guess)
- Auto-calculate quarterly liability from income_entries - expense_entries

### Digital Products
```
products
  id, org_id, name, type (digital_product/course/template/service),
  price, currency, status (draft/live/archived), created_at

funnels
  id, org_id, product_id, name, 
  stages jsonb (e.g. ["landing_view","checkout_start","purchase"])

funnel_events
  id, org_id, funnel_id, session_id, stage, 
  utm_source, utm_medium, occurred_at

sales
  id, org_id, product_id, client_id (nullable — could be anonymous buyer),
  amount, payment_method, occurred_at
```

Funnel tracking realistically means: embed a small tracking script/webhook on your landing pages (or Gumroad/Razorpay webhook) → fires `funnel_events` → dashboard shows conversion rate view→checkout→purchase. Don't build custom analytics from scratch — hook into what you already use (Razorpay/Instamojo/Gumroad webhooks) and just log events.

### SaaS Tracking
```
saas_products
  id, org_id, name (e.g. "Settla"), stage (mvp/beta/live), 
  pricing_model, launched_at

subscriptions
  id, org_id, saas_product_id, client_id, plan, mrr_amount,
  status (active/churned/trial), started_at, churned_at

saas_metrics_snapshot
  id, org_id, saas_product_id, date, mrr, active_users, churn_count
```

---

## 4. Tech Stack (unchanged core, add these for new modules)

| Need | Tool | Why |
|---|---|---|
| Core stack | TanStack Start + Supabase + Tailwind/shadcn | Consistent with what you know |
| Charts (finance/funnel dashboards) | Recharts | Lightweight, good with React |
| PDF (invoices/quotes/tax reports) | @react-pdf/renderer | Already planned |
| Webhooks (payment gateways) | Supabase Edge Functions | Catch Razorpay/Gumroad events, write to `sales`/`income_entries` |
| Scheduled jobs (tax period rollups, MRR snapshots) | Supabase Cron / pg_cron | Native to Postgres, no extra infra |
| File storage (receipts, PDFs) | Supabase Storage | Already in stack |

**Don't add:** a separate accounting software integration (Zoho Books/Tally) yet. Build native tracking first — integrate later only if manual entry becomes real pain at higher volume.

---

## 5. Dashboard Structure (this is now the real product)

```
/dashboard                    → org-wide: MRR, monthly income vs expense, overdue follow-ups, pipeline value
/clients, /clients/:id
/deals (Kanban), /deals/:id
/quotations, /invoices
/finance
  /finance/income             → table + filters by source/category
  /finance/expenses           → table + filters, receipt uploads
  /finance/tax                → quarterly GST + income tax estimates
  /finance/reports            → P&L, monthly/quarterly export
/products
  /products                   → digital product catalog
  /products/:id/funnel        → funnel visual (view→checkout→purchase %)
  /products/:id/sales         → sales log
/saas
  /saas                       → all products (Settla, first-selfie-studio) with MRR at a glance
  /saas/:id                   → subscriptions, churn, growth chart
/team
  /team                       → members, roles, permissions
  /team/:id                   → individual performance (deals closed, tasks)
/settings                     → org info, GSTIN, branding, permission templates
```

---

## 6. Build Order — Sequenced, Not Simultaneous

Building everything at once = shipping nothing. Sequence by what stops the bleeding first:

**Phase 1 (Weeks 1-2) — Foundation + CRM**
Core (auth/org/roles) → Clients → Deals → Notes/Activities → Quotations → Invoices
*(This is the previous spec — build this first, exactly as planned.)*

**Phase 2 (Week 3) — Finance**
Income/expense tracker manual entry first (no automation yet) → Tax calculator (quarterly GST estimate) → P&L dashboard
*Why now: you need to see money clearly before you scale anything else.*

**Phase 3 (Week 4) — Team scaling**
Full RBAC with custom roles → invite flow → audit log
*Why now: only build this once you're actually about to add a 3rd/4th person. Don't over-engineer permissions for a team of 2.*

**Phase 4 (Weeks 5-6) — Digital Products + Funnel**
Product catalog → manual sales log → webhook integration with your payment gateway → funnel dashboard
*Why now: only matters once you actually have a digital product live. If you don't have one yet, this phase moves down the list — don't build tracking for products that don't exist.*

**Phase 5 (Week 7+) — SaaS Tracking**
Settla + first-selfie-studio registered as products → manual MRR entry → automate via Stripe/Razorpay webhook later
*Why last: Settla is still pre-launch. Build this when you have actual subscribers to track, not before.*

---

## 7. Antigravity-Ready Prompt — Phase 1 (start here)

```
Build Hesics OS Phase 1 using TanStack Start + Supabase + Tailwind + shadcn/ui.

Core schema: organizations, users, roles, permissions, role_permissions, 
user_roles, audit_log, clients, deals, notes, activities, quotations, invoices.
(Full schema attached separately — build tables exactly as specified.)

Design the RBAC as permission-based (not hardcoded owner/member) so new roles 
can be added later without schema changes.

Pages: /dashboard, /clients, /clients/:id, /deals (Kanban drag-drop), /deals/:id,
/quotations, /quotations/:id (line item editor + PDF export), 
/invoices, /invoices/:id, /settings.

Auth: Supabase magic link. On signup, first user becomes Founder role with 
all permissions auto-assigned.

Design: dark-base editorial, Space Grotesk headings, Inter body, single orange 
accent (#FF6B00), minimal. This is the foundation for a larger modular system 
(Finance, Products, SaaS tracking modules come later) — keep the org/auth/permission 
layer generic enough that new modules can plug in without touching this code.

Build incrementally: schema+auth first, then clients, then deals, then quotes/invoices.
```

*(Phase 2-5 prompts follow the same pattern — I'll generate each when you're ready to build that phase. Don't hand Antigravity all 5 phases at once, it'll get sloppy on scope.)*

---

## 8. The Actual Hard Truth
Everyone building "the operating system for my business" at your stage makes the same mistake: they build finance, products, and SaaS tracking modules for revenue streams that don't exist yet or are too small to need tracking. Settla is pre-launch. Digital products — do you have one selling right now? If not, Phase 4 and 5 are **fantasy features**. Build CRM + Finance first (Phase 1-2). That's 80% of your actual operational pain right now. Everything else — build it when the revenue stream is real enough to need tracking, not before. Premature infrastructure is how solo founders burn 3 months building tools instead of closing clients.

# Hesics OS — Architecture Doc

## 1. System Overview
Modular monolith on Supabase + TanStack Start. Not microservices — you're 2-5 people, microservices would be self-sabotage. One codebase, one database, logically separated modules (routes + table namespaces), each module can be built/deployed independently without breaking others.

```
┌─────────────────────────────────────────────────┐
│              TanStack Start (Vercel)              │
│  ┌───────┐ ┌───────┐ ┌────────┐ ┌────────────┐   │
│  │  CRM  │ │Finance│ │Products│ │SaaS/Team   │   │
│  │routes │ │routes │ │ routes │ │  routes    │   │
│  └───┬───┘ └───┬───┘ └───┬────┘ └─────┬──────┘   │
│      └─────────┴───────┬─┴────────────┘          │
│                 TanStack Query (data layer)        │
└──────────────────────┬──────────────────────────┘
                        │
          ┌─────────────┴──────────────┐
          │         Supabase            │
          │  ┌────────┐  ┌───────────┐  │
          │  │Postgres│  │Auth (RLS) │  │
          │  │  + RLS │  │           │  │
          │  └────────┘  └───────────┘  │
          │  ┌────────┐  ┌───────────┐  │
          │  │Storage │  │Edge Funcs │  │
          │  │(PDFs)  │  │(webhooks) │  │
          │  └────────┘  └───────────┘  │
          └─────────────┬──────────────┘
                         │
          ┌──────────────┴──────────────┐
          │   External Integrations      │
          │  Razorpay/Gumroad webhooks    │
          │  n8n (WhatsApp automation)    │
          │  Resend (email)               │
          └───────────────────────────────┘
```

## 2. Core Architectural Decisions

### 2.1 Multi-tenancy: org_id everywhere
Every table (except `permissions`, a global seed table) carries `org_id`. Even though you're one org today, this future-proofs for: sub-brands (PurpleAura vs Hesics_Aura as separate orgs under one umbrella?), or if you ever spin this into a product other agencies use. Enforced via RLS, not app logic — the database itself refuses cross-org reads.

### 2.2 Permission enforcement at DB layer (RLS), not just UI
Never trust the frontend to hide what a role shouldn't see. Postgres Row-Level Security policies check `user_roles` + `role_permissions` on every query. Example: a `finance:read`-less user's query for `income_entries` returns zero rows, even if they inspect network requests directly.

### 2.3 Event-driven links between modules (not tight coupling)
When an invoice is marked "paid," it should auto-create an `income_entries` row — but Finance module code shouldn't be hardcoded inside the Invoices module. Use a lightweight trigger/function pattern (Postgres trigger or Edge Function on `invoices` update) that writes to `income_entries`. This means Finance module can evolve independently without breaking Invoices.

### 2.4 Webhooks as the integration boundary
Payment gateway (Razorpay/Gumroad) → Supabase Edge Function → writes to `sales` + `funnel_events` + `income_entries`. All external system integration happens at this one boundary — never let external APIs get called directly from frontend code.

## 3. Module Boundaries (logical, same DB)

| Module | Owns tables | Reads from |
|---|---|---|
| Core | organizations, users, roles, permissions, audit_log | — |
| CRM | clients, deals, notes, activities, quotations, invoices | Core |
| Finance | income_entries, expense_entries, tax_records | CRM (invoices), Products (sales), SaaS (subscriptions) |
| Products | products, funnels, funnel_events, sales | Core |
| SaaS | saas_products, subscriptions, saas_metrics_snapshot | Core |

Rule: a module can **read** another module's tables via defined queries, but should never **write** to another module's tables directly except via the trigger/event pattern in 2.3.

## 4. Audit & Accountability Layer
Every write to a sensitive table (finance, invoices, permission changes) logs to `audit_log`: who, what, when, before/after state (jsonb diff). Non-negotiable once team grows past 2 — you need to know who touched what, especially on finance data.

## 5. Scaling Path (when you outgrow this)
- **Now → 5 people:** current architecture handles this fine, zero changes needed
- **5 → 15 people:** consider splitting Edge Functions into dedicated background job queue (Supabase → Trigger.dev or similar) if webhook volume grows
- **If Hesics OS becomes a product other agencies pay for:** THEN consider actual multi-tenant SaaS hardening (separate compute per org, dedicated infra review) — not before. Don't architect for a hypothetical product launch that doesn't exist yet.

## 6. Deployment Environments
```
Local dev → Staging (Supabase staging project + Vercel preview) → Production
```
Never point local/staging at production Supabase project. Seed staging with fake client data for testing quote/invoice generation.

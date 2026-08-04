# Hesics OS — Product Requirements Document

## 1. Product Vision
Hesics OS is the internal operating system for Hesics_Aura — unifying CRM, finance, digital product sales, and SaaS product tracking into one tool the founding team (and future hires) run the business from daily. Not a SaaS to sell (yet) — an internal weapon to make Hesics operate like a company 5x its size.

## 2. Problem Statement
- Clients, deals, and follow-ups live in scattered chats/notes → deals die from forgotten follow-ups
- Quotation/invoice creation is manual, slow, unbranded → looks unprofessional, delays cash
- No visibility into actual income vs expenses → decisions made blind
- No tax provisioning → GST/income tax becomes a scramble, not a plan
- Multiple ventures (PurpleAura, Settla, Hesics_Aura, digital products) with zero unified tracking
- Team is about to grow — no permission structure, no accountability layer

## 3. Goals (v1, 90 days)
| Goal | Metric |
|---|---|
| Reduce deal follow-up drop-off | 0 leads lost to "forgot to follow up" |
| Speed up quote-to-invoice | Under 5 minutes to send a professional quote |
| Financial clarity | Real-time income/expense view, updated same-day |
| Tax readiness | Quarterly GST liability known before due date, always |
| Team scalability | Add a 3rd member without re-architecting permissions |

## 4. Non-Goals (v1)
- Not a public-facing SaaS product
- Not a full accounting system (no ledger/double-entry bookkeeping — that's Tally/Zoho Books territory)
- No client-facing portal
- No mobile app (responsive web is enough)

## 5. Users & Roles
- **Founder** (Peer Sheik Mydeen) — full visibility, finance access, team management
- **Co-founder/Ops** (NK, Sheik) — CRM + finance + products, no team-deletion rights
- **Future hires** (editor, sales, intern) — scoped access per role, defined at invite time

## 6. Feature Requirements by Module

### 6.1 CRM (P0 — build first)
- Add/edit/search clients with source tagging (referral, Instagram, cold DM, etc.)
- Deal pipeline (Kanban): New → Contacted → Quoted → Negotiation → Won/Lost
- Notes + timestamped activity log per client/deal
- Follow-up date field on every activity — dashboard surfaces overdue ones
- Quotation builder: dynamic line items, tax calc, PDF export, branded
- One-click quote → invoice conversion
- Invoice status tracking: draft/sent/paid/overdue

### 6.2 Finance (P0)
- Manual income entry (with source linkage: invoice/product/subscription/other)
- Manual expense entry with category + optional receipt upload
- Quarterly GST liability auto-calculated from income/expense entries
- P&L dashboard: monthly/quarterly view, income vs expense trend

### 6.3 Digital Products (P1 — build only when a product is actually live)
- Product catalog
- Funnel stage tracking (view → checkout → purchase) via payment gateway webhook
- Per-product revenue reporting

### 6.4 SaaS Tracking (P1 — build only when Settla has paying users)
- Product registry (Settla, first-selfie-studio)
- Subscription tracking, MRR calculation
- Churn tracking

### 6.5 Team/Permissions (P0, lightweight now — expand later)
- Role-based permission system (not hardcoded)
- Invite flow
- Audit log of who changed what

## 7. Success Criteria for v1 Launch
- Both founders using it daily for every new client/deal within week 1
- Zero client lost due to missed follow-up within month 1
- First quote generated and sent from the system within week 2
- Q1 GST estimate available inside the tool before the actual filing deadline

## 8. Open Questions (answer before Phase 2)
- Entity type: proprietorship / partnership / Pvt Ltd? (Changes tax calc entirely)
- GSTIN registered? What's the applicable GST rate for your service mix?
- Is there a live digital product with real transactions today, or is this speculative?
- Is Settla monetized yet, or still pre-revenue?

Don't let Phase 4/5 features get built against these open questions unanswered — that's how you build tracking for revenue that doesn't exist.

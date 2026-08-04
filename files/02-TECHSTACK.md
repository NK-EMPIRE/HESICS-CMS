# Hesics OS — Tech Stack

## Principle
Use what you already know (TanStack Start + Supabase + Vercel, from first-selfie-studio). Zero new learning curve = faster ship. Don't chase trendy stacks — chase shipped product.

## Frontend
| Layer | Choice | Notes |
|---|---|---|
| Framework | TanStack Start (React) | Already proven in your stack |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| Components | shadcn/ui | Accessible, unstyled-by-default, matches your editorial design language |
| State/data | TanStack Query | Pairs natively with TanStack Start |
| Forms | React Hook Form + Zod | Type-safe validation, esp. important for quote/invoice line items |
| Charts | Recharts | Finance dashboards, funnel visualizations |
| Drag-drop (Kanban) | dnd-kit | Lightweight, accessible |
| PDF generation | @react-pdf/renderer | Code-based templates for quotes/invoices/tax reports |

## Backend
| Layer | Choice | Notes |
|---|---|---|
| Database | Supabase (Postgres) | Managed Postgres, generous free tier, scales with you |
| Auth | Supabase Auth (magic link) | Zero password management, fast onboarding for new hires |
| Row-level security | Postgres RLS policies | Enforce org-level + role-level data isolation at the DB layer — not just app layer |
| File storage | Supabase Storage | Receipts, PDFs, logos |
| Serverless functions | Supabase Edge Functions (Deno) | Payment webhook handlers, PDF generation triggers |
| Scheduled jobs | pg_cron (native to Supabase) | Monthly MRR snapshots, quarterly tax rollups |
| Realtime sync | Supabase Realtime | Live Kanban updates when both of you are working simultaneously |

## Infra
| Layer | Choice | Notes |
|---|---|---|
| Hosting | Vercel | Already your deploy target |
| Environment | Staging + Production Supabase projects | Never test against real client data |
| Domain | ops.hesicsaura.com (suggested) | Internal tool subdomain, separate from client-facing sites |

## Integrations (Phase 2+)
| Need | Tool |
|---|---|
| Payment webhooks | Razorpay / Instamojo / Gumroad (whichever you use for digital products) |
| WhatsApp send (quote/invoice links) | Existing n8n WhatsApp workflow you already built |
| Email delivery | Resend or Supabase's built-in SMTP relay |

## Explicitly Rejected (and why)
- **Separate backend (Node/Express/NestJS):** Supabase + Edge Functions cover 100% of your backend needs at this scale. Adding a separate backend = double the infra to maintain for zero benefit.
- **Firebase:** Postgres > NoSQL for relational data like deals/invoices/tax records. You need joins, not documents.
- **Zoho CRM/Books integration:** Premature. Build native first; integrate only if manual entry becomes real pain at higher volume.
- **Mobile app (React Native/Flutter):** Responsive web via TanStack Start covers you. Building native mobile now is a distraction, not a need.

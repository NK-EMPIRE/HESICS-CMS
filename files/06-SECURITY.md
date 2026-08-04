# Hesics OS — Security Doc

## 0. Reality Check
This tool holds your client contacts, deal values, income/expense, and eventually tax data — the most sensitive data your company has. One leaked link or one over-permissioned intern account and you've handed a competitor your entire client list and pricing. Security here isn't optional polish — it's the difference between a business asset and a liability.

## 1. Authentication
- Supabase Auth with magic-link (passwordless) — removes password-reuse risk entirely
- Session tokens short-lived, auto-refresh via Supabase SDK
- No shared logins, ever — every team member gets their own account, even interns. Shared logins destroy your audit trail.

## 2. Authorization (Row-Level Security)
- Every table has RLS enabled, default-deny
- Permissions checked at the database layer, not just hidden in the UI — a curious/malicious user inspecting network requests should get empty results, not a client-side-only block
- Finance module (`income_entries`, `expense_entries`, `tax_records`) restricted to `finance:read`/`finance:write` permission holders only — default OFF for any new role until explicitly granted

## 3. Data Isolation
- `org_id` on every table, enforced via RLS — even though you're one org today, this prevents any future data bleed if you ever spin off a sub-brand or bring on a white-label partner
- Staging environment uses fully separate Supabase project — never seed staging with real client data

## 4. Sensitive Data Handling
- GSTIN, bank details, client contact info: stored encrypted at rest (Supabase/Postgres default encryption covers this) — don't store anything in plaintext client-side state longer than needed
- PDFs (quotes/invoices with client financial data) stored in Supabase Storage with signed URLs (time-limited access), not public buckets
- Receipt uploads (expense tracking): same signed-URL pattern, never public

## 5. Audit Trail
- Every write to `clients`, `deals`, `invoices`, `income_entries`, `expense_entries`, `user_roles` logged to `audit_log` with before/after diff
- This is your evidence trail if something goes wrong — a wrong invoice number, a permission escalation, a deleted client record. Don't skip this table to save build time.

## 6. Webhook Security (Payment Gateway Integrations)
- Every incoming webhook (Razorpay/Gumroad) MUST verify signature before processing — never trust an unsigned POST claiming "payment received." This is the #1 way fake-payment fraud happens.
- Webhook endpoints rate-limited via Supabase Edge Function config

## 7. Secrets Management
- API keys (Razorpay, Resend, etc.) stored in Supabase Edge Function environment variables — never in frontend code, never committed to git
- Rotate keys immediately if anyone leaves the team or a repo is ever made public accidentally

## 8. Access Offboarding
- When a team member leaves: revoke `user_roles` immediately, don't just "deactivate" — actually pull permissions same day
- Audit log preserves their historical actions even after removal (don't delete their `users` row, just revoke access)

## 9. Backup & Recovery
- Supabase automatic daily backups (available on paid tier — worth paying for once real client/financial data lives here)
- Export critical tables (`clients`, `invoices`, `income_entries`) to CSV monthly as a manual off-platform backup — cheap insurance against platform-level incidents

## 10. What NOT to over-engineer (yet)
- SOC2/ISO compliance — irrelevant until you're selling this as a product to enterprise clients
- Multi-factor auth beyond magic-link — revisit only if team grows past ~10 or handles higher-stakes data
- Penetration testing — premature at this scale; revisit if this ever becomes a paid external product

## 11. The One Rule That Matters Most
**Never let convenience beat access control.** It'll be tempting to give an intern "just admin access, easier for now." Don't. The day you regret it is the day a client's financial data or your entire pipeline leaks to a competitor because someone's phone got into the wrong hands. Scope every invite tightly, every time.

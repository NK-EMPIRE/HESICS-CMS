# Hesics OS — Design Doc

## 1. Design Philosophy
This is an internal tool, not a marketing site. Optimize for speed-of-use and clarity over visual flair. But since it carries the Hesics_Aura brand (PDFs go to real clients), the *output artifacts* (quotes, invoices) should look premium — matching your naveenkarthick.ai editorial system. Two different design budgets: **minimal for the app UI, premium for client-facing PDFs.**

## 2. Visual System

### Color
- Base: dark neutral (#0A0A0A / #121212) — matches your existing brand direction
- Surface: #1A1A1A / #1E1E1E for cards/panels
- Single accent: Orange (#FF6B00 or similar) — used sparingly for primary actions, active states, alerts (overdue follow-ups)
- Status colors (functional, not decorative): green (paid/won), amber (pending/in-progress), red (overdue/lost) — desaturated versions, not neon

### Typography
- Headings: Space Grotesk
- Body: Inter
- Numeric/financial data: JetBrains Mono (tabular figures for income/expense tables — numbers must align)

### Layout
- Sidebar nav (persistent): Dashboard, Clients, Deals, Quotations, Invoices, Finance, Products, SaaS, Team, Settings
- Dense data tables for Clients/Invoices/Finance — this is a working tool, not a showcase. Prioritize information density over whitespace.
- Kanban board for Deals — cards show: client name, deal value, days-in-stage, owner avatar
- Dashboard: card-based KPI strip up top (pipeline value, overdue follow-ups, MTD income/expense, cash position), then activity feed below

## 3. Key Screen Patterns

### Dashboard
- Top row: 4 KPI cards (Pipeline Value, Overdue Follow-ups [red if >0], MTD Income, MTD Expense)
- Middle: Deal stage funnel chart + Income vs Expense trend line
- Bottom: Activity feed (recent notes/activities across team)

### Client Profile
- Left panel: contact info, tags, owner, status
- Right panel: tabbed — Notes | Activities | Deals | Quotes/Invoices
- Always-visible "Add Note" quick action (this is the highest-frequency action — make it one click, not buried in a menu)

### Deal Kanban
- Columns = stages, drag-drop between them
- Card shows deal value + days stagnant in current stage (color shifts amber→red the longer it sits — visual pressure to move deals forward)

### Quotation/Invoice Editor
- Split view: line-item editor (left) + live PDF preview (right)
- This is the highest-stakes screen — client sees the PDF output directly. Make the preview accurate to the actual generated PDF, no surprises.

### Finance Tables
- Income/Expense: filterable table, category chips, monthly grouping
- Tax page: single clear number up top ("Estimated Q2 GST Payable: ₹X"), breakdown below

## 4. PDF Templates (Quotes/Invoices) — This Is What Clients See
- Hesics_Aura logo top-left, clean header with quote/invoice number + date + validity
- Client info block, line items table (desc/qty/rate/amount), subtotal/tax/total clearly separated
- Footer: payment terms, bank details/UPI, thank-you note
- Design language: same dark-editorial-meets-clean aesthetic, but PDFs should default to white/light background for print practicality unless you specifically want dark-mode PDFs (unusual for client-facing docs — recommend light for print/readability)

## 5. Interaction Principles
- Every list view has inline quick actions (no forced navigation to a detail page for simple edits)
- Overdue anything (follow-ups, invoices) gets a persistent red badge in the sidebar nav — you should never NOT know something's overdue
- Keyboard shortcuts for power users (you'll be in this tool daily): `c` = new client, `d` = new deal, `q` = new quote

## 6. Accessibility & Responsiveness
- Fully responsive (you'll check this on your phone between client calls)
- WCAG AA contrast minimum even in dark mode — don't sacrifice readability for aesthetic

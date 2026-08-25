# HESICS Focused Production Implementation Plan

## Goal

Make HESICS genuinely usable and secure in production by delivering the **Clients workspace first**, then connecting it to quotations, invoices, deals, activities, meetings, files, and follow-up automation. At the same time, establish clear role-specific workspaces for superadmins, employees, interns, and affiliates without exposing private performance or credential data to the wrong people.

This plan narrows the first implementation milestone so the product becomes useful quickly instead of attempting every future integration at once. Zoom, Notion, mobile, and broader app integrations remain part of the target platform, but they will be connected through the same secure integration architecture after the client and workflow foundation is reliable.

## Current Baseline

The repository already contains a Clients page, Deals Board, Meetings, Finance, Quotations, Invoices, Agreements, Team/RBAC, Audit Logs, Private Vault, local/Firestore data handling, and a broad role-permission model. The current shell exposes many top-level navigation items, while the data store performs optimistic browser-local mutations and does not consistently await or surface Firestore failures. Therefore, the first implementation must improve **correctness, authorization, workflow completeness, and information architecture** together.

## Product Scope for the First Production Release

### Client workspace

The Clients workspace becomes the center of the product. It must support search, filtering, sorting, pagination or efficient query loading, status management, tags, owner assignment, venture/workspace assignment, contact details, notes, activities, tasks, meetings, quotations, invoices, files, agreements, timeline history, last-contact date, next action, relationship health, and archive/restore behavior.

Every client record must have a clear lifecycle: lead, qualified, active, at-risk, dormant, churned, or archived. Duplicate detection should warn before creation. Client forms must validate email, phone, required business information, and sensitive fields. Users should be able to open a client and immediately understand the current relationship, outstanding work, upcoming meeting, open commercial documents, unpaid invoices, and next recommended action.

### Connected commercial workflows

The client page should provide contextual actions rather than forcing users to navigate through disconnected modules:

| Client action | Result |
|---|---|
| Add deal | Creates or links an opportunity with owner, stage, value, probability, next action, and due date |
| Create quotation | Opens a prefilled quotation using client and deal details; supports draft, review, issue, send, revise, and cancel states |
| Convert quotation | Creates a linked invoice with preserved line items and traceable history |
| Mark invoice paid | Creates one idempotent payment event and one linked income record; never duplicates on retry |
| Log activity | Adds a timeline entry, optional task, next follow-up date, and notification preference |
| Schedule meeting | Creates a meeting linked to the client/deal and later connects to Zoom/calendar integration |
| Add file | Stores a tenant-scoped document with type, visibility, owner, version, and audit history |
| Start agreement | Creates a controlled signing session with expiry and audit events |

### Automation order

Automations will be implemented in this order because each later automation depends on reliable data and events:

1. **Client follow-up automation:** calculate overdue and stale relationships, create visible reminders, and notify the responsible employee.
2. **Deal next-action automation:** require or suggest the next action after stage changes and flag deals with no recent activity.
3. **Quotation automation:** numbering, duplicate warning, draft-to-issued transition, delivery status, expiry reminder, and quotation-to-invoice conversion.
4. **Invoice automation:** numbering, due-date reminders, overdue status, payment event, receipt notification, and idempotent income creation.
5. **Meeting automation:** reminders, attendance/update notes, post-meeting follow-up task, and later Zoom/calendar events.
6. **Document automation:** controlled templates, versioning, secure file access, and agreement status updates.
7. **Digest automation:** daily or weekly summaries for authorized managers and superadmins only.

Every automation must define its trigger, permission context, idempotency key, retry policy, failure status, audit event, and user-visible outcome. Browser timers must not be used as the source of truth.

## Role and Workspace Model

The role model should be capability-based and server-enforced. The UI may hide unavailable actions, but the backend/database must independently deny unauthorized reads and writes. A user may have different permissions by organization, venture, workspace, or assigned records only if the policy model requires it.

| Role | Main workspace | Allowed capabilities | Private restrictions |
|---|---|---|---|
| Superadmin / organization owner | All workspaces plus private command center | Full organization administration, role policy, integrations, credentials, files, tasks, notes, operations, reports, audit, configuration | Can view private employee/intern/affiliate performance, credentials, and operational intelligence |
| Employee | Today, Clients, assigned Deals, Meetings, assigned Tasks, permitted Documents | Work on assigned clients/deals/tasks, log activities, update meetings, create drafts, submit quotations/invoices according to permission | Cannot see private scorecards, credentials, hidden notes, or other restricted personnel data |
| Intern | Today, assigned Tasks, limited Clients, Meetings, work updates | Complete assigned work, add notes/updates where permitted, submit work summaries, attend meetings | Read-only or restricted client visibility; no finance, credentials, role administration, private scorecards, or sensitive documents |
| Affiliate with HESICS | Affiliate workspace, assigned/referral clients, tasks, commission/status views | Submit referrals, track assigned work, upload permitted files, view only their own relationship and status | No internal client-wide data, employee/intern scores, credentials, finance ledger, or private notes |
| External client | Controlled portal/signing surfaces only | View assigned documents, sign agreements, confirm meeting information, respond to permitted requests | No internal notes, scores, credentials, other clients, or internal commercial history beyond explicitly shared records |

### Superadmin collaborative space

The existing Private Vault should become a **Superadmin Command Center**, not only a vault. It should include:

- private tasks, task assignments, priorities, dependencies, statuses, due dates, reminders, and recurring tasks;
- private notes and linked notes for clients, employees, interns, affiliates, ventures, and operational decisions;
- internal client intelligence and restricted timeline annotations;
- credential and secret metadata stored through a secure server-side secret mechanism, never browser-local plaintext;
- domain management records, renewal dates, registrar/provider, DNS notes, ownership, and renewal reminders;
- file management with folders, tags, versions, access scope, retention, and audit history;
- private meeting notes and decision records;
- employee, intern, and affiliate work summaries and scorecards visible only to authorized superadmins;
- system health, integration status, failed automation jobs, audit events, and operational alerts.

Credentials must be treated separately from ordinary notes and files. The UI should never fetch or display raw secrets by default. Use masked values, explicit reveal permissions, access logging, rotation reminders, and server-side encryption/secret storage.

### Employee and intern workspaces

Employees need a focused Today view showing assigned clients, tasks, meetings, follow-ups, deal next actions, and work updates. They should be able to submit a work summary at the end of a day or task cycle, record blockers, and request help. Interns need a simpler task-first workspace with clear instructions, due dates, attachments, completion evidence, and supervisor review. The interface should prevent accidental access to finance, credentials, private personnel notes, or unrelated clients.

### Affiliate workspace

Affiliates should have a separate relationship model rather than being treated as ordinary employees. They need referral records, assigned clients or opportunities, follow-up status, permitted documents, commission/status information if applicable, and a communication log. Affiliate visibility must be explicitly scoped to their own records and shared materials.

## Secure Technical Architecture

### Immediate architecture direction

Use a **modular monolith with a trusted server-side command layer** rather than microservices. The current React/Vite frontend can be preserved, but privileged mutations must move behind server-side functions/API procedures. Keep the existing data provider only if it can support the required transaction, query, tenant, and rule guarantees; otherwise migrate the shared core to a relational backend through a staged adapter.

```text
Web UI / Mobile UI
        ↓
Typed API / Server Commands
        ↓
Authentication + Organization Policy + Role/Scope Checks
        ↓
Domain Services
        ↓
Repositories / Transactions / Idempotency
        ↓
Database + Object Storage + Job Queue
        ↓
Integrations: Email, Zoom, Notion, Calendar, Payments, Notifications
```

### Security fixes required before production use

1. Remove the client-side root password and any offline path that accepts a roster email without real authentication.
2. Do not treat `localStorage` user objects as proof of identity or permission.
3. Replace unrestricted agreement updates with expiring, single-use signing sessions and field allowlists.
4. Secure email dispatch with verified identity, server-owned templates, recipient policy, rate limits, payload limits, and redacted errors.
5. Enforce organization scope and record ownership in every database read/write rule.
6. Restrict Storage by organization, folder/type, role, content type, size, and ownership.
7. Replace hardcoded audit actors with authenticated server identity and request IDs.
8. Store credentials only server-side using an encrypted secret store; never place them in notes, browser storage, or frontend environment variables.
9. Add audit events for role changes, credential reveal, file access, domain changes, invoice/payment changes, agreement signing, and automation replay.
10. Add security-rule, authorization, API, and end-to-end tests before enabling production data.

## Clients-First Implementation Phases

### Phase 1 — Client data and permission foundation

Create organization-scoped client records, contacts, ownership, tags, statuses, lifecycle transitions, tasks, notes, files, and timeline events. Define read/write/archive permissions for superadmin, employee, intern, affiliate, and external client. Add validation schemas and duplicate detection. Replace global array reads with query-scoped data access.

**Exit criteria:** each role sees exactly the intended client records; client creation/edit/archive/restore works; invalid data is rejected; concurrent edits do not silently overwrite; audit events identify the actor.

### Phase 2 — Client workspace UX

Redesign the Clients page into a clear list/detail experience. The list should have a single prominent create action, search, saved filters, status chips, owner/venture filters, follow-up indicators, and bulk actions only where safe. The detail view should use tabs or progressive sections for Overview, Timeline, Deals, Quotations, Invoices, Meetings, Tasks, Files, Agreements, and Notes.

Add empty, loading, error, offline, saving, saved, and conflict states. Make the most common actions available from the client header and timeline. Optimize for keyboard navigation on desktop and a compact action sheet on mobile.

**Exit criteria:** a user can find a client in seconds, understand their current state without opening multiple pages, and complete a common action without losing context.

### Phase 3 — CRM-to-cash workflows

Implement deal creation and stage transitions from the client page, quotation creation from client/deal context, invoice conversion, payment recording, and income creation. Use server-side transactions and idempotency. Preserve version history for issued quotations and invoices. Add overdue and expiry calculations using a clear timezone policy.

**Exit criteria:** quotation and invoice states are deterministic; duplicate clicks/retries do not create duplicate documents or income; every state change is traceable; failures show a retryable state.

### Phase 4 — Tasks, reminders, meetings, and work updates

Add a shared task model with assignee, creator, linked client/deal, due date, priority, recurrence, checklist, attachments, status, comments, and audit history. Add reminders for assigned work, overdue follow-ups, meeting preparation, invoice due dates, quotation expiry, and agreement expiry.

Build employee and intern work summaries with supervisor review. Store summaries and review events separately from the scorecard calculation. Provide superadmins with a private scorecard view based on transparent factors such as completion reliability, overdue work, response time, quality review, client follow-up consistency, and meeting/work updates. Do not expose private scorecards to the scored person unless a deliberate HR policy later requires it.

**Exit criteria:** tasks and reminders work without a browser being open, delivery failures are visible, employees/interns see only assigned work, and superadmins can inspect the underlying evidence for a score.

### Phase 5 — Superadmin Command Center

Expand Private Vault into the role-protected command center. Implement separate sections for Tasks, Notes, Client Intelligence, Credentials, Domains, Files, Meetings/Decisions, Personnel Reviews, Integrations, Automation Jobs, Audit, and System Health. Use strict permissions and separate data collections/tables for secrets, performance evidence, and ordinary notes.

**Exit criteria:** only authorized superadmins can access private sections; credential reveals are logged; files are versioned and scoped; domain renewals and reminders are actionable; automation failures are replayable safely.

### Phase 6 — Zoom and Notion integrations

After the core meeting and notes models are stable, implement managed integrations:

**Zoom:** OAuth connection per organization, least-privilege scopes, meeting creation from a HESICS meeting, participant/invite status, join links, meeting update/cancellation, reminders, and—only with explicit consent and provider support—recording/transcript metadata. Never store raw tokens in frontend code. Verify webhook signatures, persist event IDs, reject replays, and process recording/transcript events asynchronously.

**Notion:** OAuth connection per organization, workspace/page selection, explicit sync direction per space, field mapping, sync cursor, conflict policy, retry queue, and disconnect/revoke controls. Start with one-way export or controlled page creation before attempting two-way synchronization. Do not silently overwrite Notion content or HESICS records.

The exact Zoom and Notion endpoints, scopes, webhook/callback capabilities, and current provider requirements must be verified immediately before implementation because provider APIs change.

### Phase 7 — Mobile quick-use app

Build a mobile companion only after the secure API and permission model are stable. Initial mobile functions should be Today, client search/detail, create client, log touchpoint, create task, update deal stage, view/send meeting information, add work update, and receive reminders. Keep superadmin credential/domain management and heavy reporting on the web initially.

Use secure native token storage, push notifications, deep links, offline drafts, visible synchronization status, native performant lists, and role-aware navigation. The mobile app must consume the same server contracts as the web application.

## Data and Automation Model

Introduce these first-class records:

| Record | Purpose |
|---|---|
| `client_timeline_events` | Immutable client history across activities, deals, documents, meetings, payments, and tasks |
| `tasks` | Assigned work for employees, interns, affiliates, and superadmins |
| `reminders` | Scheduled user-visible or channel-delivered reminders |
| `work_summaries` | Employee/intern/affiliate submitted work reports and blockers |
| `performance_evidence` | Private facts supporting score calculations |
| `performance_scores` | Private derived scores and review periods |
| `files` / `file_versions` | Metadata, scope, owner, type, retention, and versions |
| `credentials` / `credential_access_events` | Masked secret metadata and reveal/access audit |
| `domains` / `domain_events` | Registrar, renewal, DNS ownership, status, and reminders |
| `integration_connections` | Provider, scopes, status, owner, sync health, and revocation |
| `automation_jobs` | Trigger, status, retries, error, idempotency key, and replay state |
| `webhook_deliveries` | Provider event ID, signature result, processing status, and replay protection |

All automation jobs must be deterministic where possible, idempotent, retryable, observable, and linked to a user/organization permission context. AI can be added later for summaries or classification, but it must not make unsupervised financial, access-control, credential, or contract decisions.

## Testing Plan

1. Unit-test client validation, duplicate detection, lifecycle transitions, permission policy, scoring inputs, numbering, reminder schedules, and idempotency.
2. Test every database rule for each role, organization, record owner, assigned user, external client, and deactivated account.
3. Test server commands for client CRUD, deal changes, quote/invoice conversion, payment/income, task assignment, credential reveal, file access, domain updates, and role changes.
4. Test automation replay, duplicate webhook events, provider timeout, rate limit, failed email, failed Zoom/Notion sync, and job retry.
5. Run browser E2E flows for superadmin, employee, intern, affiliate, and external-client visibility.
6. Run mobile E2E flows for the defined quick actions and offline draft recovery.
7. Add accessibility, responsive, performance, dependency, backup-restore, and migration tests.

## Delivery Roadmap

### First 30 days — Clients and security

Lock down authentication and storage, remove unsafe fallbacks, define the role/permission matrix, implement organization-scoped client data, improve client list/detail UX, add validation and audit events, and make writes awaitable with visible failure states.

### Days 31–60 — CRM-to-cash and work management

Deliver deals, tasks, reminders, quotation lifecycle, invoice automation, idempotent payment/income, client timeline, meetings linked to clients, employee/intern workspaces, work summaries, and CI/security tests.

### Days 61–90 — Superadmin operations and integrations

Deliver the private command center, credential/domain/file management, scorecards, automation-job monitoring, email/calendar integration, Zoom integration spike and first production flow, and Notion controlled export/sync spike.

### Days 91–120 — Mobile and expansion

Deliver the first mobile quick-use app, push notifications, offline drafts, Zoom/Notion hardening, payment/webhook automation, richer files, and additional app integrations based on real usage.

## Assumptions and Open Decisions

The plan assumes that “superadmin” is the only role allowed to see employee, intern, and affiliate performance scores and raw credential/domain-management information. It assumes employees should access only assigned or organization-permitted clients, interns should have a limited task-first view, and affiliates should see only referrals/clients explicitly shared with them.

The following choices materially affect implementation and must be confirmed before schema work: whether HESICS launches as one organization or multi-tenant; whether affiliates receive commission tracking; the exact employee score formula and review period; which mobile quick actions are mandatory; whether Notion begins as export-only; and which Zoom features are required first. Where unspecified, the implementation should use the safer default: least privilege, export before two-way sync, and human review before automatic scoring or financial changes.

## Definition of Done

The first milestone is complete when a superadmin can create and manage a client end-to-end; employees can work assigned clients/tasks/meetings; interns can complete scoped tasks and submit updates; affiliates can manage only their permitted referrals; quotations and invoices automate reliably without duplication; private scorecards and credentials are visible only to authorized superadmins; client files, notes, domains, and tasks are auditable; failures are recoverable; and the Clients workspace is simpler and faster than navigating the current separate pages.

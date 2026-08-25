# HESICS CMS — CTO-Level Forensic Audit

**Repository:** `NK-EMPIRE/HESICS-CMS`  
**Revision audited:** `ecf4d2a` on `main`  
**Audit date:** 23 August 2026  
**Scope:** Repository structure, implementation, authentication and authorization, Firestore and Storage rules, data layer, API surface, build/dependency posture, UI/UX surface, operations, testing, scalability, and product direction.

> **Evidence standard.** Findings are labeled **Confirmed issue**, **Likely issue**, **Recommendation**, or **Future opportunity**. Confirmed findings are directly supported by the checked-in implementation or reproducible build/audit commands. This audit does not claim to have observed production traffic, Firebase console settings, deployed rules, real user behavior, or data that is not present in the repository.

## 1. Executive Summary

HESICS is a polished-looking React/Vite CRM and internal operating system for a small multi-venture services business. It combines clients, sales pipeline, activities, quotations, invoices, finance entries, agreements, meetings, team permissions, a private vault, PDF generation, email dispatch, and Firestore synchronization. The repository builds successfully with TypeScript and Vite, and it contains a meaningful amount of product thinking, domain typing, Firebase rules, and a coherent visual identity.

The central architectural problem is that the product presents itself as a secure multi-user SaaS while much of its data model and mutation path remains **client-owned**. The principal data store mirrors collections into browser memory and `localStorage`, performs optimistic local mutations, then starts Firestore writes without awaiting or surfacing failure. Authorization is partly implemented in UI code and partly in Firestore rules, but several rules are overly broad or structurally unsafe. The most serious example is the public agreement update rule, which allows any caller—including an unauthenticated caller—to update any agreement document. The email endpoint is also unauthenticated and accepts caller-controlled recipient and HTML content, creating an abuse and spoofing risk.

The most urgent authentication issue is the root password fallback: `VITE_ROOT_MASTER_PASS` is a Vite client-side environment variable and is therefore eligible to be embedded in the browser bundle. Comparing a user-entered password with that value in frontend code is not a secure authentication mechanism. The offline fallback is even more serious: when Firebase is not configured, any existing roster email is accepted without validating the supplied password. This may be useful for a prototype, but it is not acceptable for production.

The recommended path is **not** a microservices rewrite. Keep a modular monolith and keep React/Vite for the client, but move privileged actions behind a trusted backend or Firebase Cloud Functions, make Firebase Auth the only source of authentication truth, remove credential logic from the client, enforce tenant and ownership constraints in rules or server code, replace broad collection listeners with query-scoped access, and introduce an explicit async repository/service boundary. Then add security and end-to-end tests around sign-in, authorization, agreements, finance, invoicing, email, and migration behavior.

| Area | Assessment | Immediate implication |
|---|---:|---|
| Architecture | 4/10 | Coherent prototype, but the client is too authoritative for production |
| Security | 2/10 | Privileged data and public agreement writes require immediate review |
| Database | 4/10 | Functional Firestore model, weak integrity and tenant boundaries |
| Code quality | 6/10 | Typed and organized, but a large monolithic store and duplicated patterns dominate |
| UX/UI | 7/10 | Strong visual direction; complexity and failure feedback need work |
| Scalability | 3/10 | Full collection listeners and browser-local mirrors will not scale safely |
| Testing/DevOps | 2/10 | Build passes, but no meaningful automated test or CI layer is present |

## 2. What This Product Actually Does

The implementation is an internal CRM/ERP-style workspace for HESICS. Users authenticate, enter a shell with dashboard navigation, and manage a small business lifecycle: prospects and clients, deals and pipeline stages, activities, quotations, invoices, income and expense records, agreements, meetings, team members, services, and a private vault. It also supports PDF generation and email delivery, with Firebase used for authentication, Firestore persistence, and Storage.

The repository documentation describes a broader “operating system” ambition, including multi-venture visibility, unified client timelines, invoice-to-income automation, tax rollups, payment webhooks, WhatsApp reminders, founder digests, recurring expenses, quote numbering, and stale-client flags. The checked-in application implements the core manual workflow, but most of those cross-module automations are documented aspirations rather than confirmed production workflows.

| User journey | Current implementation | Audit conclusion |
|---|---|---|
| Sign in | Firebase email/password, Google, email link, plus local fallback | Authentication behavior differs materially by environment |
| Manage clients | React pages call an in-browser store; store mirrors Firestore collection | Works for a small prototype; unsafe as the authority boundary |
| Manage deals | CRUD methods and Kanban UI | No server-side domain transaction around stage changes |
| Quote/invoice | Manual forms and PDF generation | No confirmed invoice-to-income atomic workflow |
| Finance | Manual income and expense entries | Sensitive ledger is directly accessed from the browser |
| Agreements | Public review/signature route and Firestore collection | Public update rule is dangerously broad |
| Email | Browser calls `/api/send-email`; Vercel function or Vite middleware sends SMTP | Endpoint lacks authentication, rate limiting, and allowlisting |
| Team/RBAC | UI permission helpers plus Firestore hierarchy rules | Client checks are bypassable; rules are inconsistent with tenant needs |

## 3. Architecture Map

### High-level architecture

```text
Browser
  ├── React + TypeScript + Vite
  ├── React Router pages and feature components
  ├── Firebase Auth SDK
  ├── Firestore SDK and broad onSnapshot listeners
  ├── Firebase Storage SDK
  ├── localStorage cache / offline fallback
  └── jsPDF, XLSX, charts, email client
          │
          ├── Firebase Auth
          ├── Firestore collections
          ├── Firebase Storage bucket
          └── Vercel /api/send-email → Gmail SMTP
```

The repository has a **client-heavy modular monolith**. `src/App.tsx` and route pages provide the application shell. `src/lib/db/index.ts` contains a large `FirebaseDataStore` that owns domain arrays, local persistence, Firestore subscriptions, and CRUD mutations. Thin domain modules under `src/lib/db/` re-export store operations. `src/lib/firebaseAuth.ts` handles authentication and local session persistence. `src/lib/rbac.ts` handles client-side permission decisions. `firestore.rules` and `storage.rules` provide the intended server-side security layer.

### Request and data flow

For a normal client mutation, the flow is approximately: user submits a React modal; the component calls a store method; the store updates an in-memory array; it writes the entire array to `localStorage`; it records an audit item; it invokes `setDoc`, `updateDoc`, or `deleteDoc` without awaiting; the UI reports success based on the local mutation; a Firestore snapshot may later reconcile the browser state. This is simple to understand, but it creates a gap between **what the UI says happened** and **what the database accepted**.

For sign-in, Firebase Auth is used when all required `VITE_FIREBASE_*` variables exist. The resulting email is matched against the browser’s copy of the users roster. A local session object is written to `localStorage`. When Firebase is not configured, the password supplied by the user is not validated for roster users; an existing email is sufficient. The root account has an additional frontend password comparison path.

### Dependency map

| Dependency | Used for | Criticality | Main concern |
|---|---|---:|---|
| Firebase Auth | Identity | Critical | Client roster matching is not a substitute for server claims |
| Firestore | Primary shared data | Critical | Broad listeners, client writes, weak tenant constraints |
| Firebase Storage | File storage | High | Any authenticated user can read/write any path under current rules |
| Gmail SMTP/Nodemailer | Outbound email | High | Unauthenticated relay-like endpoint and HTML injection risk |
| Vercel | Hosting/serverless API | High | No checked-in CI or deployment verification |
| `xlsx` | Spreadsheet export/import surface | Medium | High-severity advisories reported by `npm audit` |
| jsPDF/html2canvas | Document generation | Medium | Large client bundle and browser CPU/memory cost |
| DiceBear | Avatar URLs | Low | External dependency and privacy/network availability consideration |

## 4. Repository Structure Analysis

The repository is compact and easy to enter. It contains a single frontend application, one serverless email handler, Firebase rules, Vite configuration, documentation, and utility scripts. The product documentation is unusually extensive relative to the implementation and gives a useful target-state narrative.

The principal structural weakness is concentration. `src/lib/db/index.ts` is a large cross-domain class that handles organization, users, roles, services, private vault, clients, deals, activities, quotations, invoices, finance, agreements, meetings, and synchronization. `src/lib/pdfEngine.ts` is also large. This is not automatically bad, but it increases the blast radius of changes and makes domain-specific invariants difficult to test.

| Structural finding | Status | Impact |
|---|---|---|
| Single `FirebaseDataStore` owns nearly every domain | Confirmed issue | High coupling and difficult testing |
| Domain re-export modules exist under `src/lib/db/` | Strength | Useful migration seam; preserve and deepen it |
| No checked-in `.github/workflows` or Dockerfile | Confirmed issue | No visible automated quality gate or reproducible deployment image |
| No meaningful test suite found by repository inventory | Confirmed issue | Business-critical flows have no regression protection |
| `.env.example` documents both browser and server variables | Strength with risk | Clear setup, but the root password variable is unsafe in `VITE_` scope |
| Vercel rewrite sends all paths to `index.html` | Recommendation | Verify API routing precedence so `/api/send-email` is never swallowed by SPA fallback |

## 5. Code Quality Audit

The code is TypeScript with strict mode enabled and the production build passes. Types such as `Client`, `Deal`, `Quotation`, `Invoice`, `IncomeEntry`, and `ExpenseEntry` give the application a usable domain vocabulary. Recent commits show active cleanup and stability work, including route refactoring, error boundary work, Firebase initialization handling, and removal of redundant PDF components.

The main quality concern is that the store methods are **synchronous façades over asynchronous persistence**. A method returns a record even if Firestore later rejects the write. Nearly every write uses `.catch(console.error)` rather than returning a failure to the caller. This causes silent data loss, misleading success states, and impossible-to-reliably-coordinate workflows such as “mark invoice paid, create income record, send email.”

The store also uses timestamp-based IDs such as ``usr-${Date.now()}`` and ``role-${Date.now()}``. Concurrent tabs or users can collide, and the IDs do not provide a server-generated uniqueness guarantee. The full-collection array mirror encourages read-modify-write behavior and makes lost updates likely when multiple clients operate simultaneously.

| Problem | Why it matters | Impact | Recommended fix |
|---|---|---|---|
| Async writes are not awaited | UI cannot know whether persistence succeeded | Silent data loss | Return `Promise<Result<T>>`; handle loading/error states |
| All domains share one store | Changes cross unrelated concerns | Regression and coupling risk | Create domain repositories/services with shared infrastructure |
| Timestamp IDs | Millisecond collisions are possible | Overwrites or failed writes | Use Firestore auto IDs or UUIDs generated with collision resistance |
| Audit actor is often hardcoded | Audit trail may not identify the real actor | Weak accountability | Pass authenticated UID/email from a trusted server context |
| Partial updates accept `Partial<T>` broadly | Callers can mutate protected fields | Invariant bypass | Use command-specific input DTOs and server validation |
| Error handling is mostly console logging | Production users receive no actionable feedback | Trust and support burden | Centralize error mapping, telemetry, and retry policy |
| `any` appears in API handlers and caught exceptions | Weakens boundary safety | Malformed input and errors can escape | Define request/response schemas and `unknown` error handling |

## 6. Confirmed Bugs

The following are implementation defects or production risks directly supported by the repository.

| ID | Confirmed bug | Evidence | Severity |
|---|---|---|---:|
| B-01 | Offline sign-in accepts any password for a roster email | `src/lib/firebaseAuth.ts:67-84` checks only email when Firebase is unavailable | P0 |
| B-02 | Root master password is compared in client code | `src/lib/firebaseAuth.ts:27,58-64,120-127`; variable is `VITE_ROOT_MASTER_PASS` | P0 |
| B-03 | Any caller can update any agreement | `firestore.rules:139-144` contains `allow update: if true` | P0 |
| B-04 | Any authenticated user can read every Storage object and write any path under 10 MB | `storage.rules:4-7` | P1 |
| B-05 | Email API has no authentication, rate limit, recipient policy, or payload size/content validation | `api/send-email.ts:3-64` | P0 |
| B-06 | Firestore write failures are swallowed after local state is committed | Repeated `.catch(console.error)` in `src/lib/db/index.ts` | P1 |
| B-07 | Full collection listeners are opened for major collections | `src/lib/db/index.ts:226-417` | P1 |
| B-08 | Audit log has a browser-local source of truth and clear function | `src/lib/auditLog.ts:61-71,132-134` | P1 |
| B-09 | `xlsx` is a direct dependency and `npm audit --omit=dev` reports high-severity prototype-pollution and ReDoS advisories | `package.json`; audit reports GHSA-4r6h-8v6p-xvw6 and GHSA-5pgg-2g8v-p4x9 | P1 |
| B-10 | No automated test or CI workflow is present in the checked-in repository | Repository inventory; package scripts contain dev/build/preview only | P1 |
| B-11 | Root identity and privilege are duplicated in local state and rules | `ROOT_MASTER_USER`, `ROOT_MASTER_EMAIL`, and hardcoded actor identifiers | P1 |
| B-12 | Agreement reads are public without a token predicate | `firestore.rules:141` | P1 |

## 7. Potential Bugs

These require targeted tests or production configuration inspection before being called broken.

| Potential issue | Why it is plausible | Test needed |
|---|---|---|
| SPA rewrite may interfere with the Vercel function | A catch-all rewrite is present and API routing order is not documented | Deploy a preview and POST to `/api/send-email` |
| Snapshot reconciliation may overwrite newer local state | Snapshots replace whole arrays and mutations are optimistic | Two-browser concurrent edit test |
| Empty Firestore collections may leave stale local data | Sync callbacks only replace state when `!snapshot.empty` and `list.length > 0` | Delete last remote document, reload, compare local cache |
| Public agreement update may permit field escalation | Rule checks no token and no field whitelist | Emulator test updating arbitrary fields anonymously |
| Root user may be recreated or duplicated across auth/data states | Root user is synthesized locally and also matched from Firestore | Fresh browser, Firebase enabled, missing root document test |
| Role hierarchy fields may be user-editable through broad update DTOs | Client accepts `Partial<User>` and rules only partly constrain changes | Attempt role/hierarchy update from lower role |
| Email HTML may permit header/content abuse or oversized requests | `to`, `subject`, `html`, and `text` are caller-controlled | Fuzz endpoint with arrays, long strings, CRLF, and HTML payloads |
| Meetings may store external links without validation | Meeting UI constructs or accepts platform links | Invalid URL and malicious protocol tests |
| PDF generation may become unresponsive on large records | Heavy jsPDF/html2canvas dependencies are client-side | Performance test with large line-item sets and mobile hardware |

## 8. Security Audit

### Authentication

The production path should be Firebase Auth only, with the authenticated Firebase UID as the identity key. The current code adds a local session object containing user profile data to `localStorage` and then uses the browser copy of that data for UI decisions. `localStorage` is readable by any injected script, so it should never be treated as proof of identity or privilege. The browser copy can be stale even when Firebase has revoked a user or changed their status.

The frontend root password is a critical design flaw. Any secret placed in a Vite `VITE_` variable is intended for client exposure. Even if the generated bundle does not make the value obvious, a user who can run the application can inspect code, source maps if enabled, or runtime behavior. Root authentication must be represented by Firebase Auth and server-side custom claims or a server-managed identity—not a password comparison shipped to the browser.

### Authorization

The Firestore rules use a hierarchy read from `/users/{request.auth.uid}`. This assumes Firebase Auth UIDs equal application user document IDs. The client-created IDs use `usr-${Date.now()}`, so this assumption is not naturally satisfied. If the authenticated UID does not have a corresponding user document, `getUserData()` may fail or produce rule evaluation errors. The rules also do not consistently enforce `org_id`, ownership, or field immutability.

The agreement rule is the highest-risk authorization defect. `allow update: if true` means anonymous callers can update any agreement document and can potentially alter fields beyond a signature payload. A secure public-signature design should expose a narrow HTTPS function with a random, hashed, expiring signing token, single-use semantics, explicit allowed fields, and an append-only signature event.

### API security

`api/send-email.ts` is effectively a public SMTP relay endpoint if deployed as written. It does not require Firebase ID token verification, does not enforce a recipient allowlist, does not cap body size, does not validate email format, does not rate limit, and returns raw error messages. The development Vite middleware has the same basic weakness. The endpoint should accept a typed email-template command, not arbitrary HTML from the browser.

### Storage security

The current Storage rule grants any authenticated user read/write access to every object path. It also permits writes based only on file size. There is no content type check, path ownership, organization partition, role restriction, or deletion policy. A production rule should constrain paths to `orgs/{orgId}/...`, compare the token’s organization claim, validate content type and size, and separate private documents from public agreement assets.

### Secrets and dependencies

No secret values are reproduced in this report. The repository tracks `.env.example`, which is appropriate, but the name `VITE_ROOT_MASTER_PASS` is itself an architectural warning because it signals a browser-exposed credential. Rotate any real credential that has ever been placed in a client environment or committed file. The dependency audit reports two high-severity advisories affecting the direct `xlsx` dependency: prototype pollution and regular-expression denial of service. Upgrade to a fixed version if compatible, replace the package, or isolate and strictly validate workbook inputs.

## 9. Database Audit

Firestore is a reasonable choice for an early internal CRM, but the current usage is closer to a browser-synchronized document cache than a robust database architecture. Major collections are read in full using `collection(firestore, "...")` and stored as arrays. There are no visible query constraints, pagination, tenant filters, server timestamps, transactions, or composite-index strategy.

The domain types include `org_id` on several entities, but the rules do not consistently require `resource.data.org_id == request.auth.token.org_id` or an equivalent organization lookup. In a multi-tenant product, every read and write must be tenant-scoped by server-enforced identity, not by the client’s filtering behavior.

Finance and invoice state transitions require stronger integrity. A paid invoice should not be able to produce multiple income entries through repeated clicks or retries. The current implementation has no visible transaction, idempotency key, unique business number constraint, or event record that would guarantee exactly-once business effects.

| Database concern | Current state | Target state |
|---|---|---|
| IDs | Client timestamp IDs | Firestore auto IDs plus business-number uniqueness strategy |
| Tenant isolation | `org_id` fields but weak rule enforcement | Token claim/lookup and mandatory org predicates |
| Query scale | Full collection snapshots | Query-scoped listeners, pagination, indexed filters |
| Integrity | Broad partial updates | Server commands, field whitelists, transactions |
| Audit | LocalStorage plus client-created records | Append-only server audit events with UID and request ID |
| Finance automation | Manual entries | Idempotent invoice/payment domain events |
| Deletion | Direct deletes in many domains | Soft-delete/archive for financial and audit records |
| Time | Client-generated ISO dates in many places | Firestore server timestamps and timezone policy |

## 10. API Audit

The product does not have a conventional domain API for most operations; the browser uses Firebase SDK calls directly. This can be acceptable for a tightly controlled Firebase application, but it requires extremely disciplined rules and schema validation. Here, the absence of a server command layer makes sensitive operations difficult to secure and observe.

The one explicit API is email dispatch. It should be redesigned as a narrow endpoint such as `POST /api/v1/email/send-template`, authenticated by a Firebase ID token and authorized for a small set of server-defined templates. The request should contain a template name and validated variables; the server should select subject, sender, and HTML. It should return a stable error envelope and a request ID, not provider error details.

| API design area | Finding | Recommendation |
|---|---|---|
| Naming/versioning | Only one unversioned endpoint | Introduce `/api/v1` for server commands |
| Validation | Truthiness checks only | Use schema validation for all fields and lengths |
| Errors | Raw messages and inconsistent headers | Stable `{error:{code,message,requestId}}` envelope |
| Auth | No endpoint authentication | Verify Firebase ID token server-side |
| Authorization | No operation-level policy | Require permission and organization context |
| Idempotency | Not present | Require idempotency keys for email/payment-like commands |
| Rate limiting | Not present | Per-user, per-org, and IP limits |
| Payload | Arbitrary HTML | Server-owned templates and sanitized variables |

## 11. Performance Audit

The production build passes, but the bundle is heavy. The generated build includes approximately 696 KB for the Firebase vendor chunk, 625 KB for the PDF vendor chunk, 322 KB for UI/data utilities, and a 617 KB application chunk before compression. This is a meaningful mobile performance risk for an internal application that may be used on ordinary devices and networks.

The full Firestore listeners are the larger scale risk. Every active session appears to subscribe to users, clients, deals, invoices, quotations, activities, finance, meetings, and other collections. This increases initial read volume, memory use, live synchronization cost, and exposure of data that the user may not need. Route-level data loading and query-scoped subscriptions should replace the global mirror.

Frontend recommendations include lazy loading route modules, moving PDF/XLSX functionality behind dynamic imports, reducing the initial Firebase surface, using virtualized tables for large lists, and measuring Web Vitals. Backend/database recommendations include paginated queries, indexed filters, server-side aggregation for dashboard metrics, and background jobs for expensive exports.

## 12. UI Audit

The repository shows a deliberate dark, premium, enterprise visual system with generous spacing, typography adjustments, logo assets, reusable components, charts, modals, date pickers, and a structured shell. Recent commits specifically address layout breathing room, dropdown positioning, z-index tokens, and error-boundary stability. These are genuine strengths.

The main UI risk is not visual inconsistency but **operational ambiguity**. If a mutation is committed locally and fails remotely, the UI can show a successful state while the user’s data is not durable. Error, retry, offline, and conflict states need to be first-class visual states. Finance and agreement actions also need stronger confirmation language, event history, and clear distinction between draft, sent, paid, signed, expired, and cancelled.

| UI area | Assessment | Improvement |
|---|---|---|
| Visual identity | Strong | Preserve the dark premium system and formalize tokens |
| Component reuse | Moderate to strong | Consolidate modal/table/form primitives |
| Status feedback | Weak | Add pending, succeeded, failed, retried, and conflicted states |
| Data density | Risky at scale | Add pagination, virtualization, and saved views |
| Accessibility | Unknown/needs verification | Run axe and keyboard audits; verify focus traps and contrast |
| Mobile | Needs validation | Test Kanban, finance tables, PDFs, and modal forms on narrow screens |

## 13. UX Audit

The product’s breadth can create a high cognitive load. CRM, finance, operations, agreements, meetings, team administration, and a private vault are all valuable, but a first-time user needs a clear role-based home and a single next action. The application should reduce the number of top-level concepts visible to users who do not need them.

The most important UX improvement is a trustworthy action model. Every high-risk action should state what will change, who can see it, whether it is reversible, and whether the operation is complete. For example, marking an invoice paid should show the ledger effect and prevent duplicate submission; sending an agreement should show the recipient and expiry; removing a user should explain access revocation and retained audit records.

| Current flow | Problem | New flow | Why it is better |
|---|---|---|---|
| Dashboard opens broad operational overview | Can overwhelm new users | Role-based “next best actions” plus summary metrics | Faster time to value |
| Client → separate deals/activities/invoices | Context switching | Unified client timeline with filtered subviews | Better client briefing |
| Manual invoice and finance entry | Repetition and error | Invoice paid event proposes or creates idempotent income record | Less retyping |
| Team admin through broad forms | Risk of privilege mistakes | Role template, capability preview, confirmation, audit event | Safer administration |
| Public agreement update | Invisible security boundary | Dedicated signing page and narrow signing command | Clear and trustworthy |

## 14. Product Flow Audit

The intended lifecycle is discover → sign up → onboard → first action → core value → repeat usage → retention → upgrade → referral. The current product is primarily an internal authenticated workspace, so public acquisition and upgrade flows are not evident in the repository. The most relevant funnel is internal activation: sign in, create or import a client, create a deal, issue a quote, convert to invoice, record payment, and review performance.

The likely drop-off points are setup and trust. Firebase environment misconfiguration produces an offline mode rather than a hard production failure; a user may believe data is shared when it is only in local storage. The broad product surface also postpones the first meaningful outcome. A guided first-run checklist should create a client, add a deal, generate a quote, and explain the next recommended action.

## 15. Simplification Opportunities

The simplest scalable version is a modular monolith with a small number of reliable workflows, not a collection of loosely coordinated screens. Keep the feature breadth, but hide it behind role-based navigation and a few business objects: client, opportunity, document, money movement, and activity.

Do not make users understand Firestore synchronization, offline fallback, or role hierarchy terms that are meaningful only to developers. The system should expose clear business concepts and automate repetitive transitions. Remove duplicate local persistence mechanisms once a real backend is authoritative.

## 16. Feature Gap Analysis

### Missing essential features

The essential production gaps are server-enforced identity and authorization, secure email dispatch, tenant isolation, durable audit logs, reliable mutation feedback, backups and restore procedures, rate limiting, schema validation, and automated tests for critical flows. These are prerequisites rather than optional features.

### High-value features

A unified client timeline, idempotent invoice-to-income automation, stale-client flags, saved dashboard views, role-based onboarding, bulk import with validation, and an approval workflow for quotations and invoices would create direct operational value. These should follow security and reliability work.

### Nice-to-have features

WhatsApp reminders, founder digests, tax rollup drafts, recurring expenses, intelligent search, and AI summaries are plausible later additions. They should be built only after events, permissions, and observability are trustworthy.

### Features that should not be built yet

Do not build microservices, a generalized workflow engine, a custom identity provider, a real-time event mesh, or an elaborate AI agent platform at the current maturity. Each would increase operational cost before the foundational data model is reliable.

## 17. Integration Opportunities

| Integration | Use case | Benefit | Complexity | Priority |
|---|---|---|---:|---:|
| Firebase Auth + custom claims | Central identity and roles | Removes client credential logic | Medium | P0 |
| Transactional email provider | Templated invitations and documents | Better deliverability and control than raw SMTP relay | Medium | P1 |
| Error tracking | Capture rejected writes and UI failures | Makes silent failures visible | Low | P0 |
| Scheduled job runner | Follow-ups, recurring expenses, digests | Removes manual repetition | Medium | P2 |
| Payment gateway webhook | Payment-to-ledger automation | Reduces duplicate entry | Medium | P2 |
| Object storage policy layer | Agreements, invoices, attachments | Secure document lifecycle | Medium | P1 |
| WhatsApp/n8n | Founder reminders | High behavior-change value | Medium | P2 |

## 18. AI Opportunities

The strongest AI opportunity is not a general chatbot. It is **structured assistance around existing work**: summarize a client timeline before a meeting, classify inbound notes into activity types, detect duplicate quotations, draft follow-up messages from deal context, extract line items from uploaded documents, and surface deals whose next action is missing.

AI should operate through server-side jobs with explicit user consent, tenant boundaries, redaction rules, cost limits, and human review for financial or contractual outputs. Never allow an AI-generated result to mark an invoice paid, change a permission, or sign an agreement without a deterministic authorization path.

## 19. Scalability Analysis

The current architecture can support a small single-organization prototype, but it is not scale-ready. Horizontal scaling of static Vite assets is easy; the difficulty is data access, authorization, write coordination, and operations. Full collection snapshots, browser-local mirrors, and client-owned business logic amplify cost and inconsistency as users and records increase.

### What should remain simple now

Keep one frontend, one trusted backend boundary, Firebase Auth, Firestore, and Storage. Use modular domain code inside one deployable application. Avoid introducing a message broker until there is a real asynchronous workload.

### What should be modularized

Separate identity/policy, CRM, commercial documents, finance, agreements, communications, and audit into domain services or repositories. Use shared validation, error, and telemetry libraries.

### What should be extracted later

Extract document rendering, bulk exports, notification delivery, and analytics aggregation only when measured workload or reliability requirements justify it. A queue/worker boundary becomes appropriate when exports, OCR, scheduled digests, or webhook processing are slow or retry-heavy.

## 20. DevOps Audit

The checked-in build pipeline is minimal: `npm run build` runs `tsc && vite build`; development and preview scripts are present. The build passed during this audit. There is no visible GitHub Actions workflow, Dockerfile, test script, lint script, migration command, backup configuration, rollback runbook, or environment validation step. The project therefore relies heavily on external dashboard configuration and manual discipline.

A serious deployment pipeline should validate environment variable presence without printing values, run typecheck, lint, unit tests, Firebase Emulator security tests, production build, dependency audit, and a smoke test against a preview deployment. Production deploys should be gated, and Firestore rules should be versioned and tested before release.

## 21. Testing Audit

No meaningful test suite was found in the repository inventory, and `package.json` exposes no test command. This is a critical gap because the most dangerous behavior is in cross-layer policy: a UI may hide a button while Firestore rules allow or deny an operation differently; an optimistic local write may mask a rejected remote write; an agreement update may be public when it should be token-bound.

The testing pyramid should prioritize business risk: Firestore Emulator rules tests for every collection, unit tests for RBAC and validation, integration tests for repositories and server functions, and browser E2E tests for sign-in, client creation, quote-to-invoice, payment/ledger behavior, team changes, agreement signing, email dispatch, and failure/retry states. Measure coverage of critical flows, not only lines.

## 22. Technical Debt

| Priority | Location | Problem | Impact | Fix | Complexity |
|---|---|---|---|---|---:|
| Critical | `firebaseAuth.ts`, `.env.example` | Browser root password fallback | Credential disclosure and bypass risk | Remove fallback; use Firebase Auth/custom claims | M |
| Critical | `firestore.rules` | Unrestricted agreement update | Contract/signature tampering | Tokenized callable function and field whitelist | M |
| Critical | `api/send-email.ts` | Unauthenticated arbitrary email endpoint | Abuse, spoofing, cost | Auth, templates, limits, provider abstraction | M |
| High | `storage.rules` | Any-authenticated-user global access | Data leakage and overwrite | Tenant/path/content rules | S-M |
| High | `db/index.ts` | Unawaited Firestore writes | Silent data loss | Async repository results and retries | L |
| High | `db/index.ts` | Full collection listeners | Cost and scaling bottleneck | Query-scoped pagination/listeners | L |
| High | `auditLog.ts` | Local audit source and hardcoded actors | Non-repudiation failure | Server append-only audit events | M |
| High | Repository root | No CI/tests | Regression and release risk | Add pipeline and emulator/E2E tests | M |
| Medium | `pdfEngine.ts`, `xlsx` | Large client-side document/export stack | Slow initial/runtime experience | Dynamic import and server jobs | M |
| Medium | Domain types/updates | Broad `Partial<T>` writes | Invariant drift | Command DTOs and validators | M |
| Low | Naming/organization | Mixed “root/chief/founder/admin” concepts | Cognitive and maintenance load | Canonical policy vocabulary | S |

## 23. Recommended Target Architecture

```text
CLIENT
  ↓
UI / APPLICATION
  ↓
API / BFF + Firebase Auth token verification
  ↓
DOMAIN / BUSINESS LOGIC
  ↓
DATA ACCESS / REPOSITORIES
  ↓
FIRESTORE + STORAGE
```

Supporting infrastructure should be explicit: Firebase Auth for identity; custom claims or an organization-membership lookup for policy; Firestore for transactional domain data; Storage for tenant-scoped documents; a small queue or scheduled worker only for jobs that need retries; structured audit events; error tracking and metrics; and an email provider behind a server-owned template service.

The client should submit commands such as `createClient`, `issueQuotation`, `markInvoicePaid`, `inviteMember`, and `signAgreement`. The server/domain layer should validate the command, authorize it, perform the transaction, append an audit event, and return the resulting resource. The UI should never decide that a privileged operation succeeded merely because local state changed.

## 24. Recommended Database Architecture

Retain Firestore initially, but organize documents by organization and enforce the organization at every rule boundary. A practical shape is `orgs/{orgId}/clients/{clientId}`, `orgs/{orgId}/deals/{dealId}`, `orgs/{orgId}/invoices/{invoiceId}`, and similar subcollections, or a rigorously enforced `org_id` field if a flat migration is safer. Add `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, and a server-generated version where appropriate.

Add a `domain_events` or `audit_events` collection for immutable business events, and use transactions for invoice state changes and ledger effects. Use soft deletion for finance, agreements, invoices, and audit-relevant entities. Keep an explicit migration plan: dual-read if necessary, backfill organization IDs, verify counts and checksums, deploy rules in stages, then remove the old paths only after rollback windows close.

## 25. Recommended API Architecture

Introduce a small BFF/server-command layer. Keep read queries in Firestore where the security rules are strong, but route sensitive mutations through trusted functions or server endpoints. Validate all payloads with a schema library. Return typed response envelopes and request IDs. Add idempotency keys to payment, email, invitation, and state-transition commands.

Example contracts:

```text
POST /api/v1/clients
POST /api/v1/quotations/{id}/issue
POST /api/v1/invoices/{id}/mark-paid
POST /api/v1/team/invitations
POST /api/v1/agreements/{id}/sign
POST /api/v1/email/send-template
```

Each endpoint should verify the Firebase ID token, derive the organization and permissions server-side, validate the command, write using a transaction where required, append an audit event, and return `{data, requestId}` or `{error:{code,message,requestId}}`.

## 26. Recommended UI/UX Architecture

Use role-aware navigation with a primary “Today” dashboard, a CRM workspace, commercial documents, finance, and administration. Keep advanced configuration behind an administration area. Build reusable primitives for forms, data tables, status badges, confirmation dialogs, inline errors, async buttons, empty states, and retry banners.

The UI state model should distinguish `idle`, `loading`, `saving`, `saved`, `failed`, `offline`, and `conflict`. For a failed remote write, keep the unsaved draft visible and offer retry; do not silently revert or claim success. Use a unified client timeline as the primary context surface, with invoices, quotations, meetings, activities, and notes as typed events.

## 27. What NOT to Build

**Do not build microservices now.** The repository needs a trusted boundary and better domain separation, not network-distributed complexity.

**Do not build a custom authentication system or browser-shipped root password.** Use Firebase Auth and server-side claims/policy.

**Do not build a generalized workflow engine yet.** First implement a small number of explicit, idempotent domain events.

**Do not build an AI chatbot as a vanity feature.** Build targeted summarization, extraction, duplicate detection, and next-action assistance only where a measurable workflow improves.

**Do not build more dashboard charts before fixing data correctness.** A beautiful metric derived from stale or rejected writes damages trust.

## 28. 10X Opportunities

The strongest product opportunity is a reliable “data enters once, works everywhere” operating system. A paid invoice can create a ledger event, update cash-flow metrics, schedule a receipt, and produce a founder digest—but only after the event model is durable and idempotent.

Other defensible opportunities include a 10-second client briefing generated from the unified timeline, Tamil/Tanglish communication templates with client preference tracking, deal-decay signals tied to next actions, cross-venture command-center filtering, and a document intelligence layer that extracts quote/invoice fields while preserving human approval.

## 29. Priority Matrix

Scores use the requested 1–10 dimensions: user impact, business impact, security risk, technical risk, implementation complexity, and scalability impact. Complexity is a cost score where higher means harder.

| Issue/action | User | Business | Security | Technical | Complexity | Scale | Priority |
|---|---:|---:|---:|---:|---:|---:|---|
| Remove client root password/offline auth bypass | 9 | 10 | 10 | 9 | 5 | 8 | P0 |
| Lock down agreement signing | 9 | 10 | 10 | 9 | 6 | 7 | P0 |
| Secure email endpoint | 8 | 9 | 9 | 8 | 5 | 7 | P0 |
| Tenant/organization enforcement | 8 | 10 | 9 | 9 | 7 | 10 | P0 |
| Surface write failures | 8 | 9 | 7 | 9 | 6 | 8 | P1 |
| Storage path and content policy | 7 | 8 | 8 | 7 | 4 | 7 | P1 |
| Add rules/unit/E2E tests and CI | 8 | 9 | 8 | 8 | 6 | 8 | P1 |
| Replace full collection mirrors | 7 | 8 | 6 | 8 | 8 | 10 | P1 |
| Server-side audit events | 7 | 8 | 8 | 7 | 6 | 8 | P1 |
| Invoice/ledger transaction and idempotency | 8 | 10 | 7 | 8 | 7 | 8 | P1 |

## 30. 30/60/90-Day Roadmap

### First 30 days

Remove the client root password path and offline password bypass. Verify Firebase Auth configuration in every deployment. Lock down agreement reads/updates and replace public updates with a tokenized signing function. Secure email dispatch with authentication, templates, size limits, recipient policy, rate limiting, and redacted errors. Restrict Storage by organization and path. Add Firebase Emulator tests for rules and unit tests for RBAC. Add error tracking and make failed writes visible in the UI.

### Days 31–60

Introduce async repositories and command services. Add schema validation, server timestamps, stable IDs, idempotency, and transactions for invoice/ledger transitions. Add CI with typecheck, tests, build, dependency audit, and preview smoke tests. Replace global listeners with route/query-scoped reads for the highest-volume collections. Dynamic-import PDF/XLSX modules and measure mobile performance.

### Days 61–90

Complete organization-aware data migration and server audit events. Add a unified client timeline, saved operational views, bulk import validation, stale-client detection, and a reliable invoice-to-income event. Introduce scheduled reminders or digest jobs only after observability and retry behavior are in place. Evaluate targeted AI features using real usage evidence and explicit cost/quality thresholds.

## 31. Engineering Backlog

### SECURITY

```text
TASK: Remove VITE_ROOT_MASTER_PASS and the offline email-only login fallback.
WHY: The browser must never verify a privileged password or grant access without Firebase Auth.
FILES / MODULES: src/lib/firebaseAuth.ts, .env.example, Firebase Auth configuration.
CHANGE: Require Firebase Auth; use server-side claims or membership lookup for founder/admin status.
DEPENDENCIES: Firebase Auth users and deployment environment validation.
RISK: Existing prototype users may need credential migration.
COMPLEXITY: 5/10.
PRIORITY: P0.
EXPECTED RESULT: No client-shipped master credential and no passwordless offline access.
```

```text
TASK: Replace unrestricted agreement updates with a tokenized signing command.
WHY: Anonymous arbitrary document updates can tamper with contracts.
FILES / MODULES: firestore.rules, src/pages/SignAgreement.tsx, new server function.
CHANGE: Hash expiring single-use tokens; whitelist signature fields; append a signing event.
DEPENDENCIES: Token issuance and migration of existing agreement links.
RISK: Existing public links will need controlled backward compatibility.
COMPLEXITY: 6/10.
PRIORITY: P0.
EXPECTED RESULT: Public users can sign only the intended agreement and fields.
```

```text
TASK: Secure email dispatch.
WHY: The current endpoint can be abused to send arbitrary caller-controlled messages.
FILES / MODULES: api/send-email.ts, src/lib/emailService.ts, deployment config.
CHANGE: Verify Firebase ID tokens, accept templates not raw HTML, rate-limit, validate recipients, cap payloads, and redact provider errors.
DEPENDENCIES: Auth verification and provider configuration.
RISK: Some existing email flows must be migrated to template variables.
COMPLEXITY: 5/10.
PRIORITY: P0.
EXPECTED RESULT: Authenticated, auditable, abuse-resistant outbound email.
```

### BUG FIXES

```text
TASK: Make every mutation awaitable and failure-aware.
WHY: Local success currently masks Firestore rejection.
FILES / MODULES: src/lib/db/index.ts, all mutation callers, shared result types.
CHANGE: Return promises, handle pending/failure/retry states, and reconcile only after durable success.
DEPENDENCIES: UI async state primitives.
RISK: More visible failures may require user-facing recovery flows.
COMPLEXITY: 7/10.
PRIORITY: P1.
EXPECTED RESULT: The UI never claims a failed remote write succeeded.
```

```text
TASK: Replace timestamp IDs with collision-safe IDs and business-number allocation.
WHY: Concurrent operations can collide and business documents need stable references.
FILES / MODULES: src/lib/db/index.ts, invoice/quotation services.
CHANGE: Use auto IDs/UUIDs and server-controlled quote/invoice numbers.
DEPENDENCIES: Backfill and compatibility lookup.
RISK: Existing links and exports must continue to resolve.
COMPLEXITY: 5/10.
PRIORITY: P1.
EXPECTED RESULT: Safe concurrent creation and predictable document numbering.
```

### ARCHITECTURE

```text
TASK: Split FirebaseDataStore into domain repositories and application services.
WHY: The monolithic store creates broad coupling and makes policy hard to test.
FILES / MODULES: src/lib/db/index.ts, src/lib/db/*, new services/commands modules.
CHANGE: Keep shared Firebase infrastructure, but isolate CRM, commercial, finance, agreements, and identity boundaries.
DEPENDENCIES: Async mutation contract.
RISK: Temporary adapter complexity during migration.
COMPLEXITY: 8/10.
PRIORITY: P1.
EXPECTED RESULT: Smaller testable units without a premature microservice split.
```

### DATABASE

```text
TASK: Enforce organization scope and add integrity fields.
WHY: org_id exists in the model but is not consistently enforced by rules.
FILES / MODULES: firestore.rules, types, migration scripts.
CHANGE: Add org-scoped paths or mandatory org predicates; use server timestamps and audit fields.
DEPENDENCIES: Auth claims/membership model.
RISK: Incorrect migration can hide data; back up and verify counts first.
COMPLEXITY: 7/10.
PRIORITY: P0.
EXPECTED RESULT: Strong tenant isolation and traceable records.
```

```text
TASK: Make invoice-to-income effects transactional and idempotent.
WHY: Financial records must not duplicate or diverge on retries.
FILES / MODULES: invoice and finance repositories, new event/transaction service.
CHANGE: Use a payment-state transition, idempotency key, and immutable ledger event.
DEPENDENCIES: Server command layer.
RISK: Historical data may require reconciliation.
COMPLEXITY: 7/10.
PRIORITY: P1.
EXPECTED RESULT: One durable business event produces one ledger effect.
```

### BACKEND

```text
TASK: Add a versioned command API/BFF.
WHY: Sensitive mutations need trusted validation, authorization, and observability.
FILES / MODULES: api/, new server services, shared schemas.
CHANGE: Add authenticated, typed endpoints for team, documents, finance, agreements, and email.
DEPENDENCIES: Firebase Admin SDK or equivalent server verifier.
RISK: Dual paths may temporarily diverge.
COMPLEXITY: 7/10.
PRIORITY: P1.
EXPECTED RESULT: Privileged business rules execute outside the browser.
```

### FRONTEND

```text
TASK: Add a reliable async data-access hook layer.
WHY: Current pages read global arrays and cannot model pending/error/conflict states.
FILES / MODULES: src/pages, src/components, new hooks/query layer.
CHANGE: Use route-scoped reads, mutations with status, cache invalidation, and retry.
DEPENDENCIES: Repository/API contract.
RISK: UI migration touches most pages.
COMPLEXITY: 7/10.
PRIORITY: P1.
EXPECTED RESULT: Predictable data loading and truthful UI feedback.
```

### UI/UX

```text
TASK: Build a role-based onboarding and “Today” workflow.
WHY: The broad workspace delays first value and increases cognitive load.
FILES / MODULES: Dashboard, AppShell, onboarding components.
CHANGE: Guide a user through client → deal → quote → next action; hide irrelevant modules by role.
DEPENDENCIES: Stable permissions and first-run state.
RISK: Existing power users may prefer the current dashboard.
COMPLEXITY: 5/10.
PRIORITY: P2.
EXPECTED RESULT: Faster activation and less navigation overhead.
```

### PERFORMANCE

```text
TASK: Lazy-load PDF/XLSX and route modules; replace broad listeners with indexed queries.
WHY: Build output is large and full collection listeners scale poorly.
FILES / MODULES: App routing, pdfEngine.ts, export modules, db synchronization.
CHANGE: Dynamic imports, pagination, query filters, and measured Web Vitals.
DEPENDENCIES: Repository/query contract and Firestore indexes.
RISK: Some offline behavior will change.
COMPLEXITY: 8/10.
PRIORITY: P1.
EXPECTED RESULT: Smaller initial load and predictable read cost.
```

### TESTING

```text
TASK: Establish a risk-first test pyramid.
WHY: There are no meaningful automated tests for critical security and financial paths.
FILES / MODULES: new tests/, Firebase Emulator configuration, CI workflow.
CHANGE: Add rules tests, RBAC unit tests, repository integration tests, and E2E smoke flows.
DEPENDENCIES: Stable async/API boundaries.
RISK: Emulator setup effort.
COMPLEXITY: 6/10.
PRIORITY: P1.
EXPECTED RESULT: Releases are protected by business-risk regression tests.
```

### DEVOPS

```text
TASK: Add CI/CD gates, environment validation, backups, and rollback runbooks.
WHY: Build success alone does not protect production data or deployment safety.
FILES / MODULES: .github/workflows, deployment documentation, Firebase/Vercel configuration.
CHANGE: Run typecheck, lint, tests, build, audit, rules tests, and preview smoke tests; document restore.
DEPENDENCIES: Test suite and secret management.
RISK: Pipeline initially exposes undocumented assumptions.
COMPLEXITY: 5/10.
PRIORITY: P1.
EXPECTED RESULT: Reproducible, reviewable, reversible releases.
```

### INTEGRATIONS

```text
TASK: Replace raw SMTP relay behavior with a provider abstraction and templates.
WHY: Deliverability, security, and auditability are currently weak.
FILES / MODULES: api/send-email.ts, emailService.ts.
CHANGE: Server-side templates, provider adapter, delivery status, retries.
DEPENDENCIES: Authenticated API command.
RISK: Template migration.
COMPLEXITY: 5/10.
PRIORITY: P1.
EXPECTED RESULT: Reliable and controlled communications.
```

### AI

```text
TASK: Add server-side client briefing and next-action suggestions after data correctness is proven.
WHY: This saves preparation time without introducing a generic chatbot.
FILES / MODULES: new AI job/service, client timeline UI, policy/redaction layer.
CHANGE: Summarize approved client events and suggest human-reviewable follow-ups.
DEPENDENCIES: Tenant isolation, audit events, model cost controls.
RISK: Sensitive data exposure and hallucination.
COMPLEXITY: 6/10.
PRIORITY: P2.
EXPECTED RESULT: Faster client preparation with human approval and traceability.
```

### PRODUCT FEATURES

```text
TASK: Implement a unified client timeline.
WHY: It is the clearest expression of the product’s operating-system value.
FILES / MODULES: client detail page, activity/document services, event projection.
CHANGE: Present notes, stage changes, quotes, invoices, payments, meetings, and follow-ups chronologically.
DEPENDENCIES: Immutable domain events and consistent timestamps.
RISK: Historical data backfill and event ordering.
COMPLEXITY: 7/10.
PRIORITY: P2.
EXPECTED RESULT: A user can brief themselves on a client in seconds.
```

## 32. Final CTO Verdict

**Current maturity: MVP / early internal production, not production-grade SaaS.** The implementation has enough substance to be a valuable internal prototype and a promising foundation. It is not ready to claim secure multi-tenant production operation until identity, authorization, durable writes, agreement signing, email dispatch, Storage policy, and test/operations controls are corrected.

### Overall scorecard

| Category | Score / 10 |
|---|---:|
| Architecture | 4 |
| Code Quality | 6 |
| Security | 2 |
| Database | 4 |
| Performance | 4 |
| UX | 7 |
| UI | 7 |
| Scalability | 3 |
| Testing | 2 |
| DevOps | 2 |
| Product Strategy | 7 |
| Maintainability | 5 |

### Biggest strengths

1. The product has a clear operating-system direction rather than being only a contact list.
2. The domain model and feature surface are broad enough to support meaningful workflows.
3. TypeScript strict mode, a passing production build, and a visible Firebase rules file provide a useful baseline.
4. The visual system and recent UI cleanup show strong product-design intent.
5. The repository documentation identifies valuable automation opportunities and explicitly avoids premature microservices.

### Biggest weaknesses

1. Client-side credential and offline authorization logic undermines the security model.
2. Agreement updates are publicly writable.
3. Email dispatch is an unauthenticated arbitrary-content endpoint.
4. Storage access is too broad.
5. Browser-local optimistic persistence is treated as if it were durable shared state.
6. Full-collection listeners will create cost and performance pressure.
7. Audit records are not a trusted, immutable source of truth.
8. Organization/tenant boundaries are not consistently enforced.
9. No meaningful automated tests or CI gates are visible.
10. Cross-domain logic is concentrated in a very large store.

### Biggest risks

1. Account takeover or unauthorized access through client-side/offline authentication paths.
2. Contract/agreement tampering through unrestricted updates.
3. Email abuse, spoofing, and provider-account reputation damage.
4. Leakage or overwrite of stored files.
5. Silent loss of data when Firestore writes fail.
6. Financial duplication or inconsistency around invoice and income workflows.
7. Privilege drift caused by client-side role state and broad update inputs.
8. Multi-tenant data leakage if the product expands beyond one organization.
9. Rising read and bundle costs from global listeners and client-heavy utilities.
10. Release regressions due to missing security, integration, and E2E tests.

### Biggest opportunities

1. Build a trusted data-entry-once operating system around durable domain events.
2. Make the unified client timeline the product’s signature workflow.
3. Automate invoice-to-income and payment-to-funnel transitions idempotently.
4. Use targeted AI for client briefing, extraction, and next-action assistance.
5. Leverage Tamil/Tanglish communication templates as a focused market advantage.
6. Add deal-decay and stale-client signals tied to real next actions.
7. Create a cross-venture command center after tenant and data boundaries are sound.
8. Turn auditability and document lifecycle into a trust differentiator.
9. Use scheduled founder digests only after event and retry infrastructure exists.
10. Preserve the modular-monolith approach while making the boundaries explicit.

# TOP 20 ACTIONS

1. **Remove the browser root password and offline email-only login →** eliminate the most direct authentication bypass and credential exposure → **Impact:** critical security and trust → **Complexity:** medium → **Priority:** P0.
2. **Replace `allow update: if true` for agreements →** prevent anonymous contract tampering → **Impact:** critical legal/security protection → **Complexity:** medium → **Priority:** P0.
3. **Secure `/api/send-email` with token verification, templates, rate limits, and recipient policy →** prevent arbitrary email abuse → **Impact:** critical operational/security protection → **Complexity:** medium → **Priority:** P0.
4. **Enforce organization/tenant scope in every Firestore rule →** prevent cross-organization leakage as the product grows → **Impact:** critical scalability/security protection → **Complexity:** high → **Priority:** P0.
5. **Restrict Storage by organization, path, role, content type, and size →** prevent file leakage and overwrite → **Impact:** high → **Complexity:** low-medium → **Priority:** P1.
6. **Convert unawaited writes into async result-returning operations →** make UI success match durable persistence → **Impact:** high reliability → **Complexity:** high → **Priority:** P1.
7. **Add Firebase Emulator security-rule tests →** verify authorization independently of UI visibility → **Impact:** high security → **Complexity:** medium → **Priority:** P1.
8. **Add CI gates for typecheck, tests, build, rules, and dependency audit →** prevent unsafe releases → **Impact:** high → **Complexity:** medium → **Priority:** P1.
9. **Replace hardcoded audit actors with authenticated server identity →** restore accountability and non-repudiation → **Impact:** high → **Complexity:** medium → **Priority:** P1.
10. **Introduce a trusted command/API layer for sensitive mutations →** centralize validation, policy, transactions, and observability → **Impact:** high → **Complexity:** high → **Priority:** P1.
11. **Make invoice state transitions and income creation idempotent and transactional →** protect financial correctness → **Impact:** high business value → **Complexity:** high → **Priority:** P1.
12. **Replace timestamp IDs with collision-safe IDs and business-number allocation →** prevent concurrent creation collisions → **Impact:** high → **Complexity:** medium → **Priority:** P1.
13. **Replace global collection listeners with query-scoped pagination →** control read costs and support scale → **Impact:** high → **Complexity:** high → **Priority:** P1.
14. **Add schema validation and field-level allowlists to every mutation →** prevent malformed or privileged field updates → **Impact:** high → **Complexity:** medium → **Priority:** P1.
15. **Create server-side immutable audit events →** make security and financial history trustworthy → **Impact:** high → **Complexity:** medium → **Priority:** P1.
16. **Add route-level loading, failure, retry, and conflict states →** stop users from trusting false success messages → **Impact:** high UX/reliability → **Complexity:** medium → **Priority:** P1.
17. **Dynamic-import PDF/XLSX features and measure mobile performance →** reduce initial bundle and runtime cost → **Impact:** medium-high → **Complexity:** medium → **Priority:** P1.
18. **Build a unified client timeline from durable domain events →** deliver the product’s clearest differentiated value → **Impact:** high product value → **Complexity:** high → **Priority:** P2.
19. **Add stale-client, deal-decay, and next-action automation →** improve retention and cash-flow behavior → **Impact:** high product value → **Complexity:** medium → **Priority:** P2.
20. **Add targeted AI client briefing and document extraction with human review →** save operational time without adding a gimmick chatbot → **Impact:** medium-high → **Complexity:** medium-high → **Priority:** P2.

## Evidence Index

The principal evidence reviewed was `src/lib/firebaseAuth.ts`, `src/lib/firebase.ts`, `src/lib/db/index.ts`, `src/lib/auditLog.ts`, `src/lib/rbac.ts`, `firestore.rules`, `storage.rules`, `api/send-email.ts`, `vite.config.ts`, `vercel.json`, `package.json`, `.env.example`, route/page/component inventories, and the project documentation under `files/`. The production command `npm run build` completed successfully. The production dependency audit reported one high-severity direct dependency issue involving `xlsx`, with advisories [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) and [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9).

## References

[1]: https://github.com/advisories/GHSA-4r6h-8v6p-xvw6 "Prototype Pollution in sheetJS"

[2]: https://github.com/advisories/GHSA-5pgg-2g8v-p4x9 "SheetJS Regular Expression Denial of Service"

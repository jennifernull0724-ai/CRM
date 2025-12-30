# T-REX AI OS — Full System Audit (Read-Only)

## Executive Summary
- Marketing, auth, and CRM server components align with the documented stack and render cleanly, but governance gaps persist: unauthenticated visitors can hit legacy `/deals` pages that query Prisma directly with no guard (see [app/deals/page.tsx](app/deals/page.tsx) and [app/deals/layout.tsx](app/deals/layout.tsx)), and compliance/settings surfaces lack persona enforcement despite being owner/admin-only.
- Middleware still centralizes plan enforcement, but it is both deprecated (Next warning) and incomplete for role scoping—route-specific components handle auth inconsistently, leading to mixed redirects vs. raw data access ([middleware.ts](middleware.ts)).
- Navigation and shells are not persona-aware, so owners/admins see CRM links that immediately redirect, CRM users see "Tasks" links that do not exist, and all personas get a "Sign Out" link that just opens `/login` without ending the session ([components/navigation.tsx](components/navigation.tsx), [components/shells/crm-shell.tsx](components/shells/crm-shell.tsx)).
- Data workflows (contacts, CRM deals, dispatch PDFs, compliance presets) are robust, with enforced ownership, auditing, and storage policies, but compliance UI does not restrict roles, so any authenticated user can view the governance cockpit ([app/compliance/page.tsx](app/compliance/page.tsx)).
- Build pipeline currently passes `npm run lint` and `npm run build`, yet Vercel will continue warning about middleware, and pdfkit/fontkit remains a Node-only dependency that will fail if any route is forced onto the Edge runtime.

## Route Map Table

| Path / Group | Surface | Persona | Guard & Behavior | Notes |
| --- | --- | --- | --- | --- |
| `/`, `/pricing`, `/security`, `/legal`, `/request-demo`, `/support`, `/terms`, `/privacy` | Marketing | Public | Rendered statically via marketing header/footer components ([app/page.tsx](app/page.tsx), [app/pricing/page.tsx](app/pricing/page.tsx), [app/security/page.tsx](app/security/page.tsx), [app/legal/page.tsx](app/legal/page.tsx)) | Branding intact; no auth hooks. |
| `/login`, `/signup`, `/forgot-password` | Auth | Prospect | Client components submit to NextAuth/signup APIs ([app/login/page.tsx](app/login/page.tsx), [app/signup/page.tsx](app/signup/page.tsx)) | Login relies on `signIn`; logout link missing. |
| `/app` | Role router | Any authenticated user | Server component redirects to persona home via `resolveRoleDestination` ([app/app/page.tsx](app/app/page.tsx)) | Works only after session + company exist. |
| `/crm/*` | CRM workspace | Sales "user" only | Layout blocks non-`user` roles and wraps `CrmShell` ([app/crm/layout.tsx](app/crm/layout.tsx)) | Navigation still advertises `/crm/tasks`, which has no route. |
| `/contacts`, `/contacts/new`, `/contacts/[contactId]` | Legacy contacts | Mixed | Each page performs its own `getServerSession` check; layout is public ([app/contacts/page.tsx](app/contacts/page.tsx), [app/contacts/layout.tsx](app/contacts/layout.tsx)) | Guard duplication; redirect loops possible if layout reused. |
| `/deals`, `/deals/new`, `/deals/[dealId]` | Legacy deals | Mixed | **No auth or role guard**; server component queries Prisma directly ([app/deals/page.tsx](app/deals/page.tsx), [app/deals/layout.tsx](app/deals/layout.tsx)) | Critical data exposure violating locked architecture. |
| `/crm/deals/*` | Persona-scoped deals | Sales "user" | Actions enforce owner-only access via `requireCrmUserContext` ([app/crm/deals/actions.ts](app/crm/deals/actions.ts)) | Upload/email bid docs scoped to deal owner. |
| `/dashboard/*` | Control planes | Owner/Admin/Estimator | Entry page routes by role, layouts fetch dashboards, middleware re-checks ([app/dashboard/page.tsx](app/dashboard/page.tsx), [app/dashboard/(governance)/owner/page.tsx](app/dashboard/(governance)/owner/page.tsx), [app/dashboard/(governance)/admin/page.tsx](app/dashboard/(governance)/admin/page.tsx)) | Works but nav still exposes CRM links. |
| `/estimating`, `/estimating/[estimateId]`, `/estimating/settings` | Estimator console | Estimator | Pages call `requireEstimatorContext` and render shells ([app/estimating/page.tsx](app/estimating/page.tsx)) | Settings link duplicates `/settings/estimating`. |
| `/dispatch/*` | Dispatch console | Dispatch/Admin/Owner | Page ensures role in `DISPATCH_ROLES`, fetches queue/presets ([app/dispatch/page.tsx](app/dispatch/page.tsx)) | Extensive data surfaces; conversions gated by server actions. |
| `/compliance/*`, `/verify/employee/*` | Compliance cockpit | Intended Owner/Admin | Pages only require company ID; **any authenticated role can load them** ([app/compliance/page.tsx](app/compliance/page.tsx)) | Violates "Owner/Admin only" mandate. |
| `/settings/*`, `/upgrade/*` | Settings / billing | Mixed | Hub has no guard; middleware only enforces plan restrictions ([app/settings/page.tsx](app/settings/page.tsx)) | Users lacking billing rights still see links. |
| `/api/...` (contacts, deals, analytics, dispatch, work-orders, compliance) | API | Various | Majority require session via `auth()`/`getServerSession`; downloads revalidate tokens ([app/api/work-orders/[workOrderId]/pdf/route.ts](app/api/work-orders/%5BworkOrderId%5D/pdf/route.ts), [app/api/crm/deals/[dealId]/bid-documents/[documentId]/download/route.ts](app/api/crm/deals/%5BdealId%5D/bid-documents/%5BdocumentId%5D/download/route.ts)) | Some analytics endpoints assume cron callers; plan restriction map blocks starter tier features. |

## Persona Compliance Table

| Persona | Entry Route | Visible Navigation | Accessible Pages | Result |
| --- | --- | --- | --- | --- |
| Owner | `/dashboard/owner` via `/app` | Global nav shows CRM links plus dashboard/settings ([components/navigation.tsx](components/navigation.tsx)) | Can open `/compliance` and `/settings`; CRM links redirect | **FAIL** – overreach + broken nav messaging. |
| Admin | `/dashboard/admin` | Global nav; DashboardShell limits links ([components/shells/dashboard-shell.tsx](components/shells/dashboard-shell.tsx)) | Middleware blocks `/crm`, but `/compliance` stays open | **FAIL** – compliance overreach, mixed labels. |
| User (Sales) | `/crm` | CRM shell nav lists Contacts, Deals, Tasks ([components/shells/crm-shell.tsx](components/shells/crm-shell.tsx)) | Pages enforce owner-only filters; `/crm/tasks` link 404s | **FAIL** – navigation advertises non-existent route. |
| Estimator | `/dashboard/estimator` → `/estimating` | Estimating shell with dashboard/console/settings ([components/shells/estimating-shell.tsx](components/shells/estimating-shell.tsx)) | `requireEstimatorContext` gates pipeline/settings; redundant nav copy | **PASS (borderline)** – functional but repetitive labels. |
| Dispatch | `/dispatch` | Dispatch shell limited to console/work orders ([components/shells/dispatch-shell.tsx](components/shells/dispatch-shell.tsx)) | Role-enforced conversions, queue, analytics | **PASS** – flows match mandates. |
| Compliance | `/compliance` | General layout (no shell) | Any authenticated role can read snapshots, presets | **FAIL** – critical governance gap. |

## UI / UX Issues
- Navigation bar is universal and not role-aware, so owners/admins see CRM links that immediately redirect, and the "Sign Out" control is just a `/login` link with no `signOut()` call ([components/navigation.tsx](components/navigation.tsx)).
- CRM shell advertises `/crm/tasks`, but that route is not implemented anywhere, creating dead-end navigation ([components/shells/crm-shell.tsx](components/shells/crm-shell.tsx)).
- Legacy deals UI uses default gray palette and standard cards, clashing with the navy/orange identity seen elsewhere ([app/deals/page.tsx](app/deals/page.tsx)).
- Compliance cockpit mixes white cards and yellow alerts without the brand’s dark framing, making it feel like a different product surface ([app/compliance/page.tsx](app/compliance/page.tsx)).
- Pricing/security pages maintain consistent typography, but `/deals/new` and other legacy scaffolds fall back to plain Tailwind defaults, creating a jarring drop in fidelity ([app/deals/new/page.tsx](app/deals/new/page.tsx)).
- Mobile/responsive treatments differ: SurfaceShell collapses nav to icons, but marketing header/footer do not share the same typography stack, causing visual jumps when switching contexts ([components/shells/surface-shell.tsx](components/shells/surface-shell.tsx)).

## Feature Inventory
- Contacts radar, filtering, and task/note/email workflows enforce ownership, mention handling, and alerting ([app/contacts/page.tsx](app/contacts/page.tsx), [app/contacts/[contactId]/page.tsx](app/contacts/%5BcontactId%5D/page.tsx), [app/contacts/actions.ts](app/contacts/actions.ts)).
- CRM deals (persona-specific) cover creation, estimating handoff, bid document uploads/emails, and audit logging; file workflows use GCS via `uploadDealBidDocument` ([app/crm/deals/actions.ts](app/crm/deals/actions.ts), [app/crm/deals/[dealId]/actions.ts](app/crm/deals/%5BdealId%5D/actions.ts)).
- Dispatch console aggregates queue metrics, compliance overrides, work-order digests, and conversion actions with role-scoped server actions ([app/dispatch/page.tsx](app/dispatch/page.tsx), [app/dispatch/actions.ts](app/dispatch/actions.ts)).
- Estimating pipeline buckets by status/industry with `PIPELINE_STATUSES` guards and server-only data pulls ([app/estimating/page.tsx](app/estimating/page.tsx), [lib/estimating/pipeline.ts](lib/estimating/pipeline.ts)).
- Compliance cockpit renders employees, snapshots, presets, and exports, though access control is missing ([app/compliance/page.tsx](app/compliance/page.tsx), [lib/compliance/presets.ts](lib/compliance/presets.ts)).
- Security forms, request demo, support, and plan-aware upgrade flows exist, including Stripe checkout route enforcement ([app/upgrade/page.tsx](app/upgrade/page.tsx), [app/api/stripe/checkout/route.ts](app/api/stripe/checkout/route.ts)).
- Change log reconstruction:
  - `d124e02` “Add marketing pages, auth redesign, SEO metadata…” – introduced polished public surfaces plus new auth clients.
  - `f2610ba` added compliance actors, dispatch attribution, welcome email, and seat enforcement (maps to the dispatch/compliance logic now in `lib/dispatch/*` and `lib/compliance/*`).
  - `1661f29` “chore: save WIP edge fixes” captured metadata/regex Edge runtime cleanups but left pdfkit runtime constraints unresolved.

## Security & Document Handling
- File storage uses Google Cloud Storage via `uploadFile`, with per-company prefixes and SHA-256 hashes stored with metadata ([lib/s3.ts](lib/s3.ts)).
- CRM "user" personas can upload bid documents; ownership enforced and every upload audited ([app/crm/deals/[dealId]/actions.ts](app/crm/deals/%5BdealId%5D/actions.ts)).
- Dispatch PDFs regenerate per request with immutable versioning before upload; transactions guarantee atomic DB+storage writes ([lib/dispatch/pdfStorage.ts](lib/dispatch/pdfStorage.ts), [lib/dispatch/pdf.ts](lib/dispatch/pdf.ts)).
- Work-order and deal document downloads always route through signed URLs scoped to the requesting company and actor ([app/api/work-orders/[workOrderId]/documents/[documentId]/route.ts](app/api/work-orders/%5BworkOrderId%5D/documents/%5BdocumentId%5D/route.ts), [app/api/crm/deals/[dealId]/bid-documents/[documentId]/download/route.ts](app/api/crm/deals/%5BdealId%5D/bid-documents/%5BdocumentId%5D/download/route.ts)).
- Email attachments are explicitly permitted up to 5 files / 25 MB total, and every send logs both activity and audit entries ([app/contacts/actions.ts](app/contacts/actions.ts)).
- Compliance documents/presets share the same storage helpers, but UI lacks role gating, so while PDFs/documents are immutable, visibility is not restricted ([app/compliance/page.tsx](app/compliance/page.tsx)).
- Audit logging is pervasive: contact CRUD, tasks, notes, deal uploads, and work-order PDFs all write to `accessAuditLog` and activity tables before returning responses ([app/contacts/actions.ts](app/contacts/actions.ts), [app/crm/deals/[dealId]/actions.ts](app/crm/deals/%5BdealId%5D/actions.ts), [lib/dispatch/pdfStorage.ts](lib/dispatch/pdfStorage.ts)).

## Lint / Build Status
- `npm run lint` – passes with no reported violations (run 2025-12-30).
- `npm run build` – passes on Next.js 16.1.1 with one warning: deprecated middleware convention (“use proxy instead”).

## Immediate Risk Areas
1. Public legacy `/deals` routes expose company-wide data without authentication ([app/deals/page.tsx](app/deals/page.tsx)).
2. Compliance cockpit/documents remain accessible to any authenticated persona ([app/compliance/page.tsx](app/compliance/page.tsx)).
3. Global navigation misleads every persona, linking to unauthorized or nonexistent routes ([components/navigation.tsx](components/navigation.tsx)).
4. Middleware is deprecated and incomplete; once proxy migration is enforced, plan enforcement may regress ([middleware.ts](middleware.ts)).
5. pdfkit/fontkit stack is Node-only; accidental Edge routing will break dispatch/compliance workflows ([lib/dispatch/pdf.ts](lib/dispatch/pdf.ts)).

## Safe Areas
- Contacts radar, task/note/email workflows enforce ownership and should stay untouched during governance fixes ([app/contacts/page.tsx](app/contacts/page.tsx), [app/contacts/[contactId]/page.tsx](app/contacts/%5BcontactId%5D/page.tsx)).
- Dispatch dashboard metrics, queue handling, and work-order PDF generation follow the locked architecture and include full auditing ([app/dispatch/page.tsx](app/dispatch/page.tsx), [lib/dispatch/pdfStorage.ts](lib/dispatch/pdfStorage.ts)).
- CRM persona routes (`/crm/*`) already block non-user roles via layout and middleware ([app/crm/layout.tsx](app/crm/layout.tsx)).
- Marketing, pricing, security, and legal pages match the brand and should remain unchanged while governance gaps close ([app/page.tsx](app/page.tsx), [app/pricing/page.tsx](app/pricing/page.tsx), [app/security/page.tsx](app/security/page.tsx), [app/legal/page.tsx](app/legal/page.tsx)).

## Recommended Fix Order (No Implementation Yet)
1. Lock down public legacy routes (`/deals/*`, `/contacts/*`) with server-side auth/role checks or remove them entirely.
2. Enforce role gates on compliance/settings surfaces (layouts + middleware/proxy) to restrict those paths to owner/admin personas.
3. Replace global navigation with persona-aware variants and implement a real sign-out action to avoid confusing redirects.
4. Migrate middleware to the new `proxy` convention while re-validating plan restriction coverage to clear build warnings.
5. Formalize PDF runtime boundaries by flagging dispatch/compliance APIs as Node-only and documenting pdfkit limitations.
6. After governance fixes, bring legacy `/deals` scaffolding up to the current visual system and remove dead links like `/crm/tasks`.

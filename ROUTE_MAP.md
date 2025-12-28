# T-REX AI OS — Canonical Route Map

> Single source of truth for URLs, owning components, and required experiences.

| Segment | Path | Owning file | Status | Notes |
| --- | --- | --- | --- | --- |
| Landing | `/` | `app/page.tsx` | ✅ | Hero, system overview, industries, request demo CTA, pricing preview |
| Pricing | `/pricing` | `app/pricing/page.tsx` | ✅ | Consumes `PLAN_TIERS`, Starter → signup, paid → checkout |
| Login | `/login` | `app/login/page.tsx` | ✅ | Email/password, forgot password link |
| Forgot Password | `/forgot-password` | `app/forgot-password/page.tsx` | 🚧 | Email entry + token flow placeholder |
| Signup | `/signup` | `app/signup/page.tsx` | ✅ | Creates Starter workspace, no Stripe |
| Request Demo | `/request-demo` | `app/request-demo/page.tsx` | ✅ | Submits to backend + email |
| Legal Hub | `/legal` | `app/legal/page.tsx` | 🚧 | Terms + Privacy content |
| Dashboard Router | `/dashboard` | `app/dashboard/page.tsx` | 🚧 | Redirects per role |
| User Dashboard | `/dashboard/user` | `app/dashboard/user/page.tsx` | ✅ | Tasks, deals, activity |
| Estimator Dashboard | `/dashboard/estimator` | `app/dashboard/estimator/page.tsx` | 🚧 | Assigned deals view |
| Admin Dashboard | `/dashboard/admin` | `app/dashboard/admin/page.tsx` | 🚧 | Org pipeline, compliance |
| Owner Dashboard | `/dashboard/owner` | `app/dashboard/owner/page.tsx` | 🚧 | Revenue + compliance risk |
| Contacts Index | `/contacts` | `app/contacts/page.tsx` | ✅ | Search, filters, table |
| Contacts New | `/contacts/new` | `app/contacts/new/page.tsx` | ✅ | Form + activity logging |
| Contact Command Center | `/contacts/[contactId]` | `app/contacts/[contactId]/page.tsx` | 🚧 | Tabs for overview, tasks, notes, email, activity |
| Deals Index | `/deals` | `app/deals/page.tsx` | ✅ | Kanban pipeline |
| Deal Create | `/deals/new` | `app/deals/new/page.tsx` | 🚧 | Initial deal intake |
| Deal Workspace | `/deals/[dealId]` | `app/deals/[dealId]/page.tsx` | 🚧 | Header, versions, line items, activity |
| Deal PDF | `/deals/[dealId]/pdf` | `app/deals/[dealId]/pdf/route.ts` | 🚧 | Version-locked PDF download |
| Compliance Hub | `/compliance` | `app/compliance/page.tsx` | 🚧 | Employees/certs overview |
| Compliance Employees | `/compliance/employees` | `app/compliance/employees/page.tsx` | 🚧 | Employee list |
| Compliance Employee Detail | `/compliance/employees/[employeeId]` | `app/compliance/employees/[employeeId]/page.tsx` | 🚧 | Profile + QR |
| Compliance Documents | `/compliance/documents` | `app/compliance/documents/page.tsx` | 🚧 | Versioned uploads |
| QR Verify | `/verify/employee/[qrToken]` | `app/verify/employee/[qrToken]/page.tsx` | 🚧 | Public verification |
| Settings Hub | `/settings` | `app/settings/page.tsx` | 🚧 | Nav to profile / estimating / billing |
| Settings Profile | `/settings/profile` | `app/settings/profile/page.tsx` | 🚧 | User profile + email integration |
| Settings Estimating | `/settings/estimating` | `app/settings/estimating/page.tsx` | 🚧 | Templates + presets |
| Settings Billing | `/settings/billing` | `app/settings/billing/page.tsx` | 🚧 | Plan, seats, upgrade, Stripe portal |
| Upgrade Checkout | `/upgrade` | `app/upgrade/page.tsx` | ✅ | Paid tiers + Stripe launch |
| Upgrade Success | `/upgrade/success` | `app/upgrade/success/page.tsx` | ✅ | Post-checkout instructions |
| Upgrade Cancel | `/upgrade/cancel` | `app/upgrade/cancel/page.tsx` | ✅ | Retry guidance |

## Usage

- **Never add a page without registering it here.** This table is the contract between product, engineering, and billing.
- Update the *Status* column as you flesh out each experience.
- If a feature request does not map to one of these routes, it returns to product for clarification.

## Next Steps

1. Flesh out placeholder routes with real data components in priority order (Contacts Command Center → Deals Workspace → Compliance → Dashboards → Settings).
2. Centralize navigation (sidebar, top nav) so it references this map and automatically hides routes gated by `PLAN_TIERS`.
3. Keep middleware + pricing enforcement aligned when new routes are added (middleware file should reference this map for restriction coverage).

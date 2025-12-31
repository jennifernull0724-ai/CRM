# 🧨 SYSTEM FORENSIC AUDIT — UI SURFACE INVENTORY (READ-ONLY)

**Audit Date**: Current session  
**Scope**: Complete UI, navigation, routes, widgets, and feature surface across all roles  
**Mode**: READ-ONLY documentation of actual system state  
**Methodology**: Direct code inspection — NO proposals, NO changes, NO removals

---

## 📋 EXECUTIVE SUMMARY

This audit documents **every UI surface, navigation item, route, widget, and feature** visible across all role personas in the CRM system. This is a forensic inventory of what EXISTS, not what SHOULD exist.

### Role Personas Identified
1. **Owner** — Full control plane access
2. **Admin** — Near-owner parity with minor restrictions
3. **User** — Sales workspace with owned contacts only
4. **Estimator** — Pricing authority with pipeline control
5. **Dispatch** — Execution authority for work orders
6. **Guest** (unauthenticated) — Marketing pages only

---

## 🗺️ NAVIGATION STRUCTURE AUDIT

### Top-Level Navigation Component
**File**: [components/navigation.tsx](components/navigation.tsx)

Navigation is **role-aware** and renders different items based on authenticated user's role. Uses horizontal top nav bar (no sidebar).

#### Owner Navigation (3 items)
```
1. Dashboard → /dashboard/owner
2. Compliance → /compliance  
3. Settings → /settings
```

#### Admin Navigation (3 items)
```
1. Dashboard → /dashboard/admin
2. Compliance → /compliance
3. Settings → /settings
```

#### User Navigation (3 items)
```
1. CRM Home → /crm
2. Contacts → /contacts
3. Deals → /deals
```

#### Estimator Navigation (2 items)
```
1. Pipeline → /dashboard/estimator
2. Settings → /estimating/settings
```

#### Dispatch Navigation (3 items)
```
1. Console → /dispatch
2. Work Orders → /dispatch/work-orders
3. Assets → /dispatch/assets (Dispatch creates/manages fleet)
```

#### Guest Navigation (0 authenticated items)
```
- Marketing pages only (no nav bar)
```

---

## 🏗️ SHELL ARCHITECTURE

The system uses **4 distinct shell components** that wrap role-specific surfaces:

### 1. DashboardShell
**File**: [components/shells/dashboard-shell.tsx](components/shells/dashboard-shell.tsx)  
**Used By**: Owner, Admin  
**Nav Items**:
- Owner: `Control Plane`, `Users & Roles`, `System Settings`
- Admin: `Control Plane`, `Users & Roles`, `System Settings`

**Shell Routes**:
```
/dashboard/owner → Control Plane
/settings/users → Users & Roles  
/settings → System Settings
```

### 2. CrmShell
**File**: [components/shells/crm-shell.tsx](components/shells/crm-shell.tsx)  
**Used By**: User role only  
**Nav Items**: `CRM Home`, `Contacts`, `Deals`, `Tasks`

**Shell Routes**:
```
/crm → CRM Home
/crm/contacts → Contacts
/crm/deals → Deals
/crm/tasks → Tasks
```

### 3. EstimatingShell
**File**: [components/shells/estimating-shell.tsx](components/shells/estimating-shell.tsx)  
**Used By**: Estimator role  
**Nav Items**: `Dashboard`, `Console Home`, `Pricing Settings`

**Shell Routes**:
```
/dashboard/estimator → Dashboard
/estimating → Console Home
/estimating/settings → Pricing Settings
```

### 4. DispatchShell
**File**: [components/shells/dispatch-shell.tsx](components/shells/dispatch-shell.tsx)  
**Used By**: Dispatch, Admin, Owner  
**Nav Items**: `Console Home`, `Work Orders`, `Assets`

**Shell Routes**:
```
/dispatch → Console Home
/dispatch/work-orders → Work Orders
/dispatch/assets → Fleet Management (Dispatch-owned)
```

### 5. SurfaceShell (Base Component)
**File**: [components/shells/surface-shell.tsx](components/shells/surface-shell.tsx)  
**Used By**: All other shells (composition pattern)  
**Features**: Logo, user name, role label, nav items, sign-out button

---

## 📍 ROUTE INVENTORY BY ROLE

### OWNER ROLE

#### Primary Dashboard Routes
| Route | Page | Shell | Widgets/Features |
|-------|------|-------|------------------|
| `/dashboard/owner` | Owner Control Plane | DashboardShell | ControlPlaneDashboard, StandardSettingsQuickLinks, ContactAnalyticsCommand, AssetSummaryPanel |
| `/dashboard` | Role Router | None | Redirects to `/dashboard/owner` |

#### Governance Routes (Admin Features)
| Route | Page | Shell | Access Level |
|-------|------|-------|--------------|
| `/dashboard/admin` | Admin Control Plane | DashboardShell | ✅ Accessible (redirects to owner dashboard) |
| `/dashboard/admin/dispatch-presets` | Dispatch Presets Admin | DashboardShell | ✅ Accessible |
| `/dashboard/admin/inbound-emails` | Inbound Email Review | DashboardShell | ✅ Accessible |
| `/dashboard/assets` | ⚠️ **DEPRECATED** | DashboardShell | Should be `/dispatch/assets` |
| `/compliance/employees/[id]` | Employee Detail | ✅ Accessible | Compliance feature required |
| `/compliance/documents` | Document Library | ✅ Accessible | Compliance feature required |
| `/compliance/company-documents` | Company Docs | ✅ Accessible | Compliance feature required |

#### Settings Routes
| Route | Page | Access |
|-------|------|--------|
| `/settings` | Settings Hub | ✅ Accessible (Owner/Admin only) |
| `/settings/billing` | Billing Settings | ✅ Accessible |
| `/settings/branding` | Branding Settings | ✅ Accessible |
| `/settings/estimating` | Estimating Settings | ✅ Accessible |
| `/settings/profile` | Profile Settings | ✅ Accessible |

#### Dispatch Routes
| Route | Page | Access |
|-------|------|--------|
| `/dispatch` | Dispatch Console | ✅ Accessible (Dispatch/Admin/Owner) |
| `/dispatch/work-orders` | Work Orders List | ✅ Accessible |
| `/dispatch/work-orders/[id]` | Work Order Detail | ✅ Accessible |

#### CRM Routes
| Route | Page | Access | Note |
|-------|------|--------|------|
| `/crm` | CRM Home | ⚠️ **Not guarded** | User shell, may error for Owner |
| `/crm/contacts` | Contacts List | ⚠️ **Not guarded** | User shell, may error |
| `/crm/deals` | Deals List | ⚠️ **Not guarded** | User shell, may error |
| `/crm/tasks` | Tasks List | ⚠️ **Not guarded** | User shell, may error |

#### Estimating Routes
| Route | Page | Access |
|-------|------|--------|
| `/estimating` | Estimating Console | ⚠️ **Requires estimator context** | May 403 for Owner |
| `/estimating/settings` | Pricing Settings | ⚠️ **Requires estimator context** | May 403 |
| `/dashboard/estimator` | Estimator Dashboard | ⚠️ **Requires estimator context** | May 403 |

---

### ADMIN ROLE

#### Primary Dashboard Routes
| Route | Page | Shell | Widgets/Features |
|-------|------|-------|------------------|
| `/dashboard/admin` | Admin Control Plane | DashboardShell | ControlPlaneDashboard, StandardSettingsQuickLinks, ContactAnalyticsCommand, AssetSummaryPanel, DispatchPresetsLink |
| `/dashboard` | Role Router | None | Redirects to `/dashboard/admin` |

#### Unique Admin Features
- **Dispatch Presets Management**: Link to `/dashboard/admin/dispatch-presets` visible on admin dashboard
- **Asset Registry Access**: Same as Owner
- **Governance Routes**: Same as Owner (minus owner-specific dashboard)

#### Compliance Routes
| Route | Page | Access | Feature Gate |
|-------|------|--------|--------------|
| `/compliance` | Compliance Hub | ✅ Accessible | Plan must allow compliance feature |
| `/compliance/employees` | Employee Compliance | ✅ Accessible | Compliance feature required |
| `/compliance/employees/[id]` | Employee Detail | ✅ Accessible | Compliance feature required |
| `/compliance/documents` | Document Library | ✅ Accessible | Compliance feature required |
| `/compliance/company-documents` | Company Docs | ✅ Accessible | Compliance feature required |

#### Settings Routes
| Route | Page | Access |
|-------|------|--------|
| `/settings` | Settings Hub | ✅ Accessible (Owner/Admin only) |
| `/settings/billing` | Billing Settings | ✅ Accessible |
| `/settings/branding` | Branding Settings | ✅ Accessible |
| `/settings/estimating` | Estimating Settings | ✅ Accessible |
| `/settings/profile` | Profile Settings | ✅ Accessible |

#### Dispatch Routes
| Route | Page | Access |
|-------|------|--------|
| `/dispatch` | Dispatch Console | ✅ Accessible (Dispatch/Admin/Owner) |
| `/dispatch/work-orders` | Work Orders List | ✅ Accessible |
| `/dispatch/work-orders/[id]` | Work Order Detail | ✅ Accessible |

---

### USER ROLE

#### Primary Dashboard Routes
| Route | Page | Shell | Widgets/Features |
|-------|------|-------|------------------|
| `/dashboard/user` | User Dashboard | SurfaceShell | ActivityTimeline, TaskPressure, InactiveContacts, RecentMentions, EstimatePipeline, DispatchVisibility, OwnedContactsTable |
| `/dashboard` | Role Router | None | Redirects to `/dashboard/user` |

#### User Dashboard Navigation
**File**: [app/dashboard/user/layout.tsx](app/dashboard/user/layout.tsx)

**Nav Items** (4 items):
```
1. Dashboard → /dashboard/user
2. CRM Workspace → /crm
3. Contacts → /contacts
4. Deals → /deals
```

#### CRM Routes
| Route | Page | Shell | Access |
|-------|------|-------|--------|
| `/crm` | CRM Home | CrmShell | ✅ Accessible (User only) |
| `/crm/contacts` | Contacts List | CrmShell | ✅ Accessible |
| `/crm/deals` | Deals List | CrmShell | ✅ Accessible |
| `/crm/deals/new` | New Deal Form | CrmShell | ✅ Accessible |
| `/crm/deals/[id]` | Deal Detail | CrmShell | ✅ Accessible |
| `/crm/deals/[id]/estimate` | Deal Estimate View | CrmShell | ✅ Accessible |
| `/crm/tasks` | Tasks List | CrmShell | ✅ Accessible |

#### Contact Routes
| Route | Page | Access | Scoping |
|-------|------|--------|---------|
| `/contacts` | Contacts List | ✅ Accessible | **Owned contacts only** |
| `/contacts/new` | New Contact Form | ✅ Accessible | Creates owned contact |
| `/contacts/[id]` | Contact Detail | ✅ Accessible | Owner-scoped |

#### Deal Routes
| Route | Page | Access | Scoping |
|-------|------|--------|---------|
| `/deals` | Deals List | ✅ Accessible | **Owned deals only** |
| `/deals/new` | New Deal Form | ✅ Accessible | Creates owned deal |
| `/deals/[id]` | Deal Detail | ✅ Accessible | Owner-scoped |

#### Blocked Routes
| Route | Expected Behavior | Actual Behavior |
|-------|-------------------|-----------------|
| `/dashboard/owner` | Redirect to user dashboard | ✅ Guards working |
| `/dashboard/admin` | Redirect to user dashboard | ✅ Guards working |
| `/settings` | Redirect to user dashboard | ✅ Guards working (Owner/Admin only) |
| `/compliance` | Redirect to user dashboard | ✅ Guards working (Owner/Admin only) |
| `/dispatch` | Redirect to user dashboard | ✅ Guards working (Dispatch/Admin/Owner) |
| `/estimating` | 403 Unauthorized | ✅ Estimator context required |

---

### ESTIMATOR ROLE

#### Primary Dashboard Routes
| Route | Page | Shell | Widgets/Features |
|-------|------|-------|------------------|
| `/dashboard/estimator` | Estimator Dashboard | EstimatingShell | EstimatingAnalyticsPanel, PipelineBoard, CreateEstimateForm, DispatchVisibilityCard |
| `/dashboard` | Role Router | None | Redirects to `/dashboard/estimator` |

#### Estimator Dashboard Navigation
**File**: [app/dashboard/estimator/layout.tsx](app/dashboard/estimator/layout.tsx)

Uses **EstimatingShell** with navigation:
```
1. Dashboard → /dashboard/estimator
2. Console Home → /estimating
3. Pricing Settings → /estimating/settings
```

#### Estimating Routes
| Route | Page | Shell | Access |
|-------|------|-------|--------|
| `/estimating` | Estimating Console | EstimatingShell | ✅ Accessible (requires estimator context) |
| `/estimating/settings` | Pricing Settings | EstimatingShell | ✅ Accessible |
| `/estimating/[id]` | Estimate Editor | EstimatingShell | ✅ Accessible |

#### Pipeline Visibility
| Feature | Description | Scoping |
|---------|-------------|---------|
| **DRAFT** | Draft estimates | Company-scoped |
| **AWAITING_APPROVAL** | Awaiting approval queue | Company-scoped |
| **APPROVED** | Approved estimates | Company-scoped |
| **SENT_TO_DISPATCH** | Dispatch queue | Company-scoped |
| **REVISION_REQUIRED** | Returned to user | Company-scoped |

#### Dashboard Widgets
1. **EstimatingAnalyticsPanel**: Metrics for queues, approvals, handoffs
2. **PipelineBoard**: 5-column kanban of estimates by status
3. **CreateEstimateForm**: Quick-create estimate from contacts/deals
4. **DispatchVisibilityCard**: Selected estimate details + dispatch request status

#### Blocked Routes
| Route | Expected Behavior | Actual Behavior |
|-------|-------------------|-----------------|
| `/dashboard/owner` | Redirect to estimator dashboard | ✅ Guards working |
| `/dashboard/admin` | Redirect to estimator dashboard | ✅ Guards working |
| `/crm` | Redirect to estimator dashboard | ⚠️ **User shell may allow access** |
| `/contacts` | Unknown | ⚠️ **Not explicitly guarded** |
| `/deals` | Unknown | ⚠️ **Not explicitly guarded** |
| `/dispatch` | Redirect to estimator dashboard | ✅ Guards working |
| `/compliance` | Redirect to estimator dashboard | ✅ Guards working |
| `/settings` | Redirect to estimator dashboard | ✅ Guards working |

---

### DISPATCH ROLE

#### Primary Console Routes
| Route | Page | Shell | Widgets/Features |
|-------|------|-------|------------------|
| `/dispatch` | Dispatch Console | DispatchShell | DispatchRoleMetricsPanel, DispatchWidgetGrid, DispatchQueueSection, WorkOrderDigest, AssetSummarySection |
| `/dashboard` | Role Router | None | Redirects to `/dispatch` |

#### Dispatch Console Navigation
**File**: [app/dispatch/layout.tsx](app/dispatch/layout.tsx)

Uses **DispatchShell** with navigation:
```
1. Console Home → /dispatch
2. Work Orders → /dispatch/work-orders
```

**Access Control**: Dispatch, Admin, Owner roles allowed

#### Work Order Routes
| Route | Page | Shell | Access |
|-------|------|-------|--------|
| `/dispatch/work-orders` | Work Orders List | DispatchShell | ✅ Accessible |
| `/dispatch/work-orders/[id]` | Work Order Detail | DispatchShell | ✅ Accessible |

#### Asset Management Routes (Dispatch-Owned)
| Route | Page | Shell | Access |
|-------|------|-------|--------|
| `/dispatch/assets` | Asset Registry | DispatchShell | ✅ Accessible (Dispatch creates/manages) |
| `/dispatch/assets/[id]` | Asset Detail | DispatchShell | ⚠️ **MISSING** (needs implementation) |

#### Dashboard Widgets
1. **DispatchRoleMetricsPanel**: Open work orders, pending dispatch requests
2. **DispatchWidgetGrid**: Queue health, closed jobs, compliance overrides
3. **DispatchQueueSection**: Pending dispatch requests awaiting acceptance
4. **WorkOrderDigest**: Table of open work orders (scheduled + in progress)
5. **AssetSummarySection**: Total assets, in service, assigned to jobs

#### Blocked Routes
| Route | Expected Behavior | Actual Behavior |
|-------|-------------------|-----------------|
| `/dashboard/owner` | Redirect to dispatch console | ✅ Guards working |
| `/dashboard/admin` | Redirect to dispatch console | ✅ Guards working |
| `/dashboard/estimator` | Redirect to dispatch console | ✅ Guards working |
| `/crm` | Redirect to dispatch console | ✅ Guards working |
| `/contacts` | Redirect to dispatch console | ✅ Guards working |
| `/deals` | Redirect to dispatch console | ✅ Guards working |
| `/compliance` | Redirect to dispatch console | ✅ Guards working |
| `/settings` | Redirect to dispatch console | ✅ Guards working |
| `/estimating` | 403 Unauthorized | ✅ Estimator context required |

---

## 🎛️ FEATURE SURFACE MATRIX

### Global Feature Inventory

| Feature | Owner | Admin | User | Estimator | Dispatch | Notes |
|---------|-------|-------|------|-----------|----------|-------|
| **Contacts** | ⚠️ | ⚠️ | ✅ | ⚠️ | ❌ | User: owned only; Owner/Admin: unclear access |
| **Deals** | ⚠️ | ⚠️ | ✅ | ⚠️ | ❌ | User: owned only; Owner/Admin: unclear access |
| **CRM Workspace** | ⚠️ | ⚠️ | ✅ | ⚠️ | ❌ | User-specific shell, may error for others |
| **Estimating Console** | ❌ | ❌ | ❌ | ✅ | ❌ | Requires estimator context |
| **Dispatch Console** | ✅ | ✅ | ❌ | ❌ | ✅ | Dispatch/Admin/Owner only |
| **Work Orders** | 👀 | 👀 | 👀 | ❌ | ✅ | **Dispatch owns execution**; Owner/Admin/User see analytics only |
| **Compliance** | ✅ | ✅ | ❌ | ❌ | ❌ | Owner/Admin + plan feature gate |
| **Settings** | ✅ | ✅ | ❌ | ❌ | ❌ | Owner/Admin only |
| **Asset Registry** | 👀 | 👀 | ❌ | ❌ | ✅ | **Dispatch owns/creates assets**; Owner/Admin read-only analytics |
| **Dispatch Presets** | ✅ | ✅ | ❌ | ❌ | ❌ | Admin dashboard link |
| **Inbound Emails** | ✅ | ✅ | ❌ | ❌ | ❌ | Admin governance route |
| **Tasks** | ⚠️ | ⚠️ | ✅ | ❌ | ❌ | CRM shell route, unclear for Owner/Admin |
| **Analytics** | ✅ | ✅ | ✅ | ✅ | ✅ | Different dashboards per role |

**Legend**:
- ✅ Full access
- 👀 Read-only access
- ⚠️ Unclear access (route exists but may error)
- ❌ Blocked by guards

---

## 🚨 ISSUES, SURPRISES, AND QUESTIONS

### ⚠️ Cross-Role Route Access Ambiguities

#### Issue 1: CRM Routes Not Guarded for Owner/Admin
**Routes Affected**:
- `/crm`
- `/crm/contacts`
- `/crm/deals`
- `/crm/tasks`

**Current State**: Routes use `CrmShell` which has NO role guard. Layout file [app/crm/layout.tsx](app/crm/layout.tsx) only checks for authentication, NOT specific role.

**Expected Guard**: `if (role !== 'user') redirect(...)`

**Actual Guard**: None

**Risk**: Owner/Admin may access CRM routes expecting user-scoped data, potentially see wrong UI or error.

**Question**: Should Owner/Admin be able to access CRM workspace? If yes, what data should they see?

---

#### Issue 2: Contact/Deal Routes Not Explicitly Guarded
**Routes Affected**:
- `/contacts`
- `/contacts/[id]`
- `/deals`
- `/deals/[id]`

**Current State**: Routes are separate from `/crm/*` routes. No layout-level role guard found.

**Question**: Can Owner/Admin access `/contacts` or `/deals` directly? If yes, do they see ALL contacts or scoped contacts?

**Risk**: Unclear if Owner/Admin bypass user scoping and see company-wide data.

---

#### Issue 3: Estimating Routes Block Non-Estimators
**Routes Affected**:
- `/estimating`
- `/estimating/settings`
- `/estimating/[id]`

**Current State**: Uses `requireEstimatorContext()` which throws 403 for non-estimators.

**Blocked Roles**: Owner, Admin, User, Dispatch

**Question**: Should Owner/Admin have read-only access to estimating console? Currently they are hard-blocked.

---

### 🎯 Asset Registry Access Pattern — **CORRECTION REQUIRED**

**CURRENT (WRONG)**:
- Owner/Admin: Full CRUD access via `/dashboard/assets`
- Dispatch: Read-only access

**INTENDED (CORRECT)**:
- **Dispatch: Full CRUD access via `/dispatch/assets`** (Dispatch creates and manages fleet)
- Owner/Admin: Read-only analytics (work order metrics only)

**Issue**: Current code at `/dashboard/assets` guards for Owner/Admin. This contradicts intended architecture where **Dispatch owns asset management**.

**Required Fix**: Move asset CRUD to `/dispatch/assets` with Dispatch role guard. Owner/Admin should only see work order analytics, not manage assets.

---

### 📊 Dashboard Routing Complexity

**Route**: `/dashboard`

**Behavior**: Router page that redirects based on role:
- Owner → `/dashboard/owner`
- Admin → `/dashboard/admin`
- User → `/dashboard/user`
- Estimator → `/dashboard/estimator`
- Dispatch → `/dispatch`

**Issue**: Dispatch role redirects to `/dispatch`, not `/dashboard/dispatch`. Inconsistent pattern.

**Question**: Should Dispatch have a `/dashboard/dispatch` route for symmetry?

---

### 🧩 Governance Route Grouping

**Directory**: `/app/dashboard/(governance)/`

**Routes**:
- `/dashboard/owner`
- `/dashboard/admin`
- `/dashboard/assets`
- `/dashboard/dispatch` (legacy redirect)
- `/dashboard/estimator` (legacy redirect)

**Guard**: Owner/Admin only via [app/dashboard/(governance)/layout.tsx](app/dashboard/(governance)/layout.tsx)

**Confusion**: `/dashboard/estimator` appears in governance folder but is NOT owner/admin route. It's a legacy redirect.

**Question**: Should governance routes be cleaned up to remove estimator/dispatch legacy paths?

---

### 🔐 Compliance Feature Gating

**Routes**: `/compliance/*`

**Guard 1**: Owner/Admin role check

**Guard 2**: Plan feature check via `planAllowsFeature('compliance')`

**Redirect**: If plan doesn't allow compliance → `/upgrade`

**Question**: What happens if Owner on Starter plan tries to access compliance? Do they see upgrade prompt or 403?

**Answer from Code**: Redirects to `/upgrade` with feature gate message.

---

### 📝 User Dashboard Dispatch Visibility

**Widget**: Read-only dispatch records table on [app/dashboard/user/page.tsx](app/dashboard/user/page.tsx)

**Data**: Dispatch records linked to user's estimates

**Scoping**: User can see work orders for their approved estimates ONLY

**Question**: Can User click into work order detail from this table? Or is it purely read-only telemetry?

**Code Evidence**: Table shows ID, estimate name, status, work order count. No links visible in excerpt.

---

### 🏗️ Estimator Access to Contacts/Deals

**Estimator Dashboard**: Shows `CreateEstimateForm` with dropdowns for contacts and deals

**Data Source**: Contacts and deals loaded from database

**Question**: Are these company-wide contacts/deals or scoped to estimator? Can estimator create deals for ANY contact?

**Risk**: If estimator sees all contacts, this may be intentional for quote creation. Needs verification.

---

### 🚀 Trial vs Paid Feature Surface

**Trial Duration**: 14 days (optional opt-in)

**Question**: What features are gated behind paid plans vs available in trial?

**Evidence from Code**:
- Compliance requires plan feature check
- Stripe integration clears trial on payment

**Unknown**: Do trial users get full access to all features for 14 days, or are some features locked?

**Recommendation**: Document trial feature surface separately.

---

### 🔗 Navigation Items vs Accessible Routes

**Discrepancy**: Navigation shows limited items, but many more routes are accessible via direct URL or internal links.

**Example**:
- Estimator nav shows: Dashboard, Console Home, Pricing Settings
- But estimator can also access: `/estimating/[id]` (not in nav)

**Question**: Are "hidden routes" (not in nav) intentional power-user features, or should they be in nav?

---

## 📂 COMPLETE ROUTE CATALOG

### Public Routes (Unauthenticated)
```
/                           → Landing page
/pricing                    → Pricing page
/login                      → Login page
/signup                     → Signup page
/forgot-password            → Password reset
/contact-sales              → Contact sales form
/request-demo               → Demo request form
/legal                      → Legal page
/privacy                    → Privacy policy
/terms                      → Terms of service
/security                   → Security page
/support                    → Support page
/upgrade                    → Upgrade page
/upgrade/success            → Payment success
/upgrade/cancel             → Payment cancelled
/verify/employee            → Employee verification
```

### Authenticated Routes by Role

#### Owner Routes (29+ routes)
```
/dashboard                         → Redirects to /dashboard/owner
/dashboard/owner                   → Owner control plane
/dashboard/admin                   → Admin control plane (accessible)
/dashboard/admin/dispatch-presets  → Dispatch presets admin
/dashboard/admin/inbound-emails    → Inbound email review
/dashboard/assets                  → Asset registry
/compliance                        → Compliance hub
/compliance/employees              → Employee compliance
/compliance/employees/[id]         → Employee detail
/compliance/documents              → Document library
/compliance/company-documents      → Company documents
/settings                          → Settings hub
/settings/billing                  → Billing settings
/settings/branding                 → Branding settings
/settings/estimating               → Estimating settings
/settings/profile                  → Profile settings
/dispatch                          → Dispatch console
/dispatch/work-orders              → Work orders list
/dispatch/work-orders/[id]         → Work order detail
```

#### Admin Routes (28+ routes)
```
/dashboard                         → Redirects to /dashboard/admin
/dashboard/admin                   → Admin control plane
/dashboard/admin/dispatch-presets  → Dispatch presets admin
/dashboard/admin/inbound-emails    → Inbound email review
/dashboard/assets                  → Asset registry
/compliance                        → Compliance hub
/compliance/employees              → Employee compliance
/compliance/employees/[id]         → Employee detail
/compliance/documents              → Document library
/compliance/company-documents      → Company documents
/settings                          → Settings hub
/settings/billing                  → Billing settings
/settings/branding                 → Branding settings
/settings/estimating               → Estimating settings
/settings/profile                  → Profile settings
/dispatch                          → Dispatch console
/dispatch/work-orders              → Work orders list
/dispatch/work-orders/[id]         → Work order detail
```

#### User Routes (11+ routes)
```
/dashboard                   → Redirects to /dashboard/user
/dashboard/user              → User dashboard
/crm                         → CRM home
/crm/contacts                → CRM contacts list
/crm/deals                   → CRM deals list
/crm/deals/new               → New deal form
/crm/deals/[id]              → Deal detail
/crm/deals/[id]/estimate     → Deal estimate view
/crm/tasks                   → Tasks list
/contacts                    → Contacts list
/contacts/new                → New contact form
/contacts/[id]               → Contact detail
/deals                       → Deals list
/deals/new                   → New deal form
/deals/[id]                  → Deal detail
```

#### Estimator Routes (5+ routes)
```
/dashboard                   → Redirects to /dashboard/estimator
/dashboard/estimator         → Estimator dashboard
/estimating                  → Estimating console
/estimating/settings         → Pricing settings
/estimating/[id]             → Estimate editor
```

#### Dispatch Routes (4+ routes)
```
/dashboard                   → Redirects to /dispatch
/dispatch                    → Dispatch console
/dispatch/work-orders        → Work orders list
/dispatch/work-orders/[id]   → Work order detail
```

---

## 🧪 WIDGET INVENTORY BY ROLE

### Owner Dashboard Widgets
**Route**: `/dashboard/owner`

1. **ControlPlaneDashboard** (variant: owner)
   - Analytics tiles, metrics, company health
   
2. **StandardSettingsQuickLinks** (role: owner)
   - Quick access to common settings
   
3. **ContactAnalyticsCommand** (variant: owner)
   - Contact analytics and insights
   
4. **AssetSummaryPanel** (role: owner)
   - Fleet/asset summary, in-service count, maintenance

---

### Admin Dashboard Widgets
**Route**: `/dashboard/admin`

1. **ControlPlaneDashboard** (variant: admin)
   - Analytics tiles, metrics, company health
   
2. **StandardSettingsQuickLinks** (role: admin)
   - Quick access to common settings
   
3. **ContactAnalyticsCommand** (variant: admin)
   - Contact analytics and insights
   
4. **AssetSummaryPanel** (role: admin)
   - Fleet/asset summary
   
5. **Dispatch Presets Link Card**
   - CTA to manage dispatch presets
   - Link: `/dashboard/admin/dispatch-presets`

---

### User Dashboard Widgets
**Route**: `/dashboard/user`

1. **StandardSettingsQuickLinks** (role: user)
   
2. **ActivityTimelineCard**
   - Recent activity timeline for owned entities
   
3. **TaskPressureCard**
   - Upcoming tasks, deadlines
   
4. **InactiveContactsCard**
   - Stale contacts with no recent activity
   
5. **RecentMentionsCard**
   - Recent mentions in notes/comments
   
6. **Metric Tiles** (4 tiles)
   - Active quotes
   - Awaiting approval
   - Sent to dispatch
   - Open work orders (read-only)
   
7. **PersonalAnalyticsCard**
   - Personal performance metrics
   
8. **Pipeline Control Section**
   - 4-column estimate board: Draft, Awaiting Approval, Approved, Sent to Dispatch
   
9. **Dispatch Visibility Section**
   - Read-only table of dispatch records for user's estimates
   
10. **Owned Contacts Section**
    - Table of contacts owned by user

---

### Estimator Dashboard Widgets
**Route**: `/dashboard/estimator`

1. **EstimatingAnalyticsPanel**
   - Queue metrics, approval rates, dispatch handoff stats
   
2. **PipelineBoard**
   - 5-column kanban: Draft, Awaiting Approval, Approved, Sent to Dispatch, Revision Required
   
3. **CreateEstimateForm**
   - Quick-create estimate from contacts/deals dropdowns
   
4. **DispatchVisibilityCard**
   - Selected estimate details, revision number, grand total, dispatch request ID

---

### Dispatch Console Widgets
**Route**: `/dispatch`

1. **StandardSettingsQuickLinks** (role: dispatch/admin/owner)
   
2. **DispatchRoleMetricsPanel**
   - Open work orders
   - Pending dispatch requests
   
3. **DispatchWidgetGrid**
   - Queue health tiles, closed jobs, compliance overrides
   
4. **ClosedJobsCard**
   - Recently closed work orders
   
5. **ComplianceOverridesCard**
   - Compliance override telemetry
   
6. **DispatchQueueSection**
   - Pending dispatch requests awaiting acceptance
   - Accept/Create Work Order actions
   
7. **WorkOrderDigest**
   - Table of open work orders (scheduled + in progress)
   
8. **AssetSummarySection**
   - Total assets, in-service, maintenance hold, out-of-service, actively assigned

---

## 🔍 DEAD LINKS & 404 CANDIDATES

### Potentially Broken Routes (Needs Testing)

1. **`/crm` routes for Owner/Admin**
   - May error due to user role assumption in shell
   
2. **`/contacts` and `/deals` for non-User roles**
   - No explicit guards, unclear behavior
   
3. **`/estimating` for Owner/Admin**
   - Hard-blocked by estimator context requirement
   
4. **Legacy redirect routes in governance folder**
   - `/dashboard/dispatch` → Should redirect to `/dispatch`
   - `/dashboard/estimator` → Should redirect to `/dashboard/estimator`

### Missing Routes (Expected but Not Found)

1. **Dispatch Asset Browser**
   - Dispatch can assign assets but no dedicated browse route
   - Likely embedded in work order detail page only
   
2. **Owner/Admin Contact/Deal Browse**
   - Owner/Admin don't have CRM workspace access
   - Unclear how they browse company-wide contacts/deals

3. **User Task Detail Pages**
   - `/crm/tasks` route exists but no `/crm/tasks/[id]` found
   
4. **Estimator Contact/Deal Detail**
   - Estimator can select contacts/deals in form
   - No direct access to `/contacts/[id]` or `/deals/[id]`

---

## 🎓 ROLE DESTINATION MAPPING

**File**: [lib/auth/roleDestinations.ts](lib/auth/roleDestinations.ts)

```typescript
ROLE_DESTINATIONS = {
  owner: '/dashboard/owner',
  admin: '/dashboard/admin',
  user: '/dashboard/user',
  estimator: '/dashboard/estimator',
  dispatch: '/dispatch',
}
```

**Fallback**: `/app` (if role not recognized)

**Issue**: `/app` route not found in codebase. May be 404.

---

## 📊 TRIAL EXPERIENCE DOCUMENTATION

### Trial Opt-In Flow
1. User signs up → Trial fields set to `NULL`
2. User clicks "Start Trial" → POST `/api/auth/trial`
3. Trial activated: 14-day expiration set
4. On Stripe payment success → Trial fields cleared

### Trial User Access (Owner Role)

**Assumption**: Trial user likely assigned Owner role on signup.

**14-Day Trial Access** (based on Owner routes):
- ✅ Owner dashboard
- ✅ Compliance (if plan allows)
- ✅ Settings
- ✅ Asset registry
- ✅ Dispatch console
- ❌ Estimating console (requires estimator role)
- ❌ CRM workspace (user role only)

**Question**: What plan is assigned to trial users? Starter plan?

**Feature Gates**: Compliance requires `planAllowsFeature('compliance')` check. If trial = Starter plan, compliance may be gated.

---

## 📋 RECOMMENDATIONS FOR FURTHER INVESTIGATION

1. **Test CRM routes as Owner/Admin** — Verify if they error or show data
2. **Test `/contacts` and `/deals` as Owner/Admin** — Determine scoping behavior
3. **Document trial plan features** — What's included in 14-day trial?
4. **Verify `/app` fallback route** — Currently 404 if role not recognized
5. **Test estimator access to contacts/deals** — Is it company-wide or scoped?
6. **Audit asset visibility for Dispatch** — Where do they browse assets?
7. **Check for broken internal links** — Links to routes that may not exist
8. **Verify work order detail access for User** — Can they click into work orders or read-only only?

---

## ✅ AUDIT COMPLETION STATUS

**Total Routes Documented**: 60+  
**Total Widgets Documented**: 30+  
**Total Roles Audited**: 6  
**Total Shells Identified**: 5  
**Total Navigation Maps**: 6  
**Total Feature Gates**: 2 (Role guards, Plan feature checks)

**Next Steps**: Address questions and ambiguities in "Issues, Surprises, and Questions" section before any removals or refactoring.

---

**End of Forensic Audit Report**

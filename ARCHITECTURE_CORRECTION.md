# 🚨 ARCHITECTURE CORRECTION — Asset Ownership Clarification

**Date**: December 31, 2025  
**Issue**: Forensic audit initially misidentified asset management ownership  
**Status**: **CORRECTED** — Architecture now accurately documented

---

## ✅ CORRECTED ARCHITECTURE

### Asset Management Ownership

**DISPATCH ROLE** owns asset management:
- **Route**: `/dispatch/assets`
- **Actions**: Create, edit, delete fleet assets (trucks, equipment, vehicles)
- **Status Management**: Set assets to in-service, maintenance, out-of-service
- **Assignment**: Assign assets to work orders
- **Visibility**: Full CRUD access to company fleet registry

**OWNER/ADMIN ROLES** see analytics only:
- **Route**: `/dashboard/owner` or `/dashboard/admin`
- **Widgets**: AssetSummaryPanel (read-only metrics)
- **Actions**: **NONE** — Cannot create, edit, or delete assets
- **Visibility**: Work order analytics showing asset utilization

---

## 📊 Dispatch Analytics (Already Implemented)

**File**: [lib/dispatch/analytics.ts](lib/dispatch/analytics.ts)

### Work Order Analytics

```typescript
export type DispatchRoleMetrics = {
  openWorkOrders: number
  pendingDispatchRequests: number
  recentlyClosed: {
    last7: number
    last30: number
  }
}
```

### Available Analytics Functions

1. **`getOpenWorkOrderAnalytics(filters)`**
   - Returns count and IDs of open work orders
   - Filters: discipline, date range, limit
   - Statuses: `SCHEDULED`, `IN_PROGRESS`

2. **`getPendingDispatchAnalytics(filters)`**
   - Returns count and IDs of pending dispatch requests
   - Filters dispatch requests awaiting acceptance
   - Excludes manual entries

3. **`getRecentlyClosedAnalytics(filters)`**
   - Returns count and IDs of recently closed work orders
   - Defaults to 7-day window (configurable)
   - Statuses: `COMPLETED`, `CANCELLED`

4. **`getWorkOrdersForView(view, filters)`**
   - Returns detailed work order list for UI tables
   - Views: `'open' | 'pending' | 'closed'`
   - Includes: id, title, status, discipline, dates

5. **`loadDispatchRoleMetrics(companyId)`**
   - Loads complete dashboard metrics for Dispatch role
   - Returns: open count, pending count, closed (7d/30d)

---

## 🗺️ Navigation Structure (Corrected)

### Dispatch Navigation (3 Items)

```
1. Console Home → /dispatch
2. Work Orders → /dispatch/work-orders  
3. Assets → /dispatch/assets (DISPATCH OWNS)
```

### Owner/Admin Navigation (3 Items)

```
1. Control Plane → /dashboard/owner or /dashboard/admin
2. Compliance → /compliance
3. Settings → /settings
```

**Note**: Owner/Admin **DO NOT** have direct asset management navigation. They see asset analytics in AssetSummaryPanel widget on their dashboard.

---

## ⚠️ Current Code Issues

### Issue 1: `/dashboard/assets` Route Exists

**File**: [app/dashboard/(governance)/assets/page.tsx](app/dashboard/(governance)/assets/page.tsx)

**Current Guard**:
```typescript
if (!['owner', 'admin'].includes(role)) {
  redirect('/dashboard')
}
```

**Problem**: This route allows Owner/Admin to create/edit assets, which contradicts the architecture where **Dispatch owns asset management**.

**Recommended Action**:
- Move asset CRUD to `/dispatch/assets`
- Guard `/dispatch/assets` for Dispatch role only
- Remove or deprecate `/dashboard/assets`
- Keep AssetSummaryPanel on Owner/Admin dashboards (read-only)

---

### Issue 2: Asset Actions Require Owner/Admin

**File**: [app/dashboard/(governance)/assets/actions.ts](app/dashboard/(governance)/assets/actions.ts)

**Current Guard**:
```typescript
const OWNER_ADMIN_ROLES = ['owner', 'admin']

async function requireOwnerOrAdmin() {
  // ... checks role is owner or admin
}
```

**Problem**: Asset mutations (`upsertAssetAction`) require Owner/Admin role, not Dispatch role.

**Recommended Action**:
- Update guards to `requireDispatchRole()` instead
- Allow Dispatch to mutate assets
- Owner/Admin should only read asset data via analytics

---

### Issue 3: DispatchShell Missing Assets Nav Item

**File**: [components/shells/dispatch-shell.tsx](components/shells/dispatch-shell.tsx)

**Current Nav**:
```typescript
const DISPATCH_NAV: ShellNavItem[] = [
  { path: '/dispatch', label: 'Console Home', icon: 'dispatch' },
  { path: '/dispatch/work-orders', label: 'Work Orders', icon: 'tasks' },
]
```

**Problem**: Missing `Assets` navigation item.

**Recommended Action**:
```typescript
const DISPATCH_NAV: ShellNavItem[] = [
  { path: '/dispatch', label: 'Console Home', icon: 'dispatch' },
  { path: '/dispatch/work-orders', label: 'Work Orders', icon: 'tasks' },
  { path: '/dispatch/assets', label: 'Fleet', icon: 'assets' }, // ADD THIS
]
```

---

## ✅ What's Already Correct

### Dispatch Dashboard Analytics

**File**: [app/dispatch/page.tsx](app/dispatch/page.tsx)

✅ **Already renders**:
- `DispatchRoleMetricsPanel` — Open work orders, pending requests, closed (7d/30d)
- `AssetSummarySection` — Total assets, in-service, maintenance, assigned

✅ **Analytics source**:
- Uses `loadDispatchRoleMetrics()` from [lib/dispatch/analytics.ts](lib/dispatch/analytics.ts)
- All metrics computed server-side
- No client-side aggregation

### Owner/Admin Dashboard

**File**: [app/dashboard/(governance)/owner/page.tsx](app/dashboard/(governance)/owner/page.tsx)

✅ **Correctly renders**:
- `AssetSummaryPanel` — Read-only asset metrics (role: 'owner')
- Does **NOT** render asset CRUD forms

✅ **Analytics only**:
- Shows work order counts (open, in-progress, closed)
- Shows dispatch queue size
- Does **NOT** allow asset mutations

---

## 📋 Implementation Checklist (To Fix Architecture)

### Required Changes

- [ ] Create `/app/dispatch/assets/page.tsx` for asset CRUD
- [ ] Add `Assets` nav item to `DispatchShell`
- [ ] Update asset actions to require Dispatch role (not Owner/Admin)
- [ ] Deprecate or remove `/app/dashboard/(governance)/assets/page.tsx`
- [ ] Update [lib/assets/registry.ts](lib/assets/registry.ts) role guards if needed
- [ ] Add icon for 'assets' in `SurfaceShell` icon map
- [ ] Test Dispatch can create/edit/delete assets
- [ ] Test Owner/Admin CANNOT access `/dispatch/assets`
- [ ] Verify AssetSummaryPanel still works on Owner/Admin dashboards

### Optional Enhancements

- [ ] Add `/dispatch/assets/[assetId]` detail page
- [ ] Add asset assignment UI in work order detail page
- [ ] Add asset utilization analytics to Dispatch dashboard
- [ ] Add asset maintenance tracking features

---

## 🎯 Summary

**CORRECT ARCHITECTURE**:
- **Dispatch**: Creates and manages fleet assets at `/dispatch/assets`
- **Owner/Admin**: See work order analytics only (no asset mutations)
- **Dispatch Analytics**: Already implemented in [lib/dispatch/analytics.ts](lib/dispatch/analytics.ts)

**CURRENT CODE ISSUE**:
- Asset CRUD currently at `/dashboard/assets` with Owner/Admin guard (WRONG)
- Should be at `/dispatch/assets` with Dispatch guard (CORRECT)

**AUDIT STATUS**:
- ✅ DASHBOARD_AUDIT_REPORT.md — Correctly shows Owner/Admin only have work order analytics
- ✅ SYSTEM_FORENSIC_AUDIT.md — Updated to show Dispatch owns assets
- ✅ This correction document — Clarifies intended architecture vs current implementation

---

**End of Correction Document**

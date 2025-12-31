# 🎯 TRIAL CRM — HUBSPOT UX REBUILD PLAN

**Date:** December 31, 2025  
**Objective:** Rebuild Trial CRM to HubSpot-grade UX standards  
**Scope:** Trial (Starter) CRM ONLY  
**Principle:** Indistinguishable from HubSpot CRM in UX quality

---

## 🏗️ PHASED IMPLEMENTATION

### PHASE 1: FOUNDATION & NAVIGATION ⏳
**Priority:** CRITICAL  
**Status:** IN PROGRESS

**Tasks:**
1. ✅ Create HubSpot-style icon sidebar navigation component
   - Icon-only by default
   - Hover to expand with labels
   - Grey neutral theme
   - Blue active states
   
2. ✅ Update Trial shell to use icon nav
   - Replace text nav with icon sidebar
   - Implement hover expansion
   - Add upgrade button at bottom

3. ✅ Lock Trial navigation to approved items only
   - Dashboard
   - Contacts
   - Deals  
   - Tasks
   - Email (contact-anchored)
   - Documents (contact-anchored)
   - Settings
   - Upgrade (bottom pinned)

**Files to Create:**
- `components/shells/hubspot-icon-nav.tsx`
- `components/shells/trial-hubspot-shell.tsx`

**Files to Modify:**
- `app/dashboard/trial/page.tsx`
- `components/shells/trial-shell.tsx` (deprecate)

---

### PHASE 2: TRIAL DASHBOARD REDESIGN ⏳
**Priority:** CRITICAL  
**Status:** PLANNED

**Current Problem:**
- Dashboard shows analytics (wrong for Trial)
- Not productivity-focused
- No action strip
- No personal work snapshot

**New Design:**
1. **Action Strip (Top)**
   - Add Contact
   - Create Task
   - Create Note
   - Send Email
   - Upgrade (right-aligned)

2. **Personal Work Snapshot**
   - Tasks due today
   - Overdue tasks
   - Emails sent (7d)
   - Recent notes (5)

3. **Recent Activity Feed**
   - Type | Subject | Contact | Timestamp
   - Real records only
   - Click → Contact profile

4. **Locked Insights (Upgrade Preview)**
   - Blurred cards
   - Pipeline analytics (locked)
   - Team performance (locked)
   - Export reports (locked)

**Files to Create:**
- `app/dashboard/_components/trial-action-strip.tsx`
- `app/dashboard/_components/trial-work-snapshot.tsx`
- `app/dashboard/_components/trial-activity-feed.tsx`
- `app/dashboard/_components/trial-locked-insights.tsx`

**Files to Modify:**
- `app/dashboard/trial/page.tsx` (complete redesign)
- `lib/dashboard/trialDashboard.ts` (new loaders)

---

### PHASE 3: CONTACT PROFILE AS PRIMARY WORKSPACE ⏳
**Priority:** CRITICAL  
**Status:** PLANNED

**Key Requirement:**
> ❌ NO task creation, email sending, or activity logging from nav pages.
> All meaningful work happens inside the contact profile.

**Contact Profile Structure:**
1. **Header**
   - Name (inline editable)
   - Email (inline editable)
   - Company (inline editable)
   
2. **Quick Actions Bar**
   - Email
   - Task
   - Call
   - Note
   - Meeting
   - More (LinkedIn, SMS)

3. **Activity Timeline (Primary View)**
   - Filter by type
   - Filter by date
   - Collapse/expand all
   - Search timeline content
   - Immutable append-only log

4. **Right Rail**
   - Associated company
   - Deals (read-only in Trial)
   - Documents
   - Tasks

**Files to Create:**
- `app/contacts/[contactId]/_components/contact-header.tsx`
- `app/contacts/[contactId]/_components/contact-quick-actions.tsx`
- `app/contacts/[contactId]/_components/contact-timeline.tsx`
- `app/contacts/[contactId]/_components/contact-right-rail.tsx`
- `app/contacts/[contactId]/_components/inline-edit-field.tsx`

**Files to Modify:**
- `app/contacts/[contactId]/page.tsx` (complete rebuild)
- Remove task/email creation from `/crm/tasks`
- Remove standalone email routes

---

### PHASE 4: CONTACTS LIST (HUBSPOT TABLE) ⏳
**Priority:** HIGH  
**Status:** PLANNED

**Requirements:**
1. **Table Columns**
   - Name
   - Email
   - Phone
   - Company
   - Contact owner (read-only)
   - Last activity date
   - Create date
   - Recent deal amount (if exists)

2. **Interactions**
   - Inline editing (default)
   - Sortable headers
   - Advanced filters
   - Sticky headers
   - Professional empty states

3. **Trial Restrictions**
   - ❌ No bulk select
   - ❌ No bulk import
   - ❌ No export
   - ❌ No reassign ownership
   - ❌ No archive/restore

**Files to Modify:**
- `app/contacts/page.tsx`
- `app/contacts/_components/contact-table.tsx` (new)
- Remove bulk import panel from Trial

---

### PHASE 5: GLOBAL SEARCH (CMD+K) ⏳
**Priority:** HIGH  
**Status:** PLANNED

**Requirements:**
- Keyboard shortcut: Cmd/Ctrl + K
- Search:
  - Contacts
  - Tasks
  - Emails
  - Notes
- Server-side results only
- HubSpot-style modal design

**Files to Create:**
- `components/global-search.tsx`
- `app/api/search/route.ts`
- `lib/search/globalSearch.ts`

---

### PHASE 6: INLINE EDITING & KEYBOARD SHORTCUTS ⏳
**Priority:** MEDIUM  
**Status:** PLANNED

**Keyboard Shortcuts:**
- `/` - Search
- `Esc` - Close modals
- `Cmd/Ctrl + Enter` - Save forms

**Inline Editing:**
- Contact fields
- Task names
- Note content
- Deal amounts

**Files to Create:**
- `hooks/useKeyboardShortcuts.ts`
- `components/inline-edit-text.tsx`
- `components/inline-edit-dropdown.tsx`

---

### PHASE 7: EMAIL INTEGRATION ⏳
**Priority:** MEDIUM  
**Status:** PLANNED

**Requirements:**
- Email sent ONLY from contact profiles
- Auto-log to timeline
- Open/click tracking
- Settings in Settings → General → Email

**Email Settings:**
- Gmail/Outlook connect
- Signatures
- Templates (limit = 3 in Trial)
- Tracking toggles

**Files to Modify:**
- Move email UI to contact profile only
- `app/settings/profile/page.tsx` (add email section)

---

### PHASE 8: TASKS (CONTACT-ANCHORED) ⏳
**Priority:** MEDIUM  
**Status:** PLANNED

**Requirements:**
- Tasks created ONLY in contact profiles
- `/crm/tasks` shows read-only list
- Filter by status
- No kanban
- No analytics
- No team views

**Files to Modify:**
- `app/crm/tasks/page.tsx` (remove create button, read-only)
- Move task creation to contact profile

---

### PHASE 9: UPGRADE & STRIPE CHECKOUT ⏳
**Priority:** MEDIUM  
**Status:** PLANNED

**Requirements:**
- HubSpot Commerce-style layout
- Capability-based comparison
- Plans: Growth, Pro, Enterprise
- Stripe checkout with coupon/promo field
- Opens in new tab
- Data preservation messaging

**Files to Modify:**
- `app/upgrade/page.tsx` (HubSpot-style redesign)
- `components/checkout-button.tsx` (add coupon support)

---

### PHASE 10: PROFESSIONAL EMPTY STATES ⏳
**Priority:** LOW  
**Status:** PLANNED

**Requirements:**
- Every table/list has professional empty state
- Clear CTA
- No "demo" language
- No urgency messaging

**Files to Modify:**
- All list/table components

---

## 🎨 DESIGN SYSTEM REQUIREMENTS

### Typography
- Sans-serif: Inter, system-ui
- Sizes: 12px, 14px, 16px, 20px, 24px
- Weights: 400 (regular), 500 (medium), 600 (semibold)

### Colors
- Primary: Blue 600 (#2563eb)
- Neutral: Slate 50-900
- Success: Green 600
- Error: Red 600
- Warning: Amber 600

### Spacing
- Base: 4px
- Scale: 4, 8, 12, 16, 24, 32, 48, 64

### Borders
- Radius: 8px, 12px, 16px
- Width: 1px
- Color: Slate 200

---

## 🚫 REMOVAL CHECKLIST

**Remove Completely:**
- ❌ CRM Home page
- ❌ Reports nav item
- ❌ Activity standalone nav
- ❌ Files (if not wired)
- ❌ Estimating (all references)
- ❌ Compliance (all references)
- ❌ Governance language
- ❌ Analytics dashboards
- ❌ Bulk import in Trial
- ❌ Export in Trial
- ❌ Branding/logo UI in Trial
- ❌ Task creation from nav
- ❌ Email creation from nav

---

## ✅ ACCEPTANCE CRITERIA

A Trial user must be able to:
1. ✅ Add contacts (from contact profile)
2. ✅ Email contacts (from contact profile)
3. ✅ Create & complete tasks (from contact profile)
4. ✅ View full activity timelines
5. ✅ Navigate with zero dead ends
6. ✅ Immediately understand product value
7. ✅ Upgrade with confidence
8. ✅ Enter coupon codes at checkout
9. ✅ Use keyboard shortcuts (Cmd+K search)
10. ✅ Inline edit contact fields

---

## 📊 PROGRESS TRACKING

| Phase | Status | Priority | Completion |
|-------|--------|----------|------------|
| 1. Foundation & Navigation | 🚧 In Progress | CRITICAL | 0% |
| 2. Dashboard Redesign | 📋 Planned | CRITICAL | 0% |
| 3. Contact Profile Workspace | 📋 Planned | CRITICAL | 0% |
| 4. Contacts List | 📋 Planned | HIGH | 0% |
| 5. Global Search | 📋 Planned | HIGH | 0% |
| 6. Inline Editing | 📋 Planned | MEDIUM | 0% |
| 7. Email Integration | 📋 Planned | MEDIUM | 0% |
| 8. Tasks | 📋 Planned | MEDIUM | 0% |
| 9. Upgrade Flow | 📋 Planned | MEDIUM | 0% |
| 10. Empty States | 📋 Planned | LOW | 0% |

---

**Next Action:** Begin Phase 1 - HubSpot Icon Navigation Component

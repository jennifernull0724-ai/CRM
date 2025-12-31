# 🔒 T-REX AI OS — ROLE DEFINITIONS (CANONICAL)

**Date:** December 31, 2025  
**Purpose:** Authoritative role definition reference  
**Status:** LOCKED — DO NOT MODIFY

---

## CRITICAL DISTINCTION

**ROLES** and **OWNERSHIP** are separate concepts:

- **ROLE** = User's position in the company (what they can do)
- **OWNERSHIP** = Database property (who created/owns a specific record)

**Example:** A person with role "owner" can create a contact, making them the contact's "owner" (via contact.ownerId). Similarly, a person with role "user" can create a contact, making them that contact's "owner" (via contact.ownerId).

---

## 5 SYSTEM ROLES

### 1️⃣ ROLE: `owner`

**Description:** Company owner with full system privileges  
**Access Level:** FULL (all modules, all records, all settings)  
**Dashboard:** `/dashboard/owner`  
**Can Access:** Everything

**Permissions:**
- ✅ View/edit all contacts (company-wide)
- ✅ Reassign contact ownership
- ✅ Archive any contact
- ✅ Invite users with ANY role (including admin/owner)
- ✅ Change user roles
- ✅ Disable users
- ✅ Manage all company settings
- ✅ View company-wide analytics
- ✅ Approve estimates
- ✅ Create work orders
- ✅ Manage compliance

**Cannot Do:**
- Nothing — owner has unrestricted access

---

### 2️⃣ ROLE: `admin`

**Description:** Administrator with full operational privileges  
**Access Level:** FULL (same as owner, except cannot manage owners)  
**Dashboard:** `/dashboard/admin`  
**Can Access:** Everything except owner-specific functions

**Permissions:**
- ✅ View/edit all contacts (company-wide)
- ✅ Reassign contact ownership
- ✅ Archive any contact
- ✅ Invite users with roles: user, estimator, dispatch (NOT admin/owner)
- ✅ Change user roles (except owner role)
- ✅ Disable users (except owners)
- ✅ Manage all company settings
- ✅ View company-wide analytics
- ✅ Approve estimates
- ✅ Create work orders
- ✅ Manage compliance

**Cannot Do:**
- ❌ Invite users with admin/owner role (only owner can)
- ❌ Change anyone's role to owner
- ❌ Disable owner accounts

---

### 3️⃣ ROLE: `user`

**Description:** Sales person (CRM user)  
**Access Level:** LIMITED (own contacts, own deals)  
**Dashboard:** `/dashboard/user`  
**Primary Workspace:** `/crm`

**Permissions:**
- ✅ View ALL contacts (company-wide, read-only for others' contacts)
- ✅ Edit ONLY contacts they created/own (contact.ownerId = their userId)
- ✅ Log activity on any contact
- ✅ Upload documents to any contact
- ✅ Send emails from any contact
- ✅ Create/manage deals they own
- ✅ Request estimates for their deals
- ✅ View their own analytics (owned contacts only)
- ✅ Create tasks on any contact

**Cannot Do:**
- ❌ Edit contacts owned by others
- ❌ Reassign contact ownership
- ❌ Archive contacts owned by others
- ❌ View other users' analytics
- ❌ View company-wide analytics
- ❌ Approve estimates
- ❌ Create work orders
- ❌ Access compliance module
- ❌ Invite users
- ❌ Change roles

**Analytics Scope:**
- Own contacts only (`contact.ownerId = userId`)
- Own deals only (`deal.createdById = userId`)
- Own estimates only (via `deal.createdById = userId`)

---

### 4️⃣ ROLE: `estimator`

**Description:** Pricing specialist (creates estimates)  
**Access Level:** LIMITED (estimating only)  
**Dashboard:** `/dashboard/estimator`  
**Primary Workspace:** `/estimating`

**Permissions:**
- ✅ View ALL contacts (read-only, for estimate context)
- ✅ Log activity on any contact
- ✅ Upload documents to any contact
- ✅ Send emails from any contact
- ✅ Create/edit estimates they created
- ✅ Submit estimates for approval
- ✅ View their own estimating analytics
- ✅ Send approved estimates to dispatch

**Cannot Do:**
- ❌ Edit contact master data
- ❌ Reassign contact ownership
- ❌ Archive contacts
- ❌ Create/edit deals
- ❌ View sales analytics
- ❌ View company-wide analytics
- ❌ Approve estimates (owner/admin only)
- ❌ Create work orders
- ❌ Access compliance module
- ❌ Invite users
- ❌ Change roles

**Analytics Scope:**
- Own estimates only (`estimate.createdById = userId` for estimator role)
- Contacts linked to own estimates only

---

### 5️⃣ ROLE: `dispatch`

**Description:** Execution specialist (work orders)  
**Access Level:** LIMITED (execution only)  
**Dashboard:** `/dispatch`  
**Primary Workspace:** `/dispatch`

**Permissions:**
- ✅ View ALL contacts (read-only, for work order context)
- ✅ Log activity on any contact
- ✅ Upload documents to any contact
- ✅ Send emails from any contact
- ✅ Create/edit work orders
- ✅ View dispatch queue
- ✅ Close work orders
- ✅ View dispatch analytics
- ✅ Print work orders
- ✅ View compliance status (read-only)

**Cannot Do:**
- ❌ Edit contact master data
- ❌ Reassign contact ownership
- ❌ Archive contacts
- ❌ Create/edit deals
- ❌ Create/edit estimates
- ❌ View sales analytics
- ❌ View estimating analytics
- ❌ View company-wide analytics
- ❌ Mutate compliance data
- ❌ Invite users
- ❌ Change roles

**Analytics Scope:**
- Work orders only (company-wide for execution context)
- Contacts linked to active work orders only

---

## ROLE HIERARCHY

**Privileges (High to Low):**
1. **owner** — Unrestricted
2. **admin** — Unrestricted (except owner management)
3. **user** — Sales workspace (own contacts)
4. **estimator** — Estimating workspace (own estimates)
5. **dispatch** — Execution workspace (work orders)

**Note:** user, estimator, and dispatch are PEER roles with non-overlapping scopes, not a hierarchy.

---

## CONTACT OWNERSHIP vs ROLE

### Contact Ownership Property

**Field:** `contact.ownerId` (database column)  
**Type:** Foreign key to User.id  
**Purpose:** Track who created/owns the contact

**Who Can Be a Contact Owner:**
- ✅ User with role "owner"
- ✅ User with role "admin"
- ✅ User with role "user"
- ✅ User with role "estimator" (if they create a contact)
- ✅ User with role "dispatch" (if they create a contact)

**Example Scenarios:**

1. **Company owner creates contact:**
   - User role: `owner`
   - Contact.ownerId: `owner's userId`
   - Result: Company owner is the contact owner

2. **Sales person creates contact:**
   - User role: `user`
   - Contact.ownerId: `user's userId`
   - Result: Sales person is the contact owner

3. **Estimator creates contact:**
   - User role: `estimator`
   - Contact.ownerId: `estimator's userId`
   - Result: Estimator is the contact owner

### Ownership Impact

**What Ownership Controls:**
- ✅ Analytics scope for "user" role (see only owned contacts in dashboard)
- ✅ Edit permissions for "user" role (edit only owned contacts)
- ✅ Display in contact list (shows owner name for context)

**What Ownership Does NOT Control:**
- ❌ Contact visibility (ALL roles see ALL contacts)
- ❌ Route access (ALL roles can access /contacts)
- ❌ Activity logging (ALL roles can log on any contact)
- ❌ Document uploads (ALL roles can upload to any contact)

---

## ROLE VERIFICATION CHECKLIST

### ✅ When Adding New Features:

1. **Is this a ROLE check or OWNERSHIP check?**
   - Role: What the user's position is
   - Ownership: Whether user created/owns a specific record

2. **Which roles should access this?**
   - owner/admin: Full access
   - user: Own records only
   - estimator: Estimating only
   - dispatch: Execution only

3. **Where is the check enforced?**
   - ✅ Server actions (correct)
   - ❌ Route guards (incorrect for CRM)

4. **Is the terminology clear?**
   - ✅ "owner role" = company owner position
   - ✅ "contact owner" = contact.ownerId property
   - ❌ "owner" alone = ambiguous

---

## COMMON MISTAKES TO AVOID

### ❌ WRONG: Conflating Role and Ownership

```typescript
// BAD: Confusing terminology
if (user.owner) {  // Does this mean role or ownership?
  // ...
}

// GOOD: Clear terminology
if (user.role === 'owner') {  // Role check
  // ...
}
if (contact.ownerId === userId) {  // Ownership check
  // ...
}
```

### ❌ WRONG: Filtering Contacts by Role

```typescript
// BAD: Role-based contact filtering
const contacts = await prisma.contact.findMany({
  where: { 
    companyId,
    ownerId: role === 'user' ? userId : undefined  // ❌ WRONG
  }
})

// GOOD: All roles see all contacts
const contacts = await prisma.contact.findMany({
  where: { companyId }  // ✅ CORRECT
})
```

### ❌ WRONG: Route Guards Based on Role

```typescript
// BAD: Role-based route guard
export default async function CrmLayout({ children }) {
  const session = await getServerSession(authOptions)
  if (session.user.role !== 'user') {  // ❌ WRONG
    redirect('/dashboard')
  }
  return <div>{children}</div>
}

// GOOD: Session check only
export default async function CrmLayout({ children }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {  // ✅ CORRECT
    redirect('/login')
  }
  return <div>{children}</div>
}
```

### ✅ CORRECT: Action-Level Permissions

```typescript
// GOOD: Permission check in server action
export async function updateContact(contactId: string, data: any) {
  const session = await getServerSession(authOptions)
  const contact = await prisma.contact.findUnique({ 
    where: { id: contactId } 
  })
  
  const isOwnerRole = session.user.role === 'owner'
  const isAdminRole = session.user.role === 'admin'
  const isContactOwner = contact.ownerId === session.user.id
  
  if (!isContactOwner && !isOwnerRole && !isAdminRole) {
    throw new Error('You can only edit contacts you own (unless owner/admin)')
  }
  
  // ... update contact
}
```

---

## ENFORCEMENT RULES

### 🔒 ABSOLUTE RULES

1. **5 Roles Only:** owner, admin, user, estimator, dispatch
2. **Role ≠ Ownership:** These are separate concepts
3. **All Roles See All Contacts:** Contact visibility is company-wide
4. **Permissions at Action Level:** NOT at route level (except dashboards)
5. **Analytics on Dashboards Only:** Not in workspaces

### 🚫 FORBIDDEN PATTERNS

1. ❌ Adding new roles without architecture review
2. ❌ Role-based contact list filtering
3. ❌ Role-based CRM route guards
4. ❌ Using "owner" ambiguously (always specify "owner role" or "contact owner")
5. ❌ Client-side role checks for data access

---

## SCHEMA REFERENCE

**User.role Field:**
```prisma
model User {
  role String @default("user")  // Values: "owner", "admin", "user", "estimator", "dispatch"
}
```

**Contact.ownerId Field:**
```prisma
model Contact {
  ownerId   String?
  owner     User?   @relation("ContactOwner", fields: [ownerId], references: [id])
}
```

**Distinction:**
- `User.role` = What position the user holds
- `Contact.ownerId` = Who created/owns this specific contact

---

**CANONICAL REFERENCE — DO NOT DEVIATE**

Last Updated: December 31, 2025  
Verified By: GitHub Copilot (Sonnet 4.5)  
Status: LOCKED ✅

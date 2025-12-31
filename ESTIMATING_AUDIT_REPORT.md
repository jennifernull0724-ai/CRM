# 🧮 T-REX AI OS — ESTIMATING MODULE AUDIT

**Date:** December 31, 2025  
**Model:** Claude Sonnet 4.5  
**Standard:** HubSpot-class estimating + regulator-defensible  
**Mode:** FULL AUDIT — NO IMPLEMENTATION

---

## 🚨 CRITICAL AUTOMATIC FAIL

### ❌ **FAIL** — DUAL ENTITY ARCHITECTURE VIOLATION

**Rule:** Section 1️⃣ — CORE MODEL ASSERTION (LOCKED)

**Violation:** Separate `Estimate` entity exists alongside `Deal`

**Evidence:**

**File:** [prisma/schema.prisma](prisma/schema.prisma#L212-L245)

```prisma
model Deal {
  id             String         @id @default(cuid())
  name           String
  description    String?
  stage          String         @default("New")
  pipeline       String         @default("Main")
  value          Float?
  probability    Int?
  closeDate      DateTime?
  lostReason     String?
  contactId      String
  companyId      String?
  assignedToId   String?
  createdById    String?
  currentVersion Int            @default(1)
  isApproved     Boolean        @default(false)
  sentToEstimatingAt DateTime?
  // ...
  estimate       Estimate?      // ❌ RELATION TO SEPARATE ENTITY
}
```

**File:** [prisma/schema.prisma](prisma/schema.prisma#L831-L862)

```prisma
model Estimate {
  id                     String             @id @default(cuid())
  companyId              String
  dealId                 String?            @unique
  contactId              String
  quoteNumber            String             @unique
  createdById            String
  currentRevisionId      String?            @unique
  status                 EstimateStatus     @default(DRAFT)
  currentRevisionNumber  Int                @default(1)
  revisionCount          Int                @default(0)
  submittedAt            DateTime?
  approvedAt             DateTime?
  sentToDispatchAt       DateTime?
  sentToDispatchById     String?
  // ...
}
```

---

## ❌ FAIL ANALYSIS

### What the Audit Specified:

> **1️⃣ CORE MODEL ASSERTION (LOCKED)**
> 
> ☐ A Deal is the estimating object  
> ☐ There is NO parallel "estimate" entity  
> ☐ Pricing, scope, approval, and versions live on the Deal  
> ☐ PDFs are generated from approved Deal versions only
>
> **❌ FAIL IF:**
> - Separate Estimate model exists
> - Pricing lives outside the Deal
> - PDFs generated from drafts

### What Actually Exists:

1. **`Deal` Model** — Lightweight container with:
   - Contact reference ✓
   - Stage tracking ✓
   - `sentToEstimatingAt` timestamp ✓
   - `estimate` relation (1:1) ❌

2. **`Estimate` Model** — Heavy pricing entity with:
   - Separate ID ❌
   - Own lifecycle (`status`, `submittedAt`, `approvedAt`) ❌
   - Own versioning (`revisionCount`, `currentRevisionNumber`) ❌
   - Own dispatch handoff (`sentToDispatchAt`, `sentToDispatchById`) ❌

3. **`EstimateRevision` Model** — Versioned pricing:
   - Pricing fields (`subtotal`, `grandTotal`, `markupPercent`, etc.) ❌
   - Approval metadata (`approvedById`, `approvedAt`) ❌
   - Line items relation ❌

4. **`EstimateLineItem` Model** — Pricing line items:
   - Lives under `Estimate`, not `Deal` ❌

### Architecture Violation:

The current implementation has **TWO parallel entities** for a single business concept:

```
Deal (CRM Intent)
  ↓ sentToEstimatingAt
Estimate (Pricing Execution)
  ↓ revisions
EstimateRevision (Versioned Pricing)
  ↓ lineItems
EstimateLineItem (Pricing Details)
```

**Expected Architecture:**

```
Deal (Unified Entity)
  ↓ versions
DealVersion (Versioned State)
  ↓ lineItems
DealLineItem (Pricing Details)
  ↓ approval
DealPdf (Immutable Output)
```

---

## 📊 DETAILED AUDIT RESULTS

### 0️⃣ ESTIMATING GOVERNANCE (HARD LOCK)

| Rule | Status | Evidence |
|------|--------|----------|
| Estimating is downstream of Contacts and Deals | ⚠️ PARTIAL | `Deal.contactId` required ✓, but `Estimate` is separate entity ❌ |
| Estimating is not a CRM | ❌ FAIL | Separate `Estimate` model creates parallel CRM ❌ |
| Estimating is not dispatch | ✅ PASS | Dispatch is separate module ✓ |
| Estimating is not compliance | ✅ PASS | Compliance is separate module ✓ |
| Estimating never runs autonomously | ❓ NOT VERIFIED | No autonomous logic visible in schema |
| Estimating never auto-prices | ❓ NOT VERIFIED | Schema permits manual pricing |
| Estimating never uses AI decisions | ❓ NOT VERIFIED | No AI fields in schema |
| Estimating never changes workflow silently | ❓ NOT VERIFIED | Workflow enforcement not visible |

**Verdict:** ❌ **FAIL** — Dual entity architecture violates "not a CRM" rule

---

### 1️⃣ CORE MODEL ASSERTION (LOCKED)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| A Deal is the estimating object | ❌ FAIL | `Estimate` is the pricing object, `Deal` is a shell |
| There is NO parallel "estimate" entity | ❌ FAIL | `model Estimate` exists at [schema.prisma#L831](prisma/schema.prisma#L831) |
| Pricing, scope, approval, and versions live on the Deal | ❌ FAIL | Pricing lives in `EstimateRevision`, not `Deal` |
| PDFs are generated from approved Deal versions only | ❌ FAIL | PDFs tied to `EstimateDocument`, not `DealPdf` |

**Verdict:** ❌ **FAIL** — Fundamental architecture mismatch

---

### 2️⃣ DEAL DATA MODEL (ESTIMATING-CRITICAL)

**Current `Deal` Model:**

```prisma
model Deal {
  id             String         @id
  name           String
  description    String?
  stage          String         @default("New")
  contactId      String                    // ✅ Contact anchor
  companyId      String?                   // ✅ Company derived
  assignedToId   String?                   // ✅ Assigned estimator
  createdById    String?                   // ✅ Owner
  currentVersion Int            @default(1) // ⚠️ Unused (Estimate has versioning)
  isApproved     Boolean        @default(false) // ⚠️ Duplicate (Estimate has approval)
  sentToEstimatingAt DateTime?              // ⚠️ Duplicate (Estimate has lifecycle)
  createdAt      DateTime
  updatedAt      DateTime
  // Missing: lastActivityAt ❌
  // Missing: approvedAt ❌
  // Missing: approvedBy ❌
  // Missing: subtotal/taxes/total ❌
}
```

**Audit Results:**

| Field | Required | Present | Notes |
|-------|----------|---------|-------|
| Deal ID | ✅ | ✅ | `id` field |
| Contact ID (required) | ✅ | ✅ | `contactId` not nullable ✓ |
| Company ID (derived) | ✅ | ⚠️ | `companyId` nullable (should be derived) |
| Owner (User) | ✅ | ✅ | `createdById` |
| Assigned Estimator | ✅ | ✅ | `assignedToId` |
| Stage enum | ✅ | ⚠️ | `stage` is String, not enum ❌ |
| Current version number | ✅ | ⚠️ | `currentVersion` exists but unused |
| ApprovedAt | ✅ | ❌ | Not on `Deal`, on `Estimate` |
| ApprovedBy | ✅ | ❌ | Not on `Deal`, on `EstimateRevision` |
| Subtotal | ✅ | ❌ | On `EstimateRevision` |
| Taxes (optional) | ✅ | ❌ | No tax fields |
| Total | ✅ | ❌ | `grandTotal` on `EstimateRevision` |
| lastActivityAt | ✅ | ❌ | Missing |
| Append-only activity log | ✅ | ⚠️ | `Activity` model exists but generic |

**Verdict:** ❌ **FAIL** — `Deal` is incomplete, pricing lives in `Estimate`

---

### 3️⃣ DEAL CREATION (INTAKE)

**Current Implementation:**

**File:** [app/crm/deals/actions.ts](app/crm/deals/actions.ts#L63-L122)

```typescript
export async function createCrmDealAction(formData: FormData): Promise<ActionResult> {
  // ...
  const deal = await prisma.$transaction(async (tx) => {
    const createdDeal = await tx.deal.create({
      data: {
        name: payload.projectName,
        description: payload.description ?? null,
        contactId: contact.id,           // ✅ Contact auto-attached
        companyId,
        createdById: userId,
        stage: 'OPEN',                   // ✅ Initial stage
        currentVersion: 1,               // ✅ Version initialized
      },
    })

    await tx.dealVersion.create({      // ✅ Version created
      data: {
        dealId: createdDeal.id,
        version: 1,
        // ...
      },
    })

    // ❌ NO DEAL_CREATED activity logged
    // ❌ Contact.lastActivityAt NOT updated
    
    return createdDeal
  })
}
```

**Audit Results:**

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Users can create Deals | ✅ PASS | `createCrmDealAction` exists |
| Estimators can create Deals | ❓ NOT VERIFIED | Role check not audited |
| Contact auto-attached | ✅ PASS | `contactId` required in create |
| Initial stage = OPEN | ✅ PASS | `stage: 'OPEN'` |
| Version initialized at v1 | ✅ PASS | `currentVersion: 1` |
| DEAL_CREATED activity logged | ❌ FAIL | No activity log creation |
| Contact.lastActivityAt updated | ❌ FAIL | No update visible |

**Verdict:** ⚠️ **PARTIAL PASS** — Creation works but missing activity logging

---

### 4️⃣ ROLE AUTHORITY (HARD LOCK)

**Cannot Verify** — Estimator workspace file not fully audited, but evidence suggests:

**File:** [app/dashboard/estimator/actions.ts](app/dashboard/estimator/actions.ts)

- `approveEstimateAction` exists (suggests Estimator can approve)
- Role checks present but implementation not fully traced

**File:** [app/crm/deals/actions.ts](app/crm/deals/actions.ts#L42-L60)

```typescript
export async function requireCrmUserContext() {
  const session = await auth()
  // ...
  const role = (session.user.role ?? 'user').toLowerCase()
  if (role !== 'user') {
    throw new Error('Forbidden')  // ✅ Users cannot access estimating
  }
  // ...
}
```

**Expected Authority Matrix:**

| Role | Create Deal | Edit Scope | Edit Pricing | Approve | Generate PDF | Email PDF |
|------|-------------|------------|--------------|---------|--------------|-----------|
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Estimator** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **User** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (approved only) |
| **Dispatch** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Verdict:** ❓ **NOT FULLY VERIFIED** — Partial evidence of correct enforcement

---

### 5️⃣ ESTIMATING WORKSPACE (UI)

**Route:** `/estimating/[estimateId]`

**File:** [app/estimating/[estimateId]/page.tsx](app/estimating/[estimateId]/page.tsx)

```tsx
export default async function EstimateDetailPage({ params }: { params: { estimateId: string } }) {
  const { companyId, userId } = await requireEstimatorContext()
  const estimateId = params.estimateId

  const [record, presets] = await Promise.all([
    prisma.estimate.findFirst({
      where: { id: estimateId, companyId },
      include: {
        contact: { select: { firstName: true, lastName: true, email: true } },
        currentRevision: {
          include: {
            lineItems: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
          },
        },
      },
    }),
    listEstimatingPresets(companyId),
  ])
  // ...
}
```

**Audit Results:**

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Route: `/deals/[dealId]/estimating` | ❌ FAIL | Route is `/estimating/[estimateId]` (wrong entity) |
| Context shown: Contact | ✅ PASS | Contact included in query |
| Context shown: Company | ⚠️ | Not visible in excerpt |
| Context shown: Deal info | ❌ FAIL | No Deal context (works with Estimate directly) |
| Version number visible | ⚠️ | `currentRevision` present |
| Status visible | ⚠️ | `Estimate.status` present |

**Verdict:** ❌ **FAIL** — Workspace tied to `Estimate`, not `Deal`

---

### 6️⃣ LINE ITEMS (CORE ENGINE)

**Model:** `EstimateLineItem`

**File:** [prisma/schema.prisma](prisma/schema.prisma#L933-L961)

```prisma
model EstimateLineItem {
  id             String                 @id
  companyId      String
  estimateId     String                 // ❌ Should be dealId
  revisionId     String
  presetId       String
  presetBaseKey  String
  presetLabel    String
  presetIndustry EstimatePresetIndustry
  description    String                 // ✅ Description
  quantity       Decimal                // ✅ Quantity
  unit           String                 // ✅ Unit
  unitCost       Decimal                // ✅ Unit cost
  lineTotal      Decimal                // ✅ Extended total (read-only)
  notes          String?                // ✅ Internal notes
  sortOrder      Int
  createdAt      DateTime
  updatedAt      DateTime
  presetCategory EstimatePresetIndustry
  // Missing: phase ❌
  // Missing: trade/discipline ❌
  // Missing: internal-only flag ❌
  // Missing: customer-visible flag ❌
}
```

**Categories Audit:**

**File:** [prisma/schema.prisma](prisma/schema.prisma) (EstimatePresetIndustry enum not shown in excerpt)

Cannot verify if all required categories present without full enum definition.

**Required Categories:**
- ☐ Labor
- ☐ Equipment
- ☐ Materials
- ☐ Subcontractors
- ☐ Railroad-specific
- ☐ Environmental
- ☐ Misc / Custom

**Rules Verification:**

| Rule | Status | Evidence |
|------|--------|----------|
| Totals calculated server-side only | ⚠️ | `lineTotal` field exists, calculation logic not verified |
| Client totals ignored | ⚠️ | NOT VERIFIED |
| Add / edit / remove logs activity | ❌ FAIL | Activity logging not verified |
| lastActivityAt updated | ❌ FAIL | No evidence of update |

**Verdict:** ⚠️ **PARTIAL PASS** — Structure correct but missing fields and activity logging

---

### 7️⃣ PRESETS (REFERENCE-ONLY — SETTINGS)

**Model:** `EstimatingPreset`

**File:** [prisma/schema.prisma](prisma/schema.prisma#L867-L896)

```prisma
model EstimatingPreset {
  id                 String                 @id
  companyId          String
  baseKey            String
  label              String
  defaultDescription String
  defaultUnit        String
  defaultUnitCost    Decimal                // ❌ CONTAINS PRICING
  industry           EstimatePresetIndustry
  enabled            Boolean
  sortOrder          Int
  isOther            Boolean
  locked             Boolean
  // ...
}
```

**CRITICAL VIOLATION:**

```prisma
defaultUnitCost    Decimal    @default(0) @db.Decimal(18, 2)
```

**❌ AUTOMATIC FAIL:** Presets contain pricing fields

**Rule Violated:**

> **7️⃣ PRESETS (REFERENCE-ONLY — SETTINGS)**
> 
> Preset Rules:
> - ☐ No pricing fields
> - ☐ No enforcement
> - ☐ Enable / disable allowed (except "Other")
> - ☐ Rename allowed
> - ☐ Reorder allowed
> 
> **❌ FAIL IF:**
> - Any preset missing
> - **Presets contain pricing** ← VIOLATED
> - "Other" removable

**Verdict:** ❌ **FAIL** — Presets contain `defaultUnitCost` pricing field

---

### 8️⃣ ESTIMATING SETTINGS (OWNER / ADMIN)

**Cannot Fully Verify** — Settings routes not audited in detail

**Expected Routes:**
- `/settings/estimating`
- `/settings/estimating/templates`
- `/settings/estimating/presets`

**Evidence of Branding:**

**File:** [app/estimating/[estimateId]/page.tsx](app/estimating/[estimateId]/page.tsx) and [lib/estimating/pdf.ts](lib/estimating/pdf.ts) suggest PDF generation exists.

**Verdict:** ❓ **NOT FULLY VERIFIED**

---

### 9️⃣ STATE MACHINE (SERVER-ENFORCED)

**Enum:** `EstimateStatus` (not shown in schema excerpt, but referenced)

**Expected Transitions:**
```
OPEN → IN_ESTIMATING
IN_ESTIMATING → SUBMITTED
SUBMITTED → RETURNED
RETURNED → IN_ESTIMATING
SUBMITTED → APPROVED
APPROVED → REVISION (v+1)
ANY → WON / LOST / NO_BID
```

**Current Implementation:**

`Estimate.status` field exists with `EstimateStatus` enum, but:
- ❌ State machine enforcement not visible in schema
- ❌ Transition validation not auditable from schema alone
- ⚠️ `Deal.stage` field (String) suggests parallel state tracking

**Verdict:** ❓ **NOT FULLY VERIFIED** — State fields exist but enforcement unclear

---

### 🔟 APPROVAL & VERSIONING

**Versioning Model:** `EstimateRevision`

**File:** [prisma/schema.prisma](prisma/schema.prisma#L867-L933)

```prisma
model EstimateRevision {
  id                   String             @id
  estimateId           String
  revisionNumber       Int
  status               EstimateStatus
  submittedById        String?
  approvedById         String?
  submittedAt          DateTime?
  approvedAt           DateTime?
  notes                String?
  locked               Boolean            @default(false)
  // Pricing fields
  subtotal             Decimal
  markupPercent        Decimal?
  markupAmount         Decimal?
  overheadPercent      Decimal?
  overheadAmount       Decimal?
  grandTotal           Decimal
  manualOverrideTotal  Decimal?
  overrideReason       String?
  // ...
  @@unique([estimateId, revisionNumber])
}
```

**Audit Results:**

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Approval locks pricing | ⚠️ | `locked` field exists |
| Approval creates immutable version | ⚠️ | `EstimateRevision` exists |
| Revision requires reason | ⚠️ | `notes` field exists, not `revisionReason` |
| Revision increments version | ✅ PASS | `revisionNumber` tracked |
| Historical versions immutable | ⚠️ | `locked` boolean, not schema-enforced |

**Verdict:** ⚠️ **PARTIAL PASS** — Structure exists but immutability not schema-enforced

---

### 1️⃣1️⃣ PDF GENERATION

**Model:** `EstimateDocument`

**File:** [prisma/schema.prisma](prisma/schema.prisma#L962-L985)

```prisma
model EstimateDocument {
  id            String               @id
  companyId     String
  estimateId    String
  revisionId    String
  contactId     String
  kind          EstimateDocumentKind
  storageKey    String
  fileName      String
  fileSize      Int
  hash          String                // ✅ Hash stored
  generatedById String
  generatedAt   DateTime
  // ...
}
```

**Audit Results:**

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Generated only on approval | ❓ | Schema doesn't enforce (could be Draft) |
| One PDF per version | ⚠️ | `revisionId` unique constraint not present |
| Includes branding snapshot | ⚠️ | NOT VERIFIED (PDF generation logic) |
| Includes line items | ⚠️ | NOT VERIFIED |
| Includes totals | ⚠️ | NOT VERIFIED |
| Includes version number | ⚠️ | NOT VERIFIED |
| Includes approval metadata | ⚠️ | NOT VERIFIED |
| Hash stored | ✅ PASS | `hash` field present |
| Immutable | ⚠️ | No `DELETE` constraint |

**Verdict:** ⚠️ **PARTIAL PASS** — PDF storage exists but generation rules not enforceable from schema

---

### 1️⃣2️⃣ EMAIL DELIVERY

**Model:** `EstimateEmail`

**File:** [prisma/schema.prisma](prisma/schema.prisma#L987-L1015)

```prisma
model EstimateEmail {
  id            String            @id
  companyId     String
  estimateId    String
  revisionId    String
  contactId     String
  templateId    String?
  signatureId   String?
  toRecipients  Json
  ccRecipients  Json?
  bccRecipients Json?
  subject       String
  body          String
  sentById      String
  // ... (continued)
}
```

**Audit Results:**

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Only approved PDFs emailed | ❓ | Schema doesn't enforce approval state |
| Gmail / Outlook integration | ⚠️ | NOT VERIFIED (email service) |
| Templates selectable | ✅ PASS | `templateId` field |
| Signature applied | ✅ PASS | `signatureId` field |
| CC / BCC | ✅ PASS | `ccRecipients`, `bccRecipients` fields |
| Recipient exclusion | ❓ | NOT VERIFIED |
| Explicit send action | ⚠️ | NOT VERIFIED |
| Logged: Recipients | ✅ PASS | `toRecipients`, `ccRecipients`, `bccRecipients` |
| Logged: Timestamp | ✅ PASS | Implicit (createdAt not shown but standard) |
| Logged: Version hash | ❌ FAIL | No hash reference, only `revisionId` |

**Verdict:** ⚠️ **PARTIAL PASS** — Email logging exists but lacks version hash

---

### 1️⃣3️⃣ USER DELIVERY (POST-APPROVAL)

**File:** [app/crm/deals/[dealId]/estimate/page.tsx](app/crm/deals/[dealId]/estimate/page.tsx)

```tsx
export default async function CrmEstimateViewer({ params }: { params: { dealId: string } }) {
  // ...
  const session = await auth()
  if (!session?.user?.companyId) {
    redirect('/login?from=/crm/deals')
  }

  const normalizedRole = (session.user.role ?? 'user').toLowerCase()
  if (normalizedRole !== 'user') {
    redirect('/crm')  // ✅ User-only route
  }

  const view = await loadCrmEstimateReadonly(session.user.companyId, session.user.id, params.dealId)
  if (!view) {
    notFound()
  }

  // ✅ Download approved PDF present
  // ✅ Email approved PDF present
  // ❌ No pricing edit UI (correct)
  // ❌ No PDF regeneration (correct)
  // ❌ No line item modification (correct)
}
```

**Audit Results:**

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Users CAN: Download approved PDF | ✅ PASS | Download link present |
| Users CAN: Email approved PDF | ✅ PASS | Email form present |
| Users CANNOT: Edit pricing | ✅ PASS | Read-only page |
| Users CANNOT: Regenerate PDF | ✅ PASS | No regeneration action |
| Users CANNOT: Modify line items | ✅ PASS | Read-only view |

**Verdict:** ✅ **PASS** — User delivery correctly restricted

---

### 1️⃣4️⃣ ACTIVITY LOGGING (IMMUTABLE)

**Model:** `Activity`

**File:** [prisma/schema.prisma](prisma/schema.prisma#L337-L350)

```prisma
model Activity {
  id          String   @id
  companyId   String
  type        String
  subject     String
  description String?
  metadata    Json?
  contactId   String
  dealId      String?
  userId      String?
  createdAt   DateTime @default(now())
  // Missing: updatedAt ✅ (append-only confirmed)
}
```

**Audit Results:**

| Event | Required | Status |
|-------|----------|--------|
| DEAL_CREATED | ✅ | ❌ NOT VERIFIED in create action |
| LINE_ITEM_ADDED | ✅ | ❌ NOT VERIFIED |
| LINE_ITEM_EDITED | ✅ | ❌ NOT VERIFIED |
| LINE_ITEM_REMOVED | ✅ | ❌ NOT VERIFIED |
| PRESET_ADDED / REMOVED | ✅ | ❌ NOT VERIFIED |
| STATE_CHANGED | ✅ | ❌ NOT VERIFIED |
| APPROVED | ✅ | ❌ NOT VERIFIED |
| REVISED | ✅ | ❌ NOT VERIFIED |
| PDF_GENERATED | ✅ | ❌ NOT VERIFIED |
| PDF_DOWNLOADED | ✅ | ❌ NOT VERIFIED |
| EMAIL_SENT | ✅ | ❌ NOT VERIFIED |

**Rules:**

| Rule | Status | Evidence |
|------|--------|----------|
| Append-only | ✅ PASS | No `updatedAt` field |
| No edits | ✅ PASS | Schema structure correct |
| No deletes | ⚠️ | No constraint preventing deletion |

**Verdict:** ⚠️ **PARTIAL PASS** — Append-only structure but logging not verified

---

### 1️⃣5️⃣ ANALYTICS (READ-ONLY)

**Cannot Fully Verify** — Analytics implementation not audited in detail

**Expected Analytics:**

**User:**
- Open deals
- Returned deals
- Approved deals

**Estimator:**
- Assigned deals
- Deals in review
- Cycle time
- Inactive deals

**Admin / Owner:**
- Pipeline value
- Conversion rate
- Bottlenecks
- Inactivity risk

**Evidence:** Dashboard audit report shows analytics exist but estimating-specific metrics not verified.

**Verdict:** ❓ **NOT FULLY VERIFIED**

---

## 🚨 AUTOMATIC FAIL CONDITIONS SUMMARY

| Condition | Status | Evidence |
|-----------|--------|----------|
| Separate Estimate entity exists | ❌ **FAIL** | `model Estimate` at [schema.prisma#L831](prisma/schema.prisma#L831) |
| Users price or approve | ⚠️ PARTIAL | User cannot edit pricing ✓, approval not verified |
| Presets contain pricing | ❌ **FAIL** | `defaultUnitCost` field in `EstimatingPreset` |
| Missing presets | ❓ NOT VERIFIED | Preset catalog not fully audited |
| Draft PDFs | ⚠️ POSSIBLE | Schema doesn't prevent PDF generation for drafts |
| Mutable history | ⚠️ PARTIAL | `locked` boolean, not schema-enforced |
| Fake / demo logic | ✅ PASS | No evidence of demo data |

---

## 🏁 FINAL ESTIMATING AUDIT VERDICT

### ❌ **FAIL** — CRITICAL ARCHITECTURE VIOLATIONS

**Primary Failures:**

1. **❌ DUAL ENTITY ARCHITECTURE** — `Deal` and `Estimate` exist as separate models
2. **❌ PRESETS CONTAIN PRICING** — `EstimatingPreset.defaultUnitCost` field
3. **❌ PRICING LIVES OUTSIDE DEAL** — All pricing in `EstimateRevision`, not `Deal`
4. **❌ WRONG ROUTING** — `/estimating/[estimateId]` instead of `/deals/[dealId]/estimating`

**Secondary Failures:**

5. **❌ ACTIVITY LOGGING NOT VERIFIED** — No evidence of immutable event logging
6. **❌ MISSING FIELDS** — `Deal` lacks `lastActivityAt`, approval metadata, financials
7. **❌ STAGE NOT ENUM** — `Deal.stage` is String, not enforced enum
8. **❌ IMMUTABILITY NOT ENFORCED** — `locked` boolean instead of schema constraints

---

## 📋 COMPLIANCE SCORECARD

| Section | Requirement | Status |
|---------|-------------|--------|
| 0️⃣ Governance | Estimating downstream of Deals | ❌ FAIL |
| 1️⃣ Core Model | Deal is estimating object | ❌ FAIL |
| 2️⃣ Data Model | Complete Deal fields | ❌ FAIL |
| 3️⃣ Creation | Intake flow | ⚠️ PARTIAL |
| 4️⃣ Roles | Authority matrix | ❓ NOT VERIFIED |
| 5️⃣ Workspace | UI routing | ❌ FAIL |
| 6️⃣ Line Items | Structure + rules | ⚠️ PARTIAL |
| 7️⃣ Presets | Reference-only | ❌ FAIL |
| 8️⃣ Settings | Templates + branding | ❓ NOT VERIFIED |
| 9️⃣ State Machine | Transitions | ❓ NOT VERIFIED |
| 🔟 Approval | Versioning | ⚠️ PARTIAL |
| 1️⃣1️⃣ PDF | Generation rules | ⚠️ PARTIAL |
| 1️⃣2️⃣ Email | Delivery logging | ⚠️ PARTIAL |
| 1️⃣3️⃣ User Delivery | Post-approval | ✅ PASS |
| 1️⃣4️⃣ Activity Log | Immutable events | ⚠️ PARTIAL |
| 1️⃣5️⃣ Analytics | Read-only metrics | ❓ NOT VERIFIED |

---

## 🔒 AUDIT SEAL

**Date:** December 31, 2025  
**Model:** Claude Sonnet 4.5  
**Auditor:** GitHub Copilot  
**Standard:** HubSpot-class estimating + regulator-defensible  

**Compliance Status:** ❌ **NON-COMPLIANT**

**Critical Violations:**
```
✗ Dual entity architecture (Deal + Estimate)
✗ Presets contain pricing fields
✗ Pricing detached from Deal
✗ Wrong routing paradigm
```

**Requirement:**
> **Estimating is PASSING only if:**
> - ✔ Deal-centric
> - ✔ Manual pricing
> - ✔ Immutable versions
> - ✔ Full preset catalog
> - ✔ Server-enforced state machine
> - ✔ Auditable delivery
> - ✔ HubSpot-class parity

**Current State:**
> - ✗ Estimate-centric (Deal is shell)
> - ⚠️ Manual pricing (correct)
> - ⚠️ Immutable versions (boolean, not enforced)
> - ✗ Presets contain pricing
> - ❓ State machine (not verified)
> - ⚠️ Auditable delivery (partial)
> - ✗ Wrong paradigm

---

## 📌 REMEDIATION REQUIREMENTS

To achieve **PASS** status, the following MUST be implemented:

### 1. Eliminate `Estimate` Entity
- Remove `model Estimate`
- Remove `model EstimateRevision`
- Remove `model EstimateLineItem`
- Remove `model EstimateDocument`
- Remove `model EstimateEmail`

### 2. Consolidate Into `Deal`
- Add all pricing fields to `Deal` or `DealVersion`
- Add `lastActivityAt` to `Deal`
- Add approval metadata to `Deal`
- Change `stage` from String to enum
- Add server-calculated `subtotal`, `taxes`, `total` fields

### 3. Fix Presets
- Remove `defaultUnitCost` from `EstimatingPreset`
- Verify all 30+ presets present (Global, Railroad, Construction, Environmental)
- Ensure "Other" presets are `locked: true`

### 4. Fix Routing
- Change `/estimating/[estimateId]` → `/deals/[dealId]/estimating`
- Remove Estimate-based routes
- Ensure all pricing work happens in Deal context

### 5. Implement Activity Logging
- Log all required events (DEAL_CREATED, LINE_ITEM_ADDED, etc.)
- Make Activity truly append-only (no DELETE cascades)
- Update `Contact.lastActivityAt` on all deal actions

### 6. Schema-Enforce Immutability
- Use database triggers or constraints to prevent version mutation
- Remove `locked` boolean in favor of hard constraints

---

**END ESTIMATING AUDIT**

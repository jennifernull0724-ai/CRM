# 🔄 DEAL-CENTRIC ESTIMATING — MIGRATION PLAN

**Date:** December 31, 2025  
**Model:** Claude Sonnet 4.5  
**Scope:** Eliminate Estimate entity, consolidate into Deal  
**Impact:** HIGH — Database schema, routes, actions, dashboards  
**Estimated Effort:** 3-5 days (phased implementation)

---

## 🚨 CRITICAL SCOPE

This migration will:

- ❌ **ELIMINATE** `Estimate`, `EstimateRevision`, `EstimateLineItem`, `EstimateDocument`, `EstimateEmail` models
- ✅ **CONSOLIDATE** all pricing functionality into `Deal`-centric models
- ✅ **RESTRUCTURE** routes from `/estimating/[estimateId]` to `/crm/deals/[dealId]/estimating`
- ✅ **IMPLEMENT** User → Estimating trigger flow
- ✅ **IMPLEMENT** Approval → Dispatch → User delivery toggle
- ✅ **REMOVE** pricing from `EstimatingPreset`
- ✅ **ENFORCE** server-side state machine
- ✅ **IMPLEMENT** comprehensive activity logging

**Production Impact:** BREAKING CHANGE — Requires downtime for migration

---

## 📋 PHASE 0: PRE-MIGRATION AUDIT

### Current State Assessment

**Existing Models (TO BE REMOVED):**
- `Estimate` - 862 lines (schema.prisma#L831-862)
- `EstimateRevision` - 933 lines (schema.prisma#L867-933)
- `EstimateLineItem` - 961 lines (schema.prisma#L933-961)
- `EstimateDocument` - 985 lines (schema.prisma#L962-985)
- `EstimateEmail` - 1015 lines (schema.prisma#L987-1015)

**Existing Routes (TO BE CHANGED):**
- `/estimating/[estimateId]/page.tsx`
- `/estimating/[estimateId]/actions.ts`
- `/dashboard/estimator/page.tsx`

**Existing Actions (TO BE REFACTORED):**
- `createEstimateAction`
- `approveEstimateAction`
- `sendToDispatchAction`
- All line item CRUD actions

**Existing Data (TO BE MIGRATED):**
- Count existing Estimate records
- Map to Deal records (1:1 via `dealId`)
- Preserve all EstimateRevision history
- Preserve all EstimateLineItem data
- Preserve all EstimateDocument PDFs
- Preserve all EstimateEmail logs

---

## 📊 PHASE 1: SCHEMA DESIGN (Day 1)

### 1.1 Enhanced Deal Model

**New Fields on `Deal`:**

```prisma
model Deal {
  id                    String         @id @default(cuid())
  name                  String
  description           String?
  contactId             String         // ✅ Already exists
  companyId             String         // ✅ Make NOT NULL
  createdById           String?        // ✅ Already exists
  assignedToId          String?        // ✅ Already exists (estimator)
  
  // STATE MANAGEMENT (NEW)
  stage                 DealStage      @default(OPEN)  // ❌ Change from String to ENUM
  inEstimating          Boolean        @default(false) // 🆕 Estimating mode flag
  estimatingStartedAt   DateTime?                      // 🆕 When User triggered
  estimatingStartedById String?                        // 🆕 User who triggered
  
  // APPROVAL METADATA (NEW)
  currentVersion        Int            @default(1)     // ✅ Already exists
  approvedVersion       Int?                           // 🆕 Last approved version
  approvedAt            DateTime?                      // 🆕 Approval timestamp
  approvedById          String?                        // 🆕 Approver user ID
  
  // DISPATCH HANDOFF (NEW)
  dispatchedAt          DateTime?                      // 🆕 When sent to dispatch
  dispatchedById        String?                        // 🆕 Who triggered dispatch
  dispatchRequestId     String?        @unique         // 🆕 Link to DispatchRequest
  
  // FINANCIALS (NEW - FROM EstimateRevision)
  subtotal              Decimal        @default(0) @db.Decimal(18, 2)
  markupPercent         Decimal?       @db.Decimal(5, 2)
  markupAmount          Decimal?       @db.Decimal(18, 2)
  overheadPercent       Decimal?       @db.Decimal(5, 2)
  overheadAmount        Decimal?       @db.Decimal(18, 2)
  grandTotal            Decimal        @default(0) @db.Decimal(18, 2)
  
  // ACTIVITY TRACKING (NEW)
  lastActivityAt        DateTime       @default(now())
  
  // TIMESTAMPS
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt
  
  // RELATIONS
  contact               Contact        @relation(...)
  company               Company        @relation(...)
  createdBy             User?          @relation("DealCreator", ...)
  assignedTo            User?          @relation("DealEstimator", ...)
  approvedBy            User?          @relation("DealApprover", ...)
  estimatingTriggeredBy User?          @relation("DealEstimatingTrigger", ...)
  dispatchedBy          User?          @relation("DealDispatcher", ...)
  
  versions              DealVersion[]
  lineItems             DealLineItem[] // 🆕 Direct relation (not via version)
  pdfs                  DealPdf[]
  emails                DealEmail[]
  activities            Activity[]
  notes                 Note[]
  tasks                 Task[]
  dispatchRequest       DispatchRequest? @relation("DealDispatchHandoff")
  
  @@index([companyId, stage])
  @@index([companyId, inEstimating])
  @@index([assignedToId])
  @@index([approvedById])
  @@index([lastActivityAt])
}
```

### 1.2 New DealStage Enum

```prisma
enum DealStage {
  OPEN                  // Initial state (User CRM)
  IN_ESTIMATING         // User-triggered, Estimator working
  SUBMITTED             // Estimator submitted for approval
  APPROVED_ESTIMATE     // Approved, ready for dispatch
  DISPATCHED            // Sent to dispatch
  WON                   // Deal won
  LOST                  // Deal lost
  NO_BID                // Declined to bid
}
```

### 1.3 Enhanced DealVersion Model

**Consolidate EstimateRevision into DealVersion:**

```prisma
model DealVersion {
  id                   String      @id @default(cuid())
  dealId               String
  versionNumber        Int
  
  // SNAPSHOT METADATA
  createdById          String
  createdAt            DateTime    @default(now())
  
  // APPROVAL (IF APPLICABLE)
  status               DealVersionStatus @default(DRAFT)
  submittedAt          DateTime?
  submittedById        String?
  approvedAt           DateTime?
  approvedById         String?
  revisionReason       String?     // Why this revision was created
  locked               Boolean     @default(false)
  
  // PRICING SNAPSHOT (FROM EstimateRevision)
  subtotal             Decimal     @default(0) @db.Decimal(18, 2)
  markupPercent        Decimal?    @db.Decimal(5, 2)
  markupAmount         Decimal?    @db.Decimal(18, 2)
  overheadPercent      Decimal?    @db.Decimal(5, 2)
  overheadAmount       Decimal?    @db.Decimal(18, 2)
  grandTotal           Decimal     @default(0) @db.Decimal(18, 2)
  manualOverrideTotal  Decimal?    @db.Decimal(18, 2)
  overrideReason       String?
  
  // SCOPE SNAPSHOT
  scopeOfWork          String?
  assumptions          String?
  exclusions           String?
  
  // CONTACT SNAPSHOT (FROM EstimateRevision)
  contactNameSnapshot  String
  contactEmailSnapshot String?
  
  // RELATIONS
  deal                 Deal        @relation(...)
  createdBy            User        @relation("DealVersionCreator", ...)
  submittedBy          User?       @relation("DealVersionSubmitter", ...)
  approvedBy           User?       @relation("DealVersionApprover", ...)
  lineItems            DealLineItem[]
  pdfs                 DealPdf[]
  
  @@unique([dealId, versionNumber])
  @@index([dealId, status])
}

enum DealVersionStatus {
  DRAFT
  SUBMITTED
  APPROVED
  SUPERSEDED  // Replaced by newer version
}
```

### 1.4 Consolidated DealLineItem

**Merge EstimateLineItem into DealLineItem:**

```prisma
model DealLineItem {
  id             String                 @id @default(cuid())
  companyId      String
  dealId         String                 // ✅ Change from estimateId
  versionId      String?                // 🆕 Optional: null = current, non-null = historical
  
  // PRESET REFERENCE
  presetId       String
  presetBaseKey  String
  presetLabel    String
  category       EstimatingCategory     // 🆕 Rename from presetIndustry
  
  // LINE ITEM DATA
  description    String
  quantity       Decimal                @default(1) @db.Decimal(12, 2)
  unit           String
  unitCost       Decimal                @db.Decimal(18, 2)
  lineTotal      Decimal                @db.Decimal(18, 2)
  
  // METADATA
  notes          String?                // Internal notes
  sortOrder      Int                    @default(0)
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt
  
  // RELATIONS
  company        Company                @relation(...)
  deal           Deal                   @relation(...)
  version        DealVersion?           @relation(...)
  preset         EstimatingPreset       @relation(...)
  
  @@index([companyId])
  @@index([dealId])
  @@index([versionId])
}
```

### 1.5 Simplified EstimatingPreset (REMOVE PRICING)

```prisma
model EstimatingPreset {
  id                 String                 @id @default(cuid())
  companyId          String
  baseKey            String
  label              String
  defaultDescription String
  defaultUnit        String
  // ❌ REMOVE: defaultUnitCost
  category           EstimatingCategory
  enabled            Boolean                @default(true)
  sortOrder          Int                    @default(0)
  isOther            Boolean                @default(false)
  locked             Boolean                @default(false)
  createdAt          DateTime               @default(now())
  updatedAt          DateTime               @updatedAt
  
  company            Company                @relation(...)
  lineItems          DealLineItem[]         // ✅ Change from EstimateLineItem
  
  @@unique([companyId, baseKey])
  @@index([companyId, category])
}

enum EstimatingCategory {
  LABOR
  EQUIPMENT
  MATERIALS
  SUBCONTRACTORS
  RAILROAD
  ENVIRONMENTAL
  MISC
}
```

### 1.6 DealPdf (FROM EstimateDocument)

```prisma
model DealPdf {
  id            String      @id @default(cuid())
  companyId     String
  dealId        String
  versionId     String      // Link to DealVersion
  contactId     String
  
  kind          DealPdfKind
  storageKey    String      // GCS key
  fileName      String
  fileSize      Int
  hash          String      // SHA-256
  
  generatedById String
  generatedAt   DateTime    @default(now())
  
  // RELATIONS
  company       Company     @relation(...)
  deal          Deal        @relation(...)
  version       DealVersion @relation(...)
  contact       Contact     @relation(...)
  generatedBy   User        @relation("DealPdfGenerator", ...)
  
  @@index([companyId])
  @@index([dealId, kind])
  @@index([versionId])
}

enum DealPdfKind {
  ESTIMATE
  QUOTE
}
```

### 1.7 DealEmail (FROM EstimateEmail)

```prisma
model DealEmail {
  id            String      @id @default(cuid())
  companyId     String
  dealId        String
  versionId     String      // Which version was emailed
  contactId     String
  pdfId         String?     // Link to DealPdf
  
  templateId    String?
  signatureId   String?
  
  toRecipients  Json
  ccRecipients  Json?
  bccRecipients Json?
  subject       String
  body          String
  
  sentById      String
  sentAt        DateTime    @default(now())
  
  // RELATIONS
  company       Company       @relation(...)
  deal          Deal          @relation(...)
  version       DealVersion   @relation(...)
  contact       Contact       @relation(...)
  pdf           DealPdf?      @relation(...)
  sentBy        User          @relation("DealEmailSender", ...)
  template      EmailTemplate? @relation(...)
  signature     EmailSignature? @relation(...)
  
  @@index([companyId])
  @@index([dealId])
  @@index([contactId])
}
```

### 1.8 DispatchRequest Enhancement

```prisma
model DispatchRequest {
  id                     String                @id @default(cuid())
  companyId              String
  dealId                 String?               // 🆕 Link to Deal
  contactId              String
  dispatcherId           String?
  
  status                 DispatchRequestStatus @default(QUEUED)
  priority               String                @default("standard")
  
  queuedAt               DateTime              @default(now())
  scheduledFor           DateTime?
  
  complianceBlocked      Boolean               @default(false)
  blockReason            String?
  
  // SNAPSHOT FROM APPROVED DEAL
  approvedVersion        Int?                  // Which DealVersion was approved
  contactNameSnapshot    String?
  contactEmailSnapshot   String?
  scopeSummary           String?
  industry               EstimatingCategory?
  subtotal               Decimal?              @db.Decimal(18, 2)
  grandTotal             Decimal?              @db.Decimal(18, 2)
  
  createdAt              DateTime              @default(now())
  updatedAt              DateTime              @updatedAt
  
  // RELATIONS
  company                Company               @relation(...)
  deal                   Deal?                 @relation("DealDispatchHandoff", ...)
  contact                Contact               @relation(...)
  dispatcher             User?                 @relation("DispatchOwner", ...)
  workOrders             WorkOrder[]
  
  @@index([companyId])
  @@index([dealId])
  @@index([status])
}
```

---

## 🔄 PHASE 2: DATA MIGRATION STRATEGY (Day 1-2)

### 2.1 Migration Script Design

**Goal:** Zero data loss, preserve all history

**Approach:**

1. **Backup Production Database**
   - Full PostgreSQL dump
   - Store in GCS with timestamp
   - Verify backup integrity

2. **Create Migration Transaction**
   ```sql
   BEGIN;
   
   -- Step 1: Migrate Estimate → Deal fields
   UPDATE "Deal"
   SET 
     "subtotal" = (SELECT "subtotal" FROM "EstimateRevision" WHERE "EstimateRevision"."estimateId" = "Estimate"."id" AND "Estimate"."dealId" = "Deal"."id" LIMIT 1),
     "grandTotal" = (SELECT "grandTotal" FROM "EstimateRevision" WHERE "EstimateRevision"."estimateId" = "Estimate"."id" AND "Estimate"."dealId" = "Deal"."id" LIMIT 1),
     "approvedAt" = (SELECT "approvedAt" FROM "Estimate" WHERE "Estimate"."dealId" = "Deal"."id"),
     "dispatchedAt" = (SELECT "sentToDispatchAt" FROM "Estimate" WHERE "Estimate"."dealId" = "Deal"."id");
   
   -- Step 2: Migrate EstimateRevision → DealVersion
   INSERT INTO "DealVersion" (
     "id", "dealId", "versionNumber", "status", 
     "createdAt", "submittedAt", "approvedAt",
     "subtotal", "grandTotal", "markupPercent", ...
   )
   SELECT 
     "id", 
     (SELECT "dealId" FROM "Estimate" WHERE "Estimate"."id" = "EstimateRevision"."estimateId"),
     "revisionNumber",
     "status",
     "createdAt", "submittedAt", "approvedAt",
     "subtotal", "grandTotal", "markupPercent", ...
   FROM "EstimateRevision";
   
   -- Step 3: Migrate EstimateLineItem → DealLineItem
   INSERT INTO "DealLineItem" (
     "id", "companyId", "dealId", "versionId",
     "presetId", "presetBaseKey", "presetLabel",
     "description", "quantity", "unit", "unitCost", "lineTotal", ...
   )
   SELECT 
     "id", "companyId",
     (SELECT "dealId" FROM "Estimate" WHERE "Estimate"."id" = "EstimateLineItem"."estimateId"),
     "revisionId",
     "presetId", "presetBaseKey", "presetLabel",
     "description", "quantity", "unit", "unitCost", "lineTotal", ...
   FROM "EstimateLineItem";
   
   -- Step 4: Migrate EstimateDocument → DealPdf
   INSERT INTO "DealPdf" (
     "id", "companyId", "dealId", "versionId", "contactId",
     "kind", "storageKey", "fileName", "fileSize", "hash", ...
   )
   SELECT 
     "id", "companyId",
     (SELECT "dealId" FROM "Estimate" WHERE "Estimate"."id" = "EstimateDocument"."estimateId"),
     "revisionId", "contactId",
     "kind", "storageKey", "fileName", "fileSize", "hash", ...
   FROM "EstimateDocument";
   
   -- Step 5: Migrate EstimateEmail → DealEmail
   INSERT INTO "DealEmail" (
     "id", "companyId", "dealId", "versionId", "contactId",
     "templateId", "signatureId", "toRecipients", "subject", "body", ...
   )
   SELECT 
     "id", "companyId",
     (SELECT "dealId" FROM "Estimate" WHERE "Estimate"."id" = "EstimateEmail"."estimateId"),
     "revisionId", "contactId",
     "templateId", "signatureId", "toRecipients", "subject", "body", ...
   FROM "EstimateEmail";
   
   -- Step 6: Link DispatchRequest to Deal
   UPDATE "DispatchRequest"
   SET "dealId" = (
     SELECT "dealId" FROM "Estimate" WHERE "Estimate"."id" = "DispatchRequest"."estimateId"
   );
   
   -- Step 7: Remove pricing from EstimatingPreset
   ALTER TABLE "EstimatingPreset" DROP COLUMN "defaultUnitCost";
   
   -- Step 8: Drop old Estimate tables (AFTER verification)
   -- DROP TABLE "EstimateEmail";
   -- DROP TABLE "EstimateDocument";
   -- DROP TABLE "EstimateLineItem";
   -- DROP TABLE "EstimateRevision";
   -- DROP TABLE "Estimate";
   
   COMMIT;
   ```

3. **Verification Queries**
   ```sql
   -- Verify all Estimates migrated
   SELECT COUNT(*) FROM "Deal" WHERE "dealId" IS NOT NULL;
   
   -- Verify all line items migrated
   SELECT COUNT(*) FROM "DealLineItem";
   SELECT COUNT(*) FROM "EstimateLineItem"; -- Should match
   
   -- Verify all PDFs migrated
   SELECT COUNT(*) FROM "DealPdf";
   SELECT COUNT(*) FROM "EstimateDocument"; -- Should match
   
   -- Verify no orphaned records
   SELECT COUNT(*) FROM "Estimate" WHERE "dealId" IS NULL;
   ```

4. **Rollback Plan**
   ```sql
   -- If migration fails, restore from backup
   -- pg_restore --clean --if-exists -d crm_production backup_20251231.dump
   ```

### 2.2 Prisma Migration Steps

```bash
# 1. Generate migration
npx prisma migrate dev --name deal_centric_consolidation --create-only

# 2. Review migration SQL
cat prisma/migrations/TIMESTAMP_deal_centric_consolidation/migration.sql

# 3. Test on staging database
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# 4. Verify data integrity
npm run verify-migration

# 5. Apply to production (WITH DOWNTIME)
DATABASE_URL="postgresql://prod..." npx prisma migrate deploy

# 6. Drop old tables (AFTER 7-day verification period)
npx prisma migrate dev --name drop_estimate_tables
```

---

## 🛠️ PHASE 3: STATE MACHINE IMPLEMENTATION (Day 2)

### 3.1 State Transition Functions

**File:** `lib/deals/stateMachine.ts`

```typescript
import { DealStage, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

type TransitionContext = {
  dealId: string
  userId: string
  companyId: string
  reason?: string
  metadata?: Record<string, unknown>
}

// VALID TRANSITIONS
const VALID_TRANSITIONS: Record<DealStage, DealStage[]> = {
  OPEN: ['IN_ESTIMATING', 'LOST', 'NO_BID'],
  IN_ESTIMATING: ['SUBMITTED', 'OPEN', 'LOST', 'NO_BID'],
  SUBMITTED: ['APPROVED_ESTIMATE', 'IN_ESTIMATING', 'LOST', 'NO_BID'],
  APPROVED_ESTIMATE: ['DISPATCHED', 'IN_ESTIMATING'], // Can revise after approval
  DISPATCHED: ['WON', 'LOST'],
  WON: [],
  LOST: [],
  NO_BID: [],
}

export async function transitionDealStage(
  context: TransitionContext,
  targetStage: DealStage
): Promise<void> {
  const deal = await prisma.deal.findUnique({
    where: { id: context.dealId },
    select: { stage: true, companyId: true },
  })

  if (!deal) {
    throw new Error('Deal not found')
  }

  if (deal.companyId !== context.companyId) {
    throw new Error('Forbidden')
  }

  const currentStage = deal.stage
  const validTargets = VALID_TRANSITIONS[currentStage]

  if (!validTargets.includes(targetStage)) {
    throw new Error(
      `Invalid transition: ${currentStage} → ${targetStage}. Valid targets: ${validTargets.join(', ')}`
    )
  }

  // Execute transition
  await prisma.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: context.dealId },
      data: {
        stage: targetStage,
        lastActivityAt: new Date(),
      },
    })

    await logActivity({
      companyId: context.companyId,
      userId: context.userId,
      dealId: context.dealId,
      type: 'DEAL_STAGE_CHANGED',
      subject: `Deal stage changed: ${currentStage} → ${targetStage}`,
      metadata: {
        fromStage: currentStage,
        toStage: targetStage,
        reason: context.reason,
        ...context.metadata,
      },
    })
  })
}

// USER → ESTIMATING TRIGGER
export async function sendDealToEstimating(
  dealId: string,
  userId: string,
  companyId: string,
  estimatorId?: string
): Promise<void> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { stage: true, createdById: true },
  })

  if (!deal) {
    throw new Error('Deal not found')
  }

  // Validate User owns deal or has access
  if (deal.createdById !== userId) {
    // Check if User role has access to this contact
    const contact = await prisma.contact.findFirst({
      where: {
        deals: { some: { id: dealId } },
        createdById: userId,
      },
    })

    if (!contact) {
      throw new Error('You do not have access to this deal')
    }
  }

  if (deal.stage !== DealStage.OPEN) {
    throw new Error('Deal must be in OPEN stage to send to estimating')
  }

  await prisma.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: dealId },
      data: {
        stage: DealStage.IN_ESTIMATING,
        inEstimating: true,
        estimatingStartedAt: new Date(),
        estimatingStartedById: userId,
        assignedToId: estimatorId || null,
        lastActivityAt: new Date(),
      },
    })

    await logActivity({
      companyId,
      userId,
      dealId,
      type: 'DEAL_SENT_TO_ESTIMATING',
      subject: 'Deal sent to estimating',
      metadata: {
        estimatorId,
        triggeredBy: 'user',
      },
    })

    // TODO: Notify estimator
  })
}

// APPROVAL → DISPATCH AUTO-TOGGLE
export async function approveDealEstimate(
  dealId: string,
  approverId: string,
  companyId: string,
  versionId: string
): Promise<void> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      versions: { where: { id: versionId } },
      contact: { select: { firstName: true, lastName: true, email: true } },
    },
  })

  if (!deal) {
    throw new Error('Deal not found')
  }

  if (deal.stage !== DealStage.SUBMITTED) {
    throw new Error('Deal must be in SUBMITTED stage to approve')
  }

  const version = deal.versions[0]
  if (!version) {
    throw new Error('Version not found')
  }

  await prisma.$transaction(async (tx) => {
    // 1. Lock version
    await tx.dealVersion.update({
      where: { id: versionId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: approverId,
        locked: true,
      },
    })

    // 2. Update Deal
    const updatedDeal = await tx.deal.update({
      where: { id: dealId },
      data: {
        stage: DealStage.APPROVED_ESTIMATE,
        approvedVersion: version.versionNumber,
        approvedAt: new Date(),
        approvedById: approverId,
        subtotal: version.subtotal,
        grandTotal: version.grandTotal,
        markupPercent: version.markupPercent,
        markupAmount: version.markupAmount,
        lastActivityAt: new Date(),
      },
    })

    // 3. Generate PDF (deferred to background job)
    // TODO: Queue PDF generation job

    // 4. Create DispatchRequest (AUTO-TOGGLE)
    const dispatchRequest = await tx.dispatchRequest.create({
      data: {
        companyId,
        dealId,
        contactId: deal.contactId,
        approvedVersion: version.versionNumber,
        contactNameSnapshot: `${deal.contact.firstName} ${deal.contact.lastName}`,
        contactEmailSnapshot: deal.contact.email,
        scopeSummary: version.scopeOfWork || deal.description || '',
        subtotal: version.subtotal,
        grandTotal: version.grandTotal,
        status: 'QUEUED',
      },
    })

    // 5. Update Deal with dispatch handoff
    await tx.deal.update({
      where: { id: dealId },
      data: {
        stage: DealStage.DISPATCHED,
        dispatchedAt: new Date(),
        dispatchedById: approverId,
        dispatchRequestId: dispatchRequest.id,
      },
    })

    // 6. Log activities
    await logActivity({
      companyId,
      userId: approverId,
      dealId,
      type: 'DEAL_APPROVED',
      subject: `Deal estimate approved (v${version.versionNumber})`,
      metadata: {
        versionId,
        versionNumber: version.versionNumber,
        grandTotal: version.grandTotal.toString(),
      },
    })

    await logActivity({
      companyId,
      userId: approverId,
      dealId,
      type: 'DEAL_DISPATCHED',
      subject: 'Deal sent to dispatch',
      metadata: {
        dispatchRequestId: dispatchRequest.id,
        autoTriggered: true,
      },
    })

    await logActivity({
      companyId,
      userId: approverId,
      dealId,
      type: 'USER_DELIVERY_ENABLED',
      subject: 'Deal available for User delivery',
      metadata: {
        versionNumber: version.versionNumber,
      },
    })
  })
}
```

---

## 🎨 PHASE 4: UI ROUTES RESTRUCTURE (Day 3)

### 4.1 Route Changes

**OLD ROUTES (DELETE):**
- ❌ `/estimating/[estimateId]/page.tsx`
- ❌ `/estimating/[estimateId]/actions.ts`

**NEW ROUTES (CREATE):**
- ✅ `/crm/deals/[dealId]/estimating/page.tsx` (Estimator/Admin/Owner)
- ✅ `/crm/deals/[dealId]/estimating/actions.ts`
- ✅ `/crm/deals/[dealId]/approved-estimate/page.tsx` (User delivery)

### 4.2 User → Estimating Trigger UI

**File:** `/crm/deals/[dealId]/page.tsx` (User view)

Add button:

```tsx
{deal.stage === 'OPEN' && (
  <form action={sendDealToEstimatingAction}>
    <input type="hidden" name="dealId" value={deal.id} />
    <button type="submit" className="...">
      Send to Estimating
    </button>
  </form>
)}
```

**Action:** `/crm/deals/actions.ts`

```typescript
'use server'

export async function sendDealToEstimatingAction(formData: FormData) {
  const { userId, companyId, role } = await requireCrmUserContext()
  const dealId = formData.get('dealId')?.toString()

  if (!dealId) {
    throw new Error('Deal ID required')
  }

  await sendDealToEstimating(dealId, userId, companyId)

  revalidatePath(`/crm/deals/${dealId}`)
  redirect(`/crm/deals/${dealId}`)
}
```

### 4.3 Estimating Workspace

**File:** `/crm/deals/[dealId]/estimating/page.tsx`

```tsx
import { requireEstimatorContext } from '@/lib/auth/estimatorContext'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'

export default async function DealEstimatingWorkspace({
  params,
}: {
  params: { dealId: string }
}) {
  const { companyId, userId, role } = await requireEstimatorContext()
  
  const deal = await prisma.deal.findFirst({
    where: { id: params.dealId, companyId },
    include: {
      contact: true,
      company: true,
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 1,
        include: {
          lineItems: { orderBy: [{ sortOrder: 'asc' }] },
        },
      },
      lineItems: {
        where: { versionId: null }, // Current working line items
        orderBy: [{ sortOrder: 'asc' }],
      },
    },
  })

  if (!deal) {
    notFound()
  }

  if (!deal.inEstimating) {
    redirect(`/crm/deals/${params.dealId}`)
  }

  const currentVersion = deal.versions[0]

  return (
    <div>
      <header>
        <h1>{deal.name}</h1>
        <p>Contact: {deal.contact.firstName} {deal.contact.lastName}</p>
        <p>Stage: {deal.stage}</p>
        <p>Version: {currentVersion?.versionNumber || 1}</p>
      </header>

      <LineItemEditor 
        dealId={deal.id}
        lineItems={deal.lineItems}
        currentTotal={deal.grandTotal}
      />

      <ApprovalActions dealId={deal.id} stage={deal.stage} />
    </div>
  )
}
```

### 4.4 User Delivery (Post-Approval)

**File:** `/crm/deals/[dealId]/approved-estimate/page.tsx`

```tsx
import { requireCrmUserContext } from '@/lib/auth/crmContext'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function ApprovedEstimateDelivery({
  params,
}: {
  params: { dealId: string }
}) {
  const { companyId, userId } = await requireCrmUserContext()
  
  const deal = await prisma.deal.findFirst({
    where: { 
      id: params.dealId, 
      companyId,
      stage: { in: ['APPROVED_ESTIMATE', 'DISPATCHED', 'WON'] },
    },
    include: {
      contact: true,
      versions: {
        where: { versionNumber: deal.approvedVersion },
        include: {
          pdfs: { where: { kind: 'ESTIMATE' } },
        },
      },
    },
  })

  if (!deal) {
    notFound()
  }

  const approvedVersion = deal.versions[0]
  const pdf = approvedVersion?.pdfs[0]

  return (
    <div>
      <header>
        <h1>Approved Estimate: {deal.name}</h1>
        <p>Contact: {deal.contact.firstName} {deal.contact.lastName}</p>
        <p>Approved: {deal.approvedAt?.toISOString()}</p>
        <p>Total: ${deal.grandTotal}</p>
      </header>

      {pdf && (
        <section>
          <h2>Download PDF</h2>
          <a href={`/api/deals/${deal.id}/pdf/${pdf.id}`} download>
            Download Estimate PDF
          </a>
        </section>
      )}

      <section>
        <h2>Email to Customer</h2>
        <EmailForm dealId={deal.id} pdfId={pdf?.id} />
      </section>

      {/* ❌ NO PRICING EDIT UI */}
      {/* ❌ NO PDF REGENERATION */}
      {/* ❌ NO APPROVAL ACTIONS */}
    </div>
  )
}
```

---

## 📝 PHASE 5: ACTIVITY LOGGING (Day 3)

### 5.1 Required Activity Types

**Add to AccessAuditLog enum:**

```prisma
enum AccessAuditLogAction {
  // ... existing types
  
  // DEAL ESTIMATING EVENTS
  DEAL_SENT_TO_ESTIMATING
  DEAL_STAGE_CHANGED
  DEAL_LINE_ITEM_ADDED
  DEAL_LINE_ITEM_EDITED
  DEAL_LINE_ITEM_REMOVED
  DEAL_PRESET_APPLIED
  DEAL_PRICING_UPDATED
  DEAL_SUBMITTED
  DEAL_APPROVED
  DEAL_REVISED
  DEAL_DISPATCHED
  DEAL_PDF_GENERATED
  DEAL_PDF_DOWNLOADED
  DEAL_EMAIL_SENT
  USER_DELIVERY_ENABLED
}
```

### 5.2 Activity Logger Implementation

**File:** `lib/activity/logger.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

type ActivityLog = {
  companyId: string
  userId: string
  dealId?: string
  contactId?: string
  type: string
  subject: string
  description?: string
  metadata?: Prisma.InputJsonValue
}

export async function logActivity(entry: ActivityLog): Promise<void> {
  await prisma.activity.create({
    data: {
      companyId: entry.companyId,
      userId: entry.userId,
      dealId: entry.dealId,
      contactId: entry.contactId,
      type: entry.type,
      subject: entry.subject,
      description: entry.description,
      metadata: entry.metadata ?? Prisma.JsonNull,
    },
  })

  // Update Deal.lastActivityAt if dealId present
  if (entry.dealId) {
    await prisma.deal.update({
      where: { id: entry.dealId },
      data: { lastActivityAt: new Date() },
    })
  }

  // Update Contact.lastActivityAt if contactId present
  if (entry.contactId) {
    await prisma.contact.update({
      where: { id: entry.contactId },
      data: { lastActivityAt: new Date() },
    })
  }
}

export async function logAccessAudit(entry: {
  companyId: string
  actorId: string
  action: string
  resourceType: string
  resourceId: string
  metadata?: Prisma.InputJsonValue
}): Promise<void> {
  await prisma.accessAuditLog.create({
    data: {
      companyId: entry.companyId,
      actorId: entry.actorId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      metadata: entry.metadata ?? Prisma.JsonNull,
    },
  })
}
```

---

## 🧪 PHASE 6: TESTING STRATEGY (Day 4)

### 6.1 Unit Tests

**File:** `__tests__/deals/stateMachine.test.ts`

```typescript
import { transitionDealStage, sendDealToEstimating, approveDealEstimate } from '@/lib/deals/stateMachine'
import { DealStage } from '@prisma/client'
import { prisma } from '@/lib/prisma'

describe('Deal State Machine', () => {
  it('allows OPEN → IN_ESTIMATING transition', async () => {
    // Test User trigger
  })

  it('blocks invalid transitions', async () => {
    // Test OPEN → DISPATCHED should fail
  })

  it('auto-creates DispatchRequest on approval', async () => {
    // Test approval → dispatch toggle
  })

  it('enables User delivery post-approval', async () => {
    // Test USER_DELIVERY_ENABLED activity
  })
})
```

### 6.2 Integration Tests

**File:** `__tests__/integration/dealEstimatingFlow.test.ts`

```typescript
describe('Full Deal Estimating Flow', () => {
  it('User creates Deal → sends to Estimating → Estimator prices → approves → User downloads PDF', async () => {
    // End-to-end flow
  })
})
```

### 6.3 Data Migration Verification

**File:** `scripts/verifyMigration.ts`

```typescript
import { prisma } from '@/lib/prisma'

async function verifyMigration() {
  // 1. Count migrated records
  const dealCount = await prisma.deal.count()
  const versionCount = await prisma.dealVersion.count()
  const lineItemCount = await prisma.dealLineItem.count()
  const pdfCount = await prisma.dealPdf.count()

  console.log('Migration verification:')
  console.log(`Deals: ${dealCount}`)
  console.log(`Versions: ${versionCount}`)
  console.log(`Line Items: ${lineItemCount}`)
  console.log(`PDFs: ${pdfCount}`)

  // 2. Verify no orphaned records
  const orphanedLineItems = await prisma.dealLineItem.findMany({
    where: { deal: null },
  })

  if (orphanedLineItems.length > 0) {
    throw new Error(`Found ${orphanedLineItems.length} orphaned line items`)
  }

  // 3. Verify pricing totals match
  const dealsWithMismatch = await prisma.$queryRaw`
    SELECT "Deal"."id", "Deal"."grandTotal", SUM("DealLineItem"."lineTotal") AS "calculatedTotal"
    FROM "Deal"
    LEFT JOIN "DealLineItem" ON "DealLineItem"."dealId" = "Deal"."id" AND "DealLineItem"."versionId" IS NULL
    GROUP BY "Deal"."id", "Deal"."grandTotal"
    HAVING ABS("Deal"."grandTotal" - COALESCE(SUM("DealLineItem"."lineTotal"), 0)) > 0.01
  `

  if (dealsWithMismatch.length > 0) {
    console.warn(`Found ${dealsWithMismatch.length} deals with pricing mismatches`)
  }

  console.log('✅ Migration verification complete')
}

verifyMigration()
```

---

## 📦 PHASE 7: ROLLOUT TIMELINE (Day 5)

### 7.1 Deployment Steps

**Day 1: Schema Design + Migration Script**
- [ ] Create new schema models
- [ ] Write migration SQL
- [ ] Test on local database
- [ ] Review with team

**Day 2: Data Migration**
- [ ] Backup production database
- [ ] Run migration on staging
- [ ] Verify data integrity
- [ ] Run performance tests

**Day 3: Code Refactor**
- [ ] Implement state machine
- [ ] Refactor routes
- [ ] Update actions
- [ ] Update dashboards

**Day 4: Testing**
- [ ] Unit tests
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Performance tests

**Day 5: Production Deployment**
- [ ] Schedule maintenance window (2-hour downtime)
- [ ] Backup production database
- [ ] Run migration
- [ ] Deploy new code
- [ ] Verify functionality
- [ ] Monitor for 24 hours

**Day 6-12: Monitoring Period**
- [ ] Monitor error logs
- [ ] Verify user flows
- [ ] Fix critical bugs
- [ ] Collect feedback

**Day 13: Drop Old Tables**
- [ ] Final verification
- [ ] Drop Estimate* tables
- [ ] Clean up old routes
- [ ] Update documentation

---

## 🚨 RISKS & MITIGATION

### Risk 1: Data Loss During Migration

**Mitigation:**
- Full database backup before migration
- Transaction-based migration (rollback on error)
- 7-day verification period before dropping old tables
- Keep old tables as `_legacy_estimate` for 30 days

### Risk 2: Route Breaking Changes

**Mitigation:**
- Implement 301 redirects from old routes
- Add deprecation warnings
- Update all internal links
- Notify users of URL changes

### Risk 3: Performance Degradation

**Mitigation:**
- Add indexes on new fields
- Optimize queries
- Monitor query performance
- Scale database if needed

### Risk 4: User Confusion (UI Changes)

**Mitigation:**
- In-app notifications
- Updated help docs
- Training videos
- Support readiness

---

## ✅ SUCCESS CRITERIA

Migration is SUCCESSFUL if:

- ✅ Zero data loss
- ✅ All historical records migrated
- ✅ All PDFs accessible
- ✅ User → Estimating trigger works
- ✅ Approval → Dispatch auto-toggle works
- ✅ User delivery (post-approval) works
- ✅ State machine prevents invalid transitions
- ✅ Activity logging comprehensive
- ✅ Presets have NO pricing fields
- ✅ No Estimate entity exists
- ✅ All routes use `/crm/deals/[dealId]/*`
- ✅ Performance meets SLA (<500ms page load)
- ✅ Zero critical bugs for 7 days

---

## 📊 MONITORING & VALIDATION

### Metrics to Track

**Pre-Migration:**
- Total Estimate records
- Total EstimateRevision records
- Total EstimateLineItem records
- Total EstimateDocument records
- Average page load time

**Post-Migration:**
- Total Deal records with `inEstimating=true`
- Total DealVersion records
- Total DealLineItem records
- Total DealPdf records
- Average page load time
- Error rate
- User satisfaction (surveys)

**Weekly Review:**
- Data integrity checks
- Performance benchmarks
- User feedback analysis
- Bug resolution rate

---

## 🔒 FINAL APPROVAL CHECKLIST

Before deploying to production:

- [ ] Schema reviewed by tech lead
- [ ] Migration script tested on staging
- [ ] Data integrity verified
- [ ] All tests passing (unit + integration)
- [ ] Performance benchmarks met
- [ ] Rollback plan documented
- [ ] Stakeholders notified
- [ ] Support team trained
- [ ] Documentation updated
- [ ] Maintenance window scheduled
- [ ] Backup verified
- [ ] Final sign-off from product owner

---

**Migration Plan Status:** READY FOR REVIEW  
**Estimated Timeline:** 5 days implementation + 7 days verification  
**Total Effort:** 12 days  
**Risk Level:** HIGH (breaking changes, data migration)  
**Recommendation:** Proceed with phased rollout on staging first

-- ============================================================================
-- DEAL-CENTRIC ESTIMATING MIGRATION — SCHEMA ENHANCEMENT
-- T-REX AI OS — FINAL v4 API MASTER CONTRACT
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE DealStage ENUM
-- ============================================================================

CREATE TYPE "DealStage" AS ENUM (
  'OPEN',
  'IN_ESTIMATING',
  'SUBMITTED',
  'APPROVED_ESTIMATE',
  'DISPATCHED',
  'WON',
  'LOST',
  'NO_BID'
);

-- ============================================================================
-- STEP 2: CREATE LineItemCategory ENUM (if not exists)
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LineItemCategory') THEN
    CREATE TYPE "LineItemCategory" AS ENUM (
      'LABOR',
      'MATERIAL',
      'EQUIPMENT',
      'SUBCONTRACTOR',
      'OVERHEAD',
      'OTHER'
    );
  END IF;
END$$;

-- ============================================================================
-- STEP 3: ADD NEW FIELDS TO Deal TABLE
-- ============================================================================

-- Estimating mode tracking
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "inEstimating" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "estimatingStartedAt" TIMESTAMP(3);
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "estimatingStartedById" TEXT;

-- Approval tracking
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;

-- Dispatch handoff tracking
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP(3);
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "dispatchedById" TEXT;

-- Financials (server-calculated)
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "taxes" DECIMAL(12,2);
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "total" DECIMAL(12,2) DEFAULT 0;

-- Activity tracking
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3) DEFAULT NOW();

-- Stage management (will be updated after migration)
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "newStage" "DealStage" DEFAULT 'OPEN';

-- ============================================================================
-- STEP 4: ENHANCE DealVersion TABLE (IMMUTABILITY)
-- ============================================================================

ALTER TABLE "DealVersion" DROP COLUMN IF EXISTS "approvedAt";
ALTER TABLE "DealVersion" DROP COLUMN IF EXISTS "approvedBy";
ALTER TABLE "DealVersion" DROP COLUMN IF EXISTS "totalValue";

-- Financial snapshot (immutable)
ALTER TABLE "DealVersion" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "DealVersion" ADD COLUMN IF NOT EXISTS "taxes" DECIMAL(12,2);
ALTER TABLE "DealVersion" ADD COLUMN IF NOT EXISTS "total" DECIMAL(12,2) DEFAULT 0;

-- Approval metadata (immutable)
ALTER TABLE "DealVersion" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "DealVersion" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;

-- Revision tracking
ALTER TABLE "DealVersion" ADD COLUMN IF NOT EXISTS "revisionReason" TEXT;

-- Lock flag (prevents modification after approval)
ALTER TABLE "DealVersion" ADD COLUMN IF NOT EXISTS "locked" BOOLEAN DEFAULT FALSE;

-- Metadata
ALTER TABLE "DealVersion" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT NOW();
ALTER TABLE "DealVersion" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- ============================================================================
-- STEP 5: ENHANCE DealLineItem TABLE
-- ============================================================================

ALTER TABLE "DealLineItem" DROP COLUMN IF EXISTS "unitPrice";
ALTER TABLE "DealLineItem" DROP COLUMN IF EXISTS "totalPrice";

-- Pricing fields (exact naming per spec)
ALTER TABLE "DealLineItem" ADD COLUMN IF NOT EXISTS "unitCost" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "DealLineItem" ADD COLUMN IF NOT EXISTS "lineTotal" DECIMAL(12,2) DEFAULT 0;

-- Category (enum)
ALTER TABLE "DealLineItem" ADD COLUMN IF NOT EXISTS "category" "LineItemCategory" DEFAULT 'LABOR';

-- Additional taxonomy
ALTER TABLE "DealLineItem" ADD COLUMN IF NOT EXISTS "phase" TEXT;
ALTER TABLE "DealLineItem" ADD COLUMN IF NOT EXISTS "discipline" TEXT;

-- Visibility controls
ALTER TABLE "DealLineItem" ADD COLUMN IF NOT EXISTS "customerVisible" BOOLEAN DEFAULT TRUE;
ALTER TABLE "DealLineItem" ADD COLUMN IF NOT EXISTS "internalOnly" BOOLEAN DEFAULT FALSE;

-- Sort order
ALTER TABLE "DealLineItem" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER DEFAULT 0;

-- ============================================================================
-- STEP 6: ENHANCE DealPdf TABLE (IMMUTABILITY FOR DISPATCH)
-- ============================================================================

ALTER TABLE "DealPdf" DROP COLUMN IF EXISTS "fileName";
ALTER TABLE "DealPdf" DROP COLUMN IF EXISTS "fileUrl";
ALTER TABLE "DealPdf" DROP COLUMN IF EXISTS "fileSize";
ALTER TABLE "DealPdf" DROP COLUMN IF EXISTS "generatedAt";

-- Immutable PDF artifact
ALTER TABLE "DealPdf" ADD COLUMN IF NOT EXISTS "dealVersionId" TEXT;
ALTER TABLE "DealPdf" ADD COLUMN IF NOT EXISTS "hash" TEXT;
ALTER TABLE "DealPdf" ADD COLUMN IF NOT EXISTS "storageKey" TEXT;
ALTER TABLE "DealPdf" ADD COLUMN IF NOT EXISTS "generatedById" TEXT;
ALTER TABLE "DealPdf" ADD COLUMN IF NOT EXISTS "generatedAt" TIMESTAMP(3) DEFAULT NOW();

-- ============================================================================
-- STEP 7: CREATE DispatchHandoff TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "DispatchHandoff" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "dealId" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT NOW(),
  CONSTRAINT "DispatchHandoff_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE,
  CONSTRAINT "DispatchHandoff_dealVersionId_fkey" FOREIGN KEY ("dealVersionId") REFERENCES "DealVersion"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DispatchHandoff_dealId_key" ON "DispatchHandoff"("dealId");
CREATE INDEX IF NOT EXISTS "DispatchHandoff_dealVersionId_idx" ON "DispatchHandoff"("dealVersionId");

-- ============================================================================
-- STEP 8: ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'Deal_estimatingStartedById_fkey'
  ) THEN
    ALTER TABLE "Deal" ADD CONSTRAINT "Deal_estimatingStartedById_fkey" 
      FOREIGN KEY ("estimatingStartedById") REFERENCES "User"("id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'Deal_approvedById_fkey'
  ) THEN
    ALTER TABLE "Deal" ADD CONSTRAINT "Deal_approvedById_fkey" 
      FOREIGN KEY ("approvedById") REFERENCES "User"("id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'Deal_dispatchedById_fkey'
  ) THEN
    ALTER TABLE "Deal" ADD CONSTRAINT "Deal_dispatchedById_fkey" 
      FOREIGN KEY ("dispatchedById") REFERENCES "User"("id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'DealVersion_approvedById_fkey'
  ) THEN
    ALTER TABLE "DealVersion" ADD CONSTRAINT "DealVersion_approvedById_fkey" 
      FOREIGN KEY ("approvedById") REFERENCES "User"("id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'DealVersion_createdById_fkey'
  ) THEN
    ALTER TABLE "DealVersion" ADD CONSTRAINT "DealVersion_createdById_fkey" 
      FOREIGN KEY ("createdById") REFERENCES "User"("id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'DealPdf_dealVersionId_fkey'
  ) THEN
    ALTER TABLE "DealPdf" ADD CONSTRAINT "DealPdf_dealVersionId_fkey" 
      FOREIGN KEY ("dealVersionId") REFERENCES "DealVersion"("id") ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'DealPdf_generatedById_fkey'
  ) THEN
    ALTER TABLE "DealPdf" ADD CONSTRAINT "DealPdf_generatedById_fkey" 
      FOREIGN KEY ("generatedById") REFERENCES "User"("id");
  END IF;
END$$;

-- ============================================================================
-- STEP 9: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS "Deal_newStage_idx" ON "Deal"("newStage");
CREATE INDEX IF NOT EXISTS "Deal_inEstimating_idx" ON "Deal"("inEstimating");
CREATE INDEX IF NOT EXISTS "Deal_estimatingStartedById_idx" ON "Deal"("estimatingStartedById");
CREATE INDEX IF NOT EXISTS "Deal_approvedById_idx" ON "Deal"("approvedById");
CREATE INDEX IF NOT EXISTS "Deal_dispatchedById_idx" ON "Deal"("dispatchedById");
CREATE INDEX IF NOT EXISTS "Deal_lastActivityAt_idx" ON "Deal"("lastActivityAt");

CREATE INDEX IF NOT EXISTS "DealVersion_locked_idx" ON "DealVersion"("locked");
CREATE INDEX IF NOT EXISTS "DealVersion_approvedById_idx" ON "DealVersion"("approvedById");
CREATE INDEX IF NOT EXISTS "DealVersion_createdById_idx" ON "DealVersion"("createdById");

CREATE INDEX IF NOT EXISTS "DealLineItem_category_idx" ON "DealLineItem"("category");
CREATE INDEX IF NOT EXISTS "DealLineItem_sortOrder_idx" ON "DealLineItem"("sortOrder");

CREATE INDEX IF NOT EXISTS "DealPdf_dealVersionId_idx" ON "DealPdf"("dealVersionId");
CREATE INDEX IF NOT EXISTS "DealPdf_generatedById_idx" ON "DealPdf"("generatedById");
CREATE INDEX IF NOT EXISTS "DealPdf_hash_idx" ON "DealPdf"("hash");

-- ============================================================================
-- STEP 10: UPDATE Activity TYPES (ADD NEW EVENTS)
-- ============================================================================

-- Add new activity types to AccessAuditAction enum
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'DEAL_SENT_TO_ESTIMATING';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'DEAL_STAGE_CHANGED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'DEAL_LINE_ITEM_ADDED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'DEAL_LINE_ITEM_UPDATED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'DEAL_LINE_ITEM_DELETED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'DEAL_SUBMITTED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'DEAL_APPROVED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'DEAL_DISPATCHED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'USER_DELIVERY_ENABLED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'DEAL_VERSION_CREATED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'DEAL_PDF_GENERATED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'DISPATCH_HANDOFF_CREATED';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE "Deal" IS 'Deal is the ONLY estimating object - no Estimate entity';
COMMENT ON TABLE "DealVersion" IS 'Immutable version history - locked after approval';
COMMENT ON TABLE "DealLineItem" IS 'Line items belong to Deal versions - pricing controlled by Estimator';
COMMENT ON TABLE "DealPdf" IS 'Immutable PDF artifacts - Dispatch can READ, cannot EDIT';
COMMENT ON TABLE "DispatchHandoff" IS 'Approval auto-creates handoff - enables Dispatch work order creation';

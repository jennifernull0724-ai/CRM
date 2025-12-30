-- Add estimating preset audit actions
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'ESTIMATING_PRESET_CREATED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'ESTIMATING_PRESET_UPDATED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'ESTIMATING_PRESET_REORDERED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'ESTIMATING_PRESET_DISABLED';

-- Add preset category snapshot to line items
ALTER TABLE "EstimateLineItem" ADD COLUMN IF NOT EXISTS "presetCategory" "EstimatePresetIndustry" NOT NULL DEFAULT 'BASE';

-- Backfill with existing preset industry snapshots
UPDATE "EstimateLineItem"
SET "presetCategory" = "presetIndustry"
WHERE "presetCategory" = 'BASE';

-- Require explicit category on future writes
ALTER TABLE "EstimateLineItem" ALTER COLUMN "presetCategory" DROP DEFAULT;

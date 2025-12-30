-- Rename returned status to RETURNED_TO_USER (Prisma name only; DB value remains REVISION_REQUIRED)
-- No SQL changes required for enum because mapped value is unchanged.

-- Add approvedRevisionNumber to estimates
ALTER TABLE "Estimate" ADD COLUMN IF NOT EXISTS "approvedRevisionNumber" INTEGER;

-- Dispatch intake snapshots
ALTER TABLE "DispatchRequest" ADD COLUMN IF NOT EXISTS "approvedRevisionNumber" INTEGER;
ALTER TABLE "DispatchRequest" ADD COLUMN IF NOT EXISTS "contactNameSnapshot" TEXT;
ALTER TABLE "DispatchRequest" ADD COLUMN IF NOT EXISTS "contactEmailSnapshot" TEXT;
ALTER TABLE "DispatchRequest" ADD COLUMN IF NOT EXISTS "scopeSummary" TEXT;
ALTER TABLE "DispatchRequest" ADD COLUMN IF NOT EXISTS "industry" "EstimateIndustry";
ALTER TABLE "DispatchRequest" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(18, 2);
ALTER TABLE "DispatchRequest" ADD COLUMN IF NOT EXISTS "grandTotal" DECIMAL(18, 2);

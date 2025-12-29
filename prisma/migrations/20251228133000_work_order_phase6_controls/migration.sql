-- Expand work order status lifecycle
ALTER TYPE "WorkOrderStatus" RENAME TO "WorkOrderStatus_old";

CREATE TYPE "WorkOrderStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

ALTER TABLE "WorkOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WorkOrder"
  ALTER COLUMN "status" TYPE "WorkOrderStatus"
  USING CASE
    WHEN "status"::text = 'OPEN' THEN 'SCHEDULED'::"WorkOrderStatus"
    WHEN "status"::text = 'IN_PROGRESS' THEN 'IN_PROGRESS'::"WorkOrderStatus"
    ELSE 'COMPLETED'::"WorkOrderStatus"
  END;
ALTER TABLE "WorkOrder" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP TYPE "WorkOrderStatus_old";

-- Normalize lifecycle timestamps for migrated rows
UPDATE "WorkOrder"
SET "scheduledAt" = COALESCE("scheduledAt", "createdAt")
WHERE "status" IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED');

UPDATE "WorkOrder"
SET "startedAt" = COALESCE("startedAt", "scheduledAt", "createdAt")
WHERE "status" IN ('IN_PROGRESS', 'COMPLETED');

UPDATE "WorkOrder"
SET "completedAt" = COALESCE("completedAt", "closedAt", "updatedAt"),
    "closedAt" = COALESCE("closedAt", COALESCE("completedAt", "updatedAt"))
WHERE "status" = 'COMPLETED';

-- Timeline + audit support
CREATE TYPE "WorkOrderActivityType" AS ENUM (
  'STATUS_CHANGED',
  'EMPLOYEE_ASSIGNED',
  'EMPLOYEE_UNASSIGNED',
  'COMPLIANCE_OVERRIDE',
  'ASSET_ASSIGNED',
  'ASSET_REMOVED',
  'NOTE_ADDED',
  'NOTE_UPDATED',
  'DOCUMENT_UPLOADED',
  'PDF_GENERATED',
  'EMAIL_SENT'
);

CREATE TABLE "WorkOrderActivity" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" "WorkOrderActivityType" NOT NULL,
  "previousStatus" "WorkOrderStatus",
  "newStatus" "WorkOrderStatus",
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkOrderActivity_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkOrderActivity"
  ADD CONSTRAINT "WorkOrderActivity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkOrderActivity"
  ADD CONSTRAINT "WorkOrderActivity_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkOrderActivity"
  ADD CONSTRAINT "WorkOrderActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "WorkOrderActivity_companyId_idx" ON "WorkOrderActivity"("companyId");
CREATE INDEX "WorkOrderActivity_workOrderId_createdAt_idx" ON "WorkOrderActivity"("workOrderId", "createdAt");

-- Audit event for status transitions
ALTER TYPE "AccessAuditAction" ADD VALUE 'WORKORDER_STATUS_CHANGED';

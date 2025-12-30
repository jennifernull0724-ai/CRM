ALTER TYPE "AccessAuditAction" ADD VALUE 'WORKORDER_NOTE_ADDED';
ALTER TYPE "AccessAuditAction" ADD VALUE 'WORKORDER_NOTE_UPDATED';

ALTER TABLE "WorkOrder"
  ADD COLUMN "operationsNotes" TEXT,
  ADD COLUMN "gateAccessCode" TEXT,
  ADD COLUMN "onsitePocName" TEXT,
  ADD COLUMN "onsitePocPhone" TEXT,
  ADD COLUMN "specialInstructions" TEXT;

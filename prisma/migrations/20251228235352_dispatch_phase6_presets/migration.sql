/*
	Warnings:

	- Added the required column `nameSnapshot` to the `WorkOrderPreset` table without a default value. This is not possible if the table is not empty.
	- Added the required column `scopeSnapshot` to the `WorkOrderPreset` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AccessAuditAction" ADD VALUE 'DISPATCH_RECEIVED_ESTIMATE';
ALTER TYPE "AccessAuditAction" ADD VALUE 'DISPATCH_RECEIVED_QUOTE';
ALTER TYPE "AccessAuditAction" ADD VALUE 'DISPATCH_PRESET_APPLIED';
ALTER TYPE "AccessAuditAction" ADD VALUE 'DISPATCH_PRESET_UPDATED';
ALTER TYPE "AccessAuditAction" ADD VALUE 'DISPATCH_PRESET_REORDERED';
ALTER TYPE "AccessAuditAction" ADD VALUE 'WORKORDER_CREATED';
ALTER TYPE "AccessAuditAction" ADD VALUE 'BLANK_WORKORDER_CREATED';
ALTER TYPE "AccessAuditAction" ADD VALUE 'CONTACT_LINKED_TO_WORKORDER';
ALTER TYPE "AccessAuditAction" ADD VALUE 'WORKORDER_STATUS_UPDATED';
ALTER TYPE "AccessAuditAction" ADD VALUE 'EMPLOYEE_BLOCKED_BY_COMPLIANCE';
ALTER TYPE "AccessAuditAction" ADD VALUE 'COMPLIANCE_OVERRIDE_APPLIED';
ALTER TYPE "AccessAuditAction" ADD VALUE 'COMPLIANCE_CHECK_FAILED';
ALTER TYPE "AccessAuditAction" ADD VALUE 'WORKORDER_RETURNED_TO_USER';
ALTER TYPE "AccessAuditAction" ADD VALUE 'DOCUMENT_UPLOADED';

-- AlterTable
ALTER TABLE "DispatchPreset" ADD COLUMN     "defaultScope" TEXT,
ADD COLUMN     "suggestedDisciplines" JSONB,
ADD COLUMN     "suggestedEquipment" JSONB;

-- AlterTable
ALTER TABLE "WorkOrderPreset" ADD COLUMN     "defaultNotesSnapshot" TEXT,
ADD COLUMN     "defaultScopeSnapshot" TEXT,
ADD COLUMN     "descriptionSnapshot" TEXT,
ADD COLUMN     "isOtherSnapshot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedSnapshot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nameSnapshot" TEXT NOT NULL,
ADD COLUMN     "scopeSnapshot" "DispatchPresetScope" NOT NULL,
ADD COLUMN     "suggestedDisciplinesSnapshot" JSONB,
ADD COLUMN     "suggestedEquipmentSnapshot" JSONB;

/*
  Warnings:

  - You are about to drop the column `missingProof` on the `ComplianceCertification` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CompanyComplianceDocumentCategory" AS ENUM ('INSURANCE', 'POLICIES', 'PROGRAMS', 'RAILROAD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AccessAuditAction" ADD VALUE 'WORKORDER_EMPLOYEE_ASSIGNED';
ALTER TYPE "AccessAuditAction" ADD VALUE 'WORKORDER_COMPLIANCE_OVERRIDE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ComplianceActivityType" ADD VALUE 'EMPLOYEE_CREATED';
ALTER TYPE "ComplianceActivityType" ADD VALUE 'EMPLOYEE_DEACTIVATED';
ALTER TYPE "ComplianceActivityType" ADD VALUE 'EMPLOYEE_REACTIVATED';
ALTER TYPE "ComplianceActivityType" ADD VALUE 'DOC_UPLOADED';
ALTER TYPE "ComplianceActivityType" ADD VALUE 'DOC_VERSIONED';

-- DropForeignKey
ALTER TABLE "ComplianceActivity" DROP CONSTRAINT "ComplianceActivity_employeeId_fkey";

-- AlterTable
ALTER TABLE "ComplianceActivity" ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "certificationId" TEXT,
ADD COLUMN     "companyDocumentId" TEXT,
ADD COLUMN     "companyDocumentVersionId" TEXT,
ADD COLUMN     "companyId" TEXT,
ALTER COLUMN "employeeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ComplianceCertification" DROP COLUMN "missingProof";

-- AlterTable
ALTER TABLE "ComplianceEmployee" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "WorkOrderAssignment" ADD COLUMN     "assignedById" TEXT,
ADD COLUMN     "complianceSnapshotHash" TEXT,
ADD COLUMN     "complianceSnapshotId" TEXT,
ADD COLUMN     "complianceStatus" "ComplianceStatus",
ADD COLUMN     "gapSummary" JSONB,
ADD COLUMN     "notifiedAt" TIMESTAMP(3),
ADD COLUMN     "overrideAcknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overrideActorId" TEXT,
ADD COLUMN     "overrideAt" TIMESTAMP(3),
ADD COLUMN     "overrideReason" TEXT;

-- CreateTable
CREATE TABLE "CompanyComplianceDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "category" "CompanyComplianceDocumentCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyComplianceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyComplianceDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "gcsObjectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyComplianceDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyComplianceDocument_companyId_category_idx" ON "CompanyComplianceDocument"("companyId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyComplianceDocumentVersion_documentId_versionNumber_key" ON "CompanyComplianceDocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "ComplianceActivity_companyId_idx" ON "ComplianceActivity"("companyId");

-- CreateIndex
CREATE INDEX "WorkOrderAssignment_workOrderId_unassignedAt_idx" ON "WorkOrderAssignment"("workOrderId", "unassignedAt");

-- AddForeignKey
ALTER TABLE "CompanyComplianceDocument" ADD CONSTRAINT "CompanyComplianceDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyComplianceDocument" ADD CONSTRAINT "CompanyComplianceDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyComplianceDocumentVersion" ADD CONSTRAINT "CompanyComplianceDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CompanyComplianceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyComplianceDocumentVersion" ADD CONSTRAINT "CompanyComplianceDocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceActivity" ADD CONSTRAINT "ComplianceActivity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceActivity" ADD CONSTRAINT "ComplianceActivity_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ComplianceEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceActivity" ADD CONSTRAINT "ComplianceActivity_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "ComplianceCertification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceActivity" ADD CONSTRAINT "ComplianceActivity_companyDocumentId_fkey" FOREIGN KEY ("companyDocumentId") REFERENCES "CompanyComplianceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceActivity" ADD CONSTRAINT "ComplianceActivity_companyDocumentVersionId_fkey" FOREIGN KEY ("companyDocumentVersionId") REFERENCES "CompanyComplianceDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceActivity" ADD CONSTRAINT "ComplianceActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAssignment" ADD CONSTRAINT "WorkOrderAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAssignment" ADD CONSTRAINT "WorkOrderAssignment_overrideActorId_fkey" FOREIGN KEY ("overrideActorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAssignment" ADD CONSTRAINT "WorkOrderAssignment_complianceSnapshotId_fkey" FOREIGN KEY ("complianceSnapshotId") REFERENCES "ComplianceSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

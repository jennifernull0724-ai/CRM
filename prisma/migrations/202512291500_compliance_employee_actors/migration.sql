-- AlterEnum
ALTER TYPE "ComplianceActivityType" ADD VALUE 'EMPLOYEE_UPDATED';

-- AlterTable
ALTER TABLE "ComplianceEmployee" ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "updatedById" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ComplianceSnapshot" ADD COLUMN     "failureReasons" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "ComplianceEmployee_companyId_createdById_idx" ON "ComplianceEmployee"("companyId", "createdById");

-- CreateIndex
CREATE INDEX "ComplianceEmployee_companyId_updatedById_idx" ON "ComplianceEmployee"("companyId", "updatedById");

-- AddForeignKey
ALTER TABLE "ComplianceEmployee" ADD CONSTRAINT "ComplianceEmployee_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEmployee" ADD CONSTRAINT "ComplianceEmployee_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


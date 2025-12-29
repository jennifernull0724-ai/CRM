-- CreateEnum
CREATE TYPE "WorkOrderDiscipline" AS ENUM ('CONSTRUCTION', 'RAILROAD', 'ENVIRONMENTAL');

-- AlterTable
ALTER TABLE "WorkOrder"
ADD COLUMN     "estimateId" TEXT,
ADD COLUMN     "discipline" "WorkOrderDiscipline" NOT NULL DEFAULT 'CONSTRUCTION',
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- Data migration: backfill estimate references
UPDATE "WorkOrder" AS w
SET "estimateId" = dr."estimateId"
FROM "DispatchRequest" AS dr
WHERE w."dispatchRequestId" = dr."id"
  AND dr."estimateId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "WorkOrder_estimateId_idx" ON "WorkOrder"("estimateId");
CREATE INDEX "WorkOrder_companyId_discipline_idx" ON "WorkOrder"("companyId", "discipline");

-- AddForeignKey
ALTER TABLE "WorkOrder"
ADD CONSTRAINT "WorkOrder_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

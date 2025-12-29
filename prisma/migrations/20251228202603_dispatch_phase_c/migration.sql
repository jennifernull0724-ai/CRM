-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('IN_SERVICE', 'OUT_OF_SERVICE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AccessAuditAction" ADD VALUE 'WORKORDER_ASSET_ASSIGNED';
ALTER TYPE "AccessAuditAction" ADD VALUE 'WORKORDER_ASSET_REMOVED';

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'IN_SERVICE',
    "lastKnownLocation" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderAssetAssignment" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "assignedById" TEXT,
    "removedById" TEXT,
    "statusAtAssignment" "AssetStatus" NOT NULL,
    "assetNameSnapshot" TEXT NOT NULL,
    "assetTypeSnapshot" TEXT NOT NULL,
    "unitNumberSnapshot" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "WorkOrderAssetAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asset_companyId_status_idx" ON "Asset"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_companyId_unitNumber_key" ON "Asset"("companyId", "unitNumber");

-- CreateIndex
CREATE INDEX "WorkOrderAssetAssignment_workOrderId_idx" ON "WorkOrderAssetAssignment"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderAssetAssignment_assetId_removedAt_idx" ON "WorkOrderAssetAssignment"("assetId", "removedAt");

-- CreateIndex
CREATE INDEX "WorkOrderAssetAssignment_workOrderId_removedAt_idx" ON "WorkOrderAssetAssignment"("workOrderId", "removedAt");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAssetAssignment" ADD CONSTRAINT "WorkOrderAssetAssignment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAssetAssignment" ADD CONSTRAINT "WorkOrderAssetAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAssetAssignment" ADD CONSTRAINT "WorkOrderAssetAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAssetAssignment" ADD CONSTRAINT "WorkOrderAssetAssignment_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

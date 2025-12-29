/*
  Warnings:

  - You are about to drop the column `lastKnownLocation` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `unitNumber` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `unitNumberSnapshot` on the `WorkOrderAssetAssignment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companyId,assetNumber]` on the table `Asset` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `assetName` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assetNumber` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assetNumberSnapshot` to the `WorkOrderAssetAssignment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AccessAuditAction" ADD VALUE 'ASSET_CREATED';
ALTER TYPE "AccessAuditAction" ADD VALUE 'ASSET_UPDATED';
ALTER TYPE "AccessAuditAction" ADD VALUE 'ASSET_STATUS_CHANGED';
ALTER TYPE "AccessAuditAction" ADD VALUE 'ASSET_ASSIGNED_TO_WORKORDER';
ALTER TYPE "AccessAuditAction" ADD VALUE 'ASSET_REMOVED_FROM_WORKORDER';

-- AlterEnum
ALTER TYPE "AssetStatus" ADD VALUE 'MAINTENANCE';

-- DropIndex
DROP INDEX "Asset_companyId_unitNumber_key";

-- AlterTable
ALTER TABLE "Asset" RENAME COLUMN "name" TO "assetName";
ALTER TABLE "Asset" RENAME COLUMN "unitNumber" TO "assetNumber";
ALTER TABLE "Asset" RENAME COLUMN "lastKnownLocation" TO "location";

ALTER TABLE "Asset"
  ADD COLUMN     "subType" TEXT,
  ADD COLUMN     "createdById" TEXT;

UPDATE "Asset" a
SET "createdById" = (
  SELECT u.id
  FROM "User" u
  WHERE u."companyId" = a."companyId"
  ORDER BY u."createdAt" ASC
  LIMIT 1
)
WHERE "createdById" IS NULL;

UPDATE "Asset"
SET "createdById" = (
  SELECT u.id
  FROM "User" u
  ORDER BY u."createdAt" ASC
  LIMIT 1
)
WHERE "createdById" IS NULL;

ALTER TABLE "Asset"
  ALTER COLUMN "createdById" SET NOT NULL;

-- AlterTable
ALTER TABLE "WorkOrderAssetAssignment" RENAME COLUMN "unitNumberSnapshot" TO "assetNumberSnapshot";

-- CreateIndex
CREATE UNIQUE INDEX "Asset_companyId_assetNumber_key" ON "Asset"("companyId", "assetNumber");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

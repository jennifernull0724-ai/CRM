-- CreateEnum
CREATE TYPE "DispatchPresetScope" AS ENUM ('BASE', 'CONSTRUCTION', 'RAILROAD', 'ENVIRONMENTAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkOrderActivityType" ADD VALUE 'DISPATCH_PRESET_ADDED';
ALTER TYPE "WorkOrderActivityType" ADD VALUE 'DISPATCH_PRESET_REMOVED';
ALTER TYPE "WorkOrderActivityType" ADD VALUE 'DISPATCH_PRESET_NOTE_UPDATED';

-- CreateTable
CREATE TABLE "DispatchPreset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "scope" "DispatchPresetScope" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultNotes" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "isOther" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderPreset" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "overriddenNotes" TEXT,
    "addedById" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DispatchPreset_companyId_scope_sortOrder_idx" ON "DispatchPreset"("companyId", "scope", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchPreset_companyId_scope_name_key" ON "DispatchPreset"("companyId", "scope", "name");

-- CreateIndex
CREATE INDEX "WorkOrderPreset_presetId_idx" ON "WorkOrderPreset"("presetId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderPreset_workOrderId_presetId_key" ON "WorkOrderPreset"("workOrderId", "presetId");

-- AddForeignKey
ALTER TABLE "DispatchPreset" ADD CONSTRAINT "DispatchPreset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPreset" ADD CONSTRAINT "WorkOrderPreset_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPreset" ADD CONSTRAINT "WorkOrderPreset_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "DispatchPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPreset" ADD CONSTRAINT "WorkOrderPreset_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

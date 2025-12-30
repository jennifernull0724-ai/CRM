CREATE TABLE "WorkOrderDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksumHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkOrderDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkOrderPdf" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "generatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkOrderPdf_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkOrderPdf_workOrderId_version_key" ON "WorkOrderPdf"("workOrderId", "version");
CREATE INDEX "WorkOrderDocument_companyId_idx" ON "WorkOrderDocument"("companyId");
CREATE INDEX "WorkOrderDocument_workOrderId_idx" ON "WorkOrderDocument"("workOrderId");
CREATE INDEX "WorkOrderDocument_uploadedById_idx" ON "WorkOrderDocument"("uploadedById");
CREATE INDEX "WorkOrderDocument_createdAt_idx" ON "WorkOrderDocument"("createdAt");
CREATE INDEX "WorkOrderPdf_companyId_idx" ON "WorkOrderPdf"("companyId");
CREATE INDEX "WorkOrderPdf_generatedById_idx" ON "WorkOrderPdf"("generatedById");

ALTER TABLE "WorkOrderDocument"
  ADD CONSTRAINT "WorkOrderDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkOrderDocument"
  ADD CONSTRAINT "WorkOrderDocument_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkOrderDocument"
  ADD CONSTRAINT "WorkOrderDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkOrderPdf"
  ADD CONSTRAINT "WorkOrderPdf_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkOrderPdf"
  ADD CONSTRAINT "WorkOrderPdf_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkOrderPdf"
  ADD CONSTRAINT "WorkOrderPdf_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

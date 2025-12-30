-- CreateEnum
CREATE TYPE "BidDocumentCategory" AS ENUM (
  'PLANS',
  'SPECIFICATIONS',
  'ADDENDA',
  'RFP_IFB',
  'CLARIFICATIONS',
  'CUSTOMER_PROVIDED',
  'SUBCONTRACTOR',
  'SITE_INSTRUCTIONS',
  'ACCESS_DETAILS',
  'SAMPLING_PLAN',
  'HISTORICAL_REPORT',
  'REGULATORY',
  'DAILY_LOG',
  'PHOTO',
  'OTHER'
);

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "sentToEstimatingAt" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "DealBidDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "category" "BidDocumentCategory" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksumHash" TEXT NOT NULL,
    "uploadedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealBidDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DealBidDocument" ADD CONSTRAINT "DealBidDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealBidDocument" ADD CONSTRAINT "DealBidDocument_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealBidDocument" ADD CONSTRAINT "DealBidDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "DealBidDocument_companyId_idx" ON "DealBidDocument"("companyId");
CREATE INDEX "DealBidDocument_dealId_idx" ON "DealBidDocument"("dealId");
CREATE INDEX "DealBidDocument_uploadedById_idx" ON "DealBidDocument"("uploadedById");
CREATE INDEX "DealBidDocument_uploadedAt_idx" ON "DealBidDocument"("uploadedAt");

-- Update existing enum for audit logging
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'DEAL_BID_DOCUMENT_UPLOADED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'DEAL_BID_DOCUMENT_DOWNLOADED';
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'DEAL_BID_DOCUMENT_EMAILED';

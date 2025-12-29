-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "sentToDispatchById" TEXT;

-- CreateIndex
CREATE INDEX "Estimate_sentToDispatchById_idx" ON "Estimate"("sentToDispatchById");

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_sentToDispatchById_fkey" FOREIGN KEY ("sentToDispatchById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

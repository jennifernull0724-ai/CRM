-- Add qrToken column for compliance employees
ALTER TABLE "ComplianceEmployee" ADD COLUMN "qrToken" TEXT;

-- Populate existing employees with deterministic unique tokens
UPDATE "ComplianceEmployee"
SET "qrToken" = md5("id" || '-' || random()::text || clock_timestamp()::text)
WHERE "qrToken" IS NULL;

-- Enforce non-null and uniqueness
ALTER TABLE "ComplianceEmployee" ALTER COLUMN "qrToken" SET NOT NULL;
CREATE UNIQUE INDEX "ComplianceEmployee_qrToken_key" ON "ComplianceEmployee"("qrToken");

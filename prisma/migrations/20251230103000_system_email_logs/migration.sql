-- Append-only system email audit log
CREATE TABLE "SystemEmailLog" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "formType" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "sender" TEXT NOT NULL,
  "payload" JSONB,
  "success" BOOLEAN NOT NULL,
  "errorMessage" TEXT,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemEmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SystemEmailLog_eventType_idx" ON "SystemEmailLog" ("eventType");
CREATE INDEX "SystemEmailLog_formType_idx" ON "SystemEmailLog" ("formType");
CREATE INDEX "SystemEmailLog_success_idx" ON "SystemEmailLog" ("success");

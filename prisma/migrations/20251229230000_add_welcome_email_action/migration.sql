-- Add WELCOME_EMAIL_SENT action for onboarding audit logging
ALTER TYPE "AccessAuditAction" ADD VALUE IF NOT EXISTS 'WELCOME_EMAIL_SENT';

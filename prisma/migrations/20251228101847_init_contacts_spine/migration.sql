-- CreateEnum
CREATE TYPE "PlanKey" AS ENUM ('starter', 'growth', 'pro', 'enterprise');

-- CreateEnum
CREATE TYPE "CompanyKind" AS ENUM ('account', 'client');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('PASS', 'FAIL', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('PASS', 'FAIL', 'EXPIRED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "ComplianceCategory" AS ENUM ('BASE', 'RAILROAD', 'CONSTRUCTION', 'ENVIRONMENTAL');

-- CreateEnum
CREATE TYPE "ComplianceActivityType" AS ENUM ('CERT_ADDED', 'CERT_IMAGE_UPLOADED', 'CERT_IMAGE_VERSIONED', 'CERT_EXPIRED', 'SNAPSHOT_CREATED', 'QR_GENERATED', 'COMPLIANCE_PRINTED', 'COMPLIANCE_EXPORTED');

-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'SENT_TO_DISPATCH', 'REVISION_REQUIRED');

-- CreateEnum
CREATE TYPE "EstimateIndustry" AS ENUM ('RAIL', 'CONSTRUCTION', 'ENVIRONMENTAL');

-- CreateEnum
CREATE TYPE "EstimateDocumentKind" AS ENUM ('ESTIMATE', 'QUOTE');

-- CreateEnum
CREATE TYPE "ContactActivityState" AS ENUM ('NEW', 'ACTIVE', 'STALE', 'AT_RISK');

-- CreateEnum
CREATE TYPE "ContactCallDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "ContactMeetingType" AS ENUM ('DISCOVERY', 'REVIEW', 'SITE_VISIT', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactSocialPlatform" AS ENUM ('LINKEDIN', 'X', 'INSTAGRAM', 'FIELD', 'OTHER');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "EstimatePresetIndustry" AS ENUM ('BASE', 'RAILROAD', 'CONSTRUCTION', 'ENVIRONMENTAL');

-- CreateEnum
CREATE TYPE "DispatchRequestStatus" AS ENUM ('QUEUED', 'PENDING_ASSIGNMENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "AccessAuditAction" AS ENUM ('INVITE_CREATED', 'INVITE_REVOKED', 'INVITE_ACCEPTED', 'ROLE_CHANGED', 'USER_DISABLED', 'USER_ENABLED', 'INVITE_TOGGLE_UPDATED', 'DISPATCH_REASSIGNED', 'WORK_ORDER_CLOSED', 'COMPLIANCE_OVERRIDE_APPROVED', 'COMPLIANCE_POLICY_UPDATED', 'WORK_ORDER_MANUAL_CREATED', 'ESTIMATE_APPROVED', 'ESTIMATE_CREATED', 'ESTIMATE_UPDATED', 'ESTIMATE_RETURNED_TO_USER', 'CONTACT_CREATED', 'CONTACT_UPDATED', 'TASK_CREATED', 'TASK_UPDATED', 'TASK_COMPLETED', 'NOTE_ADDED', 'CALL_LOGGED', 'MEETING_LOGGED', 'SOCIAL_LOGGED', 'ESTIMATE_REQUESTED', 'ESTIMATE_VIEWED', 'ESTIMATE_EMAILED', 'ESTIMATE_SENT_TO_DISPATCH', 'PDF_GENERATED', 'EMAIL_SENT', 'EMAIL_RECEIVED', 'EMAIL_ATTACHMENT_UPLOADED', 'EMAIL_RECEIVED_UNLINKED', 'EMAIL_LINKED_TO_CONTACT', 'MENTION_CREATED', 'DEAL_CREATED_FROM_CONTACT', 'WORKORDER_CREATED_FROM_CONTACT', 'EMAIL_SETTINGS_CHANGED', 'EMAIL_PROVIDER_CONNECTED', 'EMAIL_PROVIDER_DISCONNECTED', 'EMAIL_TEMPLATE_CREATED', 'EMAIL_TEMPLATE_UPDATED', 'EMAIL_TEMPLATE_DELETED', 'EMAIL_TEMPLATE_DEFAULT_SET', 'EMAIL_SIGNATURE_CREATED', 'EMAIL_SIGNATURE_UPDATED', 'EMAIL_SIGNATURE_DELETED', 'EMAIL_SIGNATURE_ACTIVATED', 'EMAIL_RECIPIENT_TOGGLED', 'LOGO_UPLOADED', 'LOGO_UPDATED', 'CUSTOM_ACTIVITY_LOGGED');

-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('gmail', 'outlook');

-- CreateEnum
CREATE TYPE "EmailTemplateScope" AS ENUM ('crm', 'estimating', 'dispatch', 'work_orders', 'global');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "password" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "subscriptionStatus" TEXT DEFAULT 'trial',
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "kind" "CompanyKind" NOT NULL DEFAULT 'client',
    "planKey" "PlanKey" NOT NULL DEFAULT 'starter',
    "starterStartedAt" TIMESTAMP(3),
    "starterExpiresAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "mobile" TEXT,
    "jobTitle" TEXT,
    "derivedCompanyName" TEXT NOT NULL DEFAULT '',
    "companyOverrideName" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activityState" "ContactActivityState" NOT NULL DEFAULT 'NEW',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'New',
    "pipeline" TEXT NOT NULL DEFAULT 'Main',
    "value" DOUBLE PRECISION,
    "probability" INTEGER,
    "closeDate" TIMESTAMP(3),
    "lostReason" TEXT,
    "contactId" TEXT NOT NULL,
    "companyId" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealVersion" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "description" TEXT,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealLineItem" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealPdf" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealPdf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealEmail" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "cc" TEXT,
    "bcc" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'sent',

    CONSTRAINT "DealEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "contactId" TEXT NOT NULL,
    "dealId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "notes" TEXT,
    "contactId" TEXT NOT NULL,
    "dealId" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mentions" TEXT,
    "contactId" TEXT NOT NULL,
    "dealId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactCall" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "direction" "ContactCallDirection" NOT NULL,
    "result" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "notes" TEXT,
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMeeting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "meetingType" "ContactMeetingType" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "attendees" JSONB,
    "outcome" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSocialTouch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "platform" "ContactSocialPlatform" NOT NULL,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSocialTouch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "EmailProvider" NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "displayName" TEXT,
    "label" TEXT,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "scopes" JSONB,
    "syncCursor" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',
    "syncError" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "deauthorizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOAuthState" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "EmailProvider" NOT NULL,
    "state" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "scopes" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "provider" "EmailProvider" NOT NULL,
    "direction" "EmailDirection" NOT NULL,
    "subject" TEXT NOT NULL,
    "snippet" TEXT,
    "bodyHtml" TEXT,
    "bodyText" TEXT,
    "fromAddress" TEXT NOT NULL,
    "replyToAddress" TEXT,
    "toAddresses" JSONB NOT NULL,
    "ccAddresses" JSONB,
    "bccAddresses" JSONB,
    "threadId" TEXT,
    "messageId" TEXT NOT NULL,
    "externalId" TEXT,
    "references" JSONB,
    "authorId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT DEFAULT 'recorded',
    "error" TEXT,
    "requiresContactResolution" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAttachment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "accountId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER,
    "storageKey" TEXT NOT NULL,
    "externalId" TEXT,
    "checksum" TEXT,
    "isInline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailIngestionQueue" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "syncCursor" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailIngestionQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceEmployee" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "complianceStatus" "ComplianceStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "lastVerifiedAt" TIMESTAMP(3),
    "complianceHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceCertification" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "presetKey" TEXT,
    "customName" TEXT,
    "category" "ComplianceCategory" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "CertificationStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "missingProof" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceCertificationImage" (
    "id" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceCertificationImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceActivity" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "ComplianceActivityType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceSnapshot" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ComplianceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceQrToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceQrToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompliancePreset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "category" "ComplianceCategory" NOT NULL,
    "baseKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "isOther" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompliancePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dealId" TEXT,
    "contactId" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "currentRevisionId" TEXT,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "currentRevisionNumber" INTEGER NOT NULL DEFAULT 1,
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "sentToDispatchAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateRevision" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedById" TEXT,
    "approvedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "quoteNumber" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "projectLocation" TEXT,
    "industry" "EstimateIndustry" NOT NULL,
    "scopeOfWork" TEXT NOT NULL,
    "assumptions" TEXT,
    "exclusions" TEXT,
    "contactNameSnapshot" TEXT NOT NULL,
    "contactEmailSnapshot" TEXT,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "markupPercent" DECIMAL(5,2),
    "markupAmount" DECIMAL(18,2),
    "overheadPercent" DECIMAL(5,2),
    "overheadAmount" DECIMAL(18,2),
    "grandTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "manualOverrideTotal" DECIMAL(18,2),
    "overrideReason" TEXT,
    "pricingNotes" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimatingPreset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "baseKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "defaultDescription" TEXT NOT NULL,
    "defaultUnit" TEXT NOT NULL,
    "defaultUnitCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "industry" "EstimatePresetIndustry" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isOther" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimatingPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateLineItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "presetBaseKey" TEXT NOT NULL,
    "presetLabel" TEXT NOT NULL,
    "presetIndustry" "EstimatePresetIndustry" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "kind" "EstimateDocumentKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateEmail" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "templateId" TEXT,
    "signatureId" TEXT,
    "toRecipients" JSONB NOT NULL,
    "ccRecipients" JSONB,
    "bccRecipients" JSONB,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentById" TEXT NOT NULL,
    "pdfDocumentId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "estimateId" TEXT,
    "contactId" TEXT NOT NULL,
    "dispatcherId" TEXT,
    "status" "DispatchRequestStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" TEXT NOT NULL DEFAULT 'standard',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" TIMESTAMP(3),
    "complianceBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dispatchRequestId" TEXT,
    "contactId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'OPEN',
    "manualEntry" BOOLEAN NOT NULL DEFAULT false,
    "complianceBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "overrideApproved" BOOLEAN NOT NULL DEFAULT false,
    "overrideApprovedById" TEXT,
    "overrideApprovedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderAssignment" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "WorkOrderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvite" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessAuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "actorId" TEXT,
    "targetUserId" TEXT,
    "targetInviteId" TEXT,
    "action" "AccessAuditAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scope" "EmailTemplateScope" NOT NULL DEFAULT 'global',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSignature" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailRecipientPreference" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sendEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailRecipientPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Contact_companyId_archived_idx" ON "Contact"("companyId", "archived");

-- CreateIndex
CREATE INDEX "Contact_ownerId_idx" ON "Contact"("ownerId");

-- CreateIndex
CREATE INDEX "Contact_companyId_isSystem_idx" ON "Contact"("companyId", "isSystem");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_companyId_email_key" ON "Contact"("companyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "DealVersion_dealId_version_key" ON "DealVersion"("dealId", "version");

-- CreateIndex
CREATE INDEX "DealPdf_contactId_idx" ON "DealPdf"("contactId");

-- CreateIndex
CREATE INDEX "DealEmail_contactId_idx" ON "DealEmail"("contactId");

-- CreateIndex
CREATE INDEX "Activity_companyId_idx" ON "Activity"("companyId");

-- CreateIndex
CREATE INDEX "Activity_contactId_idx" ON "Activity"("contactId");

-- CreateIndex
CREATE INDEX "Activity_dealId_idx" ON "Activity"("dealId");

-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_completed_idx" ON "Task"("completed");

-- CreateIndex
CREATE INDEX "Task_contactId_idx" ON "Task"("contactId");

-- CreateIndex
CREATE INDEX "Note_contactId_idx" ON "Note"("contactId");

-- CreateIndex
CREATE INDEX "ContactCall_companyId_idx" ON "ContactCall"("companyId");

-- CreateIndex
CREATE INDEX "ContactCall_contactId_idx" ON "ContactCall"("contactId");

-- CreateIndex
CREATE INDEX "ContactCall_createdById_idx" ON "ContactCall"("createdById");

-- CreateIndex
CREATE INDEX "ContactCall_happenedAt_idx" ON "ContactCall"("happenedAt");

-- CreateIndex
CREATE INDEX "ContactMeeting_companyId_idx" ON "ContactMeeting"("companyId");

-- CreateIndex
CREATE INDEX "ContactMeeting_contactId_idx" ON "ContactMeeting"("contactId");

-- CreateIndex
CREATE INDEX "ContactMeeting_createdById_idx" ON "ContactMeeting"("createdById");

-- CreateIndex
CREATE INDEX "ContactMeeting_scheduledFor_idx" ON "ContactMeeting"("scheduledFor");

-- CreateIndex
CREATE INDEX "ContactSocialTouch_companyId_idx" ON "ContactSocialTouch"("companyId");

-- CreateIndex
CREATE INDEX "ContactSocialTouch_contactId_idx" ON "ContactSocialTouch"("contactId");

-- CreateIndex
CREATE INDEX "ContactSocialTouch_createdById_idx" ON "ContactSocialTouch"("createdById");

-- CreateIndex
CREATE INDEX "ContactSocialTouch_occurredAt_idx" ON "ContactSocialTouch"("occurredAt");

-- CreateIndex
CREATE INDEX "EmailAccount_companyId_idx" ON "EmailAccount"("companyId");

-- CreateIndex
CREATE INDEX "EmailAccount_userId_idx" ON "EmailAccount"("userId");

-- CreateIndex
CREATE INDEX "EmailAccount_provider_idx" ON "EmailAccount"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAccount_companyId_emailAddress_key" ON "EmailAccount"("companyId", "emailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOAuthState_state_key" ON "EmailOAuthState"("state");

-- CreateIndex
CREATE INDEX "EmailOAuthState_companyId_idx" ON "EmailOAuthState"("companyId");

-- CreateIndex
CREATE INDEX "EmailOAuthState_provider_idx" ON "EmailOAuthState"("provider");

-- CreateIndex
CREATE INDEX "EmailOAuthState_expiresAt_idx" ON "EmailOAuthState"("expiresAt");

-- CreateIndex
CREATE INDEX "Email_companyId_idx" ON "Email"("companyId");

-- CreateIndex
CREATE INDEX "Email_contactId_sentAt_idx" ON "Email"("contactId", "sentAt");

-- CreateIndex
CREATE INDEX "Email_accountId_sentAt_idx" ON "Email"("accountId", "sentAt");

-- CreateIndex
CREATE INDEX "Email_authorId_idx" ON "Email"("authorId");

-- CreateIndex
CREATE INDEX "Email_direction_idx" ON "Email"("direction");

-- CreateIndex
CREATE INDEX "Email_threadId_idx" ON "Email"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "Email_companyId_messageId_key" ON "Email"("companyId", "messageId");

-- CreateIndex
CREATE INDEX "EmailAttachment_companyId_idx" ON "EmailAttachment"("companyId");

-- CreateIndex
CREATE INDEX "EmailAttachment_contactId_idx" ON "EmailAttachment"("contactId");

-- CreateIndex
CREATE INDEX "EmailAttachment_emailId_idx" ON "EmailAttachment"("emailId");

-- CreateIndex
CREATE INDEX "EmailIngestionQueue_companyId_idx" ON "EmailIngestionQueue"("companyId");

-- CreateIndex
CREATE INDEX "EmailIngestionQueue_accountId_idx" ON "EmailIngestionQueue"("accountId");

-- CreateIndex
CREATE INDEX "EmailIngestionQueue_runAt_idx" ON "EmailIngestionQueue"("runAt");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceEmployee_employeeId_key" ON "ComplianceEmployee"("employeeId");

-- CreateIndex
CREATE INDEX "ComplianceCertification_employeeId_idx" ON "ComplianceCertification"("employeeId");

-- CreateIndex
CREATE INDEX "ComplianceCertificationImage_uploadedById_idx" ON "ComplianceCertificationImage"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceCertificationImage_certificationId_version_key" ON "ComplianceCertificationImage"("certificationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceDocument_employeeId_version_key" ON "ComplianceDocument"("employeeId", "version");

-- CreateIndex
CREATE INDEX "ComplianceActivity_employeeId_idx" ON "ComplianceActivity"("employeeId");

-- CreateIndex
CREATE INDEX "ComplianceActivity_type_idx" ON "ComplianceActivity"("type");

-- CreateIndex
CREATE INDEX "ComplianceSnapshot_employeeId_idx" ON "ComplianceSnapshot"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceQrToken_token_key" ON "ComplianceQrToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceQrToken_snapshotId_key" ON "ComplianceQrToken"("snapshotId");

-- CreateIndex
CREATE INDEX "CompliancePreset_companyId_category_idx" ON "CompliancePreset"("companyId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "CompliancePreset_companyId_category_baseKey_key" ON "CompliancePreset"("companyId", "category", "baseKey");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_dealId_key" ON "Estimate"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_quoteNumber_key" ON "Estimate"("quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_currentRevisionId_key" ON "Estimate"("currentRevisionId");

-- CreateIndex
CREATE INDEX "Estimate_companyId_idx" ON "Estimate"("companyId");

-- CreateIndex
CREATE INDEX "Estimate_contactId_idx" ON "Estimate"("contactId");

-- CreateIndex
CREATE INDEX "EstimateRevision_submittedById_idx" ON "EstimateRevision"("submittedById");

-- CreateIndex
CREATE INDEX "EstimateRevision_approvedById_idx" ON "EstimateRevision"("approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateRevision_estimateId_revisionNumber_key" ON "EstimateRevision"("estimateId", "revisionNumber");

-- CreateIndex
CREATE INDEX "EstimatingPreset_companyId_industry_idx" ON "EstimatingPreset"("companyId", "industry");

-- CreateIndex
CREATE UNIQUE INDEX "EstimatingPreset_companyId_baseKey_key" ON "EstimatingPreset"("companyId", "baseKey");

-- CreateIndex
CREATE INDEX "EstimateLineItem_companyId_idx" ON "EstimateLineItem"("companyId");

-- CreateIndex
CREATE INDEX "EstimateLineItem_estimateId_idx" ON "EstimateLineItem"("estimateId");

-- CreateIndex
CREATE INDEX "EstimateLineItem_revisionId_idx" ON "EstimateLineItem"("revisionId");

-- CreateIndex
CREATE INDEX "EstimateDocument_companyId_idx" ON "EstimateDocument"("companyId");

-- CreateIndex
CREATE INDEX "EstimateDocument_estimateId_kind_idx" ON "EstimateDocument"("estimateId", "kind");

-- CreateIndex
CREATE INDEX "EstimateDocument_contactId_idx" ON "EstimateDocument"("contactId");

-- CreateIndex
CREATE INDEX "EstimateEmail_companyId_idx" ON "EstimateEmail"("companyId");

-- CreateIndex
CREATE INDEX "EstimateEmail_contactId_idx" ON "EstimateEmail"("contactId");

-- CreateIndex
CREATE INDEX "DispatchRequest_companyId_idx" ON "DispatchRequest"("companyId");

-- CreateIndex
CREATE INDEX "DispatchRequest_contactId_idx" ON "DispatchRequest"("contactId");

-- CreateIndex
CREATE INDEX "DispatchRequest_status_idx" ON "DispatchRequest"("status");

-- CreateIndex
CREATE INDEX "WorkOrder_companyId_idx" ON "WorkOrder"("companyId");

-- CreateIndex
CREATE INDEX "WorkOrder_contactId_idx" ON "WorkOrder"("contactId");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- CreateIndex
CREATE INDEX "WorkOrderAssignment_employeeId_idx" ON "WorkOrderAssignment"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvite_token_key" ON "UserInvite"("token");

-- CreateIndex
CREATE INDEX "UserInvite_companyId_idx" ON "UserInvite"("companyId");

-- CreateIndex
CREATE INDEX "AccessAuditLog_companyId_idx" ON "AccessAuditLog"("companyId");

-- CreateIndex
CREATE INDEX "AccessAuditLog_action_idx" ON "AccessAuditLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_companyId_key_key" ON "SystemSetting"("companyId", "key");

-- CreateIndex
CREATE INDEX "EmailTemplate_companyId_scope_idx" ON "EmailTemplate"("companyId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_companyId_name_key" ON "EmailTemplate"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "EmailRecipientPreference_companyId_email_key" ON "EmailRecipientPreference"("companyId", "email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealVersion" ADD CONSTRAINT "DealVersion_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealLineItem" ADD CONSTRAINT "DealLineItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealLineItem" ADD CONSTRAINT "DealLineItem_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "DealVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealPdf" ADD CONSTRAINT "DealPdf_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealPdf" ADD CONSTRAINT "DealPdf_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "DealVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealPdf" ADD CONSTRAINT "DealPdf_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealEmail" ADD CONSTRAINT "DealEmail_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealEmail" ADD CONSTRAINT "DealEmail_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCall" ADD CONSTRAINT "ContactCall_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCall" ADD CONSTRAINT "ContactCall_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCall" ADD CONSTRAINT "ContactCall_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMeeting" ADD CONSTRAINT "ContactMeeting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMeeting" ADD CONSTRAINT "ContactMeeting_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMeeting" ADD CONSTRAINT "ContactMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSocialTouch" ADD CONSTRAINT "ContactSocialTouch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSocialTouch" ADD CONSTRAINT "ContactSocialTouch_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSocialTouch" ADD CONSTRAINT "ContactSocialTouch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailOAuthState" ADD CONSTRAINT "EmailOAuthState_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailOAuthState" ADD CONSTRAINT "EmailOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAttachment" ADD CONSTRAINT "EmailAttachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAttachment" ADD CONSTRAINT "EmailAttachment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAttachment" ADD CONSTRAINT "EmailAttachment_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAttachment" ADD CONSTRAINT "EmailAttachment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailIngestionQueue" ADD CONSTRAINT "EmailIngestionQueue_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailIngestionQueue" ADD CONSTRAINT "EmailIngestionQueue_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEmployee" ADD CONSTRAINT "ComplianceEmployee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceCertification" ADD CONSTRAINT "ComplianceCertification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ComplianceEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceCertificationImage" ADD CONSTRAINT "ComplianceCertificationImage_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "ComplianceCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceCertificationImage" ADD CONSTRAINT "ComplianceCertificationImage_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ComplianceEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceActivity" ADD CONSTRAINT "ComplianceActivity_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ComplianceEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceSnapshot" ADD CONSTRAINT "ComplianceSnapshot_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ComplianceEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceSnapshot" ADD CONSTRAINT "ComplianceSnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceQrToken" ADD CONSTRAINT "ComplianceQrToken_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ComplianceEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceQrToken" ADD CONSTRAINT "ComplianceQrToken_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ComplianceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompliancePreset" ADD CONSTRAINT "CompliancePreset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_currentRevisionId_fkey" FOREIGN KEY ("currentRevisionId") REFERENCES "EstimateRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateRevision" ADD CONSTRAINT "EstimateRevision_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateRevision" ADD CONSTRAINT "EstimateRevision_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateRevision" ADD CONSTRAINT "EstimateRevision_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimatingPreset" ADD CONSTRAINT "EstimatingPreset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "EstimateRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "EstimatingPreset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateDocument" ADD CONSTRAINT "EstimateDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateDocument" ADD CONSTRAINT "EstimateDocument_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateDocument" ADD CONSTRAINT "EstimateDocument_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "EstimateRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateDocument" ADD CONSTRAINT "EstimateDocument_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateDocument" ADD CONSTRAINT "EstimateDocument_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateEmail" ADD CONSTRAINT "EstimateEmail_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateEmail" ADD CONSTRAINT "EstimateEmail_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateEmail" ADD CONSTRAINT "EstimateEmail_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "EstimateRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateEmail" ADD CONSTRAINT "EstimateEmail_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateEmail" ADD CONSTRAINT "EstimateEmail_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateEmail" ADD CONSTRAINT "EstimateEmail_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "EmailSignature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateEmail" ADD CONSTRAINT "EstimateEmail_pdfDocumentId_fkey" FOREIGN KEY ("pdfDocumentId") REFERENCES "EstimateDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateEmail" ADD CONSTRAINT "EstimateEmail_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchRequest" ADD CONSTRAINT "DispatchRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchRequest" ADD CONSTRAINT "DispatchRequest_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchRequest" ADD CONSTRAINT "DispatchRequest_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchRequest" ADD CONSTRAINT "DispatchRequest_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_dispatchRequestId_fkey" FOREIGN KEY ("dispatchRequestId") REFERENCES "DispatchRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_overrideApprovedById_fkey" FOREIGN KEY ("overrideApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAssignment" ADD CONSTRAINT "WorkOrderAssignment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAssignment" ADD CONSTRAINT "WorkOrderAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ComplianceEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAuditLog" ADD CONSTRAINT "AccessAuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAuditLog" ADD CONSTRAINT "AccessAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAuditLog" ADD CONSTRAINT "AccessAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAuditLog" ADD CONSTRAINT "AccessAuditLog_targetInviteId_fkey" FOREIGN KEY ("targetInviteId") REFERENCES "UserInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSignature" ADD CONSTRAINT "EmailSignature_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSignature" ADD CONSTRAINT "EmailSignature_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailRecipientPreference" ADD CONSTRAINT "EmailRecipientPreference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

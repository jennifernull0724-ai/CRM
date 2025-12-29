'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GOVERNANCE_ROLES, type GovernanceRole } from '@/lib/dashboard/governance'
import { getInviteToggle, setInviteToggle, updateCompliancePolicies, type CompliancePolicies } from '@/lib/system/settings'
import { enforceCanUseEmailIntegration } from '@/lib/billing/enforcement'
import type { AccessAuditAction, EmailProvider, EmailTemplateScope, WorkOrderStatus } from '@prisma/client'
import { randomUUID } from 'crypto'
import { transitionWorkOrderStatus, assertWorkOrderMutable } from '@/lib/dispatch/workOrderLifecycle'
import { recordWorkOrderActivity } from '@/lib/dispatch/workOrderActivity'

const DAY = 24 * 60 * 60 * 1000
const EMAIL_PROVIDERS: EmailProvider[] = ['gmail', 'outlook', 'custom']
const EMAIL_TEMPLATE_SCOPES: EmailTemplateScope[] = ['crm', 'estimating', 'dispatch', 'work_orders', 'global']
const WORK_ORDER_STATUS_VALUES: WorkOrderStatus[] = ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

function revalidateDashboards() {
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
}

async function requireOwnerOrAdmin() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    throw new Error('Unauthorized')
  }

  const normalizedRole = session.user.role.toLowerCase()

  if (!['owner', 'admin'].includes(normalizedRole)) {
    throw new Error('Insufficient role')
  }

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: normalizedRole,
    isOwner: normalizedRole === 'owner',
  }
}

async function logAccessAction(
  companyId: string,
  actorId: string,
  action: AccessAuditAction,
  extras?: { targetUserId?: string; targetInviteId?: string; metadata?: Record<string, unknown> }
) {
  await prisma.accessAuditLog.create({
    data: {
      companyId,
      actorId,
      action,
      targetUserId: extras?.targetUserId,
      targetInviteId: extras?.targetInviteId,
      metadata: extras?.metadata,
    },
  })
}

function assertRole(role: string): asserts role is GovernanceRole {
  if (!GOVERNANCE_ROLES.includes(role as GovernanceRole)) {
    throw new Error('Invalid role specified')
  }
}

function assertTemplateScope(scope: string): asserts scope is EmailTemplateScope {
  if (!EMAIL_TEMPLATE_SCOPES.includes(scope as EmailTemplateScope)) {
    throw new Error('Invalid template scope specified')
  }
}

function parseMetadataInput(value?: string): Record<string, unknown> | undefined {
  if (!value) {
    return undefined
  }

  try {
    return JSON.parse(value)
  } catch {
    return { note: value }
  }
}

export async function inviteUserAction(formData: FormData) {
  const { companyId, userId, role } = await requireOwnerOrAdmin()

  const emailRaw = formData.get('email')?.toString().trim().toLowerCase()
  const roleRaw = formData.get('role')?.toString().trim().toLowerCase()

  if (!emailRaw || !roleRaw) {
    throw new Error('Email and role are required')
  }

  assertRole(roleRaw)

  const allowedRoles: GovernanceRole[] = role === 'owner' ? GOVERNANCE_ROLES : ['estimator', 'user', 'dispatch']
  if (!allowedRoles.includes(roleRaw as GovernanceRole)) {
    throw new Error('You are not allowed to invite that role')
  }

  const invitesEnabled = await getInviteToggle(companyId)

  if (!invitesEnabled) {
    throw new Error('Invites are currently disabled')
  }

  const existingUser = await prisma.user.findFirst({ where: { email: emailRaw, companyId } })
  if (existingUser) {
    throw new Error('User already exists in this workspace')
  }

  const existingInvite = await prisma.userInvite.findFirst({ where: { email: emailRaw, companyId, revokedAt: null, acceptedAt: null } })
  if (existingInvite) {
    throw new Error('An active invite already exists for this email')
  }

  const invite = await prisma.userInvite.create({
    data: {
      companyId,
      email: emailRaw,
      role: roleRaw,
      token: randomUUID(),
      invitedById: userId,
      expiresAt: new Date(Date.now() + 7 * DAY),
    },
  })

  await logAccessAction(companyId, userId, 'INVITE_CREATED', {
    targetInviteId: invite.id,
    metadata: { email: invite.email, role: invite.role },
  })

  revalidateDashboards()
}

export async function updateInviteToggleAction(formData: FormData) {
  const { companyId, userId, role } = await requireOwnerOrAdmin()
  if (role !== 'owner') {
    throw new Error('Only owners can toggle global invites')
  }
  const enabled = formData.get('enabled')?.toString() === 'true'
  await setInviteToggle(companyId, enabled, userId)
  await logAccessAction(companyId, userId, 'INVITE_TOGGLE_UPDATED', {
    metadata: { enabled },
  })
  revalidateDashboards()
}

export async function updateUserRoleAction(formData: FormData) {
  const { companyId, userId, isOwner } = await requireOwnerOrAdmin()
  const targetUserId = formData.get('userId')?.toString()
  const nextRoleRaw = formData.get('role')?.toString().trim().toLowerCase()

  if (!targetUserId || !nextRoleRaw) {
    throw new Error('Missing user or role data')
  }

  assertRole(nextRoleRaw)

  if (nextRoleRaw === 'owner' && !isOwner) {
    throw new Error('Only owners can assign owner role')
  }

  const targetUser = await prisma.user.findFirst({ where: { id: targetUserId, companyId } })
  if (!targetUser) {
    throw new Error('User not found')
  }

  const targetRole = targetUser.role.toLowerCase()

  if (targetRole === 'owner' && !isOwner) {
    throw new Error('Admins cannot modify owner accounts')
  }

  if (!isOwner && ['owner', 'admin'].includes(nextRoleRaw)) {
    throw new Error('Admins can only reassign estimator/user/dispatch roles')
  }

  if (!isOwner && ['owner', 'admin'].includes(targetRole)) {
    throw new Error('Admins cannot modify this account')
  }

  if (targetUser.id === userId && targetRole === 'owner' && nextRoleRaw !== 'owner') {
    throw new Error('Owners cannot demote themselves from this panel')
  }

  if (targetUser.role === nextRoleRaw) {
    return
  }

  await prisma.user.update({ where: { id: targetUserId }, data: { role: nextRoleRaw } })
  await logAccessAction(companyId, userId, 'ROLE_CHANGED', {
    targetUserId,
    metadata: { from: targetUser.role, to: nextRoleRaw },
  })
  revalidateDashboards()
}

export async function setUserDisabledAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  const targetUserId = formData.get('userId')?.toString()
  const disabled = formData.get('disabled')?.toString() === 'true'

  if (!targetUserId) {
    throw new Error('Missing target user')
  }

  const targetUser = await prisma.user.findFirst({ where: { id: targetUserId, companyId } })
  if (!targetUser) {
    throw new Error('User not found')
  }

  if (targetUser.id === userId) {
    throw new Error('You cannot change your own access state')
  }

  if (targetUser.role.toLowerCase() === 'owner') {
    throw new Error('Owners cannot be disabled')
  }

  await prisma.user.update({ where: { id: targetUserId }, data: { disabled } })
  await logAccessAction(companyId, userId, disabled ? 'USER_DISABLED' : 'USER_ENABLED', {
    targetUserId,
  })
  revalidateDashboards()
}

export async function reassignDispatchOwnerAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  const dispatchRequestId = formData.get('dispatchRequestId')?.toString()
  const dispatcherId = formData.get('dispatcherId')?.toString()

  if (!dispatchRequestId || !dispatcherId) {
    throw new Error('Dispatch request and dispatcher are required')
  }

  const [request, dispatcher] = await Promise.all([
    prisma.dispatchRequest.findFirst({ where: { id: dispatchRequestId, companyId } }),
    prisma.user.findFirst({ where: { id: dispatcherId, companyId } }),
  ])

  if (!request) {
    throw new Error('Dispatch request not found')
  }

  if (!dispatcher) {
    throw new Error('Dispatcher not found')
  }

  await prisma.dispatchRequest.update({
    where: { id: dispatchRequestId },
    data: { dispatcherId },
  })

  await logAccessAction(companyId, userId, 'DISPATCH_REASSIGNED', {
    metadata: { dispatchRequestId, dispatcherId },
  })
  revalidateDashboards()
}

function parseWorkOrderStatus(value: string | null | undefined): WorkOrderStatus {
  if (!value) {
    throw new Error('Missing target status')
  }

  const normalized = value.toUpperCase() as WorkOrderStatus
  if (!WORK_ORDER_STATUS_VALUES.includes(normalized)) {
    throw new Error('Invalid work order status')
  }

  return normalized
}

export async function transitionWorkOrderStatusAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  const workOrderId = formData.get('workOrderId')?.toString()
  const nextStatus = parseWorkOrderStatus(formData.get('nextStatus')?.toString())

  if (!workOrderId) {
    throw new Error('Work order id required')
  }

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, companyId },
    select: {
      id: true,
      companyId: true,
      status: true,
      scheduledAt: true,
      startedAt: true,
      completedAt: true,
      cancelledAt: true,
      closedAt: true,
    },
  })

  if (!workOrder) {
    throw new Error('Work order not found')
  }

  await transitionWorkOrderStatus({
    workOrder,
    nextStatus,
    actorId: userId,
  })

  revalidateDashboards()
  revalidatePath('/dashboard/dispatch')
}

export async function approveComplianceOverrideAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  const workOrderId = formData.get('workOrderId')?.toString()

  if (!workOrderId) {
    throw new Error('Work order id required')
  }

  const workOrder = await prisma.workOrder.findFirst({ where: { id: workOrderId, companyId } })
  if (!workOrder) {
    throw new Error('Work order not found')
  }

  assertWorkOrderMutable(workOrder.status)

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      overrideApproved: true,
      overrideApprovedById: userId,
      overrideApprovedAt: new Date(),
      complianceBlocked: false,
    },
  })

  await logAccessAction(companyId, userId, 'COMPLIANCE_OVERRIDE_APPROVED', {
    metadata: { workOrderId },
  })
  await recordWorkOrderActivity({
    companyId,
    workOrderId,
    actorId: userId,
    type: 'COMPLIANCE_OVERRIDE',
    metadata: { overrideApproved: true },
  })
  revalidateDashboards()
  revalidatePath('/dashboard/dispatch')
}

function parseNumber(value: FormDataEntryValue | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function updateCompliancePoliciesAction(formData: FormData) {
  const { companyId, userId, role } = await requireOwnerOrAdmin()
  if (role !== 'owner') {
    throw new Error('Only owners can modify compliance policies')
  }

  const requireImages = formData.get('requireImages') === 'true'
  const expirationGraceDays = parseNumber(formData.get('expirationGraceDays'), 30)
  const retentionYears = parseNumber(formData.get('retentionYears'), 7)
  const warning30 = formData.get('warning30') === 'true'
  const warning60 = formData.get('warning60') === 'true'
  const warning90 = formData.get('warning90') === 'true'
  const onDispatch = formData.get('snapshotOnDispatch') === 'true'
  const onUpload = formData.get('snapshotOnUpload') === 'true'
  const manualSnapshots = formData.get('snapshotManual') !== 'false'
  const requireQrForDispatch = formData.get('requireQr') === 'true'
  const allowExternalVerification = formData.get('allowExternal') !== 'false'
  const qrFieldsRaw = formData.get('qrFields')?.toString() ?? 'employeeId,firstName,lastName'

  const expirationWarningWindows: number[] = []
  if (warning30) expirationWarningWindows.push(30)
  if (warning60) expirationWarningWindows.push(60)
  if (warning90) expirationWarningWindows.push(90)

  const policies: Partial<CompliancePolicies> = {
    requireImages,
    expirationGraceDays,
    expirationWarningWindows: expirationWarningWindows.length ? expirationWarningWindows : [30, 60, 90],
    retentionYears,
    snapshotRules: {
      onDispatchAssignment: onDispatch,
      onCertificationUpload: onUpload,
      onManualRequest: manualSnapshots,
    },
    qrVerification: {
      requireForDispatch: requireQrForDispatch,
      allowExternalVerification,
      publicFields: qrFieldsRaw.split(',').map((field) => field.trim()).filter(Boolean),
    },
  }

  await updateCompliancePolicies(companyId, userId, policies)
  await logAccessAction(companyId, userId, 'COMPLIANCE_POLICY_UPDATED', {
    metadata: {
      requireImages,
      expirationGraceDays,
      retentionYears,
    },
  })
  revalidateDashboards()
}

export async function manageEmailIntegrationAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  await enforceCanUseEmailIntegration(userId)

  const providerRaw = formData.get('provider')?.toString().trim().toLowerCase()
  const intent = formData.get('intent')?.toString().trim()
  const metadataRaw = formData.get('metadata')?.toString()

  if (!providerRaw || !intent) {
    throw new Error('Provider and intent are required')
  }

  if (!EMAIL_PROVIDERS.includes(providerRaw as EmailProvider)) {
    throw new Error('Unsupported provider')
  }

  const provider = providerRaw as EmailProvider
  const metadata = parseMetadataInput(metadataRaw ?? undefined)

  if (intent === 'connect') {
    await prisma.emailIntegration.upsert({
      where: { companyId_provider: { companyId, provider } },
      update: {
        status: 'connected',
        isActive: true,
        connectedAt: new Date(),
        disconnectedAt: null,
        ...(metadata ? { metadata } : {}),
      },
      create: {
        companyId,
        provider,
        status: 'connected',
        isActive: true,
        connectedAt: new Date(),
        metadata,
      },
    })

    await logAccessAction(companyId, userId, 'EMAIL_PROVIDER_CONNECTED', {
      metadata: { provider },
    })
  } else if (intent === 'disconnect') {
    const integration = await prisma.emailIntegration.findUnique({ where: { companyId_provider: { companyId, provider } } })

    if (!integration) {
      throw new Error('Integration not found')
    }

    await prisma.emailIntegration.update({
      where: { id: integration.id },
      data: {
        status: 'disconnected',
        isActive: false,
        disconnectedAt: new Date(),
        ...(metadata ? { metadata } : {}),
      },
    })

    await logAccessAction(companyId, userId, 'EMAIL_PROVIDER_DISCONNECTED', {
      metadata: { provider },
    })
  } else {
    throw new Error('Unsupported integration intent')
  }

  revalidateDashboards()
}

export async function createEmailTemplateAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  await enforceCanUseEmailIntegration(userId)

  const name = formData.get('name')?.toString().trim()
  const subject = formData.get('subject')?.toString().trim()
  const body = formData.get('body')?.toString().trim()
  const scopeRaw = formData.get('scope')?.toString().trim().toLowerCase()
  const setDefault = formData.get('isDefault') === 'true'

  if (!name || !subject || !body || !scopeRaw) {
    throw new Error('All template fields are required')
  }

  assertTemplateScope(scopeRaw)

  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.emailTemplate.create({
      data: {
        companyId,
        name,
        subject,
        body,
        scope: scopeRaw,
        isDefault: false,
        createdById: userId,
        updatedById: userId,
      },
    })

    if (setDefault) {
      await tx.emailTemplate.updateMany({ where: { companyId, scope: scopeRaw }, data: { isDefault: false } })
      await tx.emailTemplate.update({ where: { id: created.id }, data: { isDefault: true } })
    }

    return created
  })

  await logAccessAction(companyId, userId, 'EMAIL_TEMPLATE_CREATED', {
    metadata: { templateId: template.id, scope: scopeRaw },
  })

  if (setDefault) {
    await logAccessAction(companyId, userId, 'EMAIL_TEMPLATE_DEFAULT_SET', {
      metadata: { templateId: template.id, scope: scopeRaw },
    })
  }

  revalidateDashboards()
}

export async function updateEmailTemplateAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  await enforceCanUseEmailIntegration(userId)

  const templateId = formData.get('templateId')?.toString()
  const name = formData.get('name')?.toString().trim()
  const subject = formData.get('subject')?.toString().trim()
  const body = formData.get('body')?.toString().trim()
  const scopeRaw = formData.get('scope')?.toString().trim().toLowerCase()

  if (!templateId || !name || !subject || !body || !scopeRaw) {
    throw new Error('Missing template data')
  }

  assertTemplateScope(scopeRaw)

  const template = await prisma.emailTemplate.findFirst({ where: { id: templateId, companyId } })
  if (!template) {
    throw new Error('Template not found')
  }

  await prisma.emailTemplate.update({
    where: { id: templateId },
    data: {
      name,
      subject,
      body,
      scope: scopeRaw,
      updatedById: userId,
    },
  })

  await logAccessAction(companyId, userId, 'EMAIL_TEMPLATE_UPDATED', {
    metadata: { templateId, scope: scopeRaw },
  })
  revalidateDashboards()
}

export async function deleteEmailTemplateAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  await enforceCanUseEmailIntegration(userId)

  const templateId = formData.get('templateId')?.toString()
  if (!templateId) {
    throw new Error('Template id is required')
  }

  const template = await prisma.emailTemplate.findFirst({ where: { id: templateId, companyId } })
  if (!template) {
    throw new Error('Template not found')
  }

  await prisma.emailTemplate.delete({ where: { id: templateId } })

  await logAccessAction(companyId, userId, 'EMAIL_TEMPLATE_DELETED', {
    metadata: { templateId, scope: template.scope },
  })
  revalidateDashboards()
}

export async function setDefaultEmailTemplateAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  await enforceCanUseEmailIntegration(userId)

  const templateId = formData.get('templateId')?.toString()
  if (!templateId) {
    throw new Error('Template id is required')
  }

  const template = await prisma.emailTemplate.findFirst({ where: { id: templateId, companyId } })
  if (!template) {
    throw new Error('Template not found')
  }

  await prisma.$transaction([
    prisma.emailTemplate.updateMany({ where: { companyId, scope: template.scope }, data: { isDefault: false } }),
    prisma.emailTemplate.update({ where: { id: template.id }, data: { isDefault: true } }),
  ])

  await logAccessAction(companyId, userId, 'EMAIL_TEMPLATE_DEFAULT_SET', {
    metadata: { templateId, scope: template.scope },
  })
  revalidateDashboards()
}

export async function createEmailSignatureAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  await enforceCanUseEmailIntegration(userId)

  const name = formData.get('name')?.toString().trim()
  const content = formData.get('content')?.toString().trim()
  const isActive = formData.get('isActive') === 'true'

  if (!name || !content) {
    throw new Error('Name and content are required')
  }

  const signature = await prisma.emailSignature.create({
    data: {
      companyId,
      name,
      content,
      isActive,
      createdById: userId,
    },
  })

  if (isActive) {
    await prisma.emailSignature.updateMany({ where: { companyId, NOT: { id: signature.id } }, data: { isActive: false } })
    await logAccessAction(companyId, userId, 'EMAIL_SIGNATURE_ACTIVATED', {
      metadata: { signatureId: signature.id },
    })
  }

  await logAccessAction(companyId, userId, 'EMAIL_SIGNATURE_CREATED', {
    metadata: { signatureId: signature.id },
  })
  revalidateDashboards()
}

export async function updateEmailSignatureAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  await enforceCanUseEmailIntegration(userId)

  const signatureId = formData.get('signatureId')?.toString()
  const name = formData.get('name')?.toString().trim()
  const content = formData.get('content')?.toString().trim()

  if (!signatureId || !name || !content) {
    throw new Error('Missing signature data')
  }

  const signature = await prisma.emailSignature.findFirst({ where: { id: signatureId, companyId } })
  if (!signature) {
    throw new Error('Signature not found')
  }

  await prisma.emailSignature.update({
    where: { id: signatureId },
    data: { name, content },
  })

  await logAccessAction(companyId, userId, 'EMAIL_SIGNATURE_UPDATED', {
    metadata: { signatureId },
  })
  revalidateDashboards()
}

export async function activateEmailSignatureAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  await enforceCanUseEmailIntegration(userId)

  const signatureId = formData.get('signatureId')?.toString()
  if (!signatureId) {
    throw new Error('Signature id is required')
  }

  const signature = await prisma.emailSignature.findFirst({ where: { id: signatureId, companyId } })
  if (!signature) {
    throw new Error('Signature not found')
  }

  await prisma.$transaction([
    prisma.emailSignature.updateMany({ where: { companyId }, data: { isActive: false } }),
    prisma.emailSignature.update({ where: { id: signatureId }, data: { isActive: true } }),
  ])

  await logAccessAction(companyId, userId, 'EMAIL_SIGNATURE_ACTIVATED', {
    metadata: { signatureId },
  })
  revalidateDashboards()
}

export async function deleteEmailSignatureAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  await enforceCanUseEmailIntegration(userId)

  const signatureId = formData.get('signatureId')?.toString()
  if (!signatureId) {
    throw new Error('Signature id is required')
  }

  const signature = await prisma.emailSignature.findFirst({ where: { id: signatureId, companyId } })
  if (!signature) {
    throw new Error('Signature not found')
  }

  await prisma.emailSignature.delete({ where: { id: signatureId } })

  await logAccessAction(companyId, userId, 'EMAIL_SIGNATURE_DELETED', {
    metadata: { signatureId },
  })
  revalidateDashboards()
}

export async function upsertRecipientPreferenceAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  await enforceCanUseEmailIntegration(userId)

  const preferenceId = formData.get('preferenceId')?.toString()
  const emailRaw = formData.get('email')?.toString().trim().toLowerCase()
  const sendEnabled = formData.get('sendEnabled') !== 'false'
  const reason = formData.get('reason')?.toString().trim() || null

  let emailForLog = emailRaw ?? null

  if (preferenceId) {
    const preference = await prisma.emailRecipientPreference.findFirst({ where: { id: preferenceId, companyId } })
    if (!preference) {
      throw new Error('Recipient preference not found')
    }

    emailForLog = preference.email

    await prisma.emailRecipientPreference.update({
      where: { id: preferenceId },
      data: { sendEnabled, reason },
    })
  } else {
    if (!emailRaw) {
      throw new Error('Recipient email is required')
    }

    await prisma.emailRecipientPreference.upsert({
      where: { companyId_email: { companyId, email: emailRaw } },
      update: { sendEnabled, reason },
      create: { companyId, email: emailRaw, sendEnabled, reason },
    })
  }

  await logAccessAction(companyId, userId, 'EMAIL_RECIPIENT_TOGGLED', {
    metadata: { email: emailForLog, sendEnabled },
  })
  revalidateDashboards()
}

'use server'

import { revalidatePath } from 'next/cache'
import { Prisma, type AccessAuditAction, type EmailProvider, type EmailTemplateScope } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireEstimatorContext } from '@/lib/estimating/auth'
import { enforceCanUseEmailIntegration } from '@/lib/billing/enforcement'

const EMAIL_PROVIDERS: EmailProvider[] = ['gmail', 'outlook', 'custom']
const TEMPLATE_SCOPES: EmailTemplateScope[] = ['estimating', 'global']

type AllowedTemplateScope = (typeof TEMPLATE_SCOPES)[number]

type MetadataPayload = Record<string, unknown>

function revalidateEstimatingSettings() {
  revalidatePath('/estimating/settings')
  revalidatePath('/estimating')
  revalidatePath('/dashboard/estimator')
}

async function logAccessAction(
  companyId: string,
  actorId: string,
  action: AccessAuditAction,
  metadata?: MetadataPayload
) {
  await prisma.accessAuditLog.create({
    data: {
      companyId,
      actorId,
      action,
      metadata,
    },
  })
}

function parseMetadataInput(value?: string | null): MetadataPayload | undefined {
  if (!value) return undefined
  try {
    return JSON.parse(value)
  } catch {
    return { note: value }
  }
}

function assertTemplateScope(scope: string): asserts scope is AllowedTemplateScope {
  if (!TEMPLATE_SCOPES.includes(scope as AllowedTemplateScope)) {
    throw new Error('Unsupported template scope')
  }
}

function parseNumberField(value: FormDataEntryValue | null, fallback = 0): number {
  if (value === null || value === undefined) {
    return fallback
  }
  const parsed = typeof value === 'string' ? Number(value) : Number(value.toString())
  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid numeric input')
  }
  return parsed
}

export async function manageEstimatingEmailIntegrationAction(formData: FormData) {
  const { companyId, userId } = await requireEstimatorContext()
  await enforceCanUseEmailIntegration(userId)

  const providerRaw = formData.get('provider')?.toString().trim().toLowerCase()
  const intent = formData.get('intent')?.toString().trim().toLowerCase()
  const metadataRaw = formData.get('metadata')?.toString()

  if (!providerRaw || !intent) {
    throw new Error('Provider and intent are required')
  }

  if (!EMAIL_PROVIDERS.includes(providerRaw as EmailProvider)) {
    throw new Error('Unsupported provider')
  }

  const provider = providerRaw as EmailProvider
  const metadata = parseMetadataInput(metadataRaw)

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
        metadata: metadata ?? {},
      },
    })

    await logAccessAction(companyId, userId, 'EMAIL_PROVIDER_CONNECTED', {
      provider,
    })
  } else if (intent === 'disconnect') {
    const integration = await prisma.emailIntegration.findUnique({
      where: { companyId_provider: { companyId, provider } },
    })

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
      provider,
    })
  } else {
    throw new Error('Unsupported integration intent')
  }

  revalidateEstimatingSettings()
}

export async function createEstimatingEmailTemplateAction(formData: FormData) {
  const { companyId, userId } = await requireEstimatorContext()
  await enforceCanUseEmailIntegration(userId)

  const name = formData.get('name')?.toString().trim()
  const subject = formData.get('subject')?.toString().trim()
  const body = formData.get('body')?.toString().trim()
  const scopeRaw = (formData.get('scope')?.toString().trim().toLowerCase() ?? 'estimating') as string
  const setDefault = formData.get('isDefault') === 'true'

  if (!name || !subject || !body) {
    throw new Error('Name, subject, and body are required')
  }

  assertTemplateScope(scopeRaw)
  const scope = scopeRaw as AllowedTemplateScope

  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.emailTemplate.create({
      data: {
        companyId,
        name,
        subject,
        body,
        scope,
        isDefault: false,
        createdById: userId,
        updatedById: userId,
      },
    })

    if (setDefault) {
      await tx.emailTemplate.updateMany({ where: { companyId, scope }, data: { isDefault: false } })
      await tx.emailTemplate.update({ where: { id: created.id }, data: { isDefault: true } })
    }

    return created
  })

  await logAccessAction(companyId, userId, 'EMAIL_TEMPLATE_CREATED', {
    templateId: template.id,
    scope,
  })

  if (setDefault) {
    await logAccessAction(companyId, userId, 'EMAIL_TEMPLATE_DEFAULT_SET', {
      templateId: template.id,
      scope,
    })
  }

  revalidateEstimatingSettings()
}

export async function updateEstimatingEmailTemplateAction(formData: FormData) {
  const { companyId, userId } = await requireEstimatorContext()
  await enforceCanUseEmailIntegration(userId)

  const templateId = formData.get('templateId')?.toString()
  const name = formData.get('name')?.toString().trim()
  const subject = formData.get('subject')?.toString().trim()
  const body = formData.get('body')?.toString().trim()
  const scopeRaw = formData.get('scope')?.toString().trim().toLowerCase()

  if (!templateId || !name || !subject || !body || !scopeRaw) {
    throw new Error('Template payload incomplete')
  }

  assertTemplateScope(scopeRaw)
  const template = await prisma.emailTemplate.findFirst({ where: { id: templateId, companyId } })
  if (!template || !TEMPLATE_SCOPES.includes(template.scope as AllowedTemplateScope)) {
    throw new Error('Template not available for estimating scope')
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
    templateId,
    scope: scopeRaw,
  })

  revalidateEstimatingSettings()
}

export async function deleteEstimatingEmailTemplateAction(formData: FormData) {
  const { companyId, userId } = await requireEstimatorContext()
  await enforceCanUseEmailIntegration(userId)

  const templateId = formData.get('templateId')?.toString()
  if (!templateId) {
    throw new Error('Template id is required')
  }

  const template = await prisma.emailTemplate.findFirst({ where: { id: templateId, companyId } })
  if (!template || !TEMPLATE_SCOPES.includes(template.scope as AllowedTemplateScope)) {
    throw new Error('Template not available')
  }

  await prisma.emailTemplate.delete({ where: { id: templateId } })

  await logAccessAction(companyId, userId, 'EMAIL_TEMPLATE_DELETED', {
    templateId,
    scope: template.scope,
  })
  revalidateEstimatingSettings()
}

export async function setDefaultEstimatingEmailTemplateAction(formData: FormData) {
  const { companyId, userId } = await requireEstimatorContext()
  await enforceCanUseEmailIntegration(userId)

  const templateId = formData.get('templateId')?.toString()
  if (!templateId) {
    throw new Error('Template id is required')
  }

  const template = await prisma.emailTemplate.findFirst({ where: { id: templateId, companyId } })
  if (!template || !TEMPLATE_SCOPES.includes(template.scope as AllowedTemplateScope)) {
    throw new Error('Template not available for estimating scope')
  }

  await prisma.$transaction([
    prisma.emailTemplate.updateMany({ where: { companyId, scope: template.scope }, data: { isDefault: false } }),
    prisma.emailTemplate.update({ where: { id: template.id }, data: { isDefault: true } }),
  ])

  await logAccessAction(companyId, userId, 'EMAIL_TEMPLATE_DEFAULT_SET', {
    templateId,
    scope: template.scope,
  })
  revalidateEstimatingSettings()
}

export async function createEstimatingEmailSignatureAction(formData: FormData) {
  const { companyId, userId } = await requireEstimatorContext()
  await enforceCanUseEmailIntegration(userId)

  const name = formData.get('name')?.toString().trim()
  const content = formData.get('content')?.toString().trim()
  const isActive = formData.get('isActive') === 'true'

  if (!name || !content) {
    throw new Error('Signature name and content are required')
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
      signatureId: signature.id,
    })
  }

  await logAccessAction(companyId, userId, 'EMAIL_SIGNATURE_CREATED', {
    signatureId: signature.id,
  })
  revalidateEstimatingSettings()
}

export async function updateEstimatingEmailSignatureAction(formData: FormData) {
  const { companyId, userId } = await requireEstimatorContext()
  await enforceCanUseEmailIntegration(userId)

  const signatureId = formData.get('signatureId')?.toString()
  const name = formData.get('name')?.toString().trim()
  const content = formData.get('content')?.toString().trim()

  if (!signatureId || !name || !content) {
    throw new Error('Signature payload incomplete')
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
    signatureId,
  })
  revalidateEstimatingSettings()
}

export async function activateEstimatingEmailSignatureAction(formData: FormData) {
  const { companyId, userId } = await requireEstimatorContext()
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
    signatureId,
  })
  revalidateEstimatingSettings()
}

export async function deleteEstimatingEmailSignatureAction(formData: FormData) {
  const { companyId, userId } = await requireEstimatorContext()
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
    signatureId,
  })
  revalidateEstimatingSettings()
}

export async function upsertEstimatingRecipientPreferenceAction(formData: FormData) {
  const { companyId, userId } = await requireEstimatorContext()
  await enforceCanUseEmailIntegration(userId)

  const preferenceId = formData.get('preferenceId')?.toString()
  const emailRaw = formData.get('email')?.toString().trim().toLowerCase()
  const sendEnabled = formData.get('sendEnabled') !== 'false'
  const reason = formData.get('reason')?.toString().trim() || null

  let auditEmail = emailRaw ?? null

  if (preferenceId) {
    const preference = await prisma.emailRecipientPreference.findFirst({ where: { id: preferenceId, companyId } })
    if (!preference) {
      throw new Error('Recipient preference not found')
    }
    auditEmail = preference.email

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
    auditEmail = emailRaw
  }

  await logAccessAction(companyId, userId, 'EMAIL_RECIPIENT_TOGGLED', {
    email: auditEmail,
    sendEnabled,
  })
  revalidateEstimatingSettings()
}

export async function updatePresetDetailsFromSettingsAction(formData: FormData) {
  const { companyId, userId } = await requireEstimatorContext()
  const presetId = formData.get('presetId')?.toString()
  if (!presetId) {
    throw new Error('Preset id required')
  }

  const label = formData.get('label')?.toString().trim()
  const description = formData.get('description')?.toString().trim()
  const unit = formData.get('unit')?.toString().trim()
  const unitCost = parseNumberField(formData.get('unitCost'), 0)

  if (!label || !description || !unit) {
    throw new Error('Label, description, and unit are required')
  }

  const preset = await prisma.estimatingPreset.findFirst({ where: { id: presetId, companyId } })
  if (!preset) {
    throw new Error('Preset not found')
  }

  if (preset.locked) {
    throw new Error('Locked presets cannot be edited')
  }

  const changes: MetadataPayload = {}
  if (preset.label !== label) changes.label = { from: preset.label, to: label }
  if (preset.defaultDescription !== description) changes.description = { from: preset.defaultDescription, to: description }
  if (preset.defaultUnit !== unit) changes.unit = { from: preset.defaultUnit, to: unit }
  if (Number(preset.defaultUnitCost) !== unitCost) changes.unitCost = { from: preset.defaultUnitCost.toString(), to: unitCost }

  if (!Object.keys(changes).length) {
    return
  }

  await prisma.estimatingPreset.update({
    where: { id: presetId },
    data: {
      label,
      defaultDescription: description,
      defaultUnit: unit,
      defaultUnitCost: new Prisma.Decimal(unitCost),
    },
  })

  await logAccessAction(companyId, userId, 'ESTIMATING_PRESET_UPDATED', {
    presetId,
    baseKey: preset.baseKey,
    changes,
  })
  revalidateEstimatingSettings()
}

export async function togglePresetFromSettingsAction(formData: FormData) {
  const { companyId, userId } = await requireEstimatorContext()
  const presetId = formData.get('presetId')?.toString()
  const enabled = formData.get('enabled') === 'true'
  if (!presetId) {
    throw new Error('Preset id required')
  }

  const preset = await prisma.estimatingPreset.findFirst({ where: { id: presetId, companyId } })
  if (!preset) {
    throw new Error('Preset not found')
  }

  if (preset.isOther && !enabled) {
    throw new Error('Mandatory presets cannot be disabled')
  }

  if (preset.enabled === enabled) {
    return
  }

  await prisma.estimatingPreset.update({ where: { id: presetId }, data: { enabled } })

  await logAccessAction(companyId, userId, enabled ? 'ESTIMATING_PRESET_UPDATED' : 'ESTIMATING_PRESET_DISABLED', {
    presetId,
    baseKey: preset.baseKey,
    enabled,
  })
  revalidateEstimatingSettings()
}

export async function reorderPresetFromSettingsAction(formData: FormData) {
  const { companyId, userId } = await requireEstimatorContext()
  const presetId = formData.get('presetId')?.toString()
  const direction = formData.get('direction')?.toString()
  if (!presetId || !direction) {
    throw new Error('Preset id and direction required')
  }

  const preset = await prisma.estimatingPreset.findFirst({ where: { id: presetId, companyId } })
  if (!preset) {
    throw new Error('Preset not found')
  }

  const siblings = await prisma.estimatingPreset.findMany({
    where: { companyId, industry: preset.industry },
    orderBy: { sortOrder: 'asc' },
  })

  const index = siblings.findIndex((item) => item.id === presetId)
  if (index === -1) {
    return
  }

  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= siblings.length) {
    return
  }

  const target = siblings[swapIndex]

  await prisma.$transaction([
    prisma.estimatingPreset.update({ where: { id: preset.id }, data: { sortOrder: target.sortOrder } }),
    prisma.estimatingPreset.update({ where: { id: target.id }, data: { sortOrder: preset.sortOrder } }),
  ])

  await logAccessAction(companyId, userId, 'ESTIMATING_PRESET_REORDERED', {
    presetId,
    baseKey: preset.baseKey,
    from: preset.sortOrder,
    to: target.sortOrder,
    direction,
  })
  revalidateEstimatingSettings()
}

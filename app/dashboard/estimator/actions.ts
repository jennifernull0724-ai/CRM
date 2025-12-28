'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enforceCanEstimate } from '@/lib/billing/enforcement'
import { generateEstimatePdf, type GenerateEstimatePdfParams } from '@/lib/estimating/pdf'
import { getDownloadUrl, getFileBuffer, uploadEstimatePdf } from '@/lib/s3'
import { sendEmail } from '@/lib/email'
import type { AccessAuditAction, EstimateDocumentKind, EstimateIndustry, EstimateStatus } from '@prisma/client'
import { Prisma } from '@prisma/client'

const DASHBOARD_PATH = '/dashboard/estimator'
const BRANDING_PDF_LOGO_KEY = 'branding_pdf_logo'

type ActionResponse<T = unknown> = { success: true; data?: T } | { success: false; error: string }

type EstimatingContext = {
  userId: string
  companyId: string
  role: string
}

type QuoteVariant = 'estimate' | 'quote'

async function requireEstimatingContext(): Promise<EstimatingContext> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    throw new Error('Unauthorized')
  }

  await enforceCanEstimate(session.user.id)

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role.toLowerCase(),
  }
}

function normalizeIndustry(raw: string | null): EstimateIndustry {
  if (!raw) {
    throw new Error('Industry is required')
  }
  const normalized = raw.toUpperCase()
  if (!['RAIL', 'CONSTRUCTION', 'ENVIRONMENTAL'].includes(normalized)) {
    throw new Error('Unsupported industry type')
  }
  return normalized as EstimateIndustry
}

async function generateQuoteNumber(companyId: string): Promise<string> {
  const now = new Date()
  const pad = (value: number) => value.toString().padStart(2, '0')
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = Math.floor(1000 + Math.random() * 9000)
    const quoteNumber = `Q${datePart}-${suffix}`
    const existing = await prisma.estimate.findFirst({ where: { companyId, quoteNumber } })
    if (!existing) {
      return quoteNumber
    }
  }

  throw new Error('Unable to allocate unique quote number')
}

async function logEstimateEvent(
  companyId: string,
  actorId: string,
  action: AccessAuditAction,
  estimateId: string,
  metadata?: Record<string, unknown>
) {
  await prisma.accessAuditLog.create({
    data: {
      companyId,
      actorId,
      action,
      metadata: {
        estimateId,
        ...(metadata ?? {}),
      },
    },
  })
}

async function ensureEstimateWithRevision(estimateId: string, companyId: string) {
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      currentRevision: {
        include: {
          lineItems: true,
        },
      },
    },
  })

  if (!estimate || !estimate.currentRevision) {
    throw new Error('Estimate not found')
  }

  return estimate
}

async function recomputeRevisionTotals(revisionId: string) {
  const revision = await prisma.estimateRevision.findUnique({
    where: { id: revisionId },
    select: {
      markupPercent: true,
      markupAmount: true,
      overheadPercent: true,
      overheadAmount: true,
      manualOverrideTotal: true,
      overrideReason: true,
    },
  })

  if (!revision) {
    throw new Error('Revision missing')
  }

  const subtotalResult = await prisma.estimateLineItem.aggregate({
    where: { revisionId },
    _sum: { lineTotal: true },
  })

  const subtotal = subtotalResult._sum.lineTotal ?? new Prisma.Decimal(0)
  const subtotalNumber = Number(subtotal)
  const markupPercent = revision.markupPercent ? Number(revision.markupPercent) : 0
  const overheadPercent = revision.overheadPercent ? Number(revision.overheadPercent) : 0

  const markupAmount = subtotalNumber * (markupPercent / 100)
  const overheadAmount = (subtotalNumber + markupAmount) * (overheadPercent / 100)
  const computedGrandTotal = subtotalNumber + markupAmount + overheadAmount
  const finalTotal = revision.manualOverrideTotal ? Number(revision.manualOverrideTotal) : computedGrandTotal

  await prisma.estimateRevision.update({
    where: { id: revisionId },
    data: {
      subtotal,
      markupAmount: new Prisma.Decimal(markupAmount),
      overheadAmount: new Prisma.Decimal(overheadAmount),
      grandTotal: new Prisma.Decimal(computedGrandTotal),
      manualOverrideTotal: revision.manualOverrideTotal,
    },
  })

  return { subtotal: subtotalNumber, grandTotal: finalTotal }
}

async function getPdfLogo(companyId: string): Promise<Buffer | null> {
  const setting = await prisma.systemSetting.findFirst({
    where: { companyId, key: BRANDING_PDF_LOGO_KEY },
  })

  if (!setting) {
    return null
  }

  const value = setting.value as null | { key?: string }
  if (!value?.key) {
    return null
  }

  return getFileBuffer(value.key)
}

function sanitizeRichText(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function parseRecipients(value: string | null): string[] {
  if (!value) {
    return []
  }
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

async function ensureRecipientsAllowed(companyId: string, recipients: string[]) {
  if (!recipients.length) {
    throw new Error('Recipient list is empty')
  }

  const suppressed = await prisma.emailRecipientPreference.findMany({
    where: { companyId, email: { in: recipients }, sendEnabled: false },
  })

  if (suppressed.length) {
    throw new Error(`Email blocked for ${suppressed.map((pref) => pref.email).join(', ')}`)
  }
}

function parseNumberField(value: FormDataEntryValue | null, fallback = 0): number {
  if (value === null) {
    return fallback
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function createEstimateAction(formData: FormData) {
  const { userId, companyId } = await requireEstimatingContext()
  const contactId = formData.get('contactId')?.toString()
  const projectName = formData.get('projectName')?.toString().trim()
  const projectLocation = formData.get('projectLocation')?.toString().trim() || null
  const industry = normalizeIndustry(formData.get('industry')?.toString() ?? null)
  const scopeOfWork = formData.get('scopeOfWork')?.toString()
  const assumptions = sanitizeRichText(formData.get('assumptions')?.toString())
  const exclusions = sanitizeRichText(formData.get('exclusions')?.toString())
  const dealId = formData.get('dealId')?.toString() || null

  if (!contactId || !projectName || !scopeOfWork) {
    throw new Error('Contact, project name, and scope are required')
  }

  const [contact, deal] = await Promise.all([
    prisma.contact.findFirst({ where: { id: contactId, companyId } }),
    dealId ? prisma.deal.findFirst({ where: { id: dealId, companyId } }) : Promise.resolve(null),
  ])

  if (!contact) {
    throw new Error('Contact not found')
  }

  if (dealId && !deal) {
    throw new Error('Deal not found for this workspace')
  }

  const quoteNumber = await generateQuoteNumber(companyId)

  const revision = await prisma.estimateRevision.create({
    data: {
      estimate: {
        create: {
          companyId,
          contactId,
          ...(dealId ? { dealId } : {}),
          createdById: userId,
          quoteNumber,
          status: 'DRAFT',
          currentRevision: 1,
          revisionCount: 1,
        },
      },
      revisionNumber: 1,
      status: 'DRAFT',
      quoteNumber,
      projectName,
      projectLocation,
      industry,
      scopeOfWork: sanitizeRichText(scopeOfWork),
      assumptions,
      exclusions,
      contactNameSnapshot: `${contact.firstName} ${contact.lastName}`.trim(),
      contactEmailSnapshot: contact.email,
      subtotal: new Prisma.Decimal(0),
      grandTotal: new Prisma.Decimal(0),
    },
    include: { estimate: true },
  })

  await prisma.estimate.update({
    where: { id: revision.estimateId },
    data: { currentRevisionId: revision.id },
  })

  await logEstimateEvent(companyId, userId, 'ESTIMATE_CREATED', revision.estimateId, { quoteNumber })
  revalidatePath(DASHBOARD_PATH)
}

export async function startEstimateRevisionAction(formData: FormData) {
  const { userId, companyId } = await requireEstimatingContext()
  const estimateId = formData.get('estimateId')?.toString()
  if (!estimateId) {
    throw new Error('Estimate id required')
  }

  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: {
      contact: { select: { firstName: true, lastName: true, email: true } },
      currentRevision: {
        include: {
          lineItems: true,
        },
      },
    },
  })

  if (!estimate || !estimate.currentRevision) {
    throw new Error('Estimate not found')
  }

  if (!['APPROVED', 'SENT_TO_DISPATCH'].includes(estimate.status) && !estimate.currentRevision.locked) {
    throw new Error('Current revision is still editable')
  }

  const newRevisionNumber = estimate.currentRevision.revisionNumber + 1
  const newRevision = await prisma.estimateRevision.create({
    data: {
      estimateId: estimate.id,
      revisionNumber: newRevisionNumber,
      status: 'DRAFT',
      quoteNumber: estimate.quoteNumber,
      projectName: estimate.currentRevision.projectName,
      projectLocation: estimate.currentRevision.projectLocation,
      industry: estimate.currentRevision.industry,
      scopeOfWork: estimate.currentRevision.scopeOfWork,
      assumptions: estimate.currentRevision.assumptions,
      exclusions: estimate.currentRevision.exclusions,
      contactNameSnapshot: `${estimate.contact.firstName} ${estimate.contact.lastName}`.trim(),
      contactEmailSnapshot: estimate.contact.email,
      subtotal: estimate.currentRevision.subtotal,
      markupPercent: estimate.currentRevision.markupPercent,
      markupAmount: estimate.currentRevision.markupAmount,
      overheadPercent: estimate.currentRevision.overheadPercent,
      overheadAmount: estimate.currentRevision.overheadAmount,
      grandTotal: estimate.currentRevision.grandTotal,
      manualOverrideTotal: estimate.currentRevision.manualOverrideTotal,
      overrideReason: estimate.currentRevision.overrideReason,
    },
  })

  if (estimate.currentRevision.lineItems.length) {
    await prisma.estimateLineItem.createMany({
      data: estimate.currentRevision.lineItems.map((item, index) => ({
        companyId,
        estimateId: estimate.id,
        revisionId: newRevision.id,
        presetId: item.presetId,
        presetBaseKey: item.presetBaseKey,
        presetLabel: item.presetLabel,
        presetIndustry: item.presetIndustry,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        lineTotal: item.lineTotal,
        notes: item.notes,
        sortOrder: index,
      })),
    })
  }

  await prisma.estimate.update({
    where: { id: estimate.id },
    data: {
      status: 'DRAFT',
      currentRevision: newRevisionNumber,
      revisionCount: { increment: 1 },
      currentRevisionId: newRevision.id,
    },
  })

  await logEstimateEvent(companyId, userId, 'ESTIMATE_UPDATED', estimate.id, { revisionNumber: newRevisionNumber })
  revalidatePath(DASHBOARD_PATH)
}

export async function updateEstimateHeaderAction(formData: FormData) {
  const { userId, companyId } = await requireEstimatingContext()
  const estimateId = formData.get('estimateId')?.toString()
  if (!estimateId) throw new Error('Estimate id required')

  const estimate = await ensureEstimateWithRevision(estimateId, companyId)
  const revision = estimate.currentRevision

  if (revision.locked) {
    throw new Error('Approved revisions are immutable. Start a new revision instead.')
  }

  const contactId = formData.get('contactId')?.toString()
  const projectName = formData.get('projectName')?.toString().trim()
  const projectLocation = formData.get('projectLocation')?.toString().trim() || null
  const industry = normalizeIndustry(formData.get('industry')?.toString() ?? revision.industry)
  const scope = sanitizeRichText(formData.get('scopeOfWork')?.toString())
  const assumptions = sanitizeRichText(formData.get('assumptions')?.toString())
  const exclusions = sanitizeRichText(formData.get('exclusions')?.toString())

  if (!projectName || !scope) {
    throw new Error('Project name and scope are required')
  }

  let contactSnapshot = `${estimate.contact.firstName} ${estimate.contact.lastName}`.trim()
  let contactEmail = estimate.contact.email

  if (contactId && contactId !== estimate.contact.id) {
    const nextContact = await prisma.contact.findFirst({ where: { id: contactId, companyId } })
    if (!nextContact) {
      throw new Error('Contact not found')
    }
    await prisma.estimate.update({ where: { id: estimate.id }, data: { contactId } })
    contactSnapshot = `${nextContact.firstName} ${nextContact.lastName}`.trim()
    contactEmail = nextContact.email
  }

  await prisma.estimateRevision.update({
    where: { id: revision.id },
    data: {
      projectName,
      projectLocation,
      industry,
      scopeOfWork: scope,
      assumptions,
      exclusions,
      contactNameSnapshot: contactSnapshot,
      contactEmailSnapshot: contactEmail,
    },
  })

  await logEstimateEvent(companyId, userId, 'ESTIMATE_UPDATED', estimate.id, { field: 'header' })
  revalidatePath(DASHBOARD_PATH)
}

export async function saveEstimateLineItemAction(formData: FormData) {
  const { userId, companyId } = await requireEstimatingContext()
  const estimateId = formData.get('estimateId')?.toString()
  const presetId = formData.get('presetId')?.toString()
  const description = formData.get('description')?.toString().trim()
  const quantity = parseNumberField(formData.get('quantity'), 1)
  const unit = formData.get('unit')?.toString().trim()
  const unitCost = parseNumberField(formData.get('unitCost'), 0)
  const notes = formData.get('notes')?.toString().trim() || null
  const lineItemId = formData.get('lineItemId')?.toString()

  if (!estimateId || !presetId || !description || !unit) {
    throw new Error('Preset, description, unit, and estimate id are required')
  }

  const estimate = await ensureEstimateWithRevision(estimateId, companyId)
  const revision = estimate.currentRevision

  if (revision.locked) {
    throw new Error('Revision locked. Start a new revision to edit line items.')
  }

  const preset = await prisma.estimatingPreset.findFirst({ where: { id: presetId, companyId } })
  if (!preset) {
    throw new Error('Preset not available')
  }
  if (!preset.enabled && !lineItemId && !preset.isOther) {
    throw new Error('Preset disabled. Re-enable before using.')
  }

  const lineTotal = quantity * unitCost

  if (lineItemId) {
    const existing = await prisma.estimateLineItem.findFirst({ where: { id: lineItemId, companyId, revisionId: revision.id } })
    if (!existing) {
      throw new Error('Line item not found')
    }

    await prisma.estimateLineItem.update({
      where: { id: existing.id },
      data: {
        presetId: preset.id,
        presetBaseKey: preset.baseKey,
        presetLabel: preset.label,
        presetIndustry: preset.industry,
        description,
        quantity: new Prisma.Decimal(quantity),
        unit,
        unitCost: new Prisma.Decimal(unitCost),
        lineTotal: new Prisma.Decimal(lineTotal),
        notes,
      },
    })
  } else {
    await prisma.estimateLineItem.create({
      data: {
        companyId,
        estimateId: estimate.id,
        revisionId: revision.id,
        presetId: preset.id,
        presetBaseKey: preset.baseKey,
        presetLabel: preset.label,
        presetIndustry: preset.industry,
        description,
        quantity: new Prisma.Decimal(quantity),
        unit,
        unitCost: new Prisma.Decimal(unitCost),
        lineTotal: new Prisma.Decimal(lineTotal),
        notes,
        sortOrder: revision.lineItems.length,
      },
    })
  }

  await recomputeRevisionTotals(revision.id)
  await logEstimateEvent(companyId, userId, 'ESTIMATE_UPDATED', estimate.id, { field: 'line_items' })
  revalidatePath(DASHBOARD_PATH)
}

export async function deleteEstimateLineItemAction(formData: FormData) {
  const { userId, companyId } = await requireEstimatingContext()
  const lineItemId = formData.get('lineItemId')?.toString()
  if (!lineItemId) throw new Error('Line item id required')

  const lineItem = await prisma.estimateLineItem.findFirst({
    where: { id: lineItemId, companyId },
    select: { id: true, revisionId: true, estimateId: true, revision: { select: { locked: true } } },
  })
  if (!lineItem) throw new Error('Line item not found')
  if (lineItem.revision.locked) throw new Error('Revision locked')

  await prisma.estimateLineItem.delete({ where: { id: lineItemId } })
  await recomputeRevisionTotals(lineItem.revisionId)
  await logEstimateEvent(companyId, userId, 'ESTIMATE_UPDATED', lineItem.estimateId, {
    field: 'line_items',
    action: 'delete',
  })
  revalidatePath(DASHBOARD_PATH)
}

export async function reorderEstimateLineItemsAction(formData: FormData) {
  const { companyId } = await requireEstimatingContext()
  const estimateId = formData.get('estimateId')?.toString()
  const orderRaw = formData.get('order')?.toString()
  if (!estimateId || !orderRaw) throw new Error('Missing ordering payload')

  const estimate = await ensureEstimateWithRevision(estimateId, companyId)
  if (estimate.currentRevision.locked) {
    throw new Error('Revision locked')
  }

  const ids = JSON.parse(orderRaw) as string[]
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.estimateLineItem.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  )
  revalidatePath(DASHBOARD_PATH)
}

export async function setEstimatePricingAction(formData: FormData) {
  const { userId, companyId } = await requireEstimatingContext()
  const estimateId = formData.get('estimateId')?.toString()
  if (!estimateId) throw new Error('Estimate id required')

  const estimate = await ensureEstimateWithRevision(estimateId, companyId)
  const revision = estimate.currentRevision

  if (revision.locked) {
    throw new Error('Revision locked. Create a new revision to adjust pricing.')
  }

  const markupPercent = parseNumberField(formData.get('markupPercent'), 0)
  const overheadPercent = parseNumberField(formData.get('overheadPercent'), 0)
  const manualOverrideRaw = formData.get('manualOverrideTotal')?.toString().trim() || ''
  const manualOverride = manualOverrideRaw ? Number(manualOverrideRaw) : null
  const overrideReason = formData.get('overrideReason')?.toString().trim() || null

  if (manualOverride && overrideReason?.length === 0) {
    throw new Error('Manual override reason required')
  }

  await prisma.estimateRevision.update({
    where: { id: revision.id },
    data: {
      markupPercent: new Prisma.Decimal(markupPercent),
      overheadPercent: new Prisma.Decimal(overheadPercent),
      manualOverrideTotal: manualOverride ? new Prisma.Decimal(manualOverride) : null,
      overrideReason: manualOverride ? overrideReason : null,
    },
  })

  await recomputeRevisionTotals(revision.id)
  await logEstimateEvent(companyId, userId, 'ESTIMATE_UPDATED', estimate.id, { field: 'pricing' })
  revalidatePath(DASHBOARD_PATH)
}

export async function submitEstimateAction(formData: FormData) {
  const { userId, companyId } = await requireEstimatingContext()
  const estimateId = formData.get('estimateId')?.toString()
  if (!estimateId) throw new Error('Estimate id required')

  const estimate = await ensureEstimateWithRevision(estimateId, companyId)
  const revision = estimate.currentRevision

  const lineItemCount = await prisma.estimateLineItem.count({ where: { revisionId: revision.id } })
  if (!lineItemCount) {
    throw new Error('Add at least one line item before requesting approval')
  }

  if (estimate.status === 'AWAITING_APPROVAL') {
    return
  }

  const submittedAt = new Date()
  await prisma.$transaction([
    prisma.estimateRevision.update({
      where: { id: revision.id },
      data: { status: 'AWAITING_APPROVAL', submittedAt, submittedById: userId },
    }),
    prisma.estimate.update({
      where: { id: estimate.id },
      data: { status: 'AWAITING_APPROVAL', submittedAt },
    }),
  ])

  await logEstimateEvent(companyId, userId, 'ESTIMATE_UPDATED', estimate.id, { status: 'AWAITING_APPROVAL' })
  await logEstimateEvent(companyId, userId, 'ESTIMATE_REQUESTED', estimate.id, { revision: revision.revisionNumber })
  revalidatePath(DASHBOARD_PATH)
}

export async function approveEstimateAction(formData: FormData) {
  const { userId, companyId, role } = await requireEstimatingContext()
  if (!['owner', 'admin'].includes(role)) {
    throw new Error('Only owners or admins can approve estimates')
  }

  const estimateId = formData.get('estimateId')?.toString()
  if (!estimateId) throw new Error('Estimate id required')

  const estimate = await ensureEstimateWithRevision(estimateId, companyId)
  const revision = estimate.currentRevision

  if (estimate.status !== 'AWAITING_APPROVAL') {
    throw new Error('Estimate not awaiting approval')
  }

  const approvedAt = new Date()
  await prisma.$transaction([
    prisma.estimateRevision.update({
      where: { id: revision.id },
      data: { status: 'APPROVED', approvedAt, approvedById: userId, locked: true },
    }),
    prisma.estimate.update({
      where: { id: estimate.id },
      data: { status: 'APPROVED', approvedAt },
    }),
  ])

  await logEstimateEvent(companyId, userId, 'ESTIMATE_APPROVED', estimate.id, { revision: revision.revisionNumber })
  revalidatePath(DASHBOARD_PATH)
}

export async function returnEstimateAction(formData: FormData) {
  const { userId, companyId } = await requireEstimatingContext()
  const estimateId = formData.get('estimateId')?.toString()
  const reason = formData.get('reason')?.toString().trim() || 'Returned for revisions'
  if (!estimateId) throw new Error('Estimate id required')

  const estimate = await ensureEstimateWithRevision(estimateId, companyId)

  if (!['AWAITING_APPROVAL', 'APPROVED'].includes(estimate.status)) {
    throw new Error('Only submitted estimates can be returned')
  }

  await prisma.$transaction([
    prisma.estimateRevision.update({ where: { id: estimate.currentRevision.id }, data: { status: 'REVISION_REQUIRED', notes: reason, locked: false } }),
    prisma.estimate.update({ where: { id: estimate.id }, data: { status: 'REVISION_REQUIRED' } }),
  ])

  await logEstimateEvent(companyId, userId, 'ESTIMATE_RETURNED_TO_USER', estimate.id, { reason })
  revalidatePath(DASHBOARD_PATH)
}

export async function sendEstimateToDispatchAction(formData: FormData) {
  const { userId, companyId } = await requireEstimatingContext()
  const estimateId = formData.get('estimateId')?.toString()
  if (!estimateId) throw new Error('Estimate id required')

  const estimate = await prisma.estimate.findFirst({ where: { id: estimateId, companyId }, select: { id: true, status: true, sentToDispatchAt: true } })
  if (!estimate) throw new Error('Estimate not found')
  if (estimate.status !== 'APPROVED') {
    throw new Error('Estimate must be approved before dispatch')
  }

  const queuedAt = new Date()
  const existingRequest = await prisma.dispatchRequest.findFirst({ where: { estimateId: estimate.id, companyId } })

  if (existingRequest) {
    await prisma.dispatchRequest.update({ where: { id: existingRequest.id }, data: { status: 'QUEUED', queuedAt } })
  } else {
    await prisma.dispatchRequest.create({ data: { companyId, estimateId: estimate.id, status: 'QUEUED', queuedAt } })
  }

  await prisma.estimate.update({ where: { id: estimate.id }, data: { status: 'SENT_TO_DISPATCH', sentToDispatchAt: queuedAt } })
  await logEstimateEvent(companyId, userId, 'ESTIMATE_SENT_TO_DISPATCH', estimate.id)
  revalidatePath(DASHBOARD_PATH)
}

export async function generateEstimatePdfAction(formData: FormData): Promise<ActionResponse<{ url: string }>> {
  const { userId, companyId } = await requireEstimatingContext()
  const estimateId = formData.get('estimateId')?.toString()
  const variant = (formData.get('variant')?.toString() ?? 'estimate') as QuoteVariant
  if (!estimateId) return { success: false, error: 'Estimate id required' }

  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: {
      company: { select: { name: true } },
      contact: { select: { firstName: true, lastName: true, email: true } },
      currentRevision: { include: { lineItems: true } },
    },
  })

  if (!estimate || !estimate.currentRevision) {
    return { success: false, error: 'Estimate not found' }
  }

  const logoBuffer = await getPdfLogo(companyId)

  const pdfPayload: GenerateEstimatePdfParams = {
    variant,
    quoteNumber: estimate.quoteNumber,
    revisionNumber: estimate.currentRevision.revisionNumber,
    companyName: estimate.company.name,
    projectName: estimate.currentRevision.projectName,
    projectLocation: estimate.currentRevision.projectLocation,
    industry: estimate.currentRevision.industry,
    contactName: `${estimate.contact.firstName} ${estimate.contact.lastName}`.trim(),
    contactEmail: estimate.contact.email,
    createdDate: estimate.createdAt,
    scopeOfWork: estimate.currentRevision.scopeOfWork,
    assumptions: estimate.currentRevision.assumptions,
    exclusions: estimate.currentRevision.exclusions,
    lineItems: estimate.currentRevision.lineItems.map((item) => ({
      presetLabel: item.presetLabel,
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitCost: Number(item.unitCost),
      lineTotal: Number(item.lineTotal),
      notes: item.notes,
    })),
    subtotal: Number(estimate.currentRevision.subtotal),
    markupPercent: estimate.currentRevision.markupPercent ? Number(estimate.currentRevision.markupPercent) : null,
    markupAmount: estimate.currentRevision.markupAmount ? Number(estimate.currentRevision.markupAmount) : null,
    overheadPercent: estimate.currentRevision.overheadPercent ? Number(estimate.currentRevision.overheadPercent) : null,
    overheadAmount: estimate.currentRevision.overheadAmount ? Number(estimate.currentRevision.overheadAmount) : null,
    grandTotal: Number(estimate.currentRevision.grandTotal),
    manualOverrideTotal: estimate.currentRevision.manualOverrideTotal
      ? Number(estimate.currentRevision.manualOverrideTotal)
      : null,
    overrideReason: estimate.currentRevision.overrideReason,
    logo: logoBuffer,
  }

  const pdfBuffer = await generateEstimatePdf(pdfPayload)
  const uploadResult = await uploadEstimatePdf(
    pdfBuffer,
    companyId,
    estimate.id,
    estimate.currentRevision.revisionNumber,
    variant
  )

  const kind: EstimateDocumentKind = variant === 'quote' ? 'QUOTE' : 'ESTIMATE'

  const document = await prisma.estimateDocument.create({
    data: {
      companyId,
      estimateId: estimate.id,
      revisionId: estimate.currentRevision.id,
      kind,
      storageKey: uploadResult.key,
      fileName: `${estimate.quoteNumber}-${variant}.pdf`,
      fileSize: uploadResult.size,
      hash: uploadResult.hash,
      generatedById: userId,
    },
  })

  await logEstimateEvent(companyId, userId, 'PDF_GENERATED', estimate.id, { documentId: document.id, variant })
  revalidatePath(DASHBOARD_PATH)

  const url = await getDownloadUrl(uploadResult.key, 900)
  return { success: true, data: { url } }
}

export async function emailEstimateAction(formData: FormData): Promise<ActionResponse> {
  const { userId, companyId } = await requireEstimatingContext()
  const estimateId = formData.get('estimateId')?.toString()
  if (!estimateId) return { success: false, error: 'Estimate id required' }

  const toRecipients = parseRecipients(formData.get('to')?.toString() ?? '')
  const ccRecipients = parseRecipients(formData.get('cc')?.toString() ?? '')
  const bccRecipients = parseRecipients(formData.get('bcc')?.toString() ?? '')
  const templateId = formData.get('templateId')?.toString() || null
  const signatureId = formData.get('signatureId')?.toString() || null
  const subject = formData.get('subject')?.toString().trim()
  const body = formData.get('body')?.toString().trim()

  if (!subject || !body) {
    return { success: false, error: 'Subject and body are required' }
  }

  await ensureRecipientsAllowed(companyId, [...toRecipients, ...ccRecipients, ...bccRecipients])

  const [template, signature, estimate, logoBuffer] = await Promise.all([
    templateId
      ? prisma.emailTemplate.findFirst({ where: { id: templateId, companyId } })
      : Promise.resolve(null),
    signatureId
      ? prisma.emailSignature.findFirst({ where: { id: signatureId, companyId } })
      : Promise.resolve(null),
    prisma.estimate.findFirst({
      where: { id: estimateId, companyId },
      include: {
        contact: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
        currentRevision: { include: { lineItems: true } },
      },
    }),
    getPdfLogo(companyId),
  ])

  if (!estimate || !estimate.currentRevision) {
    return { success: false, error: 'Estimate not found' }
  }

  if (template && template.scope !== 'estimating' && template.scope !== 'global') {
    return { success: false, error: 'Template scope must be estimating or global' }
  }

  const pdfBuffer = await generateEstimatePdf({
    variant: 'quote',
    quoteNumber: estimate.quoteNumber,
    revisionNumber: estimate.currentRevision.revisionNumber,
    companyName: estimate.company.name,
    projectName: estimate.currentRevision.projectName,
    projectLocation: estimate.currentRevision.projectLocation,
    industry: estimate.currentRevision.industry,
    contactName: `${estimate.contact.firstName} ${estimate.contact.lastName}`.trim(),
    contactEmail: null,
    createdDate: estimate.createdAt,
    scopeOfWork: estimate.currentRevision.scopeOfWork,
    assumptions: estimate.currentRevision.assumptions,
    exclusions: estimate.currentRevision.exclusions,
    lineItems: estimate.currentRevision.lineItems.map((item) => ({
      presetLabel: item.presetLabel,
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitCost: Number(item.unitCost),
      lineTotal: Number(item.lineTotal),
      notes: item.notes,
    })),
    subtotal: Number(estimate.currentRevision.subtotal),
    markupPercent: estimate.currentRevision.markupPercent ? Number(estimate.currentRevision.markupPercent) : null,
    markupAmount: estimate.currentRevision.markupAmount ? Number(estimate.currentRevision.markupAmount) : null,
    overheadPercent: estimate.currentRevision.overheadPercent ? Number(estimate.currentRevision.overheadPercent) : null,
    overheadAmount: estimate.currentRevision.overheadAmount ? Number(estimate.currentRevision.overheadAmount) : null,
    grandTotal: Number(estimate.currentRevision.grandTotal),
    manualOverrideTotal: estimate.currentRevision.manualOverrideTotal
      ? Number(estimate.currentRevision.manualOverrideTotal)
      : null,
    overrideReason: estimate.currentRevision.overrideReason,
    logo: logoBuffer,
  })

  const finalBody = signature ? `${body}\n\n${signature.content}` : body

  await sendEmail({
    to: toRecipients,
    cc: ccRecipients,
    bcc: bccRecipients,
    subject,
    html: finalBody,
    attachments: [
      {
        filename: `${estimate.quoteNumber}-quote.pdf`,
        content: pdfBuffer,
      },
    ],
  })

  await prisma.estimateEmail.create({
    data: {
      companyId,
      estimateId: estimate.id,
      revisionId: estimate.currentRevision.id,
      templateId,
      signatureId,
      toRecipients,
      ccRecipients,
      bccRecipients,
      subject,
      body: finalBody,
      sentById: userId,
    },
  })

  await logEstimateEvent(companyId, userId, 'EMAIL_SENT', estimate.id, { subject })
  await logEstimateEvent(companyId, userId, 'ESTIMATE_EMAILED', estimate.id)
  revalidatePath(DASHBOARD_PATH)
  return { success: true }
}

export async function updatePresetDetailsAction(formData: FormData) {
  const { companyId } = await requireEstimatingContext()
  const presetId = formData.get('presetId')?.toString()
  if (!presetId) throw new Error('Preset id required')

  const label = formData.get('label')?.toString().trim()
  const description = formData.get('description')?.toString().trim()
  const unit = formData.get('unit')?.toString().trim()
  const unitCost = parseNumberField(formData.get('unitCost'), 0)

  if (!label || !description || !unit) {
    throw new Error('Label, description, and unit required')
  }

  await prisma.estimatingPreset.update({
    where: { id: presetId, companyId },
    data: {
      label,
      defaultDescription: description,
      defaultUnit: unit,
      defaultUnitCost: new Prisma.Decimal(unitCost),
    },
  })

  revalidatePath(DASHBOARD_PATH)
}

export async function togglePresetAction(formData: FormData) {
  const { companyId } = await requireEstimatingContext()
  const presetId = formData.get('presetId')?.toString()
  const enabled = formData.get('enabled') === 'true'
  if (!presetId) throw new Error('Preset id required')

  const preset = await prisma.estimatingPreset.findFirst({ where: { id: presetId, companyId } })
  if (!preset) throw new Error('Preset not found')
  if (preset.isOther && !enabled) {
    throw new Error('Mandatory presets cannot be disabled')
  }

  await prisma.estimatingPreset.update({ where: { id: presetId }, data: { enabled } })
  revalidatePath(DASHBOARD_PATH)
}

export async function reorderPresetAction(formData: FormData) {
  const { companyId } = await requireEstimatingContext()
  const presetId = formData.get('presetId')?.toString()
  const direction = formData.get('direction')?.toString()
  if (!presetId || !direction) throw new Error('Invalid reorder payload')

  const preset = await prisma.estimatingPreset.findFirst({ where: { id: presetId, companyId } })
  if (!preset) throw new Error('Preset not found')

  const siblings = await prisma.estimatingPreset.findMany({
    where: { companyId, industry: preset.industry },
    orderBy: { sortOrder: 'asc' },
  })

  const index = siblings.findIndex((item) => item.id === presetId)
  if (index === -1) return
  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= siblings.length) return

  const target = siblings[swapWith]

  await prisma.$transaction([
    prisma.estimatingPreset.update({ where: { id: preset.id }, data: { sortOrder: target.sortOrder } }),
    prisma.estimatingPreset.update({ where: { id: target.id }, data: { sortOrder: preset.sortOrder } }),
  ])

  revalidatePath(DASHBOARD_PATH)
}

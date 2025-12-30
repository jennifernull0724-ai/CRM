'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enforceCanEstimate } from '@/lib/billing/enforcement'
import { generateEstimatePdf, type GenerateEstimatePdfParams } from '@/lib/estimating/pdf'
import { getDownloadUrl, getFileBuffer, uploadEstimatePdf } from '@/lib/s3'
import { sendContactEmail } from '@/lib/email/service'
import { normalizeRecipientList } from '@/lib/email/recipients'
import { deriveCompanyNameFromEmail } from '@/lib/contacts/deriveCompany'
import type { AccessAuditAction, EstimateDocumentKind, EstimateIndustry } from '@prisma/client'
import { Prisma, EstimateStatus } from '@prisma/client'

const ESTIMATING_PATHS = ['/estimating']
const BRANDING_PDF_LOGO_KEY = 'branding_pdf_logo'

const ESTIMATE_WITH_REVISION_INCLUDE = {
  contact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      derivedCompanyName: true,
      companyOverrideName: true,
    },
  },
  currentRevision: {
    include: {
      lineItems: true,
    },
  },
} as const

type EstimateWithRevision = Prisma.EstimateGetPayload<{
  include: typeof ESTIMATE_WITH_REVISION_INCLUDE
}>

type DefinedEstimateWithRevision = EstimateWithRevision & {
  currentRevision: NonNullable<EstimateWithRevision['currentRevision']>
}

type ActionResponse<T = unknown> = { success: true; data?: T } | { success: false; error: string }

type EstimatingContext = {
  userId: string
  companyId: string
  role: string
}

function revalidateEstimatingPaths(estimateId?: string) {
  for (const path of ESTIMATING_PATHS) {
    revalidatePath(path)
  }
  if (estimateId) {
    revalidatePath(`/estimating/${estimateId}`)
  }
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

async function ensureEstimateWithRevision(estimateId: string, companyId: string): Promise<DefinedEstimateWithRevision> {
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: ESTIMATE_WITH_REVISION_INCLUDE,
  })

  if (!estimate || !estimate.currentRevision) {
    throw new Error('Estimate not found')
  }

  return estimate as DefinedEstimateWithRevision
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

function deriveContactCompany(contact: { companyOverrideName?: string | null; derivedCompanyName?: string; email: string }) {
  return (
    contact.companyOverrideName?.trim() ||
    contact.derivedCompanyName?.trim() ||
    deriveCompanyNameFromEmail(contact.email) ||
    null
  )
}

async function allocateEstimatePdfVersion(estimateId: string, revisionId: string): Promise<number> {
  const count = await prisma.estimateDocument.count({ where: { estimateId, revisionId } })
  return count + 1
}

async function createEstimatePdfVersion(params: {
  estimateId: string
  companyId: string
  actorId: string
  variant: QuoteVariant
}) {
  const estimate = await prisma.estimate.findFirst({
    where: { id: params.estimateId, companyId: params.companyId },
    include: {
      company: { select: { name: true } },
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          derivedCompanyName: true,
          companyOverrideName: true,
        },
      },
      currentRevision: { include: { lineItems: true } },
    },
  })

  if (!estimate || !estimate.currentRevision) {
    throw new Error('Estimate not found')
  }

  const generatedAt = new Date()
  const logoBuffer = await getPdfLogo(params.companyId)
  const pdfVersion = await allocateEstimatePdfVersion(estimate.id, estimate.currentRevision.id)
  const pdfVersionId = randomUUID()
  const contactCompany = deriveContactCompany(estimate.contact)

  const pdfPayload: GenerateEstimatePdfParams = {
    variant: params.variant,
    quoteNumber: estimate.quoteNumber,
    revisionNumber: estimate.currentRevision.revisionNumber,
    companyName: estimate.company.name,
    projectName: estimate.currentRevision.projectName,
    projectLocation: estimate.currentRevision.projectLocation,
    industry: estimate.currentRevision.industry,
    contactName: `${estimate.contact.firstName} ${estimate.contact.lastName}`.trim(),
    contactEmail: estimate.contact.email,
    contactCompany,
    createdDate: estimate.createdAt,
    generatedAt,
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
  const uploadResult = await uploadEstimatePdf({
    file: pdfBuffer,
    companyId: params.companyId,
    estimateId: estimate.id,
    revisionNumber: estimate.currentRevision.revisionNumber,
    variant: params.variant,
    pdfVersion,
    pdfVersionId,
  })

  const document = await prisma.estimateDocument.create({
    data: {
      id: pdfVersionId,
      companyId: params.companyId,
      estimateId: estimate.id,
      revisionId: estimate.currentRevision.id,
      contactId: estimate.contact.id,
      kind: params.variant === 'quote' ? ('QUOTE' as EstimateDocumentKind) : ('ESTIMATE' as EstimateDocumentKind),
      storageKey: uploadResult.key,
      fileName: `${estimate.quoteNumber}-rev${estimate.currentRevision.revisionNumber}-v${pdfVersion}-${params.variant}.pdf`,
      fileSize: uploadResult.size,
      hash: uploadResult.hash,
      generatedById: params.actorId,
    },
  })

  await logEstimateEvent(params.companyId, params.actorId, 'PDF_GENERATED', estimate.id, {
    pdfDocumentId: document.id,
    pdfVersion,
    revisionNumber: estimate.currentRevision.revisionNumber,
    variant: params.variant,
    storageKey: uploadResult.key,
    timestamp: generatedAt.toISOString(),
  })

  return {
    pdfBuffer,
    document,
    pdfVersion,
    revisionNumber: estimate.currentRevision.revisionNumber,
    variant: params.variant,
    generatedAt,
    storageKey: uploadResult.key,
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
          currentRevisionNumber: 1,
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
  revalidateEstimatingPaths(revision.estimateId)
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
        presetCategory: item.presetCategory,
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
      currentRevisionNumber: newRevisionNumber,
      revisionCount: { increment: 1 },
      currentRevisionId: newRevision.id,
    },
  })

  await logEstimateEvent(companyId, userId, 'ESTIMATE_UPDATED', estimate.id, { revisionNumber: newRevisionNumber })
  revalidateEstimatingPaths(estimate.id)
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
  revalidateEstimatingPaths(estimate.id)
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
        presetCategory: preset.industry,
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
        presetCategory: preset.industry,
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
  revalidateEstimatingPaths(estimate.id)
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
  revalidateEstimatingPaths(lineItem.estimateId)
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
  revalidateEstimatingPaths(estimateId)
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
  revalidateEstimatingPaths(estimate.id)
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
  await logEstimateEvent(companyId, userId, 'ESTIMATE_SUBMITTED', estimate.id, { revision: revision.revisionNumber })
  revalidateEstimatingPaths(estimate.id)
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
  revalidateEstimatingPaths(estimate.id)
}

export async function returnEstimateToUserAction(formData: FormData) {
  const { userId, companyId } = await requireEstimatingContext()
  const estimateId = formData.get('estimateId')?.toString()
  const reason = formData.get('reason')?.toString().trim() || 'Returned for revisions'
  if (!estimateId) throw new Error('Estimate id required')

  const estimate = await ensureEstimateWithRevision(estimateId, companyId)

  if (estimate.status !== 'AWAITING_APPROVAL') {
    throw new Error('Only submitted estimates can be returned')
  }

  await prisma.$transaction([
    prisma.estimateRevision.update({
      where: { id: estimate.currentRevision.id },
      data: { status: EstimateStatus.RETURNED_TO_USER, notes: reason, locked: false },
    }),
    prisma.estimate.update({ where: { id: estimate.id }, data: { status: EstimateStatus.RETURNED_TO_USER } }),
  ])

  await logEstimateEvent(companyId, userId, 'ESTIMATE_RETURNED_TO_USER', estimate.id, { reason })
  revalidateEstimatingPaths(estimate.id)
}

export async function sendEstimateToDispatchAction(formData: FormData) {
  const { userId, companyId } = await requireEstimatingContext()
  const estimateId = formData.get('estimateId')?.toString()
  if (!estimateId) throw new Error('Estimate id required')

  const estimate = await prisma.estimate.findFirst({ where: { id: estimateId, companyId }, select: { id: true, status: true, sentToDispatchAt: true, contactId: true } })
  if (!estimate) throw new Error('Estimate not found')
  if (estimate.status !== 'APPROVED') {
    throw new Error('Estimate must be approved before dispatch')
  }

  const queuedAt = new Date()
  const existingRequest = await prisma.dispatchRequest.findFirst({ where: { estimateId: estimate.id, companyId } })

  if (existingRequest) {
    await prisma.dispatchRequest.update({ where: { id: existingRequest.id }, data: { status: 'QUEUED', queuedAt } })
  } else {
    await prisma.dispatchRequest.create({ data: { companyId, estimateId: estimate.id, contactId: estimate.contactId, status: 'QUEUED', queuedAt } })
  }

  await prisma.estimate.update({
    where: { id: estimate.id },
    data: { status: 'SENT_TO_DISPATCH', sentToDispatchAt: queuedAt, sentToDispatchById: userId },
  })
  await logEstimateEvent(companyId, userId, 'ESTIMATE_SENT_TO_DISPATCH', estimate.id)
  revalidateEstimatingPaths(estimate.id)
}

export async function generateEstimatePdfAction(formData: FormData): Promise<ActionResponse<{ url: string }>> {
  const { userId, companyId } = await requireEstimatingContext()
  const estimateId = formData.get('estimateId')?.toString()
  const variant = (formData.get('variant')?.toString() ?? 'estimate') as QuoteVariant
  if (!estimateId) return { success: false, error: 'Estimate id required' }

  const pdfVersion = await createEstimatePdfVersion({
    estimateId,
    companyId,
    actorId: userId,
    variant,
  })

  revalidateEstimatingPaths(estimateId)

  const url = await getDownloadUrl(pdfVersion.storageKey, 900)
  return { success: true, data: { url } }
}

export async function emailEstimateAction(formData: FormData): Promise<ActionResponse> {
  const { userId, companyId } = await requireEstimatingContext()
  const estimateId = formData.get('estimateId')?.toString()
  const accountId = formData.get('accountId')?.toString()
  const variant = (formData.get('variant')?.toString() ?? 'quote') as QuoteVariant

  if (!estimateId) return { success: false, error: 'Estimate id required' }
  if (!accountId) return { success: false, error: 'Email account is required' }

  const toRecipients = normalizeRecipientList(formData.get('to')?.toString())
  const ccRecipients = normalizeRecipientList(formData.get('cc')?.toString())
  const bccRecipients = normalizeRecipientList(formData.get('bcc')?.toString())
  const subject = formData.get('subject')?.toString().trim()
  const bodyHtml = formData.get('bodyHtml')?.toString().trim() ?? formData.get('body')?.toString().trim() ?? ''
  const bodyTextInput = formData.get('bodyText')?.toString().trim() ?? ''
  const templateId = formData.get('templateId')?.toString() || null
  const signatureId = formData.get('signatureId')?.toString() || null

  if (!subject || !bodyHtml) {
    return { success: false, error: 'Subject and body are required' }
  }

  if (!toRecipients.length) {
    return { success: false, error: 'At least one primary recipient is required' }
  }

  const allRecipientEmails = [...toRecipients, ...ccRecipients, ...bccRecipients].map((recipient) => recipient.email)
  await ensureRecipientsAllowed(companyId, allRecipientEmails)

  const estimate = await ensureEstimateWithRevision(estimateId, companyId)
  const contactEmail = estimate.contact.email.toLowerCase()
  const includesContact = allRecipientEmails.some((email) => email.toLowerCase() === contactEmail)
  if (!includesContact) {
    return { success: false, error: 'Contact email must be included' }
  }

  const template = templateId
    ? await prisma.emailTemplate.findFirst({ where: { id: templateId, companyId, scope: { in: ['estimating', 'global'] } } })
    : null
  if (templateId && !template) {
    return { success: false, error: 'Template not found or not authorized' }
  }

  const selectedSignature = signatureId
    ? await prisma.emailSignature.findFirst({ where: { id: signatureId, companyId } })
    : await prisma.emailSignature.findFirst({ where: { companyId, isActive: true }, orderBy: { updatedAt: 'desc' } })

  if (signatureId && !selectedSignature) {
    return { success: false, error: 'Signature not found' }
  }

  const finalHtml = selectedSignature ? `${bodyHtml}\n\n${selectedSignature.content}` : bodyHtml
  const textBody = bodyTextInput || finalHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  const pdfVersion = await createEstimatePdfVersion({
    estimateId,
    companyId,
    actorId: userId,
    variant,
  })

  const attachmentName = `${estimate.quoteNumber}-rev${pdfVersion.revisionNumber}-v${pdfVersion.pdfVersion}-${variant}.pdf`

  const emailRecord = await sendContactEmail({
    accountId,
    companyId,
    contactId: estimate.contact.id,
    authorId: userId,
    to: toRecipients,
    cc: ccRecipients.length ? ccRecipients : undefined,
    bcc: bccRecipients.length ? bccRecipients : undefined,
    subject,
    html: finalHtml,
    text: textBody,
    attachments: [
      {
        filename: attachmentName,
        contentType: 'application/pdf',
        buffer: pdfVersion.pdfBuffer,
      },
    ],
  })

  await prisma.estimateEmail.create({
    data: {
      companyId,
      estimateId: estimate.id,
      revisionId: estimate.currentRevision.id,
      contactId: estimate.contact.id,
      templateId: template?.id ?? null,
      signatureId: selectedSignature?.id ?? null,
      pdfDocumentId: pdfVersion.document.id,
      toRecipients: toRecipients.map((recipient) => recipient.email),
      ccRecipients: ccRecipients.map((recipient) => recipient.email),
      bccRecipients: bccRecipients.map((recipient) => recipient.email),
      subject,
      body: finalHtml,
      sentById: userId,
    },
  })

  const timestamp = new Date().toISOString()
  await logEstimateEvent(companyId, userId, 'EMAIL_SENT', estimateId, {
    contactId: estimate.contact.id,
    recipients: {
      to: toRecipients.map((recipient) => recipient.email),
      cc: ccRecipients.map((recipient) => recipient.email),
      bcc: bccRecipients.map((recipient) => recipient.email),
    },
    subject,
    pdfDocumentId: pdfVersion.document.id,
    pdfVersion: pdfVersion.pdfVersion,
    variant,
    timestamp,
    accountId,
    templateId: template?.id ?? null,
    signatureId: selectedSignature?.id ?? null,
    emailId: emailRecord.id,
  })
  await logEstimateEvent(companyId, userId, 'ESTIMATE_EMAILED', estimateId)
  revalidateEstimatingPaths(estimateId)
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

  revalidateEstimatingPaths()
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
  revalidateEstimatingPaths()
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

  revalidateEstimatingPaths()
}

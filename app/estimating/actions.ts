'use server'

import { getServerSession } from 'next-auth'
import type { EstimateIndustry } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_QUOTE_ATTEMPTS = 12

type EstimatingContext = {
  userId: string
  companyId: string
}

type CreateEstimateInput = {
  contactId: string
  projectName: string
  projectLocation?: string | null
  industry: EstimateIndustry
  scopeOfWork: string
  assumptions?: string | null
  exclusions?: string | null
}

type CreateRevisionInput = {
  estimateId: string
}

type CreateEstimateResult = {
  estimateId: string
  revisionId: string
  quoteNumber: string
}

type CreateRevisionResult = {
  estimateId: string
  revisionId: string
  revisionNumber: number
}

type AuditClient = Pick<typeof prisma, 'accessAuditLog'>

async function requireEstimatingContext(): Promise<EstimatingContext> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    throw new Error('Unauthorized')
  }

  return { userId: session.user.id, companyId: session.user.companyId }
}

async function ensureContact(companyId: string, contactId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, companyId },
    select: { id: true, firstName: true, lastName: true, email: true },
  })

  if (!contact) {
    throw new Error('Contact not found for this company')
  }

  return contact
}

function sanitizeRichText(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function buildQuoteNumber(now: Date, suffix: number): string {
  const pad = (value: number) => value.toString().padStart(2, '0')
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  return `Q${datePart}-${suffix.toString().padStart(4, '0')}`
}

async function generateQuoteNumber(companyId: string): Promise<string> {
  const now = new Date()

  for (let attempt = 0; attempt < MAX_QUOTE_ATTEMPTS; attempt += 1) {
    const suffix = Math.floor(1 + Math.random() * 9999)
    const candidate = buildQuoteNumber(now, suffix)
    const existing = await prisma.estimate.findFirst({ where: { companyId, quoteNumber: candidate } })
    if (!existing) {
      return candidate
    }
  }

  throw new Error('Unable to generate a unique quote number')
}

async function logAuditEvent(client: AuditClient, companyId: string, actorId: string, action: string, metadata: Record<string, unknown>) {
  await client.accessAuditLog.create({
    data: {
      companyId,
      actorId,
      action,
      metadata,
    },
  })
}

export async function createEstimate(input: CreateEstimateInput): Promise<CreateEstimateResult> {
  const { userId, companyId } = await requireEstimatingContext()

  const projectName = input.projectName.trim()
  const projectLocation = input.projectLocation?.trim() || null
  const scopeOfWork = sanitizeRichText(input.scopeOfWork)
  const assumptions = sanitizeRichText(input.assumptions ?? null)
  const exclusions = sanitizeRichText(input.exclusions ?? null)

  if (!input.contactId || !projectName || !scopeOfWork) {
    throw new Error('Contact, project name, and scope of work are required')
  }

  const contact = await ensureContact(companyId, input.contactId)
  const quoteNumber = await generateQuoteNumber(companyId)
  const timestamp = new Date()

  const result = await prisma.$transaction(async (tx) => {
    const estimate = await tx.estimate.create({
      data: {
        companyId,
        contactId: contact.id,
        projectName,
        projectLocation,
        industry: input.industry,
        quoteNumber,
        status: 'DRAFT',
        createdById: userId,
        currentRevisionNumber: 1,
        revisionCount: 1,
      },
    })

    const revision = await tx.estimateRevision.create({
      data: {
        estimateId: estimate.id,
        revisionNumber: 1,
        status: 'DRAFT',
        quoteNumber,
        projectName,
        projectLocation,
        industry: input.industry,
        scopeOfWork,
        assumptions,
        exclusions,
        contactNameSnapshot: `${contact.firstName} ${contact.lastName}`.trim(),
        contactEmailSnapshot: contact.email,
        createdById: userId,
      },
    })

    await tx.estimate.update({ where: { id: estimate.id }, data: { currentRevisionId: revision.id } })

    await tx.contact.update({
      where: { id: contact.id },
      data: { lastActivityAt: timestamp, activityState: 'ACTIVE' },
    })

    await tx.activity.create({
      data: {
        companyId,
        contactId: contact.id,
        userId,
        type: 'ESTIMATE_CREATED',
        subject: `Estimate created: ${projectName}`,
        description: `Quote ${quoteNumber}`,
        metadata: {
          estimateId: estimate.id,
          revisionId: revision.id,
          quoteNumber,
        },
      },
    })

    await logAuditEvent(tx, companyId, userId, 'ESTIMATE_CREATED', {
      estimateId: estimate.id,
      quoteNumber,
      revisionId: revision.id,
      timestamp: timestamp.toISOString(),
    })

    await logAuditEvent(tx, companyId, userId, 'ESTIMATE_REVISION_CREATED', {
      estimateId: estimate.id,
      revisionId: revision.id,
      revisionNumber: 1,
      quoteNumber,
      timestamp: timestamp.toISOString(),
    })

    await logAuditEvent(tx, companyId, userId, 'ESTIMATE_UPDATED', {
      estimateId: estimate.id,
      currentRevisionNumber: 1,
      timestamp: timestamp.toISOString(),
    })

    return { estimateId: estimate.id, revisionId: revision.id, quoteNumber }
  })

  return result
}

export async function createEstimateRevision(input: CreateRevisionInput): Promise<CreateRevisionResult> {
  const { userId, companyId } = await requireEstimatingContext()

  if (!input.estimateId) {
    throw new Error('Estimate id is required')
  }

  const estimate = await prisma.estimate.findFirst({
    where: { id: input.estimateId, companyId },
    include: {
      contact: { select: { firstName: true, lastName: true, email: true } },
      currentRevision: true,
    },
  })

  if (!estimate || !estimate.currentRevision) {
    throw new Error('Estimate not found')
  }

  const revisionNumber = (estimate.currentRevisionNumber ?? 0) + 1
  const timestamp = new Date()
  const contactName = `${estimate.contact.firstName} ${estimate.contact.lastName}`.trim()

  const result = await prisma.$transaction(async (tx) => {
    const revision = await tx.estimateRevision.create({
      data: {
        estimateId: estimate.id,
        revisionNumber,
        status: 'DRAFT',
        quoteNumber: estimate.quoteNumber,
        projectName: estimate.currentRevision.projectName,
        projectLocation: estimate.currentRevision.projectLocation,
        industry: estimate.currentRevision.industry,
        scopeOfWork: estimate.currentRevision.scopeOfWork,
        assumptions: estimate.currentRevision.assumptions,
        exclusions: estimate.currentRevision.exclusions,
        contactNameSnapshot: contactName,
        contactEmailSnapshot: estimate.contact.email,
        createdById: userId,
      },
    })

    await tx.estimate.update({
      where: { id: estimate.id },
      data: {
        status: 'DRAFT',
        currentRevisionId: revision.id,
        currentRevisionNumber: revisionNumber,
        revisionCount: { increment: 1 },
      },
    })

    await logAuditEvent(tx, companyId, userId, 'ESTIMATE_REVISION_CREATED', {
      estimateId: estimate.id,
      revisionId: revision.id,
      revisionNumber,
      quoteNumber: estimate.quoteNumber,
      timestamp: timestamp.toISOString(),
    })

    await logAuditEvent(tx, companyId, userId, 'ESTIMATE_UPDATED', {
      estimateId: estimate.id,
      currentRevisionNumber: revisionNumber,
      timestamp: timestamp.toISOString(),
    })

    return { estimateId: estimate.id, revisionId: revision.id, revisionNumber }
  })

  return result
}

import type { EstimateStatus, EstimateIndustry } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export type CrmEstimateReadonly = {
  deal: {
    id: string
    name: string
    stage: string
  }
  estimate: {
    id: string
    quoteNumber: string
    status: EstimateStatus
  }
  revision: {
    id: string
    revisionNumber: number
    projectName: string
    projectLocation: string | null
    industry: EstimateIndustry
    updatedAt: Date
    subtotal: number
    markupPercent: number | null
    markupAmount: number | null
    overheadPercent: number | null
    overheadAmount: number | null
    grandTotal: number
    manualOverrideTotal: number | null
    overrideReason: string | null
  }
  contact: {
    id: string
    name: string
    email: string | null
  }
  document: {
    id: string
    fileName: string
    storageKey: string
    fileSize: number
    generatedAt: Date
    hash: string
  }
}

export async function loadCrmEstimateReadonly(companyId: string, userId: string, dealId: string): Promise<CrmEstimateReadonly | null> {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, companyId, createdById: userId },
    select: {
      id: true,
      name: true,
      stage: true,
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      estimate: { select: { id: true, quoteNumber: true, status: true } },
    },
  })

  if (!deal || !deal.estimate) {
    return null
  }

  const revision = await prisma.estimateRevision.findFirst({
    where: { estimateId: deal.estimate.id, status: 'APPROVED' },
    orderBy: { revisionNumber: 'desc' },
    select: {
      id: true,
      revisionNumber: true,
      projectName: true,
      projectLocation: true,
      industry: true,
      updatedAt: true,
      subtotal: true,
      markupPercent: true,
      markupAmount: true,
      overheadPercent: true,
      overheadAmount: true,
      grandTotal: true,
      manualOverrideTotal: true,
      overrideReason: true,
    },
  })

  if (!revision) {
    return null
  }

  const document = await prisma.estimateDocument.findFirst({
    where: { estimateId: deal.estimate.id, revisionId: revision.id, kind: 'QUOTE' },
    orderBy: { generatedAt: 'desc' },
    select: { id: true, fileName: true, storageKey: true, fileSize: true, generatedAt: true, hash: true },
  })

  if (!document) {
    return null
  }

  return {
    deal: { id: deal.id, name: deal.name, stage: deal.stage },
    estimate: { id: deal.estimate.id, quoteNumber: deal.estimate.quoteNumber, status: deal.estimate.status },
    revision: {
      id: revision.id,
      revisionNumber: revision.revisionNumber,
      projectName: revision.projectName,
      projectLocation: revision.projectLocation,
      industry: revision.industry,
      updatedAt: revision.updatedAt,
      subtotal: Number(revision.subtotal),
      markupPercent: revision.markupPercent ? Number(revision.markupPercent) : null,
      markupAmount: revision.markupAmount ? Number(revision.markupAmount) : null,
      overheadPercent: revision.overheadPercent ? Number(revision.overheadPercent) : null,
      overheadAmount: revision.overheadAmount ? Number(revision.overheadAmount) : null,
      grandTotal: Number(revision.grandTotal),
      manualOverrideTotal: revision.manualOverrideTotal ? Number(revision.manualOverrideTotal) : null,
      overrideReason: revision.overrideReason,
    },
    contact: {
      id: deal.contact.id,
      name: `${deal.contact.firstName} ${deal.contact.lastName}`.trim(),
      email: deal.contact.email,
    },
    document,
  }
}

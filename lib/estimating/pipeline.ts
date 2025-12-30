import { prisma } from '@/lib/prisma'
import type { EstimateIndustry, EstimateStatus } from '@prisma/client'

export const PIPELINE_STATUSES: EstimateStatus[] = ['DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'RETURNED_TO_USER', 'SENT_TO_DISPATCH']

export type PipelineFilters = {
  status?: EstimateStatus | null
  industry?: EstimateIndustry | null
  contactId?: string | null
  createdFrom?: Date | null
  createdTo?: Date | null
  updatedFrom?: Date | null
  updatedTo?: Date | null
}

export type PipelineRow = {
  id: string
  quoteNumber: string
  status: EstimateStatus
  contactName: string
  contactEmail: string | null
  projectName: string
  industry: EstimateIndustry
  total: number | null
  revisionNumber: number
  updatedAt: Date
  createdAt: Date
}

export type PipelineBuckets = Record<EstimateStatus, PipelineRow[]>

function buildFilters(companyId: string, filters: PipelineFilters) {
  const where: Record<string, unknown> = { companyId }

  if (filters.status) {
    where.status = filters.status
  }
  if (filters.industry) {
    where.industry = filters.industry
  }
  if (filters.contactId) {
    where.contactId = filters.contactId
  }
  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {
      ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
      ...(filters.createdTo ? { lte: filters.createdTo } : {}),
    }
  }
  if (filters.updatedFrom || filters.updatedTo) {
    where.updatedAt = {
      ...(filters.updatedFrom ? { gte: filters.updatedFrom } : {}),
      ...(filters.updatedTo ? { lte: filters.updatedTo } : {}),
    }
  }

  return where
}

export async function loadEstimatingPipeline(companyId: string, filters: PipelineFilters): Promise<PipelineBuckets> {
  const where = buildFilters(companyId, filters)

  const estimates = await prisma.estimate.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      contact: { select: { firstName: true, lastName: true, email: true } },
      currentRevision: {
        select: {
          revisionNumber: true,
          industry: true,
          grandTotal: true,
          subtotal: true,
        },
      },
    },
  })

  const buckets: PipelineBuckets = {
    DRAFT: [],
    AWAITING_APPROVAL: [],
    APPROVED: [],
    RETURNED_TO_USER: [],
    SENT_TO_DISPATCH: [],
  }

  for (const estimate of estimates) {
    if (!estimate.currentRevision) {
      continue
    }

    const contactName = `${estimate.contact.firstName} ${estimate.contact.lastName}`.trim()
    const totalNumber = estimate.currentRevision.grandTotal ? Number(estimate.currentRevision.grandTotal) : null

    const row: PipelineRow = {
      id: estimate.id,
      quoteNumber: estimate.quoteNumber,
      status: estimate.status,
      contactName,
      contactEmail: estimate.contact.email,
      projectName: estimate.currentRevision.projectName,
      industry: estimate.currentRevision.industry,
      total: Number.isFinite(totalNumber) ? totalNumber : null,
      revisionNumber: estimate.currentRevision.revisionNumber,
      updatedAt: estimate.updatedAt,
      createdAt: estimate.createdAt,
    }

    if (PIPELINE_STATUSES.includes(estimate.status)) {
      buckets[estimate.status].push(row)
    }
  }

  return buckets
}

import { prisma } from '@/lib/prisma'
import { listEstimatingPresets } from '@/lib/estimating/presets'
import { loadStandardSettings, type StandardSettingsData } from '@/lib/dashboard/standardSettings'
import type {
  Estimate,
  EstimateDocument,
  EstimateDocumentKind,
  EstimateEmail,
  EstimateIndustry,
  EstimateLineItem,
  EstimateStatus,
  EstimatingPreset,
} from '@prisma/client'

export type PipelineEstimateRow = {
  id: string
  quoteNumber: string
  status: EstimateStatus
  revisionNumber: number
  contact: {
    id: string
    name: string
    email: string | null
  }
  projectName: string
  industry: EstimateIndustry
  total: number
  lastUpdated: Date
}

export type EstimatingAnalytics = {
  totalsByStatus: Record<EstimateStatus, number>
  totalEstimates: number
  approvedEstimates: number
  returnedEstimates: number
  sentToDispatch: number
  revisionFrequency: number
  approvalTurnaroundHours: number
  conversionRate: number
  awaitingApprovals: PipelineEstimateRow[]
  recentApprovals: Array<{ id: string; quoteNumber: string; approvedAt: Date; revisionNumber: number }>
  returnedQueue: PipelineEstimateRow[]
}

type AnalyticsScope = { kind: 'company' } | { kind: 'user'; userId: string }

export type EstimateWorkspaceData = {
  estimate: Pick<Estimate, 'id' | 'status' | 'quoteNumber' | 'createdAt' | 'sentToDispatchAt' | 'approvedAt'> & {
    contact: { id: string; name: string; email: string | null }
    createdBy: { id: string; name: string | null }
    currentRevisionId: string
    revisionCount: number
  }
  revision: {
    id: string
    revisionNumber: number
    status: EstimateStatus
    projectName: string
    projectLocation: string | null
    industry: EstimateIndustry
    scopeOfWork: string
    assumptions: string | null
    exclusions: string | null
    subtotal: number
    markupPercent: number | null
    markupAmount: number | null
    overheadPercent: number | null
    overheadAmount: number | null
    grandTotal: number
    manualOverrideTotal: number | null
    overrideReason: string | null
    locked: boolean
    updatedAt: Date
  }
  lineItems: Array<EstimateLineItem & { quantity: number; unitCost: number; lineTotal: number }>
  documents: EstimateDocument[]
  emails: EstimateEmail[]
  revisionHistory: Array<{
    id: string
    revisionNumber: number
    status: EstimateStatus
    createdAt: Date
    submittedAt: Date | null
    approvedAt: Date | null
  }>
  dispatchRequestId: string | null
}

export type ContactOption = {
  id: string
  name: string
  email: string | null
}

export type DealOption = {
  id: string
  name: string
  stage: string
}

export type EstimatingDashboardPayload = {
  pipelines: Record<EstimateStatus, PipelineEstimateRow[]>
  analytics: EstimatingAnalytics
  presets: EstimatingPreset[]
  contacts: ContactOption[]
  deals: DealOption[]
  selectedEstimate: EstimateWorkspaceData | null
  settings: StandardSettingsData
}

const PIPELINE_STATUSES: EstimateStatus[] = [
  'DRAFT',
  'AWAITING_APPROVAL',
  'APPROVED',
  'RETURNED_TO_USER',
  'SENT_TO_DISPATCH',
]

function decimalToNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }
  if (!value) {
    return 0
  }
  try {
    return Number(value)
  } catch {
    return 0
  }
}

function mapPipelineRow(estimate: Awaited<ReturnType<typeof fetchPipelineEstimates>>[number]): PipelineEstimateRow | null {
  if (!estimate.currentRevision) {
    return null
  }
  const contactName = `${estimate.contact.firstName} ${estimate.contact.lastName}`.trim()
  return {
    id: estimate.id,
    quoteNumber: estimate.quoteNumber,
    status: estimate.status,
    revisionNumber: estimate.currentRevision.revisionNumber,
    contact: {
      id: estimate.contact.id,
      name: contactName,
      email: estimate.contact.email,
    },
    projectName: estimate.currentRevision.projectName,
    industry: estimate.currentRevision.industry,
    total: decimalToNumber(estimate.currentRevision.grandTotal),
    lastUpdated: estimate.currentRevision.updatedAt,
  }
}

async function fetchPipelineEstimates(companyId: string, scope: AnalyticsScope) {
  return prisma.estimate.findMany({
    where: {
      companyId,
      ...(scope.kind === 'user' ? { createdById: scope.userId } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      status: true,
      quoteNumber: true,
      revisionCount: true,
      createdById: true,
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      currentRevision: {
        select: {
          id: true,
          revisionNumber: true,
          projectName: true,
          industry: true,
          grandTotal: true,
          updatedAt: true,
        },
      },
    },
  })
}

async function fetchContacts(companyId: string): Promise<ContactOption[]> {
  const contacts = await prisma.contact.findMany({
    where: { companyId, archived: false },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    select: { id: true, firstName: true, lastName: true, email: true },
  })
  return contacts.map((contact) => ({
    id: contact.id,
    name: `${contact.firstName} ${contact.lastName}`.trim(),
    email: contact.email,
  }))
}

async function fetchDeals(companyId: string): Promise<DealOption[]> {
  const deals = await prisma.deal.findMany({
    where: { companyId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, stage: true },
    take: 50,
  })
  return deals
}

async function fetchSelectedEstimate(companyId: string, estimateId: string): Promise<EstimateWorkspaceData | null> {
  const record = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      currentRevision: {
        select: {
          id: true,
          revisionNumber: true,
          status: true,
          projectName: true,
          projectLocation: true,
          industry: true,
          scopeOfWork: true,
          assumptions: true,
          exclusions: true,
          subtotal: true,
          markupPercent: true,
          markupAmount: true,
          overheadPercent: true,
          overheadAmount: true,
          grandTotal: true,
          manualOverrideTotal: true,
          overrideReason: true,
          locked: true,
          updatedAt: true,
          lineItems: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
          documents: true,
          emails: { orderBy: { sentAt: 'desc' } },
        },
      },
      revisions: {
        orderBy: { revisionNumber: 'desc' },
        select: {
          id: true,
          revisionNumber: true,
          status: true,
          createdAt: true,
          submittedAt: true,
          approvedAt: true,
        },
      },
      dispatchRequests: { select: { id: true }, take: 1, orderBy: { createdAt: 'desc' } },
    },
  })

  if (!record || !record.currentRevision) {
    return null
  }

  const contactName = `${record.contact.firstName} ${record.contact.lastName}`.trim()
  const revision = record.currentRevision

  return {
    estimate: {
      id: record.id,
      status: record.status,
      quoteNumber: record.quoteNumber,
      createdAt: record.createdAt,
      sentToDispatchAt: record.sentToDispatchAt,
      approvedAt: record.approvedAt,
      contact: { id: record.contact.id, name: contactName, email: record.contact.email },
      createdBy: { id: record.createdBy.id, name: record.createdBy.name },
      currentRevisionId: revision.id,
      revisionCount: record.revisionCount,
    },
    revision: {
      id: revision.id,
      revisionNumber: revision.revisionNumber,
      status: revision.status,
      projectName: revision.projectName,
      projectLocation: revision.projectLocation,
      industry: revision.industry,
      scopeOfWork: revision.scopeOfWork,
      assumptions: revision.assumptions,
      exclusions: revision.exclusions,
      subtotal: decimalToNumber(revision.subtotal),
      markupPercent: revision.markupPercent ? decimalToNumber(revision.markupPercent) : null,
      markupAmount: revision.markupAmount ? decimalToNumber(revision.markupAmount) : null,
      overheadPercent: revision.overheadPercent ? decimalToNumber(revision.overheadPercent) : null,
      overheadAmount: revision.overheadAmount ? decimalToNumber(revision.overheadAmount) : null,
      grandTotal: decimalToNumber(revision.grandTotal),
      manualOverrideTotal: revision.manualOverrideTotal ? decimalToNumber(revision.manualOverrideTotal) : null,
      overrideReason: revision.overrideReason,
      locked: revision.locked,
      updatedAt: revision.updatedAt,
    },
    lineItems: revision.lineItems.map((item) => ({
      ...item,
      quantity: decimalToNumber(item.quantity),
      unitCost: decimalToNumber(item.unitCost),
      lineTotal: decimalToNumber(item.lineTotal),
    })),
    documents: revision.documents,
    emails: revision.emails,
    revisionHistory: record.revisions,
    dispatchRequestId: record.dispatchRequests[0]?.id ?? null,
  }
}

async function buildAnalytics(
  companyId: string,
  pipelineRows: PipelineEstimateRow[],
  scope: AnalyticsScope
): Promise<EstimatingAnalytics> {
  const totalsByStatus = pipelineRows.reduce<Record<EstimateStatus, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, Object.fromEntries(PIPELINE_STATUSES.map((status) => [status, 0])) as Record<EstimateStatus, number>)

  const totalEstimates = pipelineRows.length
  const approvedEstimates = totalsByStatus.APPROVED ?? 0
  const returnedEstimates = totalsByStatus.RETURNED_TO_USER ?? 0
  const sentToDispatch = totalsByStatus.SENT_TO_DISPATCH ?? 0
  const revisionFrequency = totalEstimates ? pipelineRows.reduce((acc, row) => acc + row.revisionNumber, 0) / totalEstimates : 0

  const approvedRevisions = await prisma.estimateRevision.findMany({
    where: {
      estimate: {
        companyId,
        ...(scope.kind === 'user' ? { createdById: scope.userId } : {}),
      },
      status: 'APPROVED',
      submittedAt: { not: null },
      approvedAt: { not: null },
    },
    select: {
      id: true,
      estimateId: true,
      revisionNumber: true,
      submittedAt: true,
      approvedAt: true,
      estimate: { select: { quoteNumber: true } },
    },
    orderBy: { approvedAt: 'desc' },
    take: 10,
  })

  const approvalDurations = approvedRevisions.map((revision) => {
    const submittedAt = revision.submittedAt as Date
    const approvedAt = revision.approvedAt as Date
    return (approvedAt.getTime() - submittedAt.getTime()) / (1000 * 60 * 60)
  })

  const approvalTurnaroundHours = approvalDurations.length
    ? approvalDurations.reduce((sum, hours) => sum + hours, 0) / approvalDurations.length
    : 0

  const conversionRate = approvedEstimates ? sentToDispatch / approvedEstimates : 0

  const awaitingApprovals = pipelineRows.filter((row) => row.status === 'AWAITING_APPROVAL')
  const returnedQueue = pipelineRows.filter((row) => row.status === 'RETURNED_TO_USER')

  return {
    totalsByStatus,
    totalEstimates,
    approvedEstimates,
    returnedEstimates,
    sentToDispatch,
    revisionFrequency,
    approvalTurnaroundHours,
    conversionRate,
    awaitingApprovals,
    returnedQueue,
    recentApprovals: approvedRevisions.map((revision) => ({
      id: revision.estimateId,
      quoteNumber: revision.estimate.quoteNumber,
      approvedAt: revision.approvedAt as Date,
      revisionNumber: revision.revisionNumber,
    })),
  }
}

export async function loadEstimatingDashboard(params: {
  companyId: string
  viewer: { role: 'user' | 'estimator' | 'admin' | 'owner'; userId: string }
  selectedEstimateId?: string | null
}): Promise<EstimatingDashboardPayload> {
  const { companyId, selectedEstimateId, viewer } = params
  const scope: AnalyticsScope = viewer.role === 'user' ? { kind: 'user', userId: viewer.userId } : { kind: 'company' }

  const [presets, contacts, deals, pipelineEstimates, settings] = await Promise.all([
    listEstimatingPresets(companyId),
    fetchContacts(companyId),
    fetchDeals(companyId),
    fetchPipelineEstimates(companyId, scope),
    loadStandardSettings(companyId),
  ])

  const pipelineRows = pipelineEstimates
    .map(mapPipelineRow)
    .filter((row): row is PipelineEstimateRow => Boolean(row))

  const pipelines = PIPELINE_STATUSES.reduce<Record<EstimateStatus, PipelineEstimateRow[]>>((acc, status) => {
    acc[status] = pipelineRows.filter((row) => row.status === status)
    return acc
  }, Object.fromEntries(PIPELINE_STATUSES.map((status) => [status, []])) as Record<EstimateStatus, PipelineEstimateRow[]>)

  const analytics = await buildAnalytics(companyId, pipelineRows, scope)

  const selectedEstimate = selectedEstimateId ? await fetchSelectedEstimate(companyId, selectedEstimateId) : null

  return {
    pipelines,
    analytics,
    presets,
    contacts,
    deals,
    selectedEstimate,
    settings,
  }
}

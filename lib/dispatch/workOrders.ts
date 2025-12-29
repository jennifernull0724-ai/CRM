import type {
  AssetStatus,
  ComplianceStatus,
  DispatchPresetScope,
  Prisma,
  WorkOrderActivityType,
  WorkOrderStatus,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { ComplianceGapSummary } from '@/lib/dispatch/compliance'

const DISPATCH_WORK_ORDER_INCLUDE = {
  contact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      jobTitle: true,
    },
  },
  dispatchRequest: {
    select: { status: true, priority: true },
  },
  assignments: {
    where: { unassignedAt: null },
    orderBy: { assignedAt: 'asc' },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          title: true,
          email: true,
          complianceStatus: true,
        },
      },
      assignedBy: { select: { name: true } },
      overrideActor: { select: { name: true } },
    },
  },
  assetAssignments: {
    orderBy: { assignedAt: 'asc' },
    include: {
      assignedBy: { select: { name: true } },
      removedBy: { select: { name: true } },
    },
  },
  activities: {
    orderBy: { createdAt: 'desc' },
    take: 12,
    include: {
      actor: { select: { name: true } },
    },
  },
  presets: {
    orderBy: { addedAt: 'asc' },
    include: {
      preset: {
        select: {
          id: true,
          name: true,
          scope: true,
          description: true,
          defaultNotes: true,
          locked: true,
          isOther: true,
          enabled: true,
        },
      },
      addedBy: { select: { name: true } },
    },
  },
} as const

type DispatchWorkOrderRecord = Prisma.WorkOrderGetPayload<{ include: typeof DISPATCH_WORK_ORDER_INCLUDE }>

export type DispatchAssignment = {
  id: string
  employeeId: string
  employeeName: string
  employeeRole: string
  employeeTitle: string
  employeeEmail: string | null
  complianceStatus: ComplianceStatus | null
  gapSummary: ComplianceGapSummary | null
  overrideAcknowledged: boolean
  overrideReason: string | null
  overrideActorName: string | null
  overrideAt: Date | null
  assignedAt: Date
  assignedByName: string | null
  complianceSnapshotHash: string | null
}

export type DispatchAssetAssignment = {
  id: string
  assetId: string
  assetName: string
  assetType: string
  assetNumber: string
  statusAtAssignment: AssetStatus
  assignedAt: Date
  assignedByName: string | null
  removedAt: Date | null
  removedByName: string | null
}

export type DispatchWorkOrder = {
  id: string
  title: string
  status: WorkOrderStatus
  manualEntry: boolean
  complianceBlocked: boolean
  blockReason: string | null
  createdAt: Date
  dispatchStatus: string | null
  dispatchPriority: string | null
  contact: {
    id: string
    name: string
    email: string
    jobTitle: string | null
  }
  assignments: DispatchAssignment[]
  assets: DispatchAssetAssignment[]
  activities: DispatchWorkOrderActivity[]
  presets: DispatchWorkOrderPreset[]
}

export type DispatchWorkOrderPreset = {
  id: string
  presetId: string
  name: string
  scope: DispatchPresetScope
  description: string | null
  defaultNotes: string | null
  overriddenNotes: string | null
  locked: boolean
  isOther: boolean
  enabled: boolean
  addedAt: Date
  addedByName: string | null
}

export type DispatchWorkOrderActivity = {
  id: string
  type: WorkOrderActivityType
  createdAt: Date
  actorName: string | null
  previousStatus: WorkOrderStatus | null
  newStatus: WorkOrderStatus | null
  metadata: Record<string, unknown> | null
}

export async function loadDispatchBoard(companyId: string): Promise<DispatchWorkOrder[]> {
  const workOrders = await prisma.workOrder.findMany({
    where: { companyId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 25,
    include: DISPATCH_WORK_ORDER_INCLUDE,
  })

  return workOrders.map(mapWorkOrder)
}

export async function getWorkOrderDetail(workOrderId: string, companyId: string): Promise<DispatchWorkOrder | null> {
  const [workOrder] = await loadDispatchBoardForIds(companyId, [workOrderId])
  return workOrder ?? null
}

async function loadDispatchBoardForIds(companyId: string, ids: string[]): Promise<DispatchWorkOrder[]> {
  if (!ids.length) {
    return []
  }

  const workOrders = await prisma.workOrder.findMany({
    where: { companyId, id: { in: ids } },
    include: DISPATCH_WORK_ORDER_INCLUDE,
  })

  const mapById = new Map<string, DispatchWorkOrder>()
  workOrders.forEach((order) => {
    mapById.set(order.id, mapWorkOrder(order))
  })

  return ids.map((id) => mapById.get(id)).filter((order): order is DispatchWorkOrder => Boolean(order))
}

function mapWorkOrder(record: DispatchWorkOrderRecord): DispatchWorkOrder {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    manualEntry: record.manualEntry,
    complianceBlocked: record.complianceBlocked,
    blockReason: record.blockReason,
    createdAt: record.createdAt,
    dispatchStatus: record.dispatchRequest?.status ?? null,
    dispatchPriority: record.dispatchRequest?.priority ?? null,
    contact: {
      id: record.contactId,
      name: `${record.contact.firstName} ${record.contact.lastName}`.trim(),
      email: record.contact.email,
      jobTitle: record.contact.jobTitle ?? null,
    },
    assignments: record.assignments.map((assignment) => ({
      id: assignment.id,
      employeeId: assignment.employeeId,
      employeeName: `${assignment.employee.firstName} ${assignment.employee.lastName}`.trim(),
      employeeRole: assignment.employee.role,
      employeeTitle: assignment.employee.title,
      employeeEmail: assignment.employee.email ?? null,
      complianceStatus: assignment.complianceStatus ?? assignment.employee.complianceStatus,
      gapSummary: assignment.gapSummary as ComplianceGapSummary | null,
      overrideAcknowledged: assignment.overrideAcknowledged,
      overrideReason: assignment.overrideReason,
      overrideActorName: assignment.overrideActor?.name ?? null,
      overrideAt: assignment.overrideAt ?? null,
      assignedAt: assignment.assignedAt,
      assignedByName: assignment.assignedBy?.name ?? null,
      complianceSnapshotHash: assignment.complianceSnapshotHash ?? null,
    })),
    assets: (record.assetAssignments ?? []).map((asset) => ({
      id: asset.id,
      assetId: asset.assetId,
      assetName: asset.assetNameSnapshot,
      assetType: asset.assetTypeSnapshot,
      assetNumber: asset.assetNumberSnapshot,
      statusAtAssignment: asset.statusAtAssignment as AssetStatus,
      assignedAt: asset.assignedAt,
      assignedByName: asset.assignedBy?.name ?? null,
      removedAt: asset.removedAt ?? null,
      removedByName: asset.removedBy?.name ?? null,
    })),
    activities: (record.activities ?? []).map((activity) => ({
      id: activity.id,
      type: activity.type as WorkOrderActivityType,
      createdAt: activity.createdAt,
      actorName: activity.actor?.name ?? null,
      previousStatus: activity.previousStatus ?? null,
      newStatus: activity.newStatus ?? null,
      metadata: (activity.metadata as Record<string, unknown> | null) ?? null,
    })),
    presets: (record.presets ?? []).map((entry) => ({
      id: entry.id,
      presetId: entry.presetId,
      name: entry.preset.name,
      scope: entry.preset.scope as DispatchPresetScope,
      description: entry.preset.description ?? null,
      defaultNotes: entry.preset.defaultNotes ?? null,
      overriddenNotes: entry.overriddenNotes ?? null,
      locked: entry.preset.locked,
      isOther: entry.preset.isOther,
      enabled: entry.preset.enabled,
      addedAt: entry.addedAt,
      addedByName: entry.addedBy?.name ?? null,
    })),
  }
}

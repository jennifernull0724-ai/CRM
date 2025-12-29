import type { AssetStatus, WorkOrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type AssetRegistryRecord = {
  id: string
  assetName: string
  assetType: string
  subType: string | null
  assetNumber: string
  status: AssetStatus
  location: string | null
  notes: string | null
  createdAt: Date
  createdBy: {
    id: string
    name: string | null
  } | null
  activeAssignments: Array<{
    assignmentId: string
    workOrderId: string
    workOrderTitle: string
    workOrderStatus: WorkOrderStatus
    assignedAt: Date
  }>
}

export type AssignableAsset = {
  id: string
  assetName: string
  assetType: string
  subType: string | null
  assetNumber: string
  status: AssetStatus
  location: string | null
  notes: string | null
  activeAssignments: number
}

export type AssetDashboardSummary = {
  total: number
  inService: number
  outOfService: number
  maintenance: number
  activelyAssigned: number
}

export async function listCompanyAssets(companyId: string): Promise<AssetRegistryRecord[]> {
  const assets = await prisma.asset.findMany({
    where: { companyId },
    orderBy: [{ assetName: 'asc' }, { assetNumber: 'asc' }],
    include: {
      createdBy: { select: { id: true, name: true } },
      assignments: {
        where: { removedAt: null },
        select: {
          id: true,
          assignedAt: true,
          workOrder: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      },
    },
  })

  return assets.map((asset) => ({
    id: asset.id,
    assetName: asset.assetName,
    assetType: asset.assetType,
    subType: asset.subType ?? null,
    assetNumber: asset.assetNumber,
    status: asset.status,
    location: asset.location ?? null,
    notes: asset.notes ?? null,
    createdAt: asset.createdAt,
    createdBy: asset.createdBy ? { id: asset.createdBy.id, name: asset.createdBy.name } : null,
    activeAssignments: asset.assignments.map((assignment) => ({
      assignmentId: assignment.id,
      workOrderId: assignment.workOrder.id,
      workOrderTitle: assignment.workOrder.title,
      workOrderStatus: assignment.workOrder.status,
      assignedAt: assignment.assignedAt,
    })),
  }))
}

export async function listAssignableAssets(companyId: string): Promise<AssignableAsset[]> {
  const assets = await prisma.asset.findMany({
    where: { companyId },
    orderBy: [{ status: 'asc' }, { assetName: 'asc' }],
    include: {
      assignments: {
        where: { removedAt: null },
        select: {
          id: true,
        },
      },
    },
  })

  return assets.map((asset) => ({
    id: asset.id,
    assetName: asset.assetName,
    assetType: asset.assetType,
    subType: asset.subType ?? null,
    assetNumber: asset.assetNumber,
    status: asset.status,
    location: asset.location ?? null,
    notes: asset.notes ?? null,
    activeAssignments: asset.assignments.length,
  }))
}

const ACTIVE_WORK_ORDER_STATUSES: WorkOrderStatus[] = ['SCHEDULED', 'IN_PROGRESS']

export async function getAssetDashboardSummary(companyId: string): Promise<AssetDashboardSummary> {
  const [statusGroups, activelyAssigned] = await Promise.all([
    prisma.asset.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { _all: true },
    }),
    prisma.workOrderAssetAssignment.count({
      where: {
        removedAt: null,
        workOrder: {
          companyId,
          status: { in: ACTIVE_WORK_ORDER_STATUSES },
        },
      },
    }),
  ])

  const inService = statusGroups.find((group) => group.status === 'IN_SERVICE')?._count._all ?? 0
  const outOfService = statusGroups.find((group) => group.status === 'OUT_OF_SERVICE')?._count._all ?? 0
  const maintenance = statusGroups.find((group) => group.status === 'MAINTENANCE')?._count._all ?? 0
  const total = statusGroups.reduce((sum, group) => sum + group._count._all, 0)

  return {
    total,
    inService,
    outOfService,
    maintenance,
    activelyAssigned,
  }
}

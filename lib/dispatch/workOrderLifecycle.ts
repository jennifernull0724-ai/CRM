import type { Prisma, WorkOrder, WorkOrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recordWorkOrderActivity } from '@/lib/dispatch/workOrderActivity'
import { sendAutoWorkOrderEmails } from '@/lib/dispatch/autoEmail'

export const TERMINAL_WORK_ORDER_STATUSES: WorkOrderStatus[] = ['COMPLETED', 'CANCELLED']

export const WORK_ORDER_STATUS_FLOW: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
}

type WorkOrderLifecycleFields = Pick<
  WorkOrder,
  'id' | 'companyId' | 'status' | 'scheduledAt' | 'startedAt' | 'completedAt' | 'cancelledAt' | 'closedAt'
>

export function assertWorkOrderMutable(status: WorkOrderStatus): void {
  if (TERMINAL_WORK_ORDER_STATUSES.includes(status)) {
    throw new Error('Work order is read-only after completion or cancellation')
  }
}

function assertStatusTransition(current: WorkOrderStatus, next: WorkOrderStatus): void {
  if (current === next) {
    throw new Error('Work order already in requested status')
  }

  if (TERMINAL_WORK_ORDER_STATUSES.includes(current)) {
    throw new Error('Completed or cancelled work orders cannot transition')
  }

  const allowed = WORK_ORDER_STATUS_FLOW[current]
  if (!allowed || !allowed.includes(next)) {
    throw new Error('Invalid work order status transition')
  }
}

function buildLifecycleUpdate(workOrder: WorkOrderLifecycleFields, nextStatus: WorkOrderStatus, occurredAt: Date): Prisma.WorkOrderUpdateInput {
  const data: Prisma.WorkOrderUpdateInput = {
    status: nextStatus,
  }

  if (nextStatus === 'SCHEDULED') {
    data.scheduledAt = { set: workOrder.scheduledAt ?? occurredAt }
  }

  if (nextStatus === 'IN_PROGRESS') {
    data.scheduledAt = { set: workOrder.scheduledAt ?? occurredAt }
    data.startedAt = { set: workOrder.startedAt ?? occurredAt }
  }

  if (nextStatus === 'COMPLETED') {
    data.scheduledAt = { set: workOrder.scheduledAt ?? occurredAt }
    data.startedAt = { set: workOrder.startedAt ?? occurredAt }
    data.completedAt = { set: occurredAt }
    data.closedAt = { set: occurredAt }
  }

  if (nextStatus === 'CANCELLED') {
    data.cancelledAt = { set: workOrder.cancelledAt ?? occurredAt }
    data.closedAt = { set: occurredAt }
  }

  return data
}

export async function transitionWorkOrderStatus(params: {
  workOrder: WorkOrderLifecycleFields
  nextStatus: WorkOrderStatus
  actorId: string
}): Promise<void> {
  const { workOrder, nextStatus, actorId } = params

  assertStatusTransition(workOrder.status, nextStatus)
  const occurredAt = new Date()
  const lifecycleUpdate = buildLifecycleUpdate(workOrder, nextStatus, occurredAt)

  await prisma.workOrder.update({
    where: { id: workOrder.id, companyId: workOrder.companyId },
    data: lifecycleUpdate,
  })

  await Promise.all([
    prisma.accessAuditLog.create({
      data: {
        companyId: workOrder.companyId,
        actorId,
        action: 'WORKORDER_STATUS_CHANGED',
        metadata: {
          workOrderId: workOrder.id,
          previousStatus: workOrder.status,
          newStatus: nextStatus,
        },
      },
    }),
    recordWorkOrderActivity({
      companyId: workOrder.companyId,
      workOrderId: workOrder.id,
      actorId,
      type: 'STATUS_CHANGED',
      previousStatus: workOrder.status,
      newStatus: nextStatus,
    }),
  ])

  if (nextStatus === 'SCHEDULED' || nextStatus === 'IN_PROGRESS') {
    try {
      await sendAutoWorkOrderEmails({
        workOrderId: workOrder.id,
        companyId: workOrder.companyId,
        actorId,
        trigger: 'status-change',
      })
    } catch (error) {
      console.error('Auto work order email (status change) failed', error)
    }
  }
}

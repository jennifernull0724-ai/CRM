import type { Prisma, WorkOrderActivityType, WorkOrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type WorkOrderActivityMetadata = Prisma.JsonValue

export type WorkOrderActivityPayload = {
  companyId: string
  workOrderId: string
  actorId?: string | null
  type: WorkOrderActivityType
  metadata?: WorkOrderActivityMetadata
  previousStatus?: WorkOrderStatus | null
  newStatus?: WorkOrderStatus | null
}

export async function recordWorkOrderActivity(payload: WorkOrderActivityPayload): Promise<void> {
  await prisma.workOrderActivity.create({
    data: {
      companyId: payload.companyId,
      workOrderId: payload.workOrderId,
      actorId: payload.actorId ?? null,
      type: payload.type,
      previousStatus: payload.previousStatus ?? null,
      newStatus: payload.newStatus ?? null,
      metadata: payload.metadata ?? null,
    },
  })
}

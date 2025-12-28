import { prisma } from '@/lib/prisma'
import { ComplianceActivityType } from '@prisma/client'

export async function logComplianceActivity({
  employeeId,
  type,
  metadata,
}: {
  employeeId: string
  type: ComplianceActivityType
  metadata?: Record<string, unknown>
}): Promise<void> {
  await prisma.complianceActivity.create({
    data: {
      employeeId,
      type,
      metadata,
    },
  })
}

export async function logActivities(batch: {
  employeeId: string
  type: ComplianceActivityType
  metadata?: Record<string, unknown>
}[]): Promise<void> {
  if (!batch.length) {
    return
  }

  await prisma.complianceActivity.createMany({
    data: batch.map(({ employeeId, type, metadata }) => ({
      employeeId,
      type,
      metadata,
    })),
  })
}

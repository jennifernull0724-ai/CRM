import { prisma } from '@/lib/prisma'
import { Prisma, type ComplianceActivityType } from '@prisma/client'

export type ComplianceActivityLog = {
  companyId: string
  actorId: string
  type: ComplianceActivityType
  employeeId?: string
  certificationId?: string
  companyDocumentId?: string
  companyDocumentVersionId?: string
  metadata?: Prisma.InputJsonValue
}

function normalizeActivity(entry: ComplianceActivityLog) {
  return {
    ...entry,
    metadata: entry.metadata ?? Prisma.JsonNull,
  }
}

export async function logComplianceActivity(entry: ComplianceActivityLog): Promise<void> {
  await prisma.complianceActivity.create({
    data: normalizeActivity(entry),
  })
}

export async function logActivities(batch: ComplianceActivityLog[]): Promise<void> {
  if (!batch.length) {
    return
  }

  await prisma.complianceActivity.createMany({
    data: batch.map(normalizeActivity),
  })
}

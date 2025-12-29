import { prisma } from '@/lib/prisma'
import type { ComplianceActivityType } from '@prisma/client'

export type ComplianceActivityLog = {
  companyId: string
  actorId: string
  type: ComplianceActivityType
  employeeId?: string
  certificationId?: string
  companyDocumentId?: string
  companyDocumentVersionId?: string
  metadata?: Record<string, unknown>
}

export async function logComplianceActivity(entry: ComplianceActivityLog): Promise<void> {
  await prisma.complianceActivity.create({
    data: entry,
  })
}

export async function logActivities(batch: ComplianceActivityLog[]): Promise<void> {
  if (!batch.length) {
    return
  }

  await prisma.complianceActivity.createMany({
    data: batch,
  })
}

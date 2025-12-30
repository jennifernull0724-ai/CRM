import { prisma } from '@/lib/prisma'

export type CrmDealRow = {
  id: string
  name: string
  stage: string
  updatedAt: Date
  sentToEstimatingAt: Date | null
  contactName: string
  contactEmail: string | null
  hasApprovedEstimate: boolean
  estimateId: string | null
}

export async function getCrmDeals(companyId: string, userId: string): Promise<CrmDealRow[]> {
  const deals = await prisma.deal.findMany({
    where: {
      companyId,
      createdById: userId,
    },
    select: {
      id: true,
      name: true,
      stage: true,
      updatedAt: true,
      sentToEstimatingAt: true,
      contact: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      estimate: {
        select: {
          id: true,
          revisions: {
            where: { status: 'APPROVED' },
            orderBy: { revisionNumber: 'desc' },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })

  return deals.map((deal) => ({
    id: deal.id,
    name: deal.name,
    stage: deal.stage,
    updatedAt: deal.updatedAt,
    sentToEstimatingAt: deal.sentToEstimatingAt,
    contactName: `${deal.contact.firstName} ${deal.contact.lastName}`.trim(),
    contactEmail: deal.contact.email,
    hasApprovedEstimate: Boolean(deal.estimate?.revisions.length),
    estimateId: deal.estimate?.id ?? null,
  }))
}

import { BidDocumentCategory, Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export type CrmDealDetail = {
  id: string
  name: string
  stage: string
  description: string | null
  sentToEstimatingAt: Date | null
  createdAt: Date
  updatedAt: Date
  contact: {
    id: string
    name: string
    email: string | null
    phone: string | null
    mobile: string | null
    jobTitle: string | null
  }
  bidDocuments: Array<{
    id: string
    fileName: string
    fileSize: number
    mimeType: string
    storageKey: string
    checksumHash: string
    category: BidDocumentCategory
    uploadedAt: Date
    uploadedBy: {
      id: string
      name: string | null
      email: string | null
    }
  }>
}

const baseDealWhere = (companyId: string, userId: string, dealId: string): Prisma.DealWhereInput => ({
  id: dealId,
  companyId,
  createdById: userId,
})

export async function loadCrmDealDetail(companyId: string, userId: string, dealId: string): Promise<CrmDealDetail | null> {
  const deal = await prisma.deal.findFirst({
    where: baseDealWhere(companyId, userId, dealId),
    select: {
      id: true,
      name: true,
      stage: true,
      description: true,
      sentToEstimatingAt: true,
      createdAt: true,
      updatedAt: true,
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          mobile: true,
          jobTitle: true,
        },
      },
      bidDocuments: {
        orderBy: { uploadedAt: 'desc' },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  })

  if (!deal) {
    return null
  }

  return {
    id: deal.id,
    name: deal.name,
    stage: deal.stage,
    description: deal.description,
    sentToEstimatingAt: deal.sentToEstimatingAt,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    contact: {
      id: deal.contact.id,
      name: `${deal.contact.firstName} ${deal.contact.lastName}`.trim(),
      email: deal.contact.email,
      phone: deal.contact.phone,
      mobile: deal.contact.mobile,
      jobTitle: deal.contact.jobTitle,
    },
    bidDocuments: deal.bidDocuments.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      storageKey: doc.storageKey,
      checksumHash: doc.checksumHash,
      category: doc.category,
      uploadedAt: doc.uploadedAt,
      uploadedBy: {
        id: doc.uploadedBy.id,
        name: doc.uploadedBy.name,
        email: doc.uploadedBy.email,
      },
    })),
  }
}

export async function assertCrmDealAccess(companyId: string, userId: string, dealId: string) {
  const deal = await prisma.deal.findFirst({
    where: baseDealWhere(companyId, userId, dealId),
    select: {
      id: true,
      name: true,
      contactId: true,
      contact: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  if (!deal) {
    throw new Error('Deal not found or outside your scope')
  }

  return deal
}

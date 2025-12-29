"use server"

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { planAllowsFeature, type PlanKey } from '@/lib/billing/planTiers'
import type { CompanyComplianceDocumentCategory } from '@prisma/client'
import { uploadCompanyComplianceDocumentVersion, deleteFile } from '@/lib/s3'
import { logComplianceActivity } from '@/lib/compliance/activity'

async function requireComplianceContext() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    throw new Error('Unauthorized')
  }

  if (!['admin', 'owner'].includes(session.user.role as string)) {
    throw new Error('Compliance access restricted to owners/admins')
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'
  const hasCompliance = planAllowsFeature(planKey, 'compliance_core') || planAllowsFeature(planKey, 'advanced_compliance')

  if (!hasCompliance) {
    throw new Error('Compliance is not enabled on this plan')
  }

  return {
    companyId: session.user.companyId,
    userId: session.user.id,
  }
}

function assertCategory(value: string | undefined): asserts value is CompanyComplianceDocumentCategory {
  const categories: CompanyComplianceDocumentCategory[] = ['INSURANCE', 'POLICIES', 'PROGRAMS', 'RAILROAD']
  if (!value || !categories.includes(value as CompanyComplianceDocumentCategory)) {
    throw new Error('Invalid document category')
  }
}

export async function createCompanyDocumentAction(formData: FormData) {
  const { companyId, userId } = await requireComplianceContext()

  const rawCategory = formData.get('category')?.toString()
  const title = formData.get('title')?.toString().trim()
  const file = formData.get('file') as File | null

  assertCategory(rawCategory)
  const category = rawCategory

  if (!title || !file) {
    throw new Error('Missing document data')
  }

  if (file.type !== 'application/pdf') {
    throw new Error('Documents must be uploaded as PDF')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const documentId = crypto.randomUUID()
  const versionId = crypto.randomUUID()

  const upload = await uploadCompanyComplianceDocumentVersion({
    file: buffer,
    companyId,
    documentId,
    versionId,
    fileName: file.name,
    contentType: file.type,
  })

  try {
    await prisma.$transaction(async (tx) => {
      await tx.companyComplianceDocument.create({
        data: {
          id: documentId,
          companyId,
          category,
          title,
          createdById: userId,
        },
      })

      await tx.companyComplianceDocumentVersion.create({
        data: {
          id: versionId,
          documentId,
          versionNumber: 1,
          gcsObjectKey: upload.key,
          fileName: file.name,
          mimeType: file.type,
          fileHash: upload.hash,
          fileSize: upload.size,
          uploadedById: userId,
        },
      })
    })
  } catch (error) {
    await deleteFile(upload.key).catch(() => undefined)
    throw error
  }

  await logComplianceActivity({
    companyId,
    actorId: userId,
    type: 'DOC_UPLOADED',
    companyDocumentId: documentId,
    companyDocumentVersionId: versionId,
    metadata: {
      title,
      category,
      versionNumber: 1,
    },
  })

  revalidatePath('/compliance/company-documents')
}

export async function addCompanyDocumentVersionAction(formData: FormData) {
  const { companyId, userId } = await requireComplianceContext()
  const documentId = formData.get('documentId')?.toString()
  const file = formData.get('file') as File | null

  if (!documentId || !file) {
    throw new Error('Missing document data')
  }

  if (file.type !== 'application/pdf') {
    throw new Error('Documents must be uploaded as PDF')
  }

  const document = await prisma.companyComplianceDocument.findFirst({
    where: { id: documentId, companyId },
    select: { id: true },
  })

  if (!document) {
    throw new Error('Document not found')
  }

  const versionNumber =
    (await prisma.companyComplianceDocumentVersion.count({ where: { documentId } })) + 1

  const buffer = Buffer.from(await file.arrayBuffer())
  const versionId = crypto.randomUUID()

  const upload = await uploadCompanyComplianceDocumentVersion({
    file: buffer,
    companyId,
    documentId,
    versionId,
    fileName: file.name,
    contentType: file.type,
  })

  try {
    await prisma.companyComplianceDocumentVersion.create({
      data: {
        id: versionId,
        documentId,
        versionNumber,
        gcsObjectKey: upload.key,
        fileName: file.name,
        mimeType: file.type,
        fileHash: upload.hash,
        fileSize: upload.size,
        uploadedById: userId,
      },
    })
  } catch (error) {
    await deleteFile(upload.key).catch(() => undefined)
    throw error
  }

  await logComplianceActivity({
    companyId,
    actorId: userId,
    type: 'DOC_VERSIONED',
    companyDocumentId: documentId,
    companyDocumentVersionId: versionId,
    metadata: {
      versionNumber,
      fileName: file.name,
    },
  })

  revalidatePath('/compliance/company-documents')
}

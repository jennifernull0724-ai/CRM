'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { BidDocumentCategory } from '@prisma/client'

import { requireCrmUserContext } from '@/app/crm/deals/actions'
import { normalizeRecipientList } from '@/lib/email/recipients'
import { sendContactEmail } from '@/lib/email/service'
import { prisma } from '@/lib/prisma'
import { getFileBuffer, uploadDealBidDocument } from '@/lib/s3'
import { assertCrmDealAccess } from '@/lib/crm/dealDetail'

const uploadSchema = z.object({
  dealId: z.string().min(1),
  category: z.nativeEnum(BidDocumentCategory),
})

const emailSchema = z.object({
  dealId: z.string().min(1),
  accountId: z.string().min(1),
  to: z.string().min(1),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
})

export type BidDocumentActionState = { success: boolean; message?: string }

function revalidateDealSurfaces(dealId: string) {
  revalidatePath('/crm/deals')
  revalidatePath(`/crm/deals/${dealId}`)
}

export async function uploadBidDocumentsAction(_prev: BidDocumentActionState, formData: FormData): Promise<BidDocumentActionState> {
  try {
    const { userId, companyId } = await requireCrmUserContext()
    const payload = uploadSchema.parse({
      dealId: formData.get('dealId')?.toString(),
      category: formData.get('category')?.toString(),
    })

    const files = formData
      .getAll('files')
      .filter((value): value is File => value instanceof File && value.size > 0)

    if (!files.length) {
      throw new Error('Select at least one file to upload')
    }

    const deal = await assertCrmDealAccess(companyId, userId, payload.dealId)

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const upload = await uploadDealBidDocument({
        file: buffer,
        companyId,
        dealId: deal.id,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
      })

      const record = await prisma.dealBidDocument.create({
        data: {
          dealId: deal.id,
          companyId,
          uploadedById: userId,
          category: payload.category,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          storageKey: upload.key,
          fileSize: upload.size,
          checksumHash: upload.hash,
        },
      })

      await prisma.accessAuditLog.create({
        data: {
          companyId,
          actorId: userId,
          action: 'DEAL_BID_DOCUMENT_UPLOADED',
          metadata: {
            dealId: deal.id,
            documentId: record.id,
            fileName: record.fileName,
            fileSize: record.fileSize,
            category: record.category,
          },
        },
      })
    }

    revalidateDealSurfaces(deal.id)
    return { success: true, message: `${files.length} document${files.length > 1 ? 's' : ''} uploaded` }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to upload bid documents'
    return { success: false, message }
  }
}

export async function emailBidDocumentsAction(_prev: BidDocumentActionState, formData: FormData): Promise<BidDocumentActionState> {
  try {
    const { userId, companyId } = await requireCrmUserContext()
    const payload = emailSchema.parse({
      dealId: formData.get('dealId')?.toString(),
      accountId: formData.get('accountId')?.toString(),
      to: formData.get('to')?.toString(),
      cc: formData.get('cc')?.toString() ?? undefined,
      bcc: formData.get('bcc')?.toString() ?? undefined,
      subject: formData.get('subject')?.toString(),
      body: formData.get('body')?.toString(),
    })

    const requestedIds = formData
      .getAll('documentIds')
      .map((value) => value?.toString())
      .filter((value): value is string => Boolean(value))

    if (!requestedIds.length) {
      throw new Error('Select at least one document to email')
    }

    const deal = await prisma.deal.findFirst({
      where: { id: payload.dealId, companyId, createdById: userId },
      select: {
        id: true,
        contactId: true,
        name: true,
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    if (!deal) {
      throw new Error('Deal not found or outside your scope')
    }

    const documents = await prisma.dealBidDocument.findMany({
      where: {
        companyId,
        dealId: deal.id,
        id: { in: requestedIds },
      },
    })

    if (documents.length !== requestedIds.length) {
      throw new Error('One or more selected documents could not be located')
    }

    const toRecipients = normalizeRecipientList(payload.to)
    if (!toRecipients.length) {
      throw new Error('Provide at least one To recipient')
    }

    const ccRecipients = normalizeRecipientList(payload.cc)
    const bccRecipients = normalizeRecipientList(payload.bcc)

    const attachments = await Promise.all(
      documents.map(async (doc) => {
        const buffer = await getFileBuffer(doc.storageKey)
        return {
          filename: doc.fileName,
          contentType: doc.mimeType,
          buffer,
          id: doc.id,
        }
      })
    )

    await sendContactEmail({
      accountId: payload.accountId,
      companyId,
      contactId: deal.contactId,
      authorId: userId,
      to: toRecipients,
      cc: ccRecipients.length ? ccRecipients : undefined,
      bcc: bccRecipients.length ? bccRecipients : undefined,
      subject: payload.subject,
      html: payload.body,
      text: payload.body,
      attachments: attachments.map(({ filename, contentType, buffer }) => ({ filename, contentType, buffer })),
    })

    await prisma.accessAuditLog.create({
      data: {
        companyId,
        actorId: userId,
        action: 'DEAL_BID_DOCUMENT_EMAILED',
        metadata: {
          dealId: deal.id,
          documentIds: attachments.map((attachment) => attachment.id),
          accountId: payload.accountId,
          to: toRecipients.map((recipient) => recipient.email),
        },
      },
    })

    revalidateDealSurfaces(deal.id)
    return { success: true, message: 'Email sent' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to email bid documents'
    return { success: false, message }
  }
}

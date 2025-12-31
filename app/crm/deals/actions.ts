'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeRecipientList } from '@/lib/email/recipients'
import { sendContactEmail } from '@/lib/email/service'
import { getFileBuffer } from '@/lib/s3'

const CREATE_DEAL_SCHEMA = z.object({
  contactId: z.string().min(1, 'Contact is required'),
  projectName: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
})

const SUBMIT_DEAL_SCHEMA = z.object({
  dealId: z.string().min(1, 'Deal id is required'),
})

const EMAIL_SCHEMA = z.object({
  dealId: z.string().min(1, 'Deal id is required'),
  accountId: z.string().min(1, 'Email account is required'),
  to: z.string().min(1, 'Recipient list is required'),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
})

const CRM_REVALIDATE_PATHS = ['/crm/deals']

function revalidateCrmDeals(dealId?: string) {
  for (const path of CRM_REVALIDATE_PATHS) {
    revalidatePath(path)
  }
  if (dealId) {
    revalidatePath(`/crm/deals/${dealId}`)
    revalidatePath(`/crm/deals/${dealId}/estimate`)
  }
  revalidatePath('/dashboard/estimator')
}

export async function requireCrmUserContext() {
  const session = await auth()

  if (!session?.user?.id || !session.user.companyId) {
    throw new Error('Unauthorized')
  }

  const role = (session.user.role ?? 'user').toLowerCase()
  if (role !== 'user') {
    throw new Error('Forbidden')
  }

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    name: session.user.name ?? 'Workspace user',
  }
}

export type ActionResult = { success: boolean; message?: string }

export async function createCrmDealAction(formData: FormData): Promise<ActionResult> {
  try {
    const { userId, companyId } = await requireCrmUserContext()
    const payload = CREATE_DEAL_SCHEMA.parse({
      contactId: formData.get('contactId')?.toString(),
      projectName: formData.get('projectName')?.toString()?.trim(),
      description: formData.get('description')?.toString()?.trim() ?? undefined,
    })

    const contact = await prisma.contact.findFirst({
      where: { id: payload.contactId, companyId },
      select: { id: true, firstName: true, lastName: true },
    })

    if (!contact) {
      throw new Error('Contact not found')
    }

    const now = new Date()

    const deal = await prisma.$transaction(async (tx) => {
      const createdDeal = await tx.deal.create({
        data: {
          name: payload.projectName,
          description: payload.description ?? null,
          contactId: contact.id,
          companyId,
          createdById: userId,
          stage: 'OPEN',
          currentVersion: 1,
        },
      })

      await tx.dealVersion.create({
        data: {
          dealId: createdDeal.id,
          version: 1,
          description: payload.description ?? 'Initial version',
          totalValue: 0,
          isActive: true,
        },
      })

      await tx.contact.update({
        where: { id: contact.id },
        data: { lastActivityAt: now, activityState: 'ACTIVE' },
      })

      await tx.activity.create({
        data: {
          companyId,
          contactId: contact.id,
          dealId: createdDeal.id,
          userId,
          type: 'DEAL_CREATED',
          subject: `Deal created: ${payload.projectName}`,
          description: payload.description ?? null,
          metadata: {
            contactId: contact.id,
            ownerId: userId,
          },
        },
      })

      await tx.accessAuditLog.create({
        data: {
          companyId,
          actorId: userId,
            action: 'DEAL_CREATED_FROM_CONTACT',
          metadata: {
            contactId: contact.id,
            dealId: createdDeal.id,
            timestamp: now.toISOString(),
          },
        },
      })

      return createdDeal
    })

    revalidateCrmDeals()

    return { success: true, message: `Deal ${deal.name} created.` }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create deal'
    return { success: false, message }
  }
}

export async function submitDealToEstimatingAction(formData: FormData): Promise<ActionResult> {
  try {
    const { userId, companyId } = await requireCrmUserContext()
    const payload = SUBMIT_DEAL_SCHEMA.parse({ dealId: formData.get('dealId')?.toString() })

    const deal = await prisma.deal.findFirst({
      where: { id: payload.dealId, companyId, createdById: userId },
      select: { id: true, name: true, stage: true, contactId: true, sentToEstimatingAt: true },
    })

    if (!deal) {
      throw new Error('Deal not available')
    }

    const normalizedStage = (deal.stage ?? '').toUpperCase()
    if (!['OPEN', 'RETURNED'].includes(normalizedStage)) {
      throw new Error('Only open or returned deals can be submitted')
    }

    const now = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.deal.update({
        where: { id: deal.id },
        data: {
          stage: 'IN_ESTIMATING',
          ...(deal.sentToEstimatingAt ? {} : { sentToEstimatingAt: now }),
        },
      })

      await tx.activity.create({
        data: {
          companyId,
          dealId: deal.id,
          contactId: deal.contactId,
          userId,
          type: 'DEAL_SUBMITTED_TO_ESTIMATING',
          subject: `Deal ${deal.name} sent to estimating`,
          metadata: { stage: 'IN_ESTIMATING' },
        },
      })
    })

    revalidateCrmDeals(deal.id)

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit deal'
    return { success: false, message }
  }
}

function formatParagraphs(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join('')
}

export async function emailApprovedEstimateFromCrmAction(formData: FormData): Promise<ActionResult> {
  try {
    const { userId, companyId } = await requireCrmUserContext()
    const payload = EMAIL_SCHEMA.parse({
      dealId: formData.get('dealId')?.toString(),
      accountId: formData.get('accountId')?.toString(),
      to: formData.get('to')?.toString(),
      cc: formData.get('cc')?.toString() ?? undefined,
      bcc: formData.get('bcc')?.toString() ?? undefined,
      subject: formData.get('subject')?.toString(),
      body: formData.get('body')?.toString(),
    })

    const deal = await prisma.deal.findFirst({
      where: { id: payload.dealId, companyId, createdById: userId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        estimate: {
          include: {
            revisions: {
              where: { status: 'APPROVED' },
              orderBy: { revisionNumber: 'desc' },
              take: 1,
              select: {
                id: true,
                revisionNumber: true,
                quoteNumber: true,
                status: true,
                subtotal: true,
                grandTotal: true,
              },
            },
          },
        },
      },
    })

    if (!deal || !deal.estimate || !deal.estimate.revisions.length) {
      throw new Error('Approved estimate not found for this deal')
    }

    const revision = deal.estimate.revisions[0]

    const document = await prisma.estimateDocument.findFirst({
      where: { estimateId: deal.estimate.id, revisionId: revision.id, kind: 'QUOTE' },
      orderBy: { generatedAt: 'desc' },
    })

    if (!document) {
      throw new Error('No approved PDF available for emailing')
    }

    const account = await prisma.emailAccount.findFirst({
      where: { id: payload.accountId, companyId, userId, deauthorizedAt: null },
    })

    if (!account) {
      throw new Error('Email account not available')
    }

    const toRecipients = normalizeRecipientList(payload.to)
    if (!toRecipients.length) {
      throw new Error('At least one To recipient is required')
    }

    const ccRecipients = normalizeRecipientList(payload.cc)
    const bccRecipients = normalizeRecipientList(payload.bcc)
    const allEmails = [...toRecipients, ...ccRecipients, ...bccRecipients].map((recipient) => recipient.email)

    if (!allEmails.includes((deal.contact.email ?? '').toLowerCase())) {
      throw new Error('Primary contact must be included on the email')
    }

    const suppressed = await prisma.emailRecipientPreference.findMany({
      where: { companyId, email: { in: allEmails }, sendEnabled: false },
    })

    if (suppressed.length) {
      throw new Error(`Email blocked for ${suppressed.map((pref) => pref.email).join(', ')}`)
    }

    const buffer = await getFileBuffer(document.storageKey)

    const htmlBody = formatParagraphs(payload.body)

    await sendContactEmail({
      accountId: payload.accountId,
      companyId,
      contactId: deal.contact.id,
      authorId: userId,
      to: toRecipients,
      cc: ccRecipients.length ? ccRecipients : undefined,
      bcc: bccRecipients.length ? bccRecipients : undefined,
      subject: payload.subject,
      html: htmlBody,
      text: payload.body,
      attachments: [
        {
          filename: document.fileName,
          contentType: 'application/pdf',
          buffer,
        },
      ],
    })

    await prisma.estimateEmail.create({
      data: {
        companyId,
        estimateId: deal.estimate.id,
        revisionId: revision.id,
        contactId: deal.contact.id,
        pdfDocumentId: document.id,
        templateId: null,
        signatureId: null,
        toRecipients: toRecipients.map((recipient) => recipient.email),
        ccRecipients: ccRecipients.map((recipient) => recipient.email),
        bccRecipients: bccRecipients.map((recipient) => recipient.email),
        subject: payload.subject,
        body: htmlBody,
        sentById: userId,
      },
    })

    await prisma.activity.create({
      data: {
        companyId,
        contactId: deal.contact.id,
        dealId: deal.id,
        type: 'ESTIMATE_PDF_EMAILED_FROM_CRM',
        subject: `${deal.estimate.quoteNumber} emailed to client`,
        description: payload.subject,
        userId,
        metadata: {
          estimateId: deal.estimate.id,
          revisionId: revision.id,
          documentId: document.id,
        },
      },
    })

    revalidateCrmDeals(deal.id)

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to email estimate'
    return { success: false, message }
  }
}

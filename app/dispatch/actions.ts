'use server'

import { createHash, randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import type { AccessAuditAction, WorkOrderDiscipline, WorkOrderStatus } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertWorkOrderMutable, transitionWorkOrderStatus } from '@/lib/dispatch/workOrderLifecycle'
import { recordWorkOrderActivity } from '@/lib/dispatch/workOrderActivity'
import { mapIndustryToDiscipline } from '@/lib/dispatch/dashboard'
import { summarizeEmployeeCompliance } from '@/lib/dispatch/compliance'
import { revalidateContactSurfaces } from '@/lib/contacts/cache'
import { sendContactEmail } from '@/lib/email/service'
import { normalizeRecipientList } from '@/lib/email/recipients'
import { uploadFile } from '@/lib/s3'
import { createWorkOrderPdfVersion, getLatestWorkOrderPdf, downloadWorkOrderPdf } from '@/lib/dispatch/pdfStorage'
import { sendAutoWorkOrderEmails } from '@/lib/dispatch/autoEmail'

const DISPATCH_CAPABLE_ROLES = ['dispatch', 'admin', 'owner']
const WORK_ORDER_DISCIPLINES: WorkOrderDiscipline[] = ['CONSTRUCTION', 'RAILROAD', 'ENVIRONMENTAL']
const NOTE_ACTIVITY_MAP = {
  WORKORDER_NOTE_ADDED: 'NOTE_ADDED',
  WORKORDER_NOTE_UPDATED: 'NOTE_UPDATED',
} as const
const MAX_EMAIL_ATTACHMENT_BYTES = 15 * 1024 * 1024
const MAX_TOTAL_EMAIL_ATTACHMENT_BYTES = 25 * 1024 * 1024
const MAX_EMAIL_ATTACHMENT_COUNT = 5
const MAX_WORK_ORDER_DOCUMENT_BYTES = 25 * 1024 * 1024

export type WorkOrderEmailActionState = { success: boolean; message?: string }

async function requireDispatchUser() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    throw new Error('Unauthorized')
  }

  const normalizedRole = session.user.role.toLowerCase()

  if (!DISPATCH_CAPABLE_ROLES.includes(normalizedRole)) {
    throw new Error('Insufficient role')
  }

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
  }
}

function revalidateDispatchSurfaces() {
  revalidatePath('/dispatch')
  revalidatePath('/dashboard/assets')
  revalidatePath('/dashboard/admin/assets')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/admin/dispatch-presets')
  revalidatePath('/dashboard/owner')
}

type WorkOrderNoteState = {
  operationsNotes: string | null
  gateAccessCode: string | null
  onsitePocName: string | null
  onsitePocPhone: string | null
  specialInstructions: string | null
}

function normalizeMultiline(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.replace(/\r\n/g, '\n').trim()
  return normalized.length ? normalized : null
}

function normalizeSingleLine(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return normalized.length ? normalized : null
}

function buildNoteStateFromForm(formData: FormData): WorkOrderNoteState {
  return {
    operationsNotes: normalizeMultiline(formData.get('operationsNotes')),
    gateAccessCode: normalizeSingleLine(formData.get('gateAccessCode')),
    onsitePocName: normalizeSingleLine(formData.get('onsitePocName')),
    onsitePocPhone: normalizeSingleLine(formData.get('onsitePocPhone')),
    specialInstructions: normalizeMultiline(formData.get('specialInstructions')),
  }
}

function buildNoteStateFromRecord(record: Partial<WorkOrderNoteState>): WorkOrderNoteState {
  return {
    operationsNotes: record.operationsNotes ?? null,
    gateAccessCode: record.gateAccessCode ?? null,
    onsitePocName: record.onsitePocName ?? null,
    onsitePocPhone: record.onsitePocPhone ?? null,
    specialInstructions: record.specialInstructions ?? null,
  }
}

function hashNoteState(state: WorkOrderNoteState): string {
  return createHash('sha256').update(JSON.stringify(state)).digest('hex')
}

function isNoteStateEmpty(state: WorkOrderNoteState): boolean {
  return !state.operationsNotes && !state.gateAccessCode && !state.onsitePocName && !state.onsitePocPhone && !state.specialInstructions
}

async function logAssetAudit(
  companyId: string,
  actorId: string,
  action: AccessAuditAction,
  metadata: Record<string, unknown>
) {
  await prisma.accessAuditLog.create({
    data: {
      companyId,
      actorId,
      action,
      metadata,
    },
  })
}

function resolveFormPayload(stateOrFormData: unknown, maybeFormData?: FormData): FormData {
  if (maybeFormData) {
    return maybeFormData
  }
  if (stateOrFormData instanceof FormData) {
    return stateOrFormData
  }
  throw new Error('Invalid form payload')
}

function stripHtml(input: string): string {
  return input.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

const DOCUMENT_FALLBACK_NAME = 'work-order-document'

function normalizeDocumentFileName(originalName?: string | null): { fileName: string; extension: string } {
  const fallbackExtension = 'bin'
  if (!originalName) {
    return { fileName: `${DOCUMENT_FALLBACK_NAME}.${fallbackExtension}`, extension: fallbackExtension }
  }

  const trimmed = originalName.trim().slice(0, 140)
  const extensionMatch = trimmed.match(/\.([a-zA-Z0-9]{1,8})$/)
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : fallbackExtension
  const base = extensionMatch ? trimmed.slice(0, trimmed.length - (extension.length + 1)) : trimmed
  const sanitizedBase = base.replace(/[^a-zA-Z0-9._-]/g, '_') || DOCUMENT_FALLBACK_NAME
  const truncatedBase = sanitizedBase.slice(0, 96)
  return {
    fileName: extension ? `${truncatedBase}.${extension}` : truncatedBase,
    extension,
  }
}

function buildDocumentStorageKey(companyId: string, workOrderId: string, extension: string): string {
  const normalizedExtension = extension.replace(/[^a-z0-9]/gi, '').toLowerCase()
  const suffix = normalizedExtension ? `.${normalizedExtension}` : ''
  return `companies/${companyId}/work-orders/${workOrderId}/documents/${randomUUID()}${suffix}`
}

export async function acceptDispatchRequestAction(formData: FormData) {
  const { companyId, userId } = await requireDispatchUser()
  const dispatchRequestId = formData.get('dispatchRequestId')?.toString()

  if (!dispatchRequestId) {
    throw new Error('Dispatch request id required')
  }

  const request = await prisma.dispatchRequest.findFirst({
    where: { id: dispatchRequestId, companyId },
    select: {
      id: true,
      status: true,
      estimateId: true,
      estimate: { select: { quoteNumber: true } },
    },
  })

  if (!request) {
    throw new Error('Dispatch request not found')
  }

  if (request.status !== 'QUEUED') {
    return
  }

  const auditAction: AccessAuditAction = request.estimateId ? 'DISPATCH_RECEIVED_ESTIMATE' : 'DISPATCH_RECEIVED_QUOTE'

  await prisma.$transaction(async (tx) => {
    await tx.dispatchRequest.update({
      where: { id: request.id },
      data: {
        status: 'PENDING_ASSIGNMENT',
        dispatcherId: userId,
      },
    })

    await tx.accessAuditLog.create({
      data: {
        companyId,
        actorId: userId,
        action: auditAction,
        metadata: {
          dispatchRequestId: request.id,
          estimateId: request.estimateId,
          quoteNumber: request.estimate?.quoteNumber ?? null,
        },
      },
    })
  })

  revalidateDispatchSurfaces()
}

export async function createWorkOrderFromDispatchAction(formData: FormData) {
  const { companyId, userId } = await requireDispatchUser()
  const dispatchRequestId = formData.get('dispatchRequestId')?.toString()

  if (!dispatchRequestId) {
    throw new Error('Dispatch request id required')
  }

  const request = await prisma.dispatchRequest.findFirst({
    where: { id: dispatchRequestId, companyId },
    include: {
      workOrders: { select: { id: true }, take: 1 },
      estimate: {
        select: {
          id: true,
          quoteNumber: true,
          currentRevision: {
            select: {
              revisionNumber: true,
              projectName: true,
              industry: true,
            },
          },
        },
      },
    },
  })

  if (!request) {
    throw new Error('Dispatch request not found')
  }

  if (request.workOrders.length > 0) {
    return
  }

  if (!request.estimate?.currentRevision) {
    throw new Error('Estimate details unavailable')
  }

  const discipline = mapIndustryToDiscipline(request.estimate.currentRevision.industry)
  const title = request.estimate.currentRevision.projectName?.trim() || `Work order ${request.estimate.quoteNumber}`

  await prisma.$transaction(async (tx) => {
    const workOrder = await tx.workOrder.create({
      data: {
        companyId,
        dispatchRequestId: request.id,
        estimateId: request.estimate!.id,
        contactId: request.contactId,
        title,
        discipline,
        status: 'DRAFT',
        manualEntry: false,
      },
    })

    await tx.dispatchRequest.update({
      where: { id: request.id },
      data: { status: 'PENDING_ASSIGNMENT' },
    })

    const metadata = {
      workOrderId: workOrder.id,
      dispatchRequestId: request.id,
      estimateId: request.estimate?.id ?? null,
      contactId: request.contactId,
      quoteNumber: request.estimate?.quoteNumber ?? null,
    }

    const activityTimestamp = workOrder.createdAt

    await tx.accessAuditLog.create({
      data: {
        companyId,
        actorId: userId,
        action: 'WORKORDER_CREATED',
        metadata,
      },
    })

    await tx.accessAuditLog.create({
      data: {
        companyId,
        actorId: userId,
        action: 'CONTACT_LINKED_TO_WORKORDER',
        metadata,
      },
    })

    await tx.accessAuditLog.create({
      data: {
        companyId,
        actorId: userId,
        action: 'WORKORDER_CREATED_FROM_CONTACT',
        metadata: {
          ...metadata,
          actorId: userId,
          companyId,
          timestamp: activityTimestamp.toISOString(),
        },
      },
    })

    await tx.contact.update({
      where: { id: request.contactId },
      data: { lastActivityAt: activityTimestamp, activityState: 'ACTIVE' },
    })

    await tx.activity.create({
      data: {
        companyId,
        contactId: request.contactId,
        userId,
        type: 'WORKORDER_CREATED',
        subject: `Work order created: ${title}`,
        description: request.estimate?.quoteNumber
          ? `Converted estimate ${request.estimate.quoteNumber} to work order`
          : 'Dispatch converted a request to work order',
        metadata,
      },
    })
  })

  revalidateDispatchSurfaces()
  revalidateContactSurfaces(request.contactId)
}

export async function createManualWorkOrderAction(formData: FormData) {
  const { companyId, userId } = await requireDispatchUser()
  const contactId = formData.get('contactId')?.toString()
  const title = formData.get('title')?.toString()?.trim()
  const disciplineInput = formData.get('discipline')?.toString()?.toUpperCase()
  const discipline = (disciplineInput && WORK_ORDER_DISCIPLINES.includes(disciplineInput as WorkOrderDiscipline)
    ? (disciplineInput as WorkOrderDiscipline)
    : 'CONSTRUCTION')

  if (!contactId) {
    throw new Error('Contact is required')
  }

  if (!title) {
    throw new Error('Work order title is required')
  }

  const contact = await prisma.contact.findFirst({ where: { id: contactId, companyId }, select: { id: true } })

  if (!contact) {
    throw new Error('Contact not found in this workspace')
  }

  await prisma.$transaction(async (tx) => {
    const workOrder = await tx.workOrder.create({
      data: {
        companyId,
        contactId,
        title,
        discipline,
        manualEntry: true,
        status: 'DRAFT',
      },
    })

    const metadata = {
      workOrderId: workOrder.id,
      contactId,
      discipline,
      manualEntry: true,
    }

    const activityTimestamp = workOrder.createdAt

    await tx.accessAuditLog.create({
      data: {
        companyId,
        actorId: userId,
        action: 'WORKORDER_CREATED',
        metadata,
      },
    })

    await tx.accessAuditLog.create({
      data: {
        companyId,
        actorId: userId,
        action: 'BLANK_WORKORDER_CREATED',
        metadata,
      },
    })

    await tx.accessAuditLog.create({
      data: {
        companyId,
        actorId: userId,
        action: 'WORK_ORDER_MANUAL_CREATED',
        metadata,
      },
    })

    await tx.accessAuditLog.create({
      data: {
        companyId,
        actorId: userId,
        action: 'CONTACT_LINKED_TO_WORKORDER',
        metadata,
      },
    })

    await tx.accessAuditLog.create({
      data: {
        companyId,
        actorId: userId,
        action: 'WORKORDER_CREATED_FROM_CONTACT',
        metadata: {
          ...metadata,
          actorId: userId,
          companyId,
          timestamp: activityTimestamp.toISOString(),
        },
      },
    })

    await tx.contact.update({
      where: { id: contactId },
      data: { lastActivityAt: activityTimestamp, activityState: 'ACTIVE' },
    })

    await tx.activity.create({
      data: {
        companyId,
        contactId,
        userId,
        type: 'WORKORDER_CREATED',
        subject: `Work order created: ${title}`,
        description: 'Manual work order opened from dispatch board',
        metadata,
      },
    })

  })

  revalidateDispatchSurfaces()
  revalidateContactSurfaces(contactId)
}

export async function uploadWorkOrderDocumentAction(formData: FormData) {
  const { companyId, userId } = await requireDispatchUser()
  const workOrderId = formData.get('workOrderId')?.toString()
  const documentEntry = formData.get('document')

  if (!workOrderId) {
    throw new Error('Work order is required')
  }

  if (!(documentEntry instanceof File)) {
    throw new Error('Document file is required')
  }

  if (documentEntry.size === 0) {
    throw new Error('Document cannot be empty')
  }

  if (documentEntry.size > MAX_WORK_ORDER_DOCUMENT_BYTES) {
    throw new Error('Document exceeds 25MB limit')
  }

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, companyId },
    select: { id: true, status: true, contactId: true },
  })

  if (!workOrder) {
    throw new Error('Work order not found')
  }

  if (!workOrder.contactId) {
    throw new Error('Work order must be linked to a contact before uploading documents')
  }

  assertWorkOrderMutable(workOrder.status)

  const { fileName, extension } = normalizeDocumentFileName(documentEntry.name)
  const mimeType = documentEntry.type || 'application/octet-stream'
  const buffer = Buffer.from(await documentEntry.arrayBuffer())
  const storageKey = buildDocumentStorageKey(companyId, workOrderId, extension)
  const uploadResult = await uploadFile(buffer, storageKey, mimeType)

  const document = await prisma.workOrderDocument.create({
    data: {
      companyId,
      workOrderId,
      uploadedById: userId,
      fileName,
      fileType: (extension || 'bin').toUpperCase(),
      mimeType,
      storageKey: uploadResult.key,
      fileSize: uploadResult.size,
      checksumHash: uploadResult.hash,
    },
  })

  const timestamp = new Date().toISOString()

  await prisma.accessAuditLog.create({
    data: {
      companyId,
      actorId: userId,
      action: 'DOCUMENT_UPLOADED',
      metadata: {
        workOrderId,
        companyId,
        documentId: document.id,
        fileName,
        fileSize: uploadResult.size,
        storageKey: uploadResult.key,
        timestamp,
      },
    },
  })

  await recordWorkOrderActivity({
    companyId,
    workOrderId,
    actorId: userId,
    type: 'DOCUMENT_UPLOADED',
    metadata: {
      documentId: document.id,
      fileName,
      fileSize: uploadResult.size,
      mimeType,
    },
  })

  revalidateDispatchSurfaces()
  revalidateContactSurfaces(workOrder.contactId)
}

export async function sendWorkOrderEmailAction(
  workOrderId: string,
  stateOrFormData: WorkOrderEmailActionState | FormData,
  maybeFormData?: FormData
): Promise<WorkOrderEmailActionState> {
  try {
    const formData = resolveFormPayload(stateOrFormData, maybeFormData)
    const { companyId, userId } = await requireDispatchUser()

    const accountId = formData.get('accountId')?.toString()
    const toRaw = formData.get('to')?.toString()
    const ccRaw = formData.get('cc')?.toString() ?? undefined
    const bccRaw = formData.get('bcc')?.toString() ?? undefined
    const subject = formData.get('subject')?.toString()?.trim()
    const bodyHtml = formData.get('bodyHtml')?.toString()
    const bodyTextInput = formData.get('bodyText')?.toString() ?? undefined
    const includePdfValue = formData.get('includePdf')
    const includePdf = includePdfValue === 'true' || includePdfValue === 'on'

    if (!accountId || !toRaw || !subject || !bodyHtml) {
      throw new Error('Account, recipients, subject, and body are required')
    }

    const workOrder = await prisma.workOrder.findFirst({
      where: { id: workOrderId, companyId },
      select: {
        id: true,
        status: true,
        contactId: true,
        contact: { select: { id: true, email: true } },
      },
    })

    if (!workOrder) {
      throw new Error('Work order not found')
    }

    if (!workOrder.contact?.email) {
      throw new Error('Linked contact is missing an email address')
    }

    const account = await prisma.emailAccount.findFirst({
      where: { id: accountId, companyId, deauthorizedAt: null },
    })

    if (!account) {
      throw new Error('Email account unavailable')
    }

    const toRecipients = normalizeRecipientList(toRaw)
    if (!toRecipients.length) {
      throw new Error('At least one recipient is required')
    }

    const ccRecipients = normalizeRecipientList(ccRaw)
    const bccRecipients = normalizeRecipientList(bccRaw)
    const allEmails = [...toRecipients, ...ccRecipients, ...bccRecipients].map((recipient) => recipient.email)

    if (allEmails.length) {
      const suppressed = await prisma.emailRecipientPreference.findMany({ where: { companyId, email: { in: allEmails } } })
      const blocked = suppressed.filter((pref) => !pref.sendEnabled)
      if (blocked.length) {
        throw new Error(`Sending blocked for ${blocked.map((pref) => pref.email).join(', ')}`)
      }
    }

    const attachments: Array<{ filename: string; contentType: string; buffer: Buffer }> = []
    const files = formData
      .getAll('attachments')
      .filter((value): value is File => value instanceof File && value.size > 0)

    if (files.length > MAX_EMAIL_ATTACHMENT_COUNT) {
      throw new Error(`Maximum ${MAX_EMAIL_ATTACHMENT_COUNT} attachments allowed`)
    }

    let totalBytes = 0
    for (const file of files) {
      if (file.size > MAX_EMAIL_ATTACHMENT_BYTES) {
        throw new Error(`${file.name} exceeds ${(MAX_EMAIL_ATTACHMENT_BYTES / (1024 * 1024)).toFixed(0)}MB limit`)
      }
      totalBytes += file.size
      if (totalBytes > MAX_TOTAL_EMAIL_ATTACHMENT_BYTES) {
        throw new Error('Attachments exceed 25MB total limit')
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      attachments.push({ filename: file.name, contentType: file.type || 'application/octet-stream', buffer })
    }

    let pdfVersion: number | null = null

    const isLockedStatus = workOrder.status === 'COMPLETED' || workOrder.status === 'CANCELLED'

    if (includePdf) {
      if (isLockedStatus) {
        const latestPdf = await getLatestWorkOrderPdf(workOrderId, companyId)
        if (!latestPdf) {
          throw new Error('Work order is read-only and no stored PDF exists to attach')
        }
        const storedBuffer = await downloadWorkOrderPdf(latestPdf)
        totalBytes += storedBuffer.length
        if (totalBytes > MAX_TOTAL_EMAIL_ATTACHMENT_BYTES) {
          throw new Error('Attachments exceed 25MB total limit with PDF included')
        }
        pdfVersion = latestPdf.version
        attachments.push({
          filename: `work-order-${workOrder.id}-v${pdfVersion}.pdf`,
          contentType: 'application/pdf',
          buffer: storedBuffer,
        })
      } else {
        const pdf = await createWorkOrderPdfVersion({
          workOrderId,
          companyId,
          actorId: userId,
          reason: 'manual-email',
        })
        pdfVersion = pdf.record.version
        totalBytes += pdf.buffer.length
        if (totalBytes > MAX_TOTAL_EMAIL_ATTACHMENT_BYTES) {
          throw new Error('Attachments exceed 25MB total limit with PDF included')
        }
        attachments.push({
          filename: `work-order-${workOrder.id}-v${pdfVersion}.pdf`,
          contentType: 'application/pdf',
          buffer: pdf.buffer,
        })
      }
    }

    const textBody = bodyTextInput?.trim() || stripHtml(bodyHtml)
    if (!textBody) {
      throw new Error('Email body cannot be empty')
    }

    const emailRecord = await sendContactEmail({
      accountId: account.id,
      companyId,
      contactId: workOrder.contactId,
      authorId: userId,
      to: toRecipients,
      cc: ccRecipients.length ? ccRecipients : undefined,
      bcc: bccRecipients.length ? bccRecipients : undefined,
      subject,
      html: bodyHtml,
      text: textBody,
      attachments,
    })

    const eventTimestamp = new Date()

    await prisma.contact.update({
      where: { id: workOrder.contactId },
      data: { lastActivityAt: eventTimestamp, activityState: 'ACTIVE' },
    })

    const recipientSummary = {
      to: toRecipients.map((recipient) => recipient.email),
      cc: ccRecipients.map((recipient) => recipient.email),
      bcc: bccRecipients.map((recipient) => recipient.email),
    }

    await prisma.accessAuditLog.create({
      data: {
        companyId,
        actorId: userId,
        action: 'EMAIL_SENT',
        metadata: {
          workOrderId,
          contactId: workOrder.contactId,
          recipients: recipientSummary,
          subject,
          timestamp: eventTimestamp.toISOString(),
          emailId: emailRecord.id,
          includePdf,
          pdfVersion,
          attachmentCount: attachments.length,
        },
      },
    })

    await recordWorkOrderActivity({
      companyId,
      workOrderId,
      actorId: userId,
      type: 'EMAIL_SENT',
      metadata: {
        subject,
        mode: 'MANUAL',
        recipients: recipientSummary,
        emailId: emailRecord.id,
        attachmentCount: attachments.length,
        includePdf,
        pdfVersion,
      },
    })

    revalidateDispatchSurfaces()
    revalidateContactSurfaces(workOrder.contactId)

    return { success: true, message: 'Email sent' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send dispatch email'
    return { success: false, message }
  }
}

export async function updateWorkOrderNotesAction(formData: FormData) {
  const { companyId, userId } = await requireDispatchUser()
  const workOrderId = formData.get('workOrderId')?.toString()

  if (!workOrderId) {
    throw new Error('Work order id is required')
  }

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, companyId },
    select: {
      id: true,
      status: true,
      operationsNotes: true,
      gateAccessCode: true,
      onsitePocName: true,
      onsitePocPhone: true,
      specialInstructions: true,
    },
  })

  if (!workOrder) {
    throw new Error('Work order not found')
  }

  assertWorkOrderMutable(workOrder.status)

  const nextState = buildNoteStateFromForm(formData)
  const previousState = buildNoteStateFromRecord(workOrder)
  const beforeHash = hashNoteState(previousState)
  const afterHash = hashNoteState(nextState)

  if (beforeHash === afterHash) {
    return
  }

  await prisma.workOrder.update({
    where: { id: workOrder.id },
    data: nextState,
  })

  const timestamp = new Date().toISOString()
  const auditAction: keyof typeof NOTE_ACTIVITY_MAP = isNoteStateEmpty(previousState)
    ? 'WORKORDER_NOTE_ADDED'
    : 'WORKORDER_NOTE_UPDATED'

  await prisma.accessAuditLog.create({
    data: {
      companyId,
      actorId: userId,
      action: auditAction,
      metadata: {
        workOrderId,
        actorId: userId,
        beforeHash,
        afterHash,
        timestamp,
      },
    },
  })

  await recordWorkOrderActivity({
    companyId,
    workOrderId,
    actorId: userId,
    type: NOTE_ACTIVITY_MAP[auditAction],
    metadata: {
      gateAccessCode: nextState.gateAccessCode,
      onsitePocName: nextState.onsitePocName,
      onsitePocPhone: nextState.onsitePocPhone,
      notesPreview: nextState.operationsNotes ? nextState.operationsNotes.slice(0, 280) : null,
      specialInstructionsPreview: nextState.specialInstructions ? nextState.specialInstructions.slice(0, 280) : null,
    },
  })

  if (workOrder.status === 'SCHEDULED' || workOrder.status === 'IN_PROGRESS') {
    try {
      await sendAutoWorkOrderEmails({
        workOrderId,
        companyId,
        actorId: userId,
        trigger: 'notes',
      })
    } catch (error) {
      console.error('Auto work order email (notes) failed', error)
    }
  }

  revalidateDispatchSurfaces()
}

export async function assignEmployeeToWorkOrderAction(formData: FormData) {
  const { companyId, userId } = await requireDispatchUser()
  const workOrderId = formData.get('workOrderId')?.toString()
  const employeeId = formData.get('employeeId')?.toString()
  const forceOverride = formData.get('forceOverride')?.toString() === 'true'
  const overrideReason = formData.get('overrideReason')?.toString()?.trim() ?? ''

  if (!workOrderId || !employeeId) {
    throw new Error('Work order and employee are required')
  }

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, companyId },
    select: { id: true, status: true, title: true },
  })

  if (!workOrder) {
    throw new Error('Work order not found')
  }

  assertWorkOrderMutable(workOrder.status)

  const employee = await prisma.complianceEmployee.findFirst({
    where: { id: employeeId, companyId, active: true },
    include: {
      certifications: {
        select: {
          id: true,
          presetKey: true,
          customName: true,
          required: true,
          status: true,
          expiresAt: true,
        },
      },
    },
  })

  if (!employee) {
    throw new Error('Compliance employee not found')
  }

  const snapshot = summarizeEmployeeCompliance(employee)
  const requiresOverride = snapshot.needsOverride

  if (requiresOverride && !forceOverride) {
    throw new Error('Compliance override acknowledgement is required to assign this employee')
  }

  if (forceOverride && overrideReason.length < 10) {
    throw new Error('Provide an override reason (minimum 10 characters)')
  }

  const existing = await prisma.workOrderAssignment.findFirst({
    where: { workOrderId, employeeId, unassignedAt: null },
    select: { id: true },
  })

  if (existing) {
    return
  }

  const missingCerts = snapshot.summary.missing.map((gap) => gap.label)
  const expiringCerts = snapshot.summary.expiring.map((gap) => gap.label)

  let newAssignmentId: string | null = null

  await prisma.$transaction(async (tx) => {
    const assignment = await tx.workOrderAssignment.create({
      data: {
        workOrderId,
        employeeId,
        assignedById: userId,
        complianceStatus: snapshot.status,
        gapSummary: snapshot.summary,
        overrideAcknowledged: requiresOverride,
        overrideReason: requiresOverride ? overrideReason : null,
        overrideActorId: requiresOverride ? userId : null,
        overrideAt: requiresOverride ? new Date() : null,
      },
    })

    newAssignmentId = assignment.id

    await tx.accessAuditLog.create({
      data: {
        companyId,
        actorId: userId,
        action: 'WORKORDER_EMPLOYEE_ASSIGNED',
        metadata: {
          workOrderId,
          workOrderTitle: workOrder.title,
          employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
          complianceStatus: snapshot.status,
          missingCerts,
          expiringCerts,
          override: requiresOverride,
        },
      },
    })

    if (requiresOverride) {
      await tx.accessAuditLog.create({
        data: {
          companyId,
          actorId: userId,
          action: 'COMPLIANCE_OVERRIDE_APPLIED',
          metadata: {
            workOrderId,
            employeeId,
            missingCerts,
            expiringCerts,
            overrideReason,
          },
        },
      })

      await recordWorkOrderActivity({
        companyId,
        workOrderId,
        actorId: userId,
        type: 'COMPLIANCE_OVERRIDE',
        metadata: {
          employeeId,
          missingCerts,
          expiringCerts,
          overrideReason,
        },
      })
    }

    await recordWorkOrderActivity({
      companyId,
      workOrderId,
      actorId: userId,
      type: 'EMPLOYEE_ASSIGNED',
      metadata: {
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
        complianceStatus: snapshot.status,
      },
    })
  })

  if ((workOrder.status === 'SCHEDULED' || workOrder.status === 'IN_PROGRESS') && newAssignmentId) {
    try {
      await sendAutoWorkOrderEmails({
        workOrderId,
        companyId,
        actorId: userId,
        trigger: 'assignment',
        targetedAssignmentId: newAssignmentId,
      })
    } catch (error) {
      console.error('Auto work order email (assignment) failed', error)
    }
  }

  revalidateDispatchSurfaces()
}

export async function removeEmployeeAssignmentAction(formData: FormData) {
  const { companyId, userId } = await requireDispatchUser()
  const assignmentId = formData.get('assignmentId')?.toString()

  if (!assignmentId) {
    throw new Error('Assignment id required')
  }

  const assignment = await prisma.workOrderAssignment.findFirst({
    where: { id: assignmentId, workOrder: { companyId } },
    include: {
      workOrder: { select: { id: true, status: true, title: true } },
      employee: { select: { firstName: true, lastName: true } },
    },
  })

  if (!assignment) {
    throw new Error('Assignment not found')
  }

  if (assignment.unassignedAt) {
    return
  }

  assertWorkOrderMutable(assignment.workOrder.status)

  await prisma.$transaction(async (tx) => {
    await tx.workOrderAssignment.update({
      where: { id: assignmentId },
      data: { unassignedAt: new Date() },
    })

    await tx.accessAuditLog.create({
      data: {
        companyId,
        actorId: userId,
        action: 'WORKORDER_STATUS_UPDATED',
        metadata: {
          workOrderId: assignment.workOrder.id,
          workOrderTitle: assignment.workOrder.title,
          employeeId: assignment.employeeId,
          action: 'EMPLOYEE_UNASSIGNED',
        },
      },
    })

    await recordWorkOrderActivity({
      companyId,
      workOrderId: assignment.workOrder.id,
      actorId: userId,
      type: 'EMPLOYEE_UNASSIGNED',
      metadata: {
        employeeId: assignment.employeeId,
        employeeName: `${assignment.employee.firstName} ${assignment.employee.lastName}`.trim(),
      },
    })
  })

  revalidateDispatchSurfaces()
}

export async function assignAssetToWorkOrderAction(formData: FormData) {
  const { companyId, userId } = await requireDispatchUser()
  const workOrderId = formData.get('workOrderId')?.toString()
  const assetId = formData.get('assetId')?.toString()

  if (!workOrderId || !assetId) {
    throw new Error('Work order and asset are required')
  }

  const [workOrder, asset] = await Promise.all([
    prisma.workOrder.findFirst({
      where: { id: workOrderId, companyId },
      select: { id: true, status: true },
    }),
    prisma.asset.findFirst({
      where: { id: assetId, companyId },
      select: {
        id: true,
        assetName: true,
        assetType: true,
        assetNumber: true,
        status: true,
      },
    }),
  ])

  if (!workOrder) {
    throw new Error('Work order not found')
  }

  assertWorkOrderMutable(workOrder.status)

  if (!asset) {
    throw new Error('Asset not found')
  }

  if (asset.status !== 'IN_SERVICE') {
    throw new Error('Only in-service assets can be assigned')
  }

  const alreadyAssigned = await prisma.workOrderAssetAssignment.findFirst({
    where: { workOrderId, assetId, removedAt: null },
    select: { id: true },
  })

  if (alreadyAssigned) {
    return
  }

  await prisma.workOrderAssetAssignment.create({
    data: {
      workOrderId,
      assetId,
      assignedById: userId,
      statusAtAssignment: asset.status,
      assetNameSnapshot: asset.assetName,
      assetTypeSnapshot: asset.assetType,
      assetNumberSnapshot: asset.assetNumber,
    },
  })

  await logAssetAudit(companyId, userId, 'ASSET_ASSIGNED_TO_WORKORDER', {
    workOrderId,
    assetId,
    assetNumber: asset.assetNumber,
    assetStatus: asset.status,
  })

  await recordWorkOrderActivity({
    companyId,
    workOrderId,
    actorId: userId,
    type: 'ASSET_ASSIGNED',
    metadata: {
      assetId,
      assetName: asset.assetName,
      assetNumber: asset.assetNumber,
    },
  })

  if (workOrder.status === 'SCHEDULED' || workOrder.status === 'IN_PROGRESS') {
    try {
      await sendAutoWorkOrderEmails({
        workOrderId,
        companyId,
        actorId: userId,
        trigger: 'asset',
      })
    } catch (error) {
      console.error('Auto work order email (asset) failed', error)
    }
  }

  revalidateDispatchSurfaces()
}

export async function removeAssetFromWorkOrderAction(formData: FormData) {
  const { companyId, userId } = await requireDispatchUser()
  const assignmentId = formData.get('assignmentId')?.toString()

  if (!assignmentId) {
    throw new Error('Assignment id required')
  }

  const assignment = await prisma.workOrderAssetAssignment.findFirst({
    where: { id: assignmentId, workOrder: { companyId } },
    select: {
      id: true,
      assetId: true,
      removedAt: true,
      workOrder: { select: { id: true, status: true } },
      asset: { select: { assetName: true, assetNumber: true } },
    },
  })

  if (!assignment) {
    throw new Error('Assignment not found')
  }

  if (assignment.removedAt) {
    return
  }

  assertWorkOrderMutable(assignment.workOrder.status)

  await prisma.workOrderAssetAssignment.update({
    where: { id: assignmentId },
    data: {
      removedAt: new Date(),
      removedById: userId,
    },
  })

  await logAssetAudit(companyId, userId, 'ASSET_REMOVED_FROM_WORKORDER', {
    workOrderId: assignment.workOrder.id,
    assetId: assignment.assetId,
    assetNumber: assignment.asset?.assetNumber ?? null,
  })

  await recordWorkOrderActivity({
    companyId,
    workOrderId: assignment.workOrder.id,
    actorId: userId,
    type: 'ASSET_REMOVED',
    metadata: {
      assetId: assignment.assetId,
      assetName: assignment.asset?.assetName ?? null,
      assetNumber: assignment.asset?.assetNumber ?? null,
    },
  })

  revalidateDispatchSurfaces()
}

export async function addPresetToWorkOrderAction(formData: FormData) {
  const { companyId, userId } = await requireDispatchUser()
  const workOrderId = formData.get('workOrderId')?.toString()
  const presetId = formData.get('presetId')?.toString()

  if (!workOrderId || !presetId) {
    throw new Error('Work order and preset are required')
  }

  const [workOrder, preset] = await Promise.all([
    prisma.workOrder.findFirst({ where: { id: workOrderId, companyId }, select: { id: true, status: true } }),
    prisma.dispatchPreset.findFirst({ where: { id: presetId, companyId }, select: { id: true, name: true, scope: true, defaultNotes: true, locked: true, isOther: true, enabled: true } }),
  ])

  if (!workOrder) {
    throw new Error('Work order not found')
  }

  assertWorkOrderMutable(workOrder.status)

  if (!preset) {
    throw new Error('Preset not found')
  }

  if (!preset.enabled && !preset.isOther) {
    throw new Error('Preset disabled')
  }

  const existing = await prisma.workOrderPreset.findFirst({ where: { workOrderId, presetId } })
  if (existing) {
    return
  }

  await prisma.workOrderPreset.create({
    data: {
      workOrderId,
      presetId,
      overriddenNotes: preset.defaultNotes ?? null,
      addedById: userId,
    },
  })

  await recordWorkOrderActivity({
    companyId,
    workOrderId,
    actorId: userId,
    type: 'DISPATCH_PRESET_ADDED',
    metadata: {
      presetId,
      presetName: preset.name,
      scope: preset.scope,
    },
  })

  revalidateDispatchSurfaces()
}

export async function removePresetFromWorkOrderAction(formData: FormData) {
  const { companyId, userId } = await requireDispatchUser()
  const workOrderPresetId = formData.get('workOrderPresetId')?.toString()

  if (!workOrderPresetId) {
    throw new Error('Preset selection id required')
  }

  const entry = await prisma.workOrderPreset.findFirst({
    where: { id: workOrderPresetId, workOrder: { companyId } },
    select: {
      id: true,
      workOrderId: true,
      presetId: true,
      preset: { select: { name: true, scope: true } },
      workOrder: { select: { id: true, status: true } },
    },
  })

  if (!entry) {
    throw new Error('Preset selection not found')
  }

  assertWorkOrderMutable(entry.workOrder.status)

  await prisma.workOrderPreset.delete({ where: { id: workOrderPresetId } })

  await recordWorkOrderActivity({
    companyId,
    workOrderId: entry.workOrderId,
    actorId: userId,
    type: 'DISPATCH_PRESET_REMOVED',
    metadata: {
      presetId: entry.presetId,
      presetName: entry.preset.name,
      scope: entry.preset.scope,
    },
  })

  revalidateDispatchSurfaces()
}

export async function updateWorkOrderPresetNotesAction(formData: FormData) {
  const { companyId, userId } = await requireDispatchUser()
  const workOrderPresetId = formData.get('workOrderPresetId')?.toString()
  const notesRaw = formData.get('notes')?.toString() ?? ''
  const trimmed = notesRaw.trim()
  const normalizedNotes = trimmed === '' ? null : trimmed

  if (!workOrderPresetId) {
    throw new Error('Preset selection id required')
  }

  const entry = await prisma.workOrderPreset.findFirst({
    where: { id: workOrderPresetId, workOrder: { companyId } },
    select: {
      id: true,
      overriddenNotes: true,
      workOrder: { select: { id: true, status: true } },
      preset: { select: { name: true, scope: true, id: true } },
    },
  })

  if (!entry) {
    throw new Error('Preset selection not found')
  }

  assertWorkOrderMutable(entry.workOrder.status)

  if ((entry.overriddenNotes ?? null) === normalizedNotes) {
    return
  }

  await prisma.workOrderPreset.update({
    where: { id: workOrderPresetId },
    data: { overriddenNotes: normalizedNotes },
  })

  await recordWorkOrderActivity({
    companyId,
    workOrderId: entry.workOrder.id,
    actorId: userId,
    type: 'DISPATCH_PRESET_NOTE_UPDATED',
    metadata: {
      presetId: entry.preset.id,
      presetName: entry.preset.name,
      scope: entry.preset.scope,
      notes: normalizedNotes,
    },
  })

  revalidateDispatchSurfaces()
}

const WORK_ORDER_STATUS_VALUES: WorkOrderStatus[] = ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

function parseWorkOrderStatusInput(value: FormDataEntryValue | null): WorkOrderStatus {
  if (!value) {
    throw new Error('Next status is required')
  }

  const normalized = value.toString().toUpperCase() as WorkOrderStatus

  if (!WORK_ORDER_STATUS_VALUES.includes(normalized)) {
    throw new Error('Invalid work order status')
  }

  return normalized
}

export async function transitionDispatchWorkOrderStatusAction(formData: FormData) {
  const { companyId, userId } = await requireDispatchUser()
  const workOrderId = formData.get('workOrderId')?.toString()
  const nextStatus = parseWorkOrderStatusInput(formData.get('nextStatus'))

  if (!workOrderId) {
    throw new Error('Work order id is required')
  }

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, companyId },
    select: {
      id: true,
      companyId: true,
      status: true,
      scheduledAt: true,
      startedAt: true,
      completedAt: true,
      cancelledAt: true,
      closedAt: true,
    },
  })

  if (!workOrder) {
    throw new Error('Work order not found')
  }

  await transitionWorkOrderStatus({
    workOrder,
    nextStatus,
    actorId: userId,
  })

  revalidateDispatchSurfaces()
}

import { prisma } from '@/lib/prisma'
import { createWorkOrderPdfVersion } from '@/lib/dispatch/pdfStorage'
import { recordWorkOrderActivity } from '@/lib/dispatch/workOrderActivity'
import { sendContactEmail } from '@/lib/email/service'
import { normalizeRecipientList } from '@/lib/email/recipients'
import type { AccessAuditAction, WorkOrderStatus } from '@prisma/client'

const ACTIVE_EMAIL_STATUSES: WorkOrderStatus[] = ['SCHEDULED', 'IN_PROGRESS']

type AutoEmailTrigger = 'status-change' | 'assignment' | 'asset' | 'notes'

type AssignmentPayload = {
  id: string
  employeeId: string
  employeeName: string
  employeeRole: string
  employeeTitle: string
  employeeEmail: string | null
  overrideAcknowledged: boolean
  overrideReason: string | null
  gapSummary: { missing?: Array<{ label: string }>; expiring?: Array<{ label: string }> } | null
}

type WorkOrderSnapshot = {
  id: string
  title: string
  status: WorkOrderStatus
  companyName: string | null
  contactId: string
  contactName: string
  contactEmail: string | null
  contactPhone: string | null
  scheduledAt: Date | null
  startedAt: Date | null
  operationsNotes: string | null
  gateAccessCode: string | null
  onsitePocName: string | null
  onsitePocPhone: string | null
  specialInstructions: string | null
  assignments: AssignmentPayload[]
}

function formatDate(date: Date | null): string {
  if (!date) return 'Not provided'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildOverrideBlock(assignment: AssignmentPayload): string {
  if (!assignment.overrideAcknowledged) return ''
  const missing = assignment.gapSummary?.missing?.map((gap) => gap.label) ?? []
  const expiring = assignment.gapSummary?.expiring?.map((gap) => gap.label) ?? []
  const missingItems = missing.length ? missing.map((label) => `<li>${label}</li>`).join('') : '<li>None listed</li>'
  const expiringItems = expiring.length ? expiring.map((label) => `<li>${label}</li>`).join('') : '<li>None listed</li>'
  return `
    <div style="margin-top:12px;padding:10px;border:1px solid #f87171;background:#fef2f2;border-radius:8px;">
      <strong>⚠️ Compliance Override Notice</strong>
      <p style="margin:6px 0 6px 0;">This assignment includes a compliance override.</p>
      <p style="margin:6px 0 4px 0;">Missing certifications:</p>
      <ul style="margin:0 0 6px 18px;">${missingItems}</ul>
      <p style="margin:6px 0 4px 0;">Expiring certifications:</p>
      <ul style="margin:0 0 6px 18px;">${expiringItems}</ul>
      ${assignment.overrideReason ? `<p style="margin:4px 0 0 0;">Reason: ${assignment.overrideReason}</p>` : ''}
    </div>
  `
}

function buildEmailBody(order: WorkOrderSnapshot, assignment: AssignmentPayload): { html: string; text: string } {
  const dateTime = order.startedAt ?? order.scheduledAt
  const location = 'Not provided'
  const dispatchContact = order.onsitePocPhone || order.contactPhone || 'Dispatch contact not provided'
  const notesBlock = [
    order.operationsNotes && `<p><strong>Operations notes:</strong> ${order.operationsNotes}</p>`,
    order.specialInstructions && `<p><strong>Special instructions:</strong> ${order.specialInstructions}</p>`,
    order.gateAccessCode && `<p><strong>Gate / access code:</strong> ${order.gateAccessCode}</p>`,
    order.onsitePocName && `<p><strong>On-site POC:</strong> ${order.onsitePocName}</p>`,
    order.onsitePocPhone && `<p><strong>POC phone:</strong> ${order.onsitePocPhone}</p>`,
  ]
    .filter(Boolean)
    .join('')

  const html = `
    <div style="font-family:Arial, sans-serif;color:#0f172a;">
      <p style="margin:0 0 8px 0;">Hi ${assignment.employeeName},</p>
      <p style="margin:0 0 12px 0;">You have been assigned to a work order.</p>
      <p style="margin:0 0 8px 0;"><strong>Company:</strong> ${order.companyName ?? 'Company not set'}</p>
      <p style="margin:0 0 8px 0;"><strong>Job:</strong> ${order.title}</p>
      <p style="margin:0 0 8px 0;"><strong>Location:</strong> ${location}</p>
      <p style="margin:0 0 8px 0;"><strong>Date / time:</strong> ${formatDate(dateTime)}</p>
      <p style="margin:0 0 8px 0;"><strong>Assigned role:</strong> ${assignment.employeeRole || assignment.employeeTitle || 'Not provided'}</p>
      <p style="margin:0 0 12px 0;"><strong>Dispatch contact:</strong> ${dispatchContact}</p>
      ${notesBlock || '<p style="margin:0 0 12px 0;">No additional notes provided.</p>'}
      ${buildOverrideBlock(assignment)}
      <p style="margin:16px 0 0 0;">A PDF copy of the work order is attached for your records.</p>
      <p style="margin:12px 0 0 0;">Thank you.</p>
    </div>
  `

  const textParts = [
    `Hi ${assignment.employeeName},`,
    'You have been assigned to a work order.',
    `Company: ${order.companyName ?? 'Company not set'}`,
    `Job: ${order.title}`,
    `Location: ${location}`,
    `Date / time: ${formatDate(dateTime)}`,
    `Assigned role: ${assignment.employeeRole || assignment.employeeTitle || 'Not provided'}`,
    `Dispatch contact: ${dispatchContact}`,
    order.operationsNotes ? `Operations notes: ${order.operationsNotes}` : null,
    order.specialInstructions ? `Special instructions: ${order.specialInstructions}` : null,
    order.gateAccessCode ? `Gate / access code: ${order.gateAccessCode}` : null,
    order.onsitePocName ? `On-site POC: ${order.onsitePocName}` : null,
    order.onsitePocPhone ? `POC phone: ${order.onsitePocPhone}` : null,
    assignment.overrideAcknowledged
      ? `Compliance Override Notice: missing [${(assignment.gapSummary?.missing ?? []).map((gap) => gap.label).join(', ') || 'none'}]; expiring [${(assignment.gapSummary?.expiring ?? []).map((gap) => gap.label).join(', ') || 'none'}].`
      : null,
    'A PDF copy of the work order is attached.',
    'Thank you.',
  ].filter(Boolean)

  return { html, text: textParts.join('\n') }
}

async function logEmailEvent(params: {
  companyId: string
  actorId: string | null
  action: AccessAuditAction
  event: 'WORKORDER_EMAIL_SENT' | 'WORKORDER_EMAIL_FAILED' | 'WORKORDER_EMAIL_SKIPPED_NO_EMAIL'
  workOrderId: string
  employeeId: string
  employeeEmail: string | null
  pdfId?: string | null
  pdfVersion?: number | null
  trigger: AutoEmailTrigger
  error?: string
}) {
  await prisma.accessAuditLog.create({
    data: {
      companyId: params.companyId,
      actorId: params.actorId,
      action: params.action,
      metadata: {
        event: params.event,
        workOrderId: params.workOrderId,
        employeeId: params.employeeId,
        employeeEmail: params.employeeEmail,
        pdfId: params.pdfId ?? null,
        pdfVersion: params.pdfVersion ?? null,
        trigger: params.trigger,
        error: params.error ?? null,
        timestamp: new Date().toISOString(),
      },
    },
  })
}

async function findDefaultAccount(companyId: string) {
  return prisma.emailAccount.findFirst({
    where: { companyId, deauthorizedAt: null },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  })
}

async function loadWorkOrderSnapshot(workOrderId: string, companyId: string): Promise<WorkOrderSnapshot | null> {
  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, companyId },
    select: {
      id: true,
      title: true,
      status: true,
      scheduledAt: true,
      startedAt: true,
      operationsNotes: true,
      gateAccessCode: true,
      onsitePocName: true,
      onsitePocPhone: true,
      specialInstructions: true,
      contactId: true,
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          companyOverrideName: true,
          derivedCompanyName: true,
          phone: true,
        },
      },
      company: { select: { name: true } },
      assignments: {
        where: { unassignedAt: null },
        orderBy: { assignedAt: 'asc' },
        select: {
          id: true,
          employeeId: true,
          overrideAcknowledged: true,
          overrideReason: true,
          gapSummary: true,
          employee: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              title: true,
            },
          },
        },
      },
    },
  })

  if (!workOrder) return null

  const contactName = `${workOrder.contact.firstName} ${workOrder.contact.lastName}`.trim()

  return {
    id: workOrder.id,
    title: workOrder.title,
    status: workOrder.status,
    companyName: workOrder.company?.name ?? null,
    contactId: workOrder.contactId,
    contactName,
    contactEmail: workOrder.contact.email,
    contactPhone: workOrder.contact.phone ?? null,
    scheduledAt: workOrder.scheduledAt,
    startedAt: workOrder.startedAt,
    operationsNotes: workOrder.operationsNotes,
    gateAccessCode: workOrder.gateAccessCode,
    onsitePocName: workOrder.onsitePocName,
    onsitePocPhone: workOrder.onsitePocPhone,
    specialInstructions: workOrder.specialInstructions,
    assignments: workOrder.assignments.map((assignment) => ({
      id: assignment.id,
      employeeId: assignment.employeeId,
      employeeName: `${assignment.employee.firstName} ${assignment.employee.lastName}`.trim(),
      employeeRole: assignment.employee.role,
      employeeTitle: assignment.employee.title,
      employeeEmail: assignment.employee.email ?? null,
      overrideAcknowledged: assignment.overrideAcknowledged,
      overrideReason: assignment.overrideReason,
      gapSummary: (assignment.gapSummary as AssignmentPayload['gapSummary']) ?? null,
    })),
  }
}

export async function sendAutoWorkOrderEmails(params: {
  workOrderId: string
  companyId: string
  actorId?: string | null
  trigger: AutoEmailTrigger
  targetedAssignmentId?: string | null
}): Promise<void> {
  const actorId = params.actorId ?? null
  const snapshot = await loadWorkOrderSnapshot(params.workOrderId, params.companyId)
  if (!snapshot) return
  if (!ACTIVE_EMAIL_STATUSES.includes(snapshot.status)) return

  const assignments = params.targetedAssignmentId
    ? snapshot.assignments.filter((assignment) => assignment.id === params.targetedAssignmentId)
    : snapshot.assignments

  if (!assignments.length) return

  const emailAccount = await findDefaultAccount(params.companyId)
  if (!emailAccount) {
    await Promise.all(
      assignments.map((assignment) =>
        logEmailEvent({
          companyId: params.companyId,
          actorId,
          action: 'CUSTOM_ACTIVITY_LOGGED',
          event: 'WORKORDER_EMAIL_FAILED',
          workOrderId: snapshot.id,
          employeeId: assignment.employeeId,
          employeeEmail: assignment.employeeEmail,
          trigger: params.trigger,
          error: 'No active email account',
        })
      )
    )
    return
  }

  let pdfBuffer: Buffer | null = null
  let pdfVersion: number | null = null
  let pdfId: string | null = null

  try {
    const pdf = await createWorkOrderPdfVersion({
      workOrderId: snapshot.id,
      companyId: params.companyId,
      actorId: actorId ?? emailAccount.userId,
      reason: 'auto-email',
    })
    pdfBuffer = pdf.buffer
    pdfVersion = pdf.record.version
    pdfId = pdf.record.id
  } catch (error) {
    await Promise.all(
      assignments.map((assignment) =>
        logEmailEvent({
          companyId: params.companyId,
          actorId,
          action: 'CUSTOM_ACTIVITY_LOGGED',
          event: 'WORKORDER_EMAIL_FAILED',
          workOrderId: snapshot.id,
          employeeId: assignment.employeeId,
          employeeEmail: assignment.employeeEmail,
          trigger: params.trigger,
          error: error instanceof Error ? error.message : 'PDF generation failed',
        })
      )
    )
    return
  }

  for (const assignment of assignments) {
    if (!assignment.employeeEmail) {
      await logEmailEvent({
        companyId: params.companyId,
        actorId,
        action: 'CUSTOM_ACTIVITY_LOGGED',
        event: 'WORKORDER_EMAIL_SKIPPED_NO_EMAIL',
        workOrderId: snapshot.id,
        employeeId: assignment.employeeId,
        employeeEmail: assignment.employeeEmail,
        pdfId,
        pdfVersion,
        trigger: params.trigger,
      })
      continue
    }

    const { html, text } = buildEmailBody(snapshot, assignment)
    const subject = `Work Order Assigned — ${snapshot.title}`

    try {
      const toRecipients = normalizeRecipientList(assignment.employeeEmail)
      await sendContactEmail({
        accountId: emailAccount.id,
        companyId: params.companyId,
        contactId: snapshot.contactId,
        authorId: actorId ?? emailAccount.userId,
        to: toRecipients,
        subject,
        html,
        text,
        attachments: [
          {
            filename: `work-order-${snapshot.id}-v${pdfVersion ?? 1}.pdf`,
            contentType: 'application/pdf',
            buffer: pdfBuffer!,
          },
        ],
      })

      await logEmailEvent({
        companyId: params.companyId,
        actorId,
        action: 'EMAIL_SENT',
        event: 'WORKORDER_EMAIL_SENT',
        workOrderId: snapshot.id,
        employeeId: assignment.employeeId,
        employeeEmail: assignment.employeeEmail,
        pdfId,
        pdfVersion,
        trigger: params.trigger,
      })

      await recordWorkOrderActivity({
        companyId: params.companyId,
        workOrderId: snapshot.id,
        actorId,
        type: 'EMAIL_SENT',
        metadata: {
          mode: 'AUTO',
          trigger: params.trigger,
          employeeId: assignment.employeeId,
          employeeEmail: assignment.employeeEmail,
          pdfVersion,
        },
      })
    } catch (error) {
      await logEmailEvent({
        companyId: params.companyId,
        actorId,
        action: 'CUSTOM_ACTIVITY_LOGGED',
        event: 'WORKORDER_EMAIL_FAILED',
        workOrderId: snapshot.id,
        employeeId: assignment.employeeId,
        employeeEmail: assignment.employeeEmail,
        pdfId,
        pdfVersion,
        trigger: params.trigger,
        error: error instanceof Error ? error.message : 'Email send failed',
      })
    }
  }
}

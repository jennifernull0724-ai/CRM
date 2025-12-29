'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import type { AccessAuditAction, WorkOrderDiscipline } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertWorkOrderMutable } from '@/lib/dispatch/workOrderLifecycle'
import { recordWorkOrderActivity } from '@/lib/dispatch/workOrderActivity'
import { mapIndustryToDiscipline } from '@/lib/dispatch/dashboard'
import { summarizeEmployeeCompliance } from '@/lib/dispatch/compliance'

const DISPATCH_CAPABLE_ROLES = ['dispatch', 'admin', 'owner']
const WORK_ORDER_DISCIPLINES: WorkOrderDiscipline[] = ['CONSTRUCTION', 'RAILROAD', 'ENVIRONMENTAL']

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
  revalidatePath('/dashboard/dispatch')
  revalidatePath('/dashboard/assets')
  revalidatePath('/dashboard/admin/assets')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/admin/dispatch-presets')
  revalidatePath('/dashboard/owner')
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
  })

  revalidateDispatchSurfaces()
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

  })

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

  await prisma.$transaction(async (tx) => {
    await tx.workOrderAssignment.create({
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

import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWorkOrderDetail } from '@/lib/dispatch/workOrders'
import { generateWorkOrderPdf } from '@/lib/dispatch/pdf'
import { recordWorkOrderActivity } from '@/lib/dispatch/workOrderActivity'

const DISPATCH_CAPABLE_ROLES = ['dispatch', 'admin', 'owner']

export async function GET(_request: NextRequest, { params }: { params: { workOrderId: string } }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const role = session.user.role.toLowerCase()

  if (!DISPATCH_CAPABLE_ROLES.includes(role)) {
    return new Response('Forbidden', { status: 403 })
  }

  const workOrder = await getWorkOrderDetail(params.workOrderId, session.user.companyId)

  if (!workOrder) {
    return new Response('Work order not found', { status: 404 })
  }

  const pdfBuffer = await generateWorkOrderPdf({
    id: workOrder.id,
    title: workOrder.title,
    status: workOrder.status,
    createdAt: workOrder.createdAt,
    dispatchStatus: workOrder.dispatchStatus,
    dispatchPriority: workOrder.dispatchPriority,
    contact: workOrder.contact,
    presets: workOrder.presets.map((preset) => ({
      name: preset.name,
      scope: preset.scope,
      notes: preset.overriddenNotes ?? preset.defaultNotes,
    })),
    assignments: workOrder.assignments.map((assignment) => ({
      employeeName: assignment.employeeName,
      employeeRole: assignment.employeeRole,
      assignedAt: assignment.assignedAt,
      complianceStatus: assignment.complianceStatus,
      overrideAcknowledged: assignment.overrideAcknowledged,
      overrideReason: assignment.overrideReason,
      missingCerts: (assignment.gapSummary?.missing ?? []).map((gap) => gap.label),
      expiringCerts: (assignment.gapSummary?.expiring ?? []).map((gap) => gap.label),
    })),
    assets: workOrder.assets.map((asset) => ({
      assetName: asset.assetName,
      assetType: asset.assetType,
      assetNumber: asset.assetNumber,
      statusAtAssignment: asset.statusAtAssignment,
      assignedAt: asset.assignedAt,
      removedAt: asset.removedAt,
    })),
  })

  await recordWorkOrderActivity({
    companyId: session.user.companyId,
    workOrderId: workOrder.id,
    actorId: session.user.id,
    type: 'PDF_GENERATED',
    metadata: {
      filename: `work-order-${workOrder.id}.pdf`,
    },
  })

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="work-order-${workOrder.id}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}

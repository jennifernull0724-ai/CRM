import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWorkOrderDetail } from '@/lib/dispatch/workOrders'
import { createWorkOrderPdfVersion } from '@/lib/dispatch/pdfStorage'

const DISPATCH_CAPABLE_ROLES = ['dispatch', 'admin', 'owner']

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ workOrderId: string }> }
) {
  const { workOrderId } = await context.params
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const role = session.user.role.toLowerCase()

  if (!DISPATCH_CAPABLE_ROLES.includes(role)) {
    return new Response('Forbidden', { status: 403 })
  }

  const workOrder = await getWorkOrderDetail(workOrderId, session.user.companyId)

  if (!workOrder) {
    return new Response('Work order not found', { status: 404 })
  }

  try {
    const { buffer: pdfBuffer } = await createWorkOrderPdfVersion({
      workOrderId: workOrder.id,
      companyId: session.user.companyId,
      actorId: session.user.id,
      reason: 'manual-download',
    })

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="work-order-${workOrder.id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate PDF'
    const status = /read-only/i.test(message) ? 409 : 400
    return new Response(message, { status })
  }
}

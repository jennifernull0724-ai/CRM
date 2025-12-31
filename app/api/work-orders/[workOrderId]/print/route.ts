import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLatestWorkOrderPdf, downloadWorkOrderPdf } from '@/lib/dispatch/pdfStorage'

const DISPATCH_ROLES = ['dispatch', 'admin', 'owner']

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workOrderId: string }> }
) {
  const { workOrderId } = await params
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role.toLowerCase()
  if (!DISPATCH_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const workOrder = await prisma.workOrder.findFirst({
    where: {
      id: workOrderId,
      companyId: session.user.companyId,
    },
    select: {
      id: true,
      title: true,
    },
  })

  if (!workOrder) {
    return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
  }

  // Get or generate the latest PDF
  let pdfBuffer: Buffer
  let pdfId: string

  try {
    const existingPdf = await getLatestWorkOrderPdf(workOrderId, session.user.companyId)
    
    if (existingPdf) {
      pdfBuffer = await downloadWorkOrderPdf(existingPdf)
      pdfId = existingPdf.id
    } else {
      // No PDF exists, generate one
      const { createWorkOrderPdfVersion } = await import('@/lib/dispatch/pdfStorage')
      const { buffer, record } = await createWorkOrderPdfVersion({
        workOrderId: workOrderId,
        companyId: session.user.companyId,
        actorId: session.user.id,
        reason: 'manual-download',
      })
      pdfBuffer = buffer
      pdfId = record.id
    }
  } catch (error) {
    console.error('Error fetching/generating work order PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }

  // Log the print event
  await prisma.accessAuditLog.create({
    data: {
      companyId: session.user.companyId,
      actorId: session.user.id,
      action: 'WORK_ORDER_PRINTED',
      metadata: {
        workOrderId: workOrder.id,
        workOrderTitle: workOrder.title,
        pdfId,
        printedAt: new Date().toISOString(),
      },
    },
  })

  // Return PDF with headers that trigger browser print dialog
  const sanitizedTitle = workOrder.title.replace(/[^a-zA-Z0-9-_ ]/g, '_')
  const fileName = `work-order-${sanitizedTitle}-${workOrderId.slice(0, 8)}.pdf`

  return new NextResponse(pdfBuffer as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Cache-Control': 'no-cache',
    },
  })
}

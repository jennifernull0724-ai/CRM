import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DISPATCH_CAPABLE_ROLES = ['dispatch', 'admin', 'owner']

function csvEscape(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role.toLowerCase()
  if (!DISPATCH_CAPABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const assignments = await prisma.workOrderAssignment.findMany({
    where: { workOrder: { companyId: session.user.companyId } },
    orderBy: { assignedAt: 'desc' },
    include: {
      workOrder: {
        select: {
          id: true,
          title: true,
          operationsNotes: true,
          gateAccessCode: true,
          onsitePocName: true,
          onsitePocPhone: true,
          specialInstructions: true,
        },
      },
      employee: { select: { firstName: true, lastName: true, role: true } },
    },
  })

  const header = [
    'workOrderId',
    'workOrderTitle',
    'operationsNotes',
    'gateAccessCode',
    'onsitePocName',
    'onsitePocPhone',
    'specialInstructions',
    'employeeName',
    'employeeRole',
    'complianceStatus',
    'assignedAt',
    'overrideAcknowledged',
    'overrideReason',
    'missingCerts',
    'expiringCerts',
  ]

  const rows = assignments.map((assignment) => {
    const gapSummary = (assignment.gapSummary as { missing?: Array<{ label: string }>; expiring?: Array<{ label: string }> }) ?? {
      missing: [],
      expiring: [],
    }
    const missing = (gapSummary.missing ?? []).map((gap) => gap.label).join(' | ')
    const expiring = (gapSummary.expiring ?? []).map((gap) => gap.label).join(' | ')

    return [
      assignment.workOrder.id,
      assignment.workOrder.title,
      assignment.workOrder.operationsNotes ?? '',
      assignment.workOrder.gateAccessCode ?? '',
      assignment.workOrder.onsitePocName ?? '',
      assignment.workOrder.onsitePocPhone ?? '',
      assignment.workOrder.specialInstructions ?? '',
      `${assignment.employee.firstName} ${assignment.employee.lastName}`.trim(),
      assignment.employee.role,
      assignment.complianceStatus ?? 'UNSET',
      assignment.assignedAt.toISOString(),
      String(assignment.overrideAcknowledged),
      assignment.overrideReason ?? '',
      missing,
      expiring,
    ]
  })

  const csv = [header, ...rows]
    .map((row) => row.map((value) => csvEscape(value)).join(','))
    .join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="dispatch-work-orders.csv"',
    },
  })
}

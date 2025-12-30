import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DISPATCH_ROLES = ['dispatch', 'admin', 'owner']

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = (session.user.role as string)?.toLowerCase()
  if (!DISPATCH_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const snapshots = await prisma.complianceSnapshot.findMany({
    where: { employee: { companyId: session.user.companyId } },
    orderBy: { createdAt: 'desc' },
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          role: true,
          complianceStatus: true,
        },
      },
    },
    take: 500,
  })

  const latestByEmployee = new Map<string, typeof snapshots[number]>()
  for (const snapshot of snapshots) {
    if (!latestByEmployee.has(snapshot.employeeId)) {
      latestByEmployee.set(snapshot.employeeId, snapshot)
    }
  }

  const items = Array.from(latestByEmployee.values()).map((snap) => ({
    employeeId: snap.employeeId,
    employeeCode: snap.employee.employeeId,
    name: `${snap.employee.firstName} ${snap.employee.lastName}`.trim(),
    role: snap.employee.role,
    complianceStatus: snap.payload?.employee?.complianceStatus ?? snap.employee.complianceStatus,
    failureReasons: Array.isArray(snap.failureReasons) ? snap.failureReasons : [],
    snapshotHash: snap.snapshotHash,
    snapshotCreatedAt: snap.createdAt,
  }))

  return NextResponse.json({ items })
}

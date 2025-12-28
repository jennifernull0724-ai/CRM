import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { planAllowsFeature, type PlanKey } from '@/lib/billing/planTiers'
import { logComplianceActivity } from '@/lib/compliance/activity'

function csvEscape(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['admin', 'owner'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'
  if (!planAllowsFeature(planKey, 'advanced_compliance')) {
    return NextResponse.json({ error: 'Enterprise plan required for exports' }, { status: 403 })
  }

  const url = new URL(request.url)
  const format = (url.searchParams.get('format') ?? 'json').toLowerCase()

  const employees = await prisma.complianceEmployee.findMany({
    where: { companyId: session.user.companyId },
    include: {
      certifications: true,
      documents: true,
    },
  })

  await Promise.all(
    employees.map((employee) =>
      logComplianceActivity({
        employeeId: employee.id,
        type: 'COMPLIANCE_EXPORTED',
        metadata: {
          format,
          userId: session.user.id,
        },
      })
    )
  )

  if (format === 'csv') {
    const header = [
      'employeeId',
      'firstName',
      'lastName',
      'certificationName',
      'status',
      'required',
      'issueDate',
      'expiresAt',
      'hasProof',
    ]
    const rows = employees.flatMap((employee) =>
      employee.certifications.map((cert) =>
        [
          employee.employeeId,
          employee.firstName,
          employee.lastName,
          cert.customName ?? cert.presetKey ?? '',
          cert.status,
          String(cert.required),
          cert.issueDate.toISOString(),
          cert.expiresAt.toISOString(),
          String(!cert.missingProof),
        ]
      )
    )

    const csv = [header, ...rows]
      .map((row) => row.map((value) => csvEscape(value)).join(','))
      .join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="compliance-export.csv"',
      },
    })
  }

  return NextResponse.json({ employees })
}

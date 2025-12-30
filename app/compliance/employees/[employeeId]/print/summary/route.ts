import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { planAllowsFeature, type PlanKey } from '@/lib/billing/planTiers'
import { generateEmployeeCompliancePdf } from '@/lib/compliance/pdf'
import { logComplianceActivity } from '@/lib/compliance/activity'
import { createComplianceSnapshot } from '@/lib/compliance/snapshots'

export async function GET(_request: Request, { params }: { params: { employeeId: string } }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['admin', 'owner'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'
  if (!planAllowsFeature(planKey, 'compliance_core')) {
    return NextResponse.json({ error: 'Compliance is not enabled on this plan' }, { status: 403 })
  }

  const employee = await prisma.complianceEmployee.findFirst({
    where: { id: params.employeeId, companyId: session.user.companyId },
    include: {
      company: { select: { name: true } },
      certifications: {
        include: {
          images: true,
        },
      },
    },
  })

  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  const snapshotRecord = await createComplianceSnapshot({
    employeeId: employee.id,
    createdById: session.user.id,
    source: 'print',
  })
  const snapshotHash = snapshotRecord.snapshot.snapshotHash

  const pdfBuffer = await generateEmployeeCompliancePdf({
    employee,
    certifications: employee.certifications.map((cert) => ({
      ...cert,
      images: cert.images.map((image) => ({
        id: image.id,
        filename: image.filename,
        objectKey: image.objectKey,
        mimeType: image.mimeType,
        sha256: image.sha256,
        version: image.version,
      })),
    })),
    snapshotHash: snapshotHash ?? 'UNVERIFIED',
    includeFullPacket: true,
  })

  await logComplianceActivity({
    companyId: session.user.companyId,
    actorId: session.user.id,
    employeeId: employee.id,
    type: 'COMPLIANCE_PRINTED',
    metadata: {
      employeeIdentifier: employee.employeeId,
      snapshotHash,
    },
  })

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${employee.employeeId}-compliance.pdf"`,
    },
  })
}

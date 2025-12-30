import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { planAllowsFeature, type PlanKey } from '@/lib/billing/planTiers'
import { prisma } from '@/lib/prisma'
import { generateComplianceBinder } from '@/lib/compliance/pdf'
import { logComplianceActivity } from '@/lib/compliance/activity'
import { createComplianceSnapshot } from '@/lib/compliance/snapshots'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const companyId = session.user.companyId!
  const actorId = session.user.id!

  if (!['admin', 'owner'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'
  if (!planAllowsFeature(planKey, 'advanced_compliance')) {
    return NextResponse.json({ error: 'Enterprise plan required for bulk printing' }, { status: 403 })
  }

  const formData = await request.formData()
  const employeeIds = formData.getAll('employeeId').map((value) => value.toString())

  if (!employeeIds.length) {
    return NextResponse.json({ error: 'Select at least one employee' }, { status: 400 })
  }

  const employees = await prisma.complianceEmployee.findMany({
    where: {
      id: { in: employeeIds },
      companyId,
    },
    include: {
      company: { select: { name: true } },
      certifications: {
        include: { images: true },
      },
    },
  })

  if (employees.length !== employeeIds.length) {
    return NextResponse.json({ error: 'One or more employees not found' }, { status: 404 })
  }

  const snapshotHashes = new Map<string, string>()

  for (const employee of employees) {
    const { snapshot } = await createComplianceSnapshot({
      employeeId: employee.id,
      createdById: actorId,
      source: 'print',
    })
    snapshotHashes.set(employee.id, snapshot.snapshotHash)
  }

  const binderBuffer = await generateComplianceBinder(
    employees.map((employee) => ({
      employee,
      certifications: employee.certifications.map((cert) => ({
        ...cert,
        images: cert.images.map((image) => ({
          id: image.id,
          filename: image.filename,
          sha256: image.sha256,
          objectKey: image.objectKey,
          mimeType: image.mimeType,
          version: image.version,
        })),
      })),
      snapshotHash: snapshotHashes.get(employee.id) ?? employee.complianceHash ?? 'UNVERIFIED',
      includeFullPacket: false,
    }))
  )

  await Promise.all(
    employees.map((employee) =>
      logComplianceActivity({
        companyId,
        actorId,
        employeeId: employee.id,
        type: 'COMPLIANCE_PRINTED',
        metadata: {
          mode: 'bulk',
          snapshotHash: snapshotHashes.get(employee.id) ?? employee.complianceHash ?? 'UNVERIFIED',
        },
      })
    )
  )

  return new NextResponse(binderBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="compliance-binder.pdf"',
    },
  })
}

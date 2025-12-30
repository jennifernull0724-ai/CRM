import { prisma } from '@/lib/prisma'
import { logComplianceActivity } from './activity'
import { hashPayload } from '@/lib/utils/hash'
import { CertificationStatus, ComplianceStatus } from '@prisma/client'

const COMPLIANCE_SNAPSHOT_MAX_AGE_DAYS = 30
const SNAPSHOT_STALE_THRESHOLD_MS = COMPLIANCE_SNAPSHOT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000

export type FailureReasonType =
  | 'MISSING_CERTIFICATION'
  | 'EXPIRED_CERTIFICATION'
  | 'MISSING_PROOF'
  | 'EMPLOYEE_INACTIVE'
  | 'MISSING_COMPANY_DOCUMENT'
  | 'SNAPSHOT_STALE'

export type FailureReason = {
  type: FailureReasonType
  entityId?: string | null
  label: string
}

export async function createComplianceSnapshot({
  employeeId,
  createdById,
  source = 'manual',
}: {
  employeeId: string
  createdById: string
  source?: 'manual' | 'inspection' | 'print' | 'export' | 'dispatch'
}) {
  const employee = await prisma.complianceEmployee.findUnique({
    where: { id: employeeId },
    include: {
      company: {
        select: { name: true },
      },
      certifications: {
        include: {
          images: true,
        },
      },
    },
  })

  if (!employee) {
    throw new Error('Employee not found')
  }

  if (!employee.qrToken) {
    throw new Error('Employee missing QR token')
  }

  const [companyDocs, latestSnapshot] = await Promise.all([
    prisma.companyComplianceDocument.findMany({
      where: { companyId: employee.companyId },
      select: { category: true },
    }),
    prisma.complianceSnapshot.findFirst({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ])

  const failureReasons: FailureReason[] = []

  const now = Date.now()
  const deriveStatus = (cert: typeof employee.certifications[number]): CertificationStatus => {
    if (cert.expiresAt.getTime() < now) {
      return CertificationStatus.EXPIRED
    }
    if (!cert.images.length) {
      return CertificationStatus.INCOMPLETE
    }
    return CertificationStatus.PASS
  }

  const certificationsWithStatus = employee.certifications.map((cert) => ({
    ...cert,
    status: deriveStatus(cert),
  }))

  certificationsWithStatus.forEach((cert) => {
    if (cert.required && cert.status !== CertificationStatus.PASS) {
      failureReasons.push({
        type: cert.status === CertificationStatus.EXPIRED ? 'EXPIRED_CERTIFICATION' : 'MISSING_CERTIFICATION',
        entityId: cert.id,
        label: `${cert.customName ?? cert.presetKey ?? 'Certification'} (${cert.status})`,
      })
    }

    if (!cert.images.length) {
      failureReasons.push({
        type: 'MISSING_PROOF',
        entityId: cert.id,
        label: `${cert.customName ?? cert.presetKey ?? 'Certification'} has no proof`,
      })
    }
  })

  if (!employee.active) {
    failureReasons.push({ type: 'EMPLOYEE_INACTIVE', label: 'Employee marked inactive', entityId: employee.id })
  }

  const requiredCategories = ['INSURANCE', 'POLICIES', 'PROGRAMS', 'RAILROAD'] as const
  const missingCompanyCategories = requiredCategories.filter(
    (category) => !companyDocs.some((doc) => doc.category === category)
  )

  if (missingCompanyCategories.length) {
    missingCompanyCategories.forEach((category) => {
      failureReasons.push({ type: 'MISSING_COMPANY_DOCUMENT', label: `Missing company document: ${category}` })
    })
  }

  const latestSnapshotIsStale = latestSnapshot
    ? now - latestSnapshot.createdAt.getTime() > SNAPSHOT_STALE_THRESHOLD_MS
    : false

  if (latestSnapshotIsStale) {
    failureReasons.push({
      type: 'SNAPSHOT_STALE',
      label: `Latest compliance snapshot older than ${COMPLIANCE_SNAPSHOT_MAX_AGE_DAYS} days`,
    })
  }

  const hasFailures = failureReasons.length > 0
  const hasNonStaleFailures = failureReasons.some((reason) => reason.type !== 'SNAPSHOT_STALE')

  let derivedComplianceStatus: ComplianceStatus
  if (!hasFailures) {
    derivedComplianceStatus = ComplianceStatus.PASS
  } else if (!hasNonStaleFailures) {
    derivedComplianceStatus = ComplianceStatus.INCOMPLETE
  } else {
    derivedComplianceStatus = ComplianceStatus.FAIL
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      title: employee.title,
      role: employee.role,
      companyName: employee.company.name,
      complianceStatus: derivedComplianceStatus,
    },
    certifications: employee.certifications.map((cert) => ({
      id: cert.id,
      presetKey: cert.presetKey,
      customName: cert.customName,
      category: cert.category,
      required: cert.required,
      issueDate: cert.issueDate.toISOString(),
      expiresAt: cert.expiresAt.toISOString(),
      status: certificationsWithStatus.find((c) => c.id === cert.id)?.status ?? cert.status,
      images: cert.images.map((image) => ({
        id: image.id,
        version: image.version,
        sha256: image.sha256,
        bucket: image.bucket,
        objectKey: image.objectKey,
        filename: image.filename,
      })),
    })),
    failureReasons,
  }

  const snapshotHash = hashPayload(payload)

  const snapshot = await prisma.complianceSnapshot.create({
    data: {
      employeeId,
      createdById,
      snapshotHash,
      payload,
      failureReasons,
    },
  })

  const token = employee.qrToken

  await prisma.complianceQrToken.upsert({
    where: { token },
    create: {
      employeeId,
      snapshotId: snapshot.id,
      token,
    },
    update: {
      snapshotId: snapshot.id,
      employeeId,
    },
  })

  await prisma.complianceEmployee.update({
    where: { id: employeeId },
    data: {
      complianceHash: snapshotHash,
      lastVerifiedAt: new Date(),
      updatedById: createdById,
      complianceStatus: derivedComplianceStatus,
    },
  })

  await logComplianceActivity({
    companyId: employee.companyId,
    actorId: createdById,
    employeeId,
    type: 'SNAPSHOT_CREATED',
    metadata: { snapshotId: snapshot.id, hash: snapshotHash, source, failureReasons },
  })

  return { snapshot, token }
}

export async function getSnapshotByToken(token: string) {
  const record = await prisma.complianceQrToken.findUnique({
    where: { token },
    include: {
      snapshot: true,
      employee: {
        include: {
          company: true,
        },
      },
    },
  })

  if (!record) {
    return null
  }

  return record
}

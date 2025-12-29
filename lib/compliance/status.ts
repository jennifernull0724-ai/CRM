import { prisma } from '@/lib/prisma'
import {
  CertificationStatus,
  ComplianceStatus,
  type ComplianceCertification,
  type ComplianceEmployee,
} from '@prisma/client'
import { logActivities, type ComplianceActivityLog } from './activity'

const EXPIRING_WINDOW_DAYS = 30
const MS_PER_DAY = 1000 * 60 * 60 * 24

export interface RefreshResult {
  employee: ComplianceEmployee
  certifications: ComplianceCertification[]
  missingRequired: number
  expiringSoon: number
}

function deriveCertificationStatus(
  cert: ComplianceCertification & { images: { id: string; mimeType: string }[] }
): CertificationStatus {
  const hasProof = cert.images.length > 0
  const now = Date.now()
  const expiresAt = cert.expiresAt.getTime()

  if (expiresAt < now) {
    return CertificationStatus.EXPIRED
  }

  if (!hasProof) {
    return CertificationStatus.INCOMPLETE
  }

  return CertificationStatus.PASS
}

function deriveEmployeeStatus(certifications: ComplianceCertification[]): ComplianceStatus {
  if (certifications.some((cert) => cert.required && cert.status !== CertificationStatus.PASS)) {
    return ComplianceStatus.FAIL
  }

  if (certifications.every((cert) => cert.status === CertificationStatus.PASS)) {
    return ComplianceStatus.PASS
  }

  return ComplianceStatus.INCOMPLETE
}

export async function refreshEmployeeComplianceState(
  employeeId: string,
  context: { actorId: string; companyId: string }
): Promise<RefreshResult | null> {
  const employee = await prisma.complianceEmployee.findUnique({
    where: { id: employeeId },
    include: {
      certifications: {
        include: {
          images: {
            select: { id: true, mimeType: true },
          },
        },
      },
    },
  })

  if (!employee) {
    return null
  }

  const updates: Promise<unknown>[] = []
  const activities: ComplianceActivityLog[] = []

  for (const cert of employee.certifications) {
    const status = deriveCertificationStatus(cert)
    const shouldUpdate = cert.status !== status

    if (shouldUpdate) {
      if (status === CertificationStatus.EXPIRED && cert.status !== CertificationStatus.EXPIRED) {
        activities.push({
          employeeId,
          companyId: context.companyId,
          actorId: context.actorId,
          type: 'CERT_EXPIRED',
          metadata: {
            certificationId: cert.id,
            presetKey: cert.presetKey,
            name: cert.customName,
          },
          certificationId: cert.id,
        })
      }

      updates.push(
        prisma.complianceCertification.update({
          where: { id: cert.id },
          data: { status },
        })
      )
      cert.status = status
    }
  }

  const missingRequired = employee.certifications.filter(
    (cert) => cert.required && cert.status !== CertificationStatus.PASS
  ).length

  const now = Date.now()
  const expiringSoon = employee.certifications.filter((cert) => {
    if (cert.status !== CertificationStatus.PASS) {
      return false
    }
    const daysUntilExpiry = (cert.expiresAt.getTime() - now) / MS_PER_DAY
    return daysUntilExpiry <= EXPIRING_WINDOW_DAYS
  }).length

  const complianceStatus = deriveEmployeeStatus(employee.certifications)

  if (employee.complianceStatus !== complianceStatus) {
    updates.push(
      prisma.complianceEmployee.update({
        where: { id: employeeId },
        data: { complianceStatus },
      })
    )
    employee.complianceStatus = complianceStatus
  }

  if (activities.length) {
    updates.push(logActivities(activities))
  }

  await Promise.all(updates)

  return {
    employee,
    certifications: employee.certifications,
    missingRequired,
    expiringSoon,
  }
}

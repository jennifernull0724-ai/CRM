import type { CertificationStatus, ComplianceStatus, Prisma } from '@prisma/client'

const DAY_IN_MS = 1000 * 60 * 60 * 24
const EXPIRY_WARNING_WINDOW_DAYS = 30

export type EmployeeWithCertifications = Prisma.ComplianceEmployeeGetPayload<{
  include: {
    certifications: {
      select: {
        id: true
        presetKey: true
        customName: true
        required: true
        status: true
        expiresAt: true
      }
    }
  }
}>

export type ComplianceGapReason = 'missing' | 'expired' | 'expiring'

export type ComplianceGap = {
  id: string
  label: string
  status: CertificationStatus
  expiresAt: string
  required: boolean
  reason: ComplianceGapReason
}

export type ComplianceGapSummary = {
  missing: ComplianceGap[]
  expiring: ComplianceGap[]
}

export type AssignmentComplianceSnapshot = {
  status: ComplianceStatus
  summary: ComplianceGapSummary
  needsOverride: boolean
}

function buildGap(cert: {
  id: string
  presetKey: string | null
  customName: string | null
  required: boolean
  status: CertificationStatus
  expiresAt: Date
}, reason: ComplianceGapReason): ComplianceGap {
  return {
    id: cert.id,
    label: cert.customName ?? cert.presetKey ?? 'Certification',
    required: cert.required,
    status: cert.status,
    expiresAt: cert.expiresAt.toISOString(),
    reason,
  }
}

export function summarizeEmployeeCompliance(
  employee: EmployeeWithCertifications,
  now: number = Date.now()
): AssignmentComplianceSnapshot {
  const summary: ComplianceGapSummary = { missing: [], expiring: [] }

  employee.certifications.forEach((cert) => {
    if (cert.required && cert.status !== 'PASS') {
      const reason: ComplianceGapReason = cert.status === 'EXPIRED' ? 'expired' : 'missing'
      summary.missing.push(buildGap(cert, reason))
      return
    }

    if (cert.status === 'PASS') {
      const daysUntilExpiry = (cert.expiresAt.getTime() - now) / DAY_IN_MS
      if (daysUntilExpiry <= EXPIRY_WARNING_WINDOW_DAYS) {
        summary.expiring.push(buildGap(cert, 'expiring'))
      }
    }
  })

  const needsOverride =
    employee.complianceStatus !== 'PASS' || summary.missing.length > 0 || summary.expiring.length > 0

  return {
    status: employee.complianceStatus,
    summary,
    needsOverride,
  }
}

export function formatGapCounts(summary: ComplianceGapSummary): { missing: number; expiring: number } {
  return {
    missing: summary.missing.length,
    expiring: summary.expiring.length,
  }
}

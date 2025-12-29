import type { ComplianceStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { summarizeEmployeeCompliance, type ComplianceGapSummary } from '@/lib/dispatch/compliance'

export type DispatchEmployeeSearchResult = {
  id: string
  name: string
  title: string
  role: string
  complianceStatus: ComplianceStatus
  missingCerts: string[]
  expiringCerts: string[]
  needsOverride: boolean
}

export type EmployeeComplianceProfile = {
  employee: {
    id: string
    firstName: string
    lastName: string
    role: string
    title: string
  }
  summary: {
    status: ComplianceStatus
    gaps: ComplianceGapSummary
    needsOverride: boolean
  }
}

const EMPLOYEE_INCLUDE = Prisma.validator<Prisma.ComplianceEmployeeDefaultArgs>()({
  include: {
    certifications: {
      select: {
        id: true,
        presetKey: true,
        customName: true,
        required: true,
        status: true,
        expiresAt: true,
      },
    },
  },
})

export async function searchDispatchEmployees(companyId: string, query: string, limit = 10): Promise<DispatchEmployeeSearchResult[]> {
  const normalized = query.trim()
  const where: Prisma.ComplianceEmployeeWhereInput = {
    companyId,
    active: true,
  }

  if (normalized.length) {
    where.OR = [
      { firstName: { contains: normalized, mode: 'insensitive' } },
      { lastName: { contains: normalized, mode: 'insensitive' } },
      { email: { contains: normalized, mode: 'insensitive' } },
      { role: { contains: normalized, mode: 'insensitive' } },
    ]
  }

  const employees = await prisma.complianceEmployee.findMany({
    where,
    include: EMPLOYEE_INCLUDE.include,
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    take: limit,
  })

  return employees.map((employee) => {
    const snapshot = summarizeEmployeeCompliance(employee)
    return {
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      title: employee.title,
      role: employee.role,
      complianceStatus: snapshot.status,
      missingCerts: snapshot.summary.missing.map((gap) => gap.label),
      expiringCerts: snapshot.summary.expiring.map((gap) => gap.label),
      needsOverride: snapshot.needsOverride,
    }
  })
}

export async function loadEmployeeComplianceProfile(companyId: string, employeeId: string): Promise<EmployeeComplianceProfile | null> {
  const employee = await prisma.complianceEmployee.findFirst({
    where: { id: employeeId, companyId, active: true },
    include: EMPLOYEE_INCLUDE.include,
  })

  if (!employee) {
    return null
  }

  const summary = summarizeEmployeeCompliance(employee)

  return {
    employee: {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role,
      title: employee.title,
    },
    summary: {
      status: summary.status,
      gaps: summary.summary,
      needsOverride: summary.needsOverride,
    },
  }
}

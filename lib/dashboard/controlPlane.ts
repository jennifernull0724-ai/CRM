import { prisma } from '@/lib/prisma'
import { getGlobalAnalytics, type GlobalAnalytics } from '@/lib/dashboard/analytics'
import { getGovernanceState, type GovernanceState } from '@/lib/dashboard/governance'
import { loadStandardSettings, type StandardSettingsData } from '@/lib/dashboard/standardSettings'
import { getCompliancePolicies, type CompliancePolicies } from '@/lib/system/settings'
import { listCompliancePresets } from '@/lib/compliance/presets'
import { ensureCompanyBootstrap } from '@/lib/system/bootstrap'
import type { CompliancePreset, CompanyComplianceDocumentCategory } from '@prisma/client'

export type ControlPlaneCertification = {
  id: string
  label: string
  employeeId: string
  employeeName: string
  status: string
}

export type ControlPlaneEmployee = {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  complianceStatus: string
  active: boolean
}

export type ControlPlaneWorkOrder = {
  id: string
  title: string
  status: string
  manualEntry: boolean
  complianceBlocked: boolean
  blockReason: string | null
  createdAt: Date
  dispatchStatus: string | null
  dispatchPriority: string | null
  assignments: { id: string; employeeName: string }[]
}

export type ControlPlaneData = {
  analytics: GlobalAnalytics
  governance: GovernanceState
  compliancePolicies: CompliancePolicies
  presets: CompliancePreset[]
  employees: ControlPlaneEmployee[]
  certifications: ControlPlaneCertification[]
  workOrders: ControlPlaneWorkOrder[]
  standardSettings: StandardSettingsData
  companyDocuments: CompanyDocumentCoverage[]
}

export type CompanyDocumentCoverage = {
  category: CompanyComplianceDocumentCategory
  documentCount: number
  lastUploadedAt: Date | null
  expired: boolean
}

const COMPANY_DOCUMENT_CATEGORIES: CompanyComplianceDocumentCategory[] = ['INSURANCE', 'POLICIES', 'PROGRAMS', 'RAILROAD']
const COMPANY_DOCUMENT_EXPIRY_DAYS = 365

export async function loadControlPlaneData(companyId: string): Promise<ControlPlaneData> {
  // Ensure workspace has minimum required system records
  await ensureCompanyBootstrap(companyId)

  const [
    analytics,
    governance,
    compliancePolicies,
    presets,
    employees,
    certificationsRaw,
    workOrdersRaw,
    standardSettings,
    companyDocumentsRaw,
  ] =
    await Promise.all([
      getGlobalAnalytics(companyId),
      getGovernanceState(companyId),
      getCompliancePolicies(companyId),
      listCompliancePresets(companyId),
      prisma.complianceEmployee.findMany({
        where: { companyId },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          complianceStatus: true,
          active: true,
        },
        orderBy: [{ active: 'desc' }, { lastName: 'asc' }],
      }),
      prisma.complianceCertification.findMany({
        where: { employee: { companyId } },
        orderBy: { expiresAt: 'asc' },
        take: 50,
        select: {
          id: true,
          customName: true,
          presetKey: true,
          status: true,
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.workOrder.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: {
          assignments: {
            include: {
              employee: { select: { firstName: true, lastName: true } },
            },
          },
          dispatchRequest: {
            select: {
              status: true,
              priority: true,
            },
          },
        },
      }),
      loadStandardSettings(companyId),
      prisma.companyComplianceDocument.findMany({
        where: { companyId },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
        },
      }),
    ])

  const certifications: ControlPlaneCertification[] = certificationsRaw.map((cert) => ({
    id: cert.id,
    employeeId: cert.employee.id,
    employeeName: `${cert.employee.firstName} ${cert.employee.lastName}`.trim(),
    label: cert.customName ?? cert.presetKey ?? 'Custom certification',
    status: cert.status,
  }))

  const workOrders: ControlPlaneWorkOrder[] = workOrdersRaw.map((workOrder) => ({
    id: workOrder.id,
    title: workOrder.title,
    status: workOrder.status,
    manualEntry: workOrder.manualEntry,
    complianceBlocked: workOrder.complianceBlocked,
    blockReason: workOrder.blockReason,
    createdAt: workOrder.createdAt,
    dispatchStatus: workOrder.dispatchRequest?.status ?? null,
    dispatchPriority: workOrder.dispatchRequest?.priority ?? null,
    assignments: workOrder.assignments.map((assignment) => ({
      id: assignment.id,
      employeeName: `${assignment.employee.firstName} ${assignment.employee.lastName}`.trim(),
    })),
  }))

  const now = Date.now()
  const companyDocuments: CompanyDocumentCoverage[] = COMPANY_DOCUMENT_CATEGORIES.map((category) => {
    const docs = companyDocumentsRaw.filter((doc) => doc.category === category)
    const latestVersion = docs
      .map((doc) => doc.versions[0]?.uploadedAt)
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => b.getTime() - a.getTime())[0]
    const lastUploadedAt = latestVersion ?? docs[0]?.createdAt ?? null
    const expired = lastUploadedAt
      ? (now - lastUploadedAt.getTime()) / (1000 * 60 * 60 * 24) > COMPANY_DOCUMENT_EXPIRY_DAYS
      : false

    return {
      category,
      documentCount: docs.length,
      lastUploadedAt,
      expired,
    }
  })

  return {
    analytics,
    governance,
    compliancePolicies,
    presets,
    employees,
    certifications,
    workOrders,
    standardSettings,
    companyDocuments,
  }
}

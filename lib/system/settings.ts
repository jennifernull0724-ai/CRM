import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type SnapshotRuleConfig = {
  onManualRequest: boolean
  onDispatchAssignment: boolean
  onCertificationUpload: boolean
}

export type QrVerificationConfig = {
  requireForDispatch: boolean
  publicFields: string[]
  allowExternalVerification: boolean
}

export type CompliancePolicies = {
  requireImages: boolean
  expirationGraceDays: number
  expirationWarningWindows: number[]
  snapshotRules: SnapshotRuleConfig
  retentionYears: number
  qrVerification: QrVerificationConfig
}

const INVITE_TOGGLE_KEY = 'crm_invites_enabled'
const COMPLIANCE_POLICY_KEY = 'compliance_policies'

export const DEFAULT_COMPLIANCE_POLICIES: CompliancePolicies = {
  requireImages: true,
  expirationGraceDays: 30,
  expirationWarningWindows: [30, 60, 90],
  snapshotRules: {
    onManualRequest: true,
    onDispatchAssignment: true,
    onCertificationUpload: false,
  },
  retentionYears: 7,
  qrVerification: {
    requireForDispatch: true,
    publicFields: ['employeeId', 'firstName', 'lastName', 'complianceStatus'],
    allowExternalVerification: true,
  },
}

type SystemSettingValue = Prisma.InputJsonValue | null

async function getSystemSetting<T extends SystemSettingValue>(companyId: string, key: string): Promise<T | null> {
  const record = await prisma.systemSetting.findUnique({
    where: {
      companyId_key: {
        companyId,
        key,
      },
    },
  })

  return (record?.value as T | null) ?? null
}

async function upsertSystemSetting<T extends SystemSettingValue>(
  companyId: string,
  key: string,
  value: T,
  updatedById?: string
): Promise<void> {
  const normalizedValue = (value === null ? Prisma.JsonNull : value) as Prisma.InputJsonValue

  await prisma.systemSetting.upsert({
    where: {
      companyId_key: {
        companyId,
        key,
      },
    },
    update: {
      value: normalizedValue,
      updatedById,
    },
    create: {
      companyId,
      key,
      value: normalizedValue,
      updatedById,
    },
  })
}

export async function getInviteToggle(companyId: string): Promise<boolean> {
  const value = await getSystemSetting<boolean>(companyId, INVITE_TOGGLE_KEY)
  return value ?? true
}

export async function setInviteToggle(companyId: string, enabled: boolean, updatedById: string): Promise<void> {
  await upsertSystemSetting(companyId, INVITE_TOGGLE_KEY, enabled, updatedById)
}

export async function getCompliancePolicies(companyId: string): Promise<CompliancePolicies> {
  const value = await getSystemSetting<CompliancePolicies>(companyId, COMPLIANCE_POLICY_KEY)
  if (!value) {
    await upsertSystemSetting(companyId, COMPLIANCE_POLICY_KEY, DEFAULT_COMPLIANCE_POLICIES)
    return DEFAULT_COMPLIANCE_POLICIES
  }
  return {
    ...DEFAULT_COMPLIANCE_POLICIES,
    ...value,
    snapshotRules: {
      ...DEFAULT_COMPLIANCE_POLICIES.snapshotRules,
      ...(value.snapshotRules ?? {}),
    },
    qrVerification: {
      ...DEFAULT_COMPLIANCE_POLICIES.qrVerification,
      ...(value.qrVerification ?? {}),
    },
  }
}

export async function updateCompliancePolicies(
  companyId: string,
  updatedById: string,
  patch: Partial<CompliancePolicies>
): Promise<CompliancePolicies> {
  const current = await getCompliancePolicies(companyId)
  const next: CompliancePolicies = {
    ...current,
    ...patch,
    snapshotRules: {
      ...current.snapshotRules,
      ...(patch.snapshotRules ?? {}),
    },
    qrVerification: {
      ...current.qrVerification,
      ...(patch.qrVerification ?? {}),
    },
  }

  await upsertSystemSetting(companyId, COMPLIANCE_POLICY_KEY, next, updatedById)
  return next
}

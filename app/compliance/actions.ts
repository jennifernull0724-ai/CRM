'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { planAllowsFeature, type PlanKey } from '@/lib/billing/planTiers'

type ComplianceContextOptions = {
  requireOwner?: boolean
}

async function requireComplianceContext(options: ComplianceContextOptions = {}) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    throw new Error('Unauthorized')
  }

  const role = (session.user.role as string)?.toLowerCase()

  if (!['admin', 'owner'].includes(role)) {
    throw new Error('Compliance settings restricted to owners/admins')
  }

  if (options.requireOwner && role !== 'owner') {
    throw new Error('Only owners can modify compliance settings')
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'
  const hasCompliance =
    planAllowsFeature(planKey, 'compliance_core') || planAllowsFeature(planKey, 'advanced_compliance')

  if (!hasCompliance) {
    throw new Error('Compliance is not enabled on this plan')
  }

  return {
    companyId: session.user.companyId,
  }
}

function toBoolean(value: FormDataEntryValue | null): boolean {
  if (value === null) return false
  if (typeof value === 'string') {
    return value === 'true' || value === 'on' || value === '1'
  }
  return Boolean(value)
}

export async function updatePresetAction(formData: FormData) {
  const { companyId } = await requireComplianceContext({ requireOwner: true })
  const presetId = formData.get('presetId')?.toString()
  const name = formData.get('name')?.toString().trim()
  const enabled = toBoolean(formData.get('enabled'))
  const orderValue = formData.get('order')?.toString()
  const order = orderValue ? Number(orderValue) : undefined

  if (!presetId) {
    throw new Error('Preset id missing')
  }

  const preset = await prisma.compliancePreset.findFirst({
    where: { id: presetId, companyId },
  })

  if (!preset) {
    throw new Error('Preset not found')
  }

  const data: Record<string, unknown> = {}

  if (name && name !== preset.name) {
    data.name = name
  }

  if (typeof order === 'number' && order >= 0) {
    data.order = order
  }

  if (!preset.isOther) {
    data.enabled = enabled
  } else {
    data.enabled = true
  }

  if (Object.keys(data).length === 0) {
    return
  }

  await prisma.compliancePreset.update({
    where: { id: presetId },
    data,
  })

  revalidatePath('/compliance')
}

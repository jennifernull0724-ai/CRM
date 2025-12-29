'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import type { DispatchPresetScope, Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_SCOPES: DispatchPresetScope[] = ['BASE', 'CONSTRUCTION', 'RAILROAD', 'ENVIRONMENTAL']
const ADMIN_ROLES = ['owner', 'admin']

type SessionContext = {
  companyId: string
  userId: string
  role: 'owner' | 'admin'
}

async function requireOwnerOrAdmin(): Promise<SessionContext> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    throw new Error('Unauthorized')
  }

  const normalizedRole = session.user.role.toLowerCase()
  if (!ADMIN_ROLES.includes(normalizedRole)) {
    throw new Error('Insufficient role')
  }

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: normalizedRole as 'owner' | 'admin',
  }
}

function parseScope(value: string | null): DispatchPresetScope {
  if (!value || !ADMIN_SCOPES.includes(value as DispatchPresetScope)) {
    throw new Error('Invalid scope')
  }
  return value as DispatchPresetScope
}

function sanitizeText(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function revalidatePresetSurfaces() {
  revalidatePath('/dashboard/admin/dispatch-presets')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/dispatch')
}

export async function createDispatchPresetAction(formData: FormData) {
  const { companyId } = await requireOwnerOrAdmin()
  const scope = parseScope(formData.get('scope')?.toString() ?? null)
  const name = sanitizeText(formData.get('name')?.toString())
  const description = sanitizeText(formData.get('description')?.toString())
  const defaultNotes = sanitizeText(formData.get('defaultNotes')?.toString())

  if (!name) {
    throw new Error('Preset name required')
  }

  const maxSort = await prisma.dispatchPreset.findFirst({
    where: { companyId, scope },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })

  await prisma.dispatchPreset.create({
    data: {
      companyId,
      scope,
      name,
      description,
      defaultNotes,
      sortOrder: (maxSort?.sortOrder ?? 0) + 1,
      enabled: true,
      locked: false,
      isOther: false,
    },
  })

  revalidatePresetSurfaces()
}

export async function updateDispatchPresetDetailsAction(formData: FormData) {
  const { companyId } = await requireOwnerOrAdmin()
  const presetId = formData.get('presetId')?.toString()
  if (!presetId) {
    throw new Error('Preset id required')
  }

  const preset = await prisma.dispatchPreset.findFirst({ where: { id: presetId, companyId } })
  if (!preset) {
    throw new Error('Preset not found')
  }

  const name = sanitizeText(formData.get('name')?.toString())
  const description = sanitizeText(formData.get('description')?.toString())
  const defaultNotes = sanitizeText(formData.get('defaultNotes')?.toString())
  const updates: Prisma.DispatchPresetUpdateInput = {}

  if (!preset.locked && !preset.isOther && name) {
    updates.name = name
  }

  updates.description = description
  updates.defaultNotes = defaultNotes

  await prisma.dispatchPreset.update({ where: { id: preset.id }, data: updates })
  revalidatePresetSurfaces()
}

export async function toggleDispatchPresetAction(formData: FormData) {
  const { companyId } = await requireOwnerOrAdmin()
  const presetId = formData.get('presetId')?.toString()
  const enabled = formData.get('enabled') === 'true'

  if (!presetId) {
    throw new Error('Preset id required')
  }

  const preset = await prisma.dispatchPreset.findFirst({ where: { id: presetId, companyId } })
  if (!preset) {
    throw new Error('Preset not found')
  }

  if (preset.isOther || preset.locked) {
    throw new Error('Locked presets cannot be disabled')
  }

  await prisma.dispatchPreset.update({ where: { id: presetId }, data: { enabled } })
  revalidatePresetSurfaces()
}

export async function deleteDispatchPresetAction(formData: FormData) {
  const { companyId } = await requireOwnerOrAdmin()
  const presetId = formData.get('presetId')?.toString()
  if (!presetId) {
    throw new Error('Preset id required')
  }

  const preset = await prisma.dispatchPreset.findFirst({ where: { id: presetId, companyId } })
  if (!preset) {
    throw new Error('Preset not found')
  }

  if (preset.locked || preset.isOther) {
    throw new Error('Locked presets cannot be deleted')
  }

  await prisma.dispatchPreset.delete({ where: { id: presetId } })

  await normalizeSortOrder(companyId, preset.scope)
  revalidatePresetSurfaces()
}

export async function moveDispatchPresetAction(formData: FormData) {
  const { companyId } = await requireOwnerOrAdmin()
  const presetId = formData.get('presetId')?.toString()
  const direction = formData.get('direction')?.toString()

  if (!presetId || !direction) {
    throw new Error('Preset id and direction required')
  }

  const target = await prisma.dispatchPreset.findFirst({ where: { id: presetId, companyId } })
  if (!target) {
    throw new Error('Preset not found')
  }

  const neighbor = await prisma.dispatchPreset.findFirst({
    where: {
      companyId,
      scope: target.scope,
      sortOrder: direction === 'up' ? { lt: target.sortOrder } : { gt: target.sortOrder },
    },
    orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' },
  })

  if (!neighbor) {
    return
  }

  await prisma.$transaction([
    prisma.dispatchPreset.update({ where: { id: target.id }, data: { sortOrder: neighbor.sortOrder } }),
    prisma.dispatchPreset.update({ where: { id: neighbor.id }, data: { sortOrder: target.sortOrder } }),
  ])

  revalidatePresetSurfaces()
}

async function normalizeSortOrder(companyId: string, scope: DispatchPresetScope): Promise<void> {
  const presets = await prisma.dispatchPreset.findMany({
    where: { companyId, scope },
    orderBy: { sortOrder: 'asc' },
  })

  await Promise.all(
    presets.map((preset, index) =>
      preset.sortOrder === index
        ? null
        : prisma.dispatchPreset.update({ where: { id: preset.id }, data: { sortOrder: index } })
    ).filter(Boolean) as Array<ReturnType<typeof prisma.dispatchPreset.update>>
  )
}

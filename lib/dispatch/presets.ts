import { prisma } from '@/lib/prisma'
import type { DispatchPreset, DispatchPresetScope, Prisma } from '@prisma/client'

export type DispatchPresetSeed = {
  scope: DispatchPresetScope
  name: string
  description?: string
  defaultNotes?: string
  locked?: boolean
  isOther?: boolean
}

type ScopedSeeds = Record<DispatchPresetScope, DispatchPresetSeed[]>

type SeedWithOrder = DispatchPresetSeed & { sortOrder: number }

const DISPATCH_PRESET_SEEDS: ScopedSeeds = {
  BASE: [
    { scope: 'BASE', name: 'Mobilization' },
    { scope: 'BASE', name: 'Demobilization' },
    { scope: 'BASE', name: 'Travel' },
    { scope: 'BASE', name: 'Per Diem' },
    { scope: 'BASE', name: 'Equipment Transport' },
    { scope: 'BASE', name: 'Project Management' },
    { scope: 'BASE', name: 'Safety Meetings' },
    { scope: 'BASE', name: 'Administrative / Documentation' },
    { scope: 'BASE', name: 'Other – General', locked: true, isOther: true },
  ],
  RAILROAD: [
    { scope: 'RAILROAD', name: 'Access & Coordination' },
    { scope: 'RAILROAD', name: 'Track Protection / RWP' },
    { scope: 'RAILROAD', name: 'RWIC' },
    { scope: 'RAILROAD', name: 'Flagging / Lookout' },
    { scope: 'RAILROAD', name: 'Hi-Rail' },
    { scope: 'RAILROAD', name: 'On-Track Equipment' },
    { scope: 'RAILROAD', name: 'Railroad Supervision' },
    { scope: 'RAILROAD', name: 'Railroad Documentation' },
    { scope: 'RAILROAD', name: 'Railroad Reporting' },
    { scope: 'RAILROAD', name: 'Other – Railroad', locked: true, isOther: true },
  ],
  CONSTRUCTION: [
    { scope: 'CONSTRUCTION', name: 'General Labor' },
    { scope: 'CONSTRUCTION', name: 'Skilled Labor' },
    { scope: 'CONSTRUCTION', name: 'Supervision' },
    { scope: 'CONSTRUCTION', name: 'Site Prep' },
    { scope: 'CONSTRUCTION', name: 'Excavation' },
    { scope: 'CONSTRUCTION', name: 'Grading' },
    { scope: 'CONSTRUCTION', name: 'Concrete' },
    { scope: 'CONSTRUCTION', name: 'Structural' },
    { scope: 'CONSTRUCTION', name: 'Installation' },
    { scope: 'CONSTRUCTION', name: 'Heavy Equipment' },
    { scope: 'CONSTRUCTION', name: 'Tools' },
    { scope: 'CONSTRUCTION', name: 'Construction Documentation' },
    { scope: 'CONSTRUCTION', name: 'Other – Construction', locked: true, isOther: true },
  ],
  ENVIRONMENTAL: [
    { scope: 'ENVIRONMENTAL', name: 'Assessment' },
    { scope: 'ENVIRONMENTAL', name: 'Remediation' },
    { scope: 'ENVIRONMENTAL', name: 'Spill Response' },
    { scope: 'ENVIRONMENTAL', name: 'Hazardous Materials' },
    { scope: 'ENVIRONMENTAL', name: 'Monitoring' },
    { scope: 'ENVIRONMENTAL', name: 'Sampling' },
    { scope: 'ENVIRONMENTAL', name: 'Testing' },
    { scope: 'ENVIRONMENTAL', name: 'PPE' },
    { scope: 'ENVIRONMENTAL', name: 'Environmental Documentation' },
    { scope: 'ENVIRONMENTAL', name: 'Other – Environmental', locked: true, isOther: true },
  ],
}

const seedMap = buildSeedMap()

function buildSeedMap(): Record<string, SeedWithOrder> {
  const map: Record<string, SeedWithOrder> = Object.create(null)
  ;(Object.entries(DISPATCH_PRESET_SEEDS) as Array<[DispatchPresetScope, DispatchPresetSeed[]]>).forEach(
    ([scope, seeds]: [DispatchPresetScope, DispatchPresetSeed[]]) => {
      seeds.forEach((seed, index) => {
        const key = makeSeedKey(scope, seed.name)
        map[key] = { ...seed, sortOrder: index }
      })
    }
  )
  return map
}

function makeSeedKey(scope: DispatchPresetScope, name: string): string {
  return `${scope}:${name.toLowerCase()}`
}

export async function ensureDispatchPresets(companyId: string): Promise<DispatchPreset[]> {
  const existing = await prisma.dispatchPreset.findMany({ where: { companyId } })
  const existingMap = new Map(existing.map((preset) => [makeSeedKey(preset.scope, preset.name), preset]))
  const createPayload: Prisma.DispatchPresetCreateManyInput[] = []

  Object.entries(seedMap).forEach(([key, seed]) => {
    if (existingMap.has(key)) {
      return
    }

    createPayload.push({
      companyId,
      scope: seed.scope,
      name: seed.name,
      description: seed.description ?? null,
      defaultNotes: seed.defaultNotes ?? null,
      locked: Boolean(seed.locked),
      isOther: Boolean(seed.isOther),
      enabled: true,
      sortOrder: seed.sortOrder,
    })
  })

  if (createPayload.length) {
    await prisma.dispatchPreset.createMany({ data: createPayload })
  }

  const updates = existing
    .map((preset) => {
      const seed = seedMap[makeSeedKey(preset.scope, preset.name)]
      if (!seed) {
        return null
      }

      const data: Prisma.DispatchPresetUpdateInput = {}
      if (preset.sortOrder !== seed.sortOrder) {
        data.sortOrder = seed.sortOrder
      }
      if (Boolean(seed.locked) !== preset.locked) {
        data.locked = Boolean(seed.locked)
      }
      if (Boolean(seed.isOther) !== preset.isOther) {
        data.isOther = Boolean(seed.isOther)
      }
      if (preset.isOther && !preset.enabled) {
        data.enabled = true
      }
      return Object.keys(data).length ? prisma.dispatchPreset.update({ where: { id: preset.id }, data }) : null
    })
    .filter(Boolean) as Array<ReturnType<typeof prisma.dispatchPreset.update>>

  if (updates.length) {
    await Promise.all(updates)
  }

  return prisma.dispatchPreset.findMany({
    where: { companyId },
    orderBy: [
      { scope: 'asc' },
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
    ],
  })
}

export async function listDispatchPresets(companyId: string): Promise<DispatchPreset[]> {
  return ensureDispatchPresets(companyId)
}

export function groupDispatchPresets(presets: DispatchPreset[]): Record<DispatchPresetScope, DispatchPreset[]> {
  return presets.reduce<Record<DispatchPresetScope, DispatchPreset[]>>((acc, preset) => {
    if (!acc[preset.scope]) {
      acc[preset.scope] = []
    }
    acc[preset.scope].push(preset)
    return acc
  }, {
    BASE: [],
    CONSTRUCTION: [],
    RAILROAD: [],
    ENVIRONMENTAL: [],
  })
}

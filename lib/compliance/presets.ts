import { prisma } from '@/lib/prisma'
import { ComplianceCategory, CompliancePreset } from '@prisma/client'

export type CompliancePresetDefinition = {
  key: string
  name: string
  category: ComplianceCategory
  locked?: boolean
  isOther?: boolean
}

type PresetGroup = Record<ComplianceCategory, CompliancePresetDefinition[]>

export const COMPLIANCE_PRESET_DEFINITIONS: PresetGroup = {
  [ComplianceCategory.BASE]: [
    { key: 'safety_orientation', name: 'Safety Orientation', category: ComplianceCategory.BASE },
    { key: 'first_aid_cpr', name: 'First Aid / CPR', category: ComplianceCategory.BASE },
    { key: 'drug_alcohol', name: 'Drug & Alcohol', category: ComplianceCategory.BASE },
    { key: 'ppe_training', name: 'PPE Training', category: ComplianceCategory.BASE },
    { key: 'safety_meetings', name: 'Safety Meetings', category: ComplianceCategory.BASE },
    {
      key: 'other_general',
      name: 'Other – General',
      category: ComplianceCategory.BASE,
      locked: true,
      isOther: true,
    },
  ],
  [ComplianceCategory.RAILROAD]: [
    { key: 'erailsafe_national', name: 'eRailSafe – National', category: ComplianceCategory.RAILROAD },
    { key: 'erailsafe_bnsf', name: 'eRailSafe – BNSF', category: ComplianceCategory.RAILROAD },
    { key: 'erailsafe_up', name: 'eRailSafe – UP', category: ComplianceCategory.RAILROAD },
    { key: 'erailsafe_csx', name: 'eRailSafe – CSX', category: ComplianceCategory.RAILROAD },
    { key: 'erailsafe_ns', name: 'eRailSafe – Norfolk Southern', category: ComplianceCategory.RAILROAD },
    { key: 'erailsafe_cn', name: 'eRailSafe – CN', category: ComplianceCategory.RAILROAD },
    { key: 'erailsafe_cp', name: 'eRailSafe – CP', category: ComplianceCategory.RAILROAD },
    { key: 'erailsafe_cpkc', name: 'eRailSafe – CPKC', category: ComplianceCategory.RAILROAD },
    { key: 'rwp', name: 'RWP', category: ComplianceCategory.RAILROAD },
    { key: 'rwic', name: 'RWIC', category: ComplianceCategory.RAILROAD },
    { key: 'lookout_flagging', name: 'Lookout / Flagging', category: ComplianceCategory.RAILROAD },
    { key: 'on_track_safety', name: 'On-Track Safety', category: ComplianceCategory.RAILROAD },
    { key: 'hi_rail', name: 'Hi-Rail Qualification', category: ComplianceCategory.RAILROAD },
    { key: 'track_protection', name: 'Track Protection', category: ComplianceCategory.RAILROAD },
    { key: 'railroad_safety_briefing', name: 'Railroad Safety Briefing', category: ComplianceCategory.RAILROAD },
    { key: 'railroad_reporting', name: 'Railroad Reporting', category: ComplianceCategory.RAILROAD },
    {
      key: 'other_railroad',
      name: 'Other – Railroad',
      category: ComplianceCategory.RAILROAD,
      locked: true,
      isOther: true,
    },
  ],
  [ComplianceCategory.CONSTRUCTION]: [
    { key: 'osha_10', name: 'OSHA 10', category: ComplianceCategory.CONSTRUCTION },
    { key: 'osha_30', name: 'OSHA 30', category: ComplianceCategory.CONSTRUCTION },
    { key: 'equipment_operator', name: 'Equipment Operator', category: ComplianceCategory.CONSTRUCTION },
    { key: 'heavy_equipment', name: 'Heavy Equipment', category: ComplianceCategory.CONSTRUCTION },
    { key: 'confined_space', name: 'Confined Space', category: ComplianceCategory.CONSTRUCTION },
    { key: 'fall_protection', name: 'Fall Protection', category: ComplianceCategory.CONSTRUCTION },
    { key: 'crane_rigging', name: 'Crane / Rigging', category: ComplianceCategory.CONSTRUCTION },
    { key: 'construction_documentation', name: 'Construction Documentation', category: ComplianceCategory.CONSTRUCTION },
    {
      key: 'other_construction',
      name: 'Other – Construction',
      category: ComplianceCategory.CONSTRUCTION,
      locked: true,
      isOther: true,
    },
  ],
  [ComplianceCategory.ENVIRONMENTAL]: [
    { key: 'hazwoper', name: 'HAZWOPER', category: ComplianceCategory.ENVIRONMENTAL },
    { key: 'spill_response', name: 'Spill Response', category: ComplianceCategory.ENVIRONMENTAL },
    { key: 'hazardous_materials', name: 'Hazardous Materials', category: ComplianceCategory.ENVIRONMENTAL },
    { key: 'environmental_monitoring', name: 'Environmental Monitoring', category: ComplianceCategory.ENVIRONMENTAL },
    { key: 'sampling_testing', name: 'Sampling & Testing', category: ComplianceCategory.ENVIRONMENTAL },
    { key: 'waste_handling', name: 'Waste Handling', category: ComplianceCategory.ENVIRONMENTAL },
    { key: 'environmental_documentation', name: 'Environmental Documentation', category: ComplianceCategory.ENVIRONMENTAL },
    {
      key: 'other_environmental',
      name: 'Other – Environmental',
      category: ComplianceCategory.ENVIRONMENTAL,
      locked: true,
      isOther: true,
    },
  ],
}

export async function ensureCompliancePresets(companyId: string): Promise<CompliancePreset[]> {
  const existing = await prisma.compliancePreset.findMany({ where: { companyId } })
  const existingMap = new Map(existing.map((preset) => [`${preset.category}:${preset.baseKey}`, preset]))
  const createPayload: Parameters<typeof prisma.compliancePreset.createMany>[0]['data'] = []

  for (const [category, definitions] of Object.entries(COMPLIANCE_PRESET_DEFINITIONS) as [
    ComplianceCategory,
    CompliancePresetDefinition[],
  ][]) {
    definitions.forEach((definition, index) => {
      const key = `${category}:${definition.key}`
      if (existingMap.has(key)) {
        return
      }

      createPayload.push({
        companyId,
        category,
        baseKey: definition.key,
        name: definition.name,
        enabled: true,
        order: index,
        isOther: definition.isOther ?? false,
        locked: definition.locked ?? false,
      })
    })
  }

  if (createPayload.length) {
    await prisma.compliancePreset.createMany({ data: createPayload })
  }

  return prisma.compliancePreset.findMany({
    where: { companyId },
    orderBy: [
      { category: 'asc' },
      { order: 'asc' },
    ],
  })
}

export async function listCompliancePresets(companyId: string): Promise<CompliancePreset[]> {
  await ensureCompliancePresets(companyId)
  return prisma.compliancePreset.findMany({
    where: { companyId },
    orderBy: [
      { category: 'asc' },
      { order: 'asc' },
    ],
  })
}

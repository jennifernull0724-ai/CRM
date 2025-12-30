import { Prisma, type AccessAuditAction, type EstimatePresetIndustry, type EstimatingPreset } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type PresetSeed = {
  baseKey: string
  label: string
  description: string
  unit: string
  unitCost: number
  industry: EstimatePresetIndustry
  isOther?: boolean
  locked?: boolean
}

const BASE_PRESETS: PresetSeed[] = [
  {
    baseKey: 'labor_general_crew',
    label: 'Labor – General Crew',
    description: 'Core crew performing production labor, demo, and cleanup tasks with standard tools.',
    unit: 'crew-hour',
    unitCost: 185,
    industry: 'BASE',
  },
  {
    baseKey: 'labor_foreman',
    label: 'Labor – Foreman',
    description: 'Field foreman coordinating crews, client interface, and on-site reporting.',
    unit: 'hour',
    unitCost: 210,
    industry: 'BASE',
  },
  {
    baseKey: 'labor_supervisor',
    label: 'Labor – Supervisor',
    description: 'Area superintendent or supervisor overseeing multiple crews and interfaces.',
    unit: 'hour',
    unitCost: 235,
    industry: 'BASE',
  },
  {
    baseKey: 'overtime_extended_shift',
    label: 'Overtime / Extended Shift',
    description: 'Premium applied to labor for night, weekend, or >10 hour shift requirements.',
    unit: 'crew-hour',
    unitCost: 65,
    industry: 'BASE',
  },
  {
    baseKey: 'standby_idle_time',
    label: 'Standby / Idle Time',
    description: 'Labor retention during client-driven holds, access delays, or coordination gaps.',
    unit: 'crew-hour',
    unitCost: 120,
    industry: 'BASE',
  },
  {
    baseKey: 'weather_delay_allowance',
    label: 'Weather Delay Allowance',
    description: 'Allowance for tarp, heat, dewatering, or snow impacts on schedule-critical scopes.',
    unit: 'shift',
    unitCost: 1450,
    industry: 'BASE',
  },
  {
    baseKey: 'mobilization_crew',
    label: 'Mobilization (Crew)',
    description: 'Labor + vehicle cost to mobilize crew, perform JHAs, and stage tooling.',
    unit: 'trip',
    unitCost: 1850,
    industry: 'BASE',
  },
  {
    baseKey: 'demobilization_crew',
    label: 'Demobilization (Crew)',
    description: 'Crew demobilization, tool load-out, inventory, and turnover to client.',
    unit: 'trip',
    unitCost: 1650,
    industry: 'BASE',
  },
  {
    baseKey: 'travel_time',
    label: 'Travel Time',
    description: 'Door-to-door compensated travel when crews commute beyond standard radius.',
    unit: 'hour',
    unitCost: 95,
    industry: 'BASE',
  },
  {
    baseKey: 'per_diem',
    label: 'Per Diem',
    description: 'Daily per diem for meals + incidentals per crew member.',
    unit: 'person-day',
    unitCost: 75,
    industry: 'BASE',
  },
  {
    baseKey: 'lodging',
    label: 'Lodging',
    description: 'Hotel cost per room night incl. taxes/fees for traveling crews.',
    unit: 'room-night',
    unitCost: 185,
    industry: 'BASE',
  },
  {
    baseKey: 'safety_meetings_tailgate',
    label: 'Safety Meetings / Tailgate Talks',
    description: 'Daily safety briefs, documentation, and OSHA-required talks.',
    unit: 'meeting',
    unitCost: 220,
    industry: 'BASE',
  },
  {
    baseKey: 'daily_paperwork_reporting',
    label: 'Daily Paperwork / Reporting',
    description: 'Daily logs, cost tracking, and documentation for client + internal teams.',
    unit: 'day',
    unitCost: 285,
    industry: 'BASE',
  },
  {
    baseKey: 'access_badging_delays',
    label: 'Access / Badging Delays',
    description: 'Badging, onboarding, and escorted access time required by client controls.',
    unit: 'person',
    unitCost: 145,
    industry: 'BASE',
  },
  {
    baseKey: 'restricted_work_windows',
    label: 'Restricted Work Windows',
    description: 'Inefficiency premium when work limited to narrow or off-hour windows.',
    unit: 'shift',
    unitCost: 1325,
    industry: 'BASE',
  },
  {
    baseKey: 'rework_reentry_allowance',
    label: 'Rework / Re-entry Allowance',
    description: 'Allowance for client-driven punch list or re-entry for verification.',
    unit: 'visit',
    unitCost: 950,
    industry: 'BASE',
  },
  {
    baseKey: 'other_general',
    label: 'Other – General',
    description: 'Mandatory general bucket for scope that does not map to curated presets.',
    unit: 'ea',
    unitCost: 0,
    industry: 'BASE',
    isOther: true,
    locked: true,
  },
]

const RAILROAD_PRESETS: PresetSeed[] = [
  {
    baseKey: 'rail_flagging',
    label: 'Flagging',
    description: 'Qualified railroad flagging resources covering on-track activities.',
    unit: 'shift',
    unitCost: 1450,
    industry: 'RAILROAD',
  },
  {
    baseKey: 'rail_rwic',
    label: 'RWIC (Per Shift)',
    description: 'Roadway Worker In Charge assigned per FRA requirements.',
    unit: 'shift',
    unitCost: 1650,
    industry: 'RAILROAD',
  },
  {
    baseKey: 'rail_rwp_processing',
    label: 'RWP Processing Time',
    description: 'Roadway Worker Protection paperwork, briefings, and approvals.',
    unit: 'shift',
    unitCost: 520,
    industry: 'RAILROAD',
  },
  {
    baseKey: 'rail_track_time_coordination',
    label: 'Track Time Coordination',
    description: 'Dispatcher and track owner coordination to secure track windows.',
    unit: 'event',
    unitCost: 380,
    industry: 'RAILROAD',
  },
  {
    baseKey: 'rail_standby',
    label: 'Railroad Standby (Crew Idle)',
    description: 'Crew idle while waiting on dispatcher clearance or traffic clears.',
    unit: 'crew-hour',
    unitCost: 210,
    industry: 'RAILROAD',
  },
  {
    baseKey: 'rail_hi_rail_mobilization',
    label: 'Hi-Rail Mobilization',
    description: 'Mobilize, inspect, and stage hi-rail equipped vehicle.',
    unit: 'trip',
    unitCost: 1250,
    industry: 'RAILROAD',
  },
  {
    baseKey: 'rail_hi_rail_standby',
    label: 'Hi-Rail Standby',
    description: 'Hourly standby for hi-rail while awaiting track time.',
    unit: 'hour',
    unitCost: 245,
    industry: 'RAILROAD',
  },
  {
    baseKey: 'rail_on_track_protection',
    label: 'On-Track Protection Setup',
    description: 'Flags, shunts, and protection devices required before entering track.',
    unit: 'setup',
    unitCost: 680,
    industry: 'RAILROAD',
  },
  {
    baseKey: 'rail_safety_briefings',
    label: 'Railroad Safety Briefings',
    description: 'Carrier-specific safety briefings and documentation.',
    unit: 'briefing',
    unitCost: 225,
    industry: 'RAILROAD',
  },
  {
    baseKey: 'rail_job_briefings',
    label: 'Job Briefings (Per Shift)',
    description: 'Formal job briefings for each shift on railroad property.',
    unit: 'shift',
    unitCost: 260,
    industry: 'RAILROAD',
  },
  {
    baseKey: 'rail_reporting_closeout',
    label: 'Railroad Reporting & Closeout',
    description: 'Daily reporting back to railroad, including service unit notifications.',
    unit: 'day',
    unitCost: 365,
    industry: 'RAILROAD',
  },
  {
    baseKey: 'rail_traffic_delay',
    label: 'Delays Due to Railroad Traffic',
    description: 'Allowance for lineup changes, meets, and opposing traffic.',
    unit: 'hour',
    unitCost: 215,
    industry: 'RAILROAD',
  },
  {
    baseKey: 'rail_signal_interference_allowance',
    label: 'Signal Interference Allowance',
    description: 'Signal/communications interference mitigation and retests.',
    unit: 'event',
    unitCost: 550,
    industry: 'RAILROAD',
  },
  {
    baseKey: 'rail_other',
    label: 'Other – Railroad',
    description: 'Mandatory catch-all for railroad-specific scope beyond curated presets.',
    unit: 'ea',
    unitCost: 0,
    industry: 'RAILROAD',
    isOther: true,
    locked: true,
  },
]

const CONSTRUCTION_PRESETS: PresetSeed[] = [
  {
    baseKey: 'con_site_prep',
    label: 'Site Prep',
    description: 'Clearing, grubbing, fencing, and temporary controls.',
    unit: 'acre',
    unitCost: 2850,
    industry: 'CONSTRUCTION',
  },
  {
    baseKey: 'con_layout_survey',
    label: 'Layout / Survey Time',
    description: 'Survey crew for layout, as-builts, and control.',
    unit: 'crew-hour',
    unitCost: 195,
    industry: 'CONSTRUCTION',
  },
  {
    baseKey: 'con_excavation',
    label: 'Excavation',
    description: 'Bulk excavation including operator + haul support.',
    unit: 'cubic-yd',
    unitCost: 42,
    industry: 'CONSTRUCTION',
  },
  {
    baseKey: 'con_trenching',
    label: 'Trenching',
    description: 'Utility trenching with spoil management.',
    unit: 'linear-ft',
    unitCost: 68,
    industry: 'CONSTRUCTION',
  },
  {
    baseKey: 'con_shoring',
    label: 'Shoring / Protection',
    description: 'Trench boxes, slide rail, or engineered shoring systems.',
    unit: 'linear-ft',
    unitCost: 115,
    industry: 'CONSTRUCTION',
  },
  {
    baseKey: 'con_concrete',
    label: 'Concrete (Form / Pour / Cure)',
    description: 'Formwork, placement, finish, and cure including admixtures.',
    unit: 'cubic-yd',
    unitCost: 425,
    industry: 'CONSTRUCTION',
  },
  {
    baseKey: 'con_structural_assembly',
    label: 'Structural Assembly',
    description: 'Steel or precast erection with rigging and torqueing.',
    unit: 'ton',
    unitCost: 1850,
    industry: 'CONSTRUCTION',
  },
  {
    baseKey: 'con_equipment_operator',
    label: 'Equipment Operator Time',
    description: 'Operated equipment time for dozers, loaders, or skid steers.',
    unit: 'hour',
    unitCost: 165,
    industry: 'CONSTRUCTION',
  },
  {
    baseKey: 'con_crane_lift',
    label: 'Crane / Lift Time',
    description: 'Hydraulic crane, operator, rigger, and mobilization.',
    unit: 'hour',
    unitCost: 485,
    industry: 'CONSTRUCTION',
  },
  {
    baseKey: 'con_traffic_control',
    label: 'Traffic Control Setup',
    description: 'MOT devices, TTCP deployment, and maintenance.',
    unit: 'setup',
    unitCost: 1650,
    industry: 'CONSTRUCTION',
  },
  {
    baseKey: 'con_restoration_backfill',
    label: 'Restoration / Backfill',
    description: 'Topsoil, seeding, asphalt, or concrete patch backfill.',
    unit: 'sq-yd',
    unitCost: 32,
    industry: 'CONSTRUCTION',
  },
  {
    baseKey: 'con_cleanup_demobilization',
    label: 'Cleanup / Demobilization',
    description: 'Final sweep, debris removal, punch list closeout.',
    unit: 'crew-day',
    unitCost: 1460,
    industry: 'CONSTRUCTION',
  },
  {
    baseKey: 'con_inspection_standby',
    label: 'Inspection Standby',
    description: 'Crew standby for AHJ or client inspections.',
    unit: 'hour',
    unitCost: 165,
    industry: 'CONSTRUCTION',
  },
  {
    baseKey: 'con_rework_allowance',
    label: 'Rework Allowance',
    description: 'Allowance for punch-list driven corrections.',
    unit: 'visit',
    unitCost: 980,
    industry: 'CONSTRUCTION',
  },
  {
    baseKey: 'con_other',
    label: 'Other – Construction',
    description: 'Mandatory catch-all for construction scope outside curated presets.',
    unit: 'ea',
    unitCost: 0,
    industry: 'CONSTRUCTION',
    isOther: true,
    locked: true,
  },
]

const ENVIRONMENTAL_PRESETS: PresetSeed[] = [
  {
    baseKey: 'env_monitoring',
    label: 'Environmental Monitoring',
    description: 'On-site air, water, or noise monitoring with calibrated equipment.',
    unit: 'shift',
    unitCost: 1450,
    industry: 'ENVIRONMENTAL',
  },
  {
    baseKey: 'env_sampling_testing',
    label: 'Sampling & Testing',
    description: 'Grab/composite sampling and accredited lab coordination.',
    unit: 'sample',
    unitCost: 185,
    industry: 'ENVIRONMENTAL',
  },
  {
    baseKey: 'env_mobilization_monitoring_equipment',
    label: 'Mobilization of Monitoring Equipment',
    description: 'Mobilize PID, weather station, pumps, and calibration gases.',
    unit: 'trip',
    unitCost: 780,
    industry: 'ENVIRONMENTAL',
  },
  {
    baseKey: 'env_standby_results',
    label: 'Standby for Results',
    description: 'Crew standby awaiting lab or field test releases.',
    unit: 'hour',
    unitCost: 145,
    industry: 'ENVIRONMENTAL',
  },
  {
    baseKey: 'env_spill_response_readiness',
    label: 'Spill Response Readiness',
    description: 'Pre-staged crew/equipment for spill standby per contract.',
    unit: 'day',
    unitCost: 1650,
    industry: 'ENVIRONMENTAL',
  },
  {
    baseKey: 'env_waste_handling',
    label: 'Waste Handling',
    description: 'Drum, tote, or berm handling plus labeling and manifests.',
    unit: 'ton',
    unitCost: 120,
    industry: 'ENVIRONMENTAL',
  },
  {
    baseKey: 'env_waste_transport_coordination',
    label: 'Waste Transport Coordination',
    description: 'Scheduling and manifesting hazardous waste haulers.',
    unit: 'load',
    unitCost: 320,
    industry: 'ENVIRONMENTAL',
  },
  {
    baseKey: 'env_decontamination_time',
    label: 'Decontamination Time',
    description: 'Personnel/equipment decon including consumables.',
    unit: 'event',
    unitCost: 420,
    industry: 'ENVIRONMENTAL',
  },
  {
    baseKey: 'env_ppe_changeovers',
    label: 'PPE Changeovers',
    description: 'Tyvek, cartridge, glove, and boot changeover labor + materials.',
    unit: 'changeover',
    unitCost: 85,
    industry: 'ENVIRONMENTAL',
  },
  {
    baseKey: 'env_reporting',
    label: 'Environmental Reporting',
    description: 'Regulatory or client reporting package preparation.',
    unit: 'report',
    unitCost: 1250,
    industry: 'ENVIRONMENTAL',
  },
  {
    baseKey: 'env_regulator_standby',
    label: 'Regulator Standby',
    description: 'Time spent waiting on regulatory site inspections or guidance.',
    unit: 'hour',
    unitCost: 150,
    industry: 'ENVIRONMENTAL',
  },
  {
    baseKey: 'env_site_access_delays',
    label: 'Site Access Delays',
    description: 'Delays tied to permits, escorts, or clearance processing.',
    unit: 'hour',
    unitCost: 135,
    industry: 'ENVIRONMENTAL',
  },
  {
    baseKey: 'env_other',
    label: 'Other – Environmental',
    description: 'Mandatory bucket for environmental scope outside defaults.',
    unit: 'ea',
    unitCost: 0,
    industry: 'ENVIRONMENTAL',
    isOther: true,
    locked: true,
  },
]

const PRESET_SEEDS: PresetSeed[] = [
  ...BASE_PRESETS,
  ...RAILROAD_PRESETS,
  ...CONSTRUCTION_PRESETS,
  ...ENVIRONMENTAL_PRESETS,
]

const seedMap = PRESET_SEEDS.reduce<Record<string, PresetSeed>>((acc, seed) => {
  acc[seed.baseKey] = seed
  return acc
}, {})

export async function ensureEstimatingPresets(companyId: string): Promise<void> {
  const existing = await prisma.estimatingPreset.findMany({ where: { companyId } })
  const existingKeys = new Set(existing.map((preset) => preset.baseKey))

  const toCreate = PRESET_SEEDS.filter((seed) => !existingKeys.has(seed.baseKey)).map((seed, index) => ({
    companyId,
    baseKey: seed.baseKey,
    label: seed.label,
    defaultDescription: seed.description,
    defaultUnit: seed.unit,
    defaultUnitCost: new Prisma.Decimal(seed.unitCost),
    industry: seed.industry,
    enabled: true,
    sortOrder: index,
    isOther: Boolean(seed.isOther),
    locked: Boolean(seed.locked),
  }))

  if (toCreate.length) {
    await prisma.estimatingPreset.createMany({ data: toCreate })

    await prisma.accessAuditLog.createMany({
      data: toCreate.map((seed) => ({
        companyId,
        actorId: null,
        action: 'ESTIMATING_PRESET_CREATED' as AccessAuditAction,
        metadata: { baseKey: seed.baseKey, label: seed.label },
      })),
    })
  }

  await Promise.all(
    existing.map((preset) => {
      const seed = seedMap[preset.baseKey]
      if (!seed) {
        return null
      }

      const updates: Prisma.EstimatingPresetUpdateInput = {}

      if (preset.sortOrder !== PRESET_SEEDS.findIndex((item) => item.baseKey === preset.baseKey)) {
        updates.sortOrder = PRESET_SEEDS.findIndex((item) => item.baseKey === preset.baseKey)
      }

      if (preset.locked !== Boolean(seed.locked)) {
        updates.locked = Boolean(seed.locked)
      }

      if (preset.isOther !== Boolean(seed.isOther)) {
        updates.isOther = Boolean(seed.isOther)
      }

      if (preset.industry !== seed.industry) {
        updates.industry = seed.industry
      }

      if (Object.keys(updates).length === 0) {
        return null
      }

      return prisma.estimatingPreset.update({ where: { id: preset.id }, data: updates })
    })
  )
}

export async function listEstimatingPresets(companyId: string): Promise<EstimatingPreset[]> {
  await ensureEstimatingPresets(companyId)
  return prisma.estimatingPreset.findMany({
    where: { companyId },
    orderBy: [{ industry: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
  })
}

export function groupPresetsByIndustry(
  presets: EstimatingPreset[]
): Partial<Record<EstimatePresetIndustry, EstimatingPreset[]>> {
  return presets.reduce<Partial<Record<EstimatePresetIndustry, EstimatingPreset[]>>>((acc, preset) => {
    if (!acc[preset.industry]) {
      acc[preset.industry] = []
    }
    acc[preset.industry]!.push(preset)
    return acc
  }, {})
}

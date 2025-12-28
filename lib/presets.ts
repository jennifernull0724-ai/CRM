// Line Item Presets for T-REX CRM
// NO PRICING - Reference only

export const GLOBAL_BASE_PRESETS = [
  { key: 'mobilization', name: 'Mobilization', category: 'Global Base' },
  { key: 'demobilization', name: 'Demobilization', category: 'Global Base' },
  { key: 'travel', name: 'Travel', category: 'Global Base' },
  { key: 'mileage', name: 'Mileage', category: 'Global Base' },
  { key: 'per_diem', name: 'Per Diem', category: 'Global Base' },
  { key: 'equipment_transport', name: 'Equipment Transport', category: 'Global Base' },
  { key: 'project_management', name: 'Project Management', category: 'Global Base' },
  { key: 'safety_meetings', name: 'Safety Meetings', category: 'Global Base' },
  { key: 'admin_documentation', name: 'Administrative / Documentation', category: 'Global Base' },
  { key: 'other_global', name: 'Other – Custom', category: 'Global Base', mandatory: true },
]

export const RAILROAD_PRESETS = [
  { key: 'access_coordination', name: 'Access & Coordination', category: 'Railroad' },
  { key: 'track_protection', name: 'Track Protection / RWP', category: 'Railroad' },
  { key: 'rwic', name: 'RWIC', category: 'Railroad' },
  { key: 'flagging', name: 'Flagging / Lookout', category: 'Railroad' },
  { key: 'railroad_labor', name: 'Railroad Labor', category: 'Railroad' },
  { key: 'railroad_supervision', name: 'Railroad Supervision', category: 'Railroad' },
  { key: 'hi_rail', name: 'Hi-Rail', category: 'Railroad' },
  { key: 'on_track_equipment', name: 'On-Track Equipment', category: 'Railroad' },
  { key: 'railroad_documentation', name: 'Railroad Documentation', category: 'Railroad' },
  { key: 'railroad_reporting', name: 'Railroad Reporting', category: 'Railroad' },
  { key: 'erailsafe', name: 'eRailSafe', category: 'Railroad', required: true },
  { key: 'other_railroad', name: 'Other – Railroad', category: 'Railroad', mandatory: true },
]

export const CONSTRUCTION_PRESETS = [
  { key: 'general_labor', name: 'General Labor', category: 'Construction' },
  { key: 'skilled_labor', name: 'Skilled Labor', category: 'Construction' },
  { key: 'supervision', name: 'Supervision', category: 'Construction' },
  { key: 'site_prep', name: 'Site Prep', category: 'Construction' },
  { key: 'excavation', name: 'Excavation', category: 'Construction' },
  { key: 'grading', name: 'Grading', category: 'Construction' },
  { key: 'concrete', name: 'Concrete', category: 'Construction' },
  { key: 'structural', name: 'Structural', category: 'Construction' },
  { key: 'installation', name: 'Installation', category: 'Construction' },
  { key: 'heavy_equipment', name: 'Heavy Equipment', category: 'Construction' },
  { key: 'tools', name: 'Tools', category: 'Construction' },
  { key: 'construction_documentation', name: 'Construction Documentation', category: 'Construction' },
  { key: 'other_construction', name: 'Other – Construction', category: 'Construction', mandatory: true },
]

export const ENVIRONMENTAL_PRESETS = [
  { key: 'assessment', name: 'Assessment', category: 'Environmental' },
  { key: 'remediation', name: 'Remediation', category: 'Environmental' },
  { key: 'spill_response', name: 'Spill Response', category: 'Environmental' },
  { key: 'hazardous_materials', name: 'Hazardous Materials', category: 'Environmental' },
  { key: 'monitoring', name: 'Monitoring', category: 'Environmental' },
  { key: 'sampling', name: 'Sampling', category: 'Environmental' },
  { key: 'testing', name: 'Testing', category: 'Environmental' },
  { key: 'ppe', name: 'PPE', category: 'Environmental' },
  { key: 'environmental_documentation', name: 'Environmental Documentation', category: 'Environmental' },
  { key: 'other_environmental', name: 'Other – Environmental', category: 'Environmental', mandatory: true },
]

export const ALL_PRESETS = [
  ...GLOBAL_BASE_PRESETS,
  ...RAILROAD_PRESETS,
  ...CONSTRUCTION_PRESETS,
  ...ENVIRONMENTAL_PRESETS,
]

export function getPresetsByCategory(category: string) {
  switch (category) {
    case 'Global Base':
      return GLOBAL_BASE_PRESETS
    case 'Railroad':
      return RAILROAD_PRESETS
    case 'Construction':
      return CONSTRUCTION_PRESETS
    case 'Environmental':
      return ENVIRONMENTAL_PRESETS
    default:
      return []
  }
}

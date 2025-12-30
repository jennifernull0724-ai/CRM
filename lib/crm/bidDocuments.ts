import { BidDocumentCategory } from '@prisma/client'

export type BidDocumentCategoryOption = {
  value: BidDocumentCategory
  label: string
  description: string
}

export const BID_DOCUMENT_CATEGORIES: BidDocumentCategoryOption[] = [
  { value: 'PLANS', label: 'Plans', description: 'Full plan sets, sheets, and marked-up drawings.' },
  { value: 'SPECIFICATIONS', label: 'Specifications', description: 'Project specs, technical manuals, performance criteria.' },
  { value: 'ADDENDA', label: 'Addenda', description: 'Issued addenda or clarifications before bid due date.' },
  { value: 'RFP_IFB', label: 'RFP / IFB', description: 'Request for Proposal or Invitation for Bid packages.' },
  { value: 'CLARIFICATIONS', label: 'Clarifications', description: 'Pre-bid RFIs, Q&A logs, or owner clarifications.' },
  { value: 'CUSTOMER_PROVIDED', label: 'Customer Provided', description: 'Any owner or agency supplied PDF or attachment.' },
  { value: 'SUBCONTRACTOR', label: 'Subcontractor Inputs', description: 'Sub quotes or partner pricing sheets.' },
  { value: 'SITE_INSTRUCTIONS', label: 'Site Instructions', description: 'Access notes, laydown maps, mobilization checklists.' },
  { value: 'ACCESS_DETAILS', label: 'Access & Maps', description: 'Gate codes, access maps, or haul routes.' },
  { value: 'SAMPLING_PLAN', label: 'Sampling Plans', description: 'Environmental sampling or monitoring plans.' },
  { value: 'HISTORICAL_REPORT', label: 'Historical Reports', description: 'Legacy site reports, geotech, or environmental history.' },
  { value: 'REGULATORY', label: 'Regulatory Docs', description: 'Permit excerpts, regulatory correspondence, authority forms.' },
  { value: 'DAILY_LOG', label: 'Daily Logs', description: 'Job daily logs or inspector notes pre-award.' },
  { value: 'PHOTO', label: 'Photos', description: 'Site condition photos or aerial imagery.' },
  { value: 'OTHER', label: 'Other', description: 'Anything else needed for bid completeness.' },
]

const LABEL_LOOKUP = BID_DOCUMENT_CATEGORIES.reduce<Record<BidDocumentCategory, BidDocumentCategoryOption>>((acc, option) => {
  acc[option.value] = option
  return acc
}, {} as Record<BidDocumentCategory, BidDocumentCategoryOption>)

export function labelForBidDocumentCategory(category: BidDocumentCategory): BidDocumentCategoryOption {
  return LABEL_LOOKUP[category]
}

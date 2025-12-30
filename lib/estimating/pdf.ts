import PDFDocument from 'pdfkit'
import type { EstimateIndustry } from '@prisma/client'

type PdfDoc = InstanceType<typeof PDFDocument>

export type PdfLineItem = {
  presetLabel: string
  description: string
  quantity: number
  unit: string
  unitCost: number
  lineTotal: number
  notes?: string | null
}

export type GenerateEstimatePdfParams = {
  variant: 'estimate' | 'quote'
  quoteNumber: string
  revisionNumber: number
  companyName: string
  projectName: string
  projectLocation?: string | null
  industry: EstimateIndustry
  contactName: string
  contactEmail?: string | null
  contactCompany?: string | null
  createdDate: Date
  generatedAt: Date
  scopeOfWork: string
  assumptions?: string | null
  exclusions?: string | null
  lineItems: PdfLineItem[]
  subtotal: number
  markupPercent?: number | null
  markupAmount?: number | null
  overheadPercent?: number | null
  overheadAmount?: number | null
  grandTotal: number
  manualOverrideTotal?: number | null
  overrideReason?: string | null
  logo?: Buffer | null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

async function streamToBuffer(doc: PdfDoc): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

function drawSectionHeading(doc: PdfDoc, label: string) {
  doc.moveDown(0.5)
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12).text(label.toUpperCase())
  doc.moveDown(0.2)
}

function renderParagraph(doc: PdfDoc, htmlContent: string) {
  const text = htmlContent
    .replace(/<\/?(strong|b)>/gi, '')
    .replace(/<br\s*\/?>(\r\n)?/gi, '\n')
    .replace(/<\/?(p|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim()

  doc.font('Helvetica').fontSize(10).fillColor('#1F2933').text(text || '—', { align: 'left' })
}

function renderLineItemTable(doc: PdfDoc, items: PdfLineItem[]) {
  const headers = ['Preset', 'Description', 'Qty', 'Unit', 'Unit Cost', 'Line Total']
  const columnWidths = [110, 170, 40, 40, 80, 90]

  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10)
  headers.forEach((header, idx) => {
    doc.text(header, { continued: idx < headers.length - 1, width: columnWidths[idx] })
  })
  doc.moveDown(0.3)
  doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke()
  doc.moveDown(0.2)

  items.forEach((item) => {
    doc.fillColor('#111827').font('Helvetica-Bold').text(item.presetLabel, { continued: true, width: columnWidths[0] })
    doc.fillColor('#1F2933').font('Helvetica').text(item.description, { continued: true, width: columnWidths[1] })
    doc.text(item.quantity.toFixed(2), { continued: true, width: columnWidths[2] })
    doc.text(item.unit, { continued: true, width: columnWidths[3] })
    doc.text(formatCurrency(item.unitCost), { continued: true, width: columnWidths[4] })
    doc.text(formatCurrency(item.lineTotal), { width: columnWidths[5] })

    if (item.notes) {
      doc.fillColor('#6B7280').fontSize(8).text(item.notes, { width: columnWidths[0] + columnWidths[1], continued: false })
    }
    doc.moveDown(0.4)
  })
}

function renderTotals(doc: PdfDoc, params: GenerateEstimatePdfParams) {
  const lines: Array<{ label: string; value: string }> = [
    { label: 'Subtotal', value: formatCurrency(params.subtotal) },
  ]

  if (params.markupPercent && params.markupAmount) {
    lines.push({ label: `Markup (${params.markupPercent.toFixed(1)}%)`, value: formatCurrency(params.markupAmount) })
  }

  if (params.overheadPercent && params.overheadAmount) {
    lines.push({ label: `Overhead (${params.overheadPercent.toFixed(1)}%)`, value: formatCurrency(params.overheadAmount) })
  }

  if (params.manualOverrideTotal && params.manualOverrideTotal > 0) {
    lines.push({ label: 'Manual Override', value: formatCurrency(params.manualOverrideTotal) })
  }

  const grandTotal = params.manualOverrideTotal ?? params.grandTotal
  lines.push({ label: 'Grand Total', value: formatCurrency(grandTotal) })

  doc.moveDown(0.5)
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('Pricing Summary')
  lines.forEach((line) => {
    doc.fillColor('#475569').font('Helvetica').fontSize(10).text(line.label, { continued: true })
    doc.text(line.value, { align: 'right' })
  })

  if (params.overrideReason && params.manualOverrideTotal) {
    doc.moveDown(0.2)
    doc.fillColor('#DC2626').fontSize(8).text(`Override reason: ${params.overrideReason}`)
  }
}

export async function generateEstimatePdf(params: GenerateEstimatePdfParams): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 54, left: 48, right: 48, bottom: 54 } })

  if (params.logo) {
    try {
      doc.image(params.logo, doc.page.margins.left, doc.page.margins.top - 20, { fit: [140, 60] })
    } catch {
      // ignore logo errors but continue render
    }
  }

  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(14).text(params.companyName)
  doc.fillColor('#475569')
    .font('Helvetica')
    .fontSize(9)
    .text(`Generated: ${params.generatedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`)

  doc.fillColor('#1E40AF').font('Helvetica-Bold').fontSize(22).text(params.variant === 'quote' ? 'Client Quote' : 'Estimate Summary', {
    align: 'right',
  })
  doc.moveDown(0.5)
  doc.fontSize(10).fillColor('#475569').text(`Quote #${params.quoteNumber} · Revision ${params.revisionNumber}`, { align: 'right' })

  doc.moveDown(1)
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('Project + Contact')
  doc.font('Helvetica').fontSize(10).fillColor('#1F2933')
  doc.text(`Project: ${params.projectName}`)
  if (params.projectLocation) {
    doc.text(`Location: ${params.projectLocation}`)
  }
  doc.text(`Industry: ${params.industry}`)
  doc.text(`Contact: ${params.contactName}${params.contactEmail ? ` • ${params.contactEmail}` : ''}`)
  if (params.contactCompany) {
    doc.text(`Contact Company: ${params.contactCompany}`)
  }
  doc.text(`Prepared: ${params.createdDate.toLocaleDateString('en-US', { dateStyle: 'medium' })}`)

  drawSectionHeading(doc, 'Scope of Work')
  renderParagraph(doc, params.scopeOfWork)

  drawSectionHeading(doc, 'Assumptions')
  renderParagraph(doc, params.assumptions ?? '')

  drawSectionHeading(doc, 'Exclusions')
  renderParagraph(doc, params.exclusions ?? '')

  doc.moveDown(0.5)
  drawSectionHeading(doc, 'Line Items')
  renderLineItemTable(doc, params.lineItems)
  renderTotals(doc, params)

  return streamToBuffer(doc)
}

import PDFDocument from 'pdfkit'
import type { AssetStatus, ComplianceStatus, DispatchPresetScope, WorkOrderStatus } from '@prisma/client'

export type WorkOrderPdfPayload = {
  id: string
  title: string
  status: WorkOrderStatus
  createdAt: Date
  dispatchStatus: string | null
  dispatchPriority: string | null
  contact: {
    name: string
    email: string
    jobTitle: string | null
  }
  presets: Array<{
    name: string
    scope: DispatchPresetScope
    notes: string | null
  }>
  assignments: Array<{
    employeeName: string
    employeeRole: string
    assignedAt: Date
    complianceStatus: ComplianceStatus | null
    overrideAcknowledged: boolean
    overrideReason: string | null
    missingCerts: string[]
    expiringCerts: string[]
  }>
  assets: Array<{
    assetName: string
    assetType: string
    assetNumber: string
    statusAtAssignment: AssetStatus
    assignedAt: Date
    removedAt: Date | null
  }>
}

function bufferPdf(doc: PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
}

function formatDate(value: Date): string {
  return value.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function generateWorkOrderPdf(payload: WorkOrderPdfPayload): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'LETTER', margin: 54 })
  doc.fontSize(20).fillColor('#0f172a').text('Work Order', { align: 'left' })
  doc.moveDown(0.5)
  doc.fontSize(14).fillColor('#334155').text(payload.title)
  doc.fontSize(10).fillColor('#475569').text(`Work order ID: ${payload.id}`)
  doc.moveDown(0.5)
  doc.text(`Status: ${payload.status}`)
  doc.text(`Dispatch status: ${payload.dispatchStatus ?? '—'}`)
  doc.text(`Priority: ${payload.dispatchPriority ?? 'Standard'}`)
  doc.text(`Created: ${formatDate(payload.createdAt)}`)

  doc.moveDown()
  doc.fontSize(14).fillColor('#0f172a').text('Contact')
  doc.fontSize(10).fillColor('#475569')
  doc.text(`Name: ${payload.contact.name}`)
  doc.text(`Email: ${payload.contact.email}`)
  doc.text(`Role: ${payload.contact.jobTitle ?? '—'}`)

  doc.moveDown()
  doc.fontSize(14).fillColor('#0f172a').text('Authorized Scope & Execution Items')
  doc.fontSize(10).fillColor('#475569')
  if (!payload.presets.length) {
    doc.text('No presets selected.')
  } else {
    payload.presets.forEach((preset) => {
      const note = preset.notes?.trim()
      doc.text(`☑ ${preset.name} (${formatScopeLabel(preset.scope)})`)
      doc.text(`Notes: ${note && note.length ? note : '—'}`)
      doc.moveDown(0.25)
    })
  }

  doc.moveDown()
  doc.fontSize(14).fillColor('#0f172a').text('Crew Assignments')
  doc.fontSize(10).fillColor('#475569')
  if (payload.assignments.length === 0) {
    doc.text('No employees assigned.')
  } else {
    payload.assignments.forEach((assignment) => {
      const overrideLabel = assignment.overrideAcknowledged ? ' · Override acknowledged' : ''
      const complianceLabel = assignment.complianceStatus ?? 'UNSET'
      doc.text(
        `${assignment.employeeName} (${assignment.employeeRole}) · ${complianceLabel}${overrideLabel}`
      )
      doc.text(`Assigned ${formatDate(assignment.assignedAt)}`)
      if (assignment.overrideAcknowledged) {
        doc.text(`Override reason: ${assignment.overrideReason ?? 'Not provided'}`)
        if (assignment.missingCerts.length) {
          doc.text(`Missing certifications: ${assignment.missingCerts.join(', ')}`)
        }
        if (assignment.expiringCerts.length) {
          doc.text(`Expiring soon: ${assignment.expiringCerts.join(', ')}`)
        }
      }
      doc.moveDown(0.25)
    })
  }

  doc.moveDown()
  doc.fontSize(14).fillColor('#0f172a').text('Assets Assigned')
  doc.fontSize(10).fillColor('#475569')
  if (payload.assets.length === 0) {
    doc.text('No assets assigned to this work order.')
  } else {
    payload.assets.forEach((asset) => {
      doc.text(`${asset.assetName} · ${asset.assetType} · Asset ${asset.assetNumber}`)
      doc.text(`Status at assignment: ${asset.statusAtAssignment}`)
      doc.text(`Assigned: ${formatDate(asset.assignedAt)}`)
      if (asset.removedAt) {
        doc.text(`Removed: ${formatDate(asset.removedAt)}`)
      }
      doc.moveDown(0.5)
    })
  }

  doc.end()
  return bufferPdf(doc)
}

function formatScopeLabel(scope: DispatchPresetScope): string {
  switch (scope) {
    case 'BASE':
      return 'Base'
    case 'CONSTRUCTION':
      return 'Construction'
    case 'RAILROAD':
      return 'Railroad'
    case 'ENVIRONMENTAL':
      return 'Environmental'
    default:
      return scope
  }
}

import PDFDocument from 'pdfkit'
import type {
  ComplianceCertification,
  ComplianceCertificationImage,
  ComplianceEmployee,
} from '@prisma/client'
import { getComplianceFileBuffer } from '@/lib/s3'

export type CertificationWithImages = ComplianceCertification & {
  images: Pick<ComplianceCertificationImage, 'id' | 'filename' | 'objectKey' | 'sha256' | 'version' | 'mimeType'>[]
}

export interface CompliancePdfPayload {
  employee: ComplianceEmployee & { company: { name: string } }
  certifications: CertificationWithImages[]
  snapshotHash: string
  includeFullPacket?: boolean
}

function pipeToBuffer(doc: PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
}

function renderHeader(doc: PDFDocument, payload: CompliancePdfPayload) {
  const { employee } = payload
  doc.fontSize(18).font('Helvetica-Bold').text('Compliance Verification Packet')
  doc.moveDown(0.5)
  doc.fontSize(12).font('Helvetica').text(`Company: ${employee.company.name}`)
  doc.text(`Employee: ${employee.firstName} ${employee.lastName}`)
  doc.text(`Role / Title: ${employee.title}`)
  doc.text(`Compliance Status: ${employee.complianceStatus}`)
  if (employee.lastVerifiedAt) {
    doc.text(`Last Verified: ${employee.lastVerifiedAt.toISOString()}`)
  }
}

async function embedCertificationImages(doc: PDFDocument, certification: CertificationWithImages) {
  for (const image of certification.images) {
    if (!image.mimeType.startsWith('image/')) {
      continue
    }
    const buffer = await getComplianceFileBuffer(image.objectKey)
    doc.addPage({ margin: 40 })
    doc.font('Helvetica-Bold').fontSize(14).text(`${certification.customName ?? certification.presetKey} — Image v${image.version}`)
    doc.moveDown(0.5)
    doc.font('Helvetica').fontSize(10).text(`Hash: ${image.sha256}`)
    doc.moveDown(0.5)
    doc.image(buffer, {
      fit: [500, 600],
      align: 'center',
      valign: 'center',
    })
  }
}

function renderCertificationSummary(doc: PDFDocument, certification: CertificationWithImages) {
  doc.fontSize(12).font('Helvetica-Bold').text(certification.customName ?? certification.presetKey)
  doc.moveDown(0.2)
  doc.fontSize(10).font('Helvetica')
  doc.text(`Category: ${certification.category}`)
  doc.text(`Required: ${certification.required ? 'Yes' : 'Optional'}`)
  doc.text(`Issue Date: ${certification.issueDate.toISOString().split('T')[0]}`)
  doc.text(`Expiration Date: ${certification.expiresAt.toISOString().split('T')[0]}`)
  doc.text(`Status: ${certification.status}`)
  const imageCount = certification.images.filter((image) => image.mimeType.startsWith('image/')).length
  const pdfCount = certification.images.length - imageCount
  doc.text(`Proof images: ${imageCount}`)
  if (pdfCount > 0) {
    doc.text(`Supplemental PDFs: ${pdfCount}`)
  }
  doc.moveDown(0.75)
}

export async function generateEmployeeCompliancePdf(payload: CompliancePdfPayload): Promise<Buffer> {
  const doc = new PDFDocument({ autoFirstPage: true, margin: 40 })
  const bufferPromise = pipeToBuffer(doc)

  renderHeader(doc, payload)
  doc.moveDown(1)
  doc.fontSize(14).font('Helvetica-Bold').text('Certifications')
  doc.moveDown(0.5)

  payload.certifications.forEach((cert) => {
    renderCertificationSummary(doc, cert)
  })

  doc.moveDown(0.5)
  doc.fontSize(10).font('Helvetica').text(`Snapshot Hash: ${payload.snapshotHash}`)

  if (payload.includeFullPacket) {
    for (const certification of payload.certifications) {
      if (!certification.images.length) {
        continue
      }
      await embedCertificationImages(doc, certification)
    }
  }

  doc.end()
  return bufferPromise
}

export async function generateComplianceBinder(employees: CompliancePdfPayload[]): Promise<Buffer> {
  const doc = new PDFDocument({ autoFirstPage: false, margin: 40 })
  const bufferPromise = pipeToBuffer(doc)

  for (const payload of employees) {
    doc.addPage()
    renderHeader(doc, payload)
    doc.moveDown(0.75)
    doc.fontSize(14).font('Helvetica-Bold').text('Certifications')
    doc.moveDown(0.25)
    payload.certifications.forEach((cert) => {
      renderCertificationSummary(doc, cert)
    })
    doc.moveDown(0.5)
    doc.fontSize(10).text(`Snapshot Hash: ${payload.snapshotHash}`)
  }

  doc.end()
  return bufferPromise
}

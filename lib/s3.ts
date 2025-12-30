import crypto from 'crypto'
import type { Readable } from 'stream'
import { bucket } from '@/lib/storage/gcs'
import path from 'path'

const BUCKET_NAME = bucket.name

export interface UploadResult {
  key: string
  bucket: string
  url: string
  hash: string
  size: number
}

async function streamToBuffer(stream: Readable | ReadableStream | Blob): Promise<Buffer> {
  if (stream instanceof Readable) {
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  if ('getReader' in stream) {
    const reader = (stream as ReadableStream).getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
  }

  const arrayBuffer = await (stream as Blob).arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Upload file to S3
 */
export async function uploadFile(file: Buffer, objectKey: string, contentType: string): Promise<UploadResult> {
  const key = objectKey.includes('.') ? objectKey : `${objectKey}/${crypto.randomUUID()}`
  const hash = crypto.createHash('sha256').update(file).digest('hex')

  const fileRef = bucket.file(key)
  await fileRef.save(file, {
    contentType,
    metadata: {
      hash,
      uploadedAt: new Date().toISOString(),
    },
  })

  return {
    key,
    bucket: BUCKET_NAME,
    url: `gs://${BUCKET_NAME}/${key}`,
    hash,
    size: file.length,
  }
}

function buildObjectKey(companyId: string, contactId: string | null, entity: string, filename: string) {
  const ext = path.extname(filename || '').replace('.', '') || 'bin'
  const cleanEntity = entity.replace(/^\/+|\/+$/g, '')
  const base = contactId ? `companies/${companyId}/contacts/${contactId}/${cleanEntity}` : `companies/${companyId}/${cleanEntity}`
  return `${base}/${crypto.randomUUID()}.${ext}`
}

/**
 * Generate signed URL for download
 */
export async function getDownloadUrl(key: string, expiresIn: number = 900): Promise<string> {
  const [signedUrl] = await bucket.file(key).getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresIn * 1000,
  })

  return signedUrl
}

/**
 * Delete file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  await bucket.file(key).delete({ ignoreNotFound: true })
}

/**
 * Upload compliance file (certifications, documents)
 */
export async function uploadComplianceFile(
  file: Buffer,
  companyId: string,
  type: 'certifications' | 'documents',
  filename: string,
  contentType: string
): Promise<UploadResult> {
  const key = buildObjectKey(companyId, null, `compliance/${type}`, filename)
  return uploadFile(file, key, contentType)
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  const [stream] = await bucket.file(key).download()
  return stream
}

export async function uploadComplianceCertificationImage(params: {
  file: Buffer
  companyId: string
  employeeId: string
  certificationId: string
  version: number
  contentType: string
}): Promise<UploadResult> {
  const { file, companyId, employeeId, certificationId, version, contentType } = params
  const ext = contentType.split('/')[1] ?? 'bin'
  const filename = `cert-${certificationId}-${version}.${ext}`
  const key = buildObjectKey(companyId, null, `compliance/employees/${employeeId}/certifications/${certificationId}/images/${version}`, filename)
  return uploadFile(file, key, contentType)
}

export async function getComplianceFileBuffer(key: string): Promise<Buffer> {
  return getFileBuffer(key)
}

export async function getComplianceSignedUrl(key: string, expiresIn: number = 900): Promise<string> {
  const expires = Date.now() + expiresIn * 1000
  const fileRef = bucket.file(key)
  const [signedUrl] = await fileRef.getSignedUrl({
    action: 'read',
    expires,
  })

  return signedUrl
}

/**
 * Upload deal PDF
 */
export async function uploadDealPdf(
  file: Buffer,
  companyId: string,
  dealId: string,
  version: number
): Promise<UploadResult> {
  const key = buildObjectKey(companyId, null, `deals/${dealId}/versions/${version}/pdfs`, 'deal.pdf')
  return uploadFile(file, key, 'application/pdf')
}

export async function uploadEstimatePdf(params: {
  file: Buffer
  companyId: string
  estimateId: string
  revisionNumber: number
  variant: 'estimate' | 'quote'
  pdfVersion: number
  pdfVersionId: string
}): Promise<UploadResult> {
  const { file, companyId, estimateId, revisionNumber, variant, pdfVersion, pdfVersionId } = params
  const key = `companies/${companyId}/estimating/${estimateId}/pdfs/v${revisionNumber}/pdf-v${pdfVersion}-${variant}-${pdfVersionId}.pdf`
  return uploadFile(file, key, 'application/pdf')
}

export async function uploadDealBidDocument(params: {
  file: Buffer
  companyId: string
  dealId: string
  fileName: string
  contentType: string
}): Promise<UploadResult> {
  const { file, companyId, dealId, fileName, contentType } = params
  const safeType = contentType && contentType.trim().length > 0 ? contentType : 'application/octet-stream'
  const key = buildObjectKey(companyId, null, `deals/${dealId}/bid-documents`, fileName || 'bid-doc')
  return uploadFile(file, key, safeType)
}

export async function uploadCompanyComplianceDocumentVersion(params: {
  file: Buffer
  companyId: string
  documentId: string
  versionId: string
  fileName: string
  contentType: string
}): Promise<UploadResult> {
  const { file, companyId, documentId, versionId, fileName, contentType } = params
  const safeName = fileName?.trim() || 'company-document'
  const ext = path.extname(safeName) || `.${contentType.split('/')[1] ?? 'bin'}`
  const baseName = (ext ? safeName.slice(0, safeName.length - ext.length) : safeName) || 'company-document'
  const sanitizedBase = baseName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'company-document'
  const key = `companies/${companyId}/compliance/company-documents/${documentId}/${versionId}/${sanitizedBase}${ext}`
  return uploadFile(file, key, contentType)
}

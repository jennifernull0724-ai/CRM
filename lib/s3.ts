import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'
import type { Readable } from 'stream'

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  ...(process.env.AWS_S3_ENDPOINT && { endpoint: process.env.AWS_S3_ENDPOINT }),
  forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
})

const bucket = process.env.AWS_S3_BUCKET!

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
export async function uploadFile(
  file: Buffer,
  path: string,
  contentType: string
): Promise<UploadResult> {
  const key = `${path}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}`
  const hash = crypto.createHash('sha256').update(file).digest('hex')

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file,
    ContentType: contentType,
    Metadata: {
      hash,
      uploadedAt: new Date().toISOString(),
    },
  })

  await s3Client.send(command)

  return {
    key,
    bucket,
    url: `s3://${bucket}/${key}`,
    hash,
    size: file.length,
  }
}

/**
 * Generate signed URL for download
 */
export async function getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  return await getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Delete file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  await s3Client.send(command)
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
  void filename
  const path = `companies/${companyId}/compliance/${type}`
  return uploadFile(file, path, contentType)
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  const response = await s3Client.send(command)
  if (!response.Body) {
    throw new Error('Empty S3 body')
  }

  return streamToBuffer(response.Body as Readable)
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
  const path = `companies/${companyId}/compliance/employees/${employeeId}/certifications/${certificationId}/images/${version}`
  return uploadFile(file, path, contentType)
}

export async function getComplianceFileBuffer(key: string): Promise<Buffer> {
  return getFileBuffer(key)
}

export async function getComplianceSignedUrl(key: string, expiresIn: number = 900): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  return getSignedUrl(s3Client, command, { expiresIn })
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
  const path = `companies/${companyId}/deals/${dealId}/versions/${version}/pdfs`
  return uploadFile(file, path, 'application/pdf')
}

export async function uploadEstimatePdf(
  file: Buffer,
  companyId: string,
  estimateId: string,
  revisionNumber: number,
  kind: 'estimate' | 'quote'
): Promise<UploadResult> {
  const path = `companies/${companyId}/estimates/${estimateId}/revisions/${revisionNumber}/${kind}`
  return uploadFile(file, path, 'application/pdf')
}

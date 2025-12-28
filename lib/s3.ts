import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'

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
  filename: string
): Promise<UploadResult> {
  const path = `companies/${companyId}/compliance/${type}`
  return uploadFile(file, path, 'application/pdf')
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

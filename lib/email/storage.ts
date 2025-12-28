import { randomUUID } from 'crypto'
import path from 'path'
import { uploadFile } from '@/lib/s3'

export async function saveEmailAttachment(params: {
  companyId: string
  contactId: string
  filename: string
  contentType: string
  buffer: Buffer
  isInline?: boolean
}) {
  const ext = path.extname(params.filename || '').replace('.', '') || guessExt(params.contentType) || 'bin'
  const entity = params.isInline ? 'img' : 'att'
  const key = `companies/${params.companyId}/contacts/${params.contactId}/email/${entity}/${entity}_${randomUUID()}.${ext}`
  return uploadFile(params.buffer, key, params.contentType)
}

function guessExt(contentType?: string) {
  if (!contentType) return null
  const parts = contentType.split('/')
  return parts[1] || null
}

import { uploadFile } from '@/lib/s3'

export async function saveEmailAttachment(params: {
  companyId: string
  contactId: string
  filename: string
  contentType: string
  buffer: Buffer
}) {
  const path = `companies/${params.companyId}/contacts/${params.contactId}/emails`
  return uploadFile(params.buffer, path, params.contentType)
}

import MailComposer from 'nodemailer/lib/mail-composer'

export type MimeAttachment = {
  filename: string
  content: Buffer
  contentType?: string
  encoding?: string
}

export type MimeMessageParams = {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  text?: string
  html?: string
  replyTo?: string
  inReplyTo?: string
  references?: string[]
  attachments?: MimeAttachment[]
}

function encodeBase64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function buildMimeMessage(params: MimeMessageParams): Promise<string> {
  const composer = new MailComposer({
    from: params.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
    cc: params.cc,
    bcc: params.bcc,
    replyTo: params.replyTo,
    inReplyTo: params.inReplyTo,
    references: params.references,
    attachments: params.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
      encoding: attachment.encoding ?? 'base64',
    })),
  })

  const raw = await new Promise<Buffer>((resolve, reject) => {
    composer.compile().build((error, message) => {
      if (error) {
        reject(error)
        return
      }
      resolve(message)
    })
  })

  return encodeBase64Url(raw)
}

declare module 'nodemailer/lib/mail-composer' {
  export interface MailComposerOptions {
    from?: string
    to?: string | string[]
    cc?: string | string[]
    bcc?: string | string[]
    subject?: string
    text?: string
    html?: string
    replyTo?: string
    inReplyTo?: string
    references?: string | string[]
    attachments?: Array<{
      filename?: string
      content?: Buffer | string
      contentType?: string
      encoding?: string
    }>
  }

  export default class MailComposer {
    constructor(options?: MailComposerOptions)
    compile(): {
      build(callback: (error: Error | null, message: Buffer) => void): void
    }
  }
}

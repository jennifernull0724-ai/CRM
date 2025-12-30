declare module 'mailparser' {
  type Readable = import('stream').Readable

  export interface AddressObject {
    address?: string | null
    name?: string | null
    group?: AddressObject[]
  }

  export interface MailAttachment {
    filename?: string
    contentType?: string
    contentDisposition?: string
    content?: Buffer | Uint8Array | string
    size?: number
  }

  export interface ParsedMail {
    messageId?: string | null
    subject?: string | null
    date?: Date | null
    from?: { value?: AddressObject[] }
    to?: { value?: AddressObject[] }
    cc?: { value?: AddressObject[] }
    bcc?: { value?: AddressObject[] }
    replyTo?: { value?: AddressObject[] }
    text?: string | null
    html?: string | Buffer | null
    attachments?: MailAttachment[]
  }

  export function simpleParser(
    source: string | Buffer | Uint8Array | Readable,
    options?: Record<string, unknown>
  ): Promise<ParsedMail>
}

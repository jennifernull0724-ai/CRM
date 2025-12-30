import crypto from 'crypto'
import { Prisma, type EmailAccount, type EmailDirection } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { needsAccessTokenRefresh, refreshAccountAccessToken } from '@/lib/email/accounts'
import { buildMimeMessage } from '@/lib/email/mime'
import { sendGmailMessage } from '@/lib/email/providers/gmail'
import { OutlookAttachment, OutlookRecipient, sendOutlookMessage } from '@/lib/email/providers/outlook'
import { saveEmailAttachment } from '@/lib/email/storage'

export type EmailRecipientInput = { email: string; name?: string }

type GmailHeader = {
  name?: string | null
  value?: string | null
}

export type SendContactEmailInput = {
  accountId: string
  companyId: string
  contactId: string
  authorId: string
  to: EmailRecipientInput[]
  cc?: EmailRecipientInput[]
  bcc?: EmailRecipientInput[]
  subject: string
  html?: string
  text?: string
  replyToMessageId?: string
  attachments?: Array<{ filename: string; contentType: string; buffer: Buffer }>
}

function formatAddress(recipient: EmailRecipientInput): string {
  return recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email
}

function toOutlookRecipient(recipient: EmailRecipientInput): OutlookRecipient {
  return { emailAddress: { address: recipient.email, name: recipient.name } }
}

function stripHtml(input?: string | null) {
  if (!input) return null
  return input.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

async function ensureFreshAccount(account: EmailAccount) {
  if (needsAccessTokenRefresh(account)) {
    return refreshAccountAccessToken(account)
  }
  return account
}

async function storeOutboundEmailRecord(params: {
  account: EmailAccount
  input: SendContactEmailInput
  direction: EmailDirection
  providerMessageId: string
  threadId?: string | null
  rawMessageId?: string | null
}) {
  const record = await prisma.email.create({
    data: {
      companyId: params.account.companyId,
      contactId: params.input.contactId,
      accountId: params.account.id,
      provider: params.account.provider,
      direction: params.direction,
      subject: params.input.subject,
      snippet: stripHtml(params.input.html) ?? params.input.text ?? null,
      bodyHtml: params.input.html ?? null,
      bodyText: params.input.text ?? stripHtml(params.input.html),
      fromAddress: params.account.displayName
        ? `${params.account.displayName} <${params.account.emailAddress}>`
        : params.account.emailAddress,
      toAddresses: params.input.to,
      ccAddresses: params.input.cc ?? Prisma.JsonNull,
      bccAddresses: params.input.bcc ?? Prisma.JsonNull,
      threadId: params.threadId ?? null,
      messageId: params.rawMessageId ?? params.providerMessageId,
      externalId: params.providerMessageId,
      authorId: params.input.authorId,
      sentAt: new Date(),
    },
  })

  await prisma.activity.create({
    data: {
      companyId: params.account.companyId,
      contactId: params.input.contactId,
      type: 'EMAIL_SENT',
      subject: `Email sent: ${params.input.subject}`,
      description: stripHtml(params.input.html) ?? params.input.text ?? null,
      metadata: {
        accountId: params.account.id,
        provider: params.account.provider,
        messageId: record.id,
      },
      userId: params.input.authorId,
    },
  })

  return record
}

export async function sendContactEmail(input: SendContactEmailInput) {
  const account = await prisma.emailAccount.findFirst({
    where: { id: input.accountId, companyId: input.companyId, deauthorizedAt: null },
  })

  if (!account) {
    throw new Error('Email account not found for this workspace')
  }

  const hydratedAccount = await ensureFreshAccount(account)

  if (!hydratedAccount.accessToken) {
    throw new Error('Email account is missing access token')
  }

  const fromAddress = hydratedAccount.displayName
    ? `${hydratedAccount.displayName} <${hydratedAccount.emailAddress}>`
    : hydratedAccount.emailAddress

  const attachments = input.attachments ?? []

  if (hydratedAccount.provider === 'gmail') {
    const raw = await buildMimeMessage({
      from: fromAddress,
      to: input.to.map(formatAddress),
      cc: input.cc?.map(formatAddress),
      bcc: input.bcc?.map(formatAddress),
      subject: input.subject,
      html: input.html,
      text: input.text,
      inReplyTo: input.replyToMessageId,
      references: input.replyToMessageId ? [input.replyToMessageId] : undefined,
      attachments: attachments.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.buffer,
        contentType: attachment.contentType,
      })),
    })

    const response = await sendGmailMessage({ accessToken: hydratedAccount.accessToken, raw })
    const headers = response.payload?.headers as GmailHeader[] | undefined
    const messageIdHeader = headers?.find((header) => header.name === 'Message-ID')
    const record = await storeOutboundEmailRecord({
      account: hydratedAccount,
      input,
      direction: 'OUTBOUND',
      providerMessageId: response.id as string,
      threadId: response.threadId,
      rawMessageId: messageIdHeader?.value ?? null,
    })

    if (attachments.length) {
      await persistAttachmentRows({ attachments, account: hydratedAccount, contactId: input.contactId, emailId: record.id })
    }

    return record
  }

  const outlookAttachments: OutlookAttachment[] = attachments.map((attachment) => ({
    '@odata.type': '#microsoft.graph.fileAttachment',
    name: attachment.filename,
    contentType: attachment.contentType,
    contentBytes: attachment.buffer.toString('base64'),
  }))

  await sendOutlookMessage({
    accessToken: hydratedAccount.accessToken,
    subject: input.subject,
    htmlBody: input.html,
    textBody: input.text,
    to: input.to.map(toOutlookRecipient),
    cc: input.cc?.map(toOutlookRecipient),
    bcc: input.bcc?.map(toOutlookRecipient),
    attachments: outlookAttachments,
    replyToId: input.replyToMessageId,
  })

  const generatedMessageId = crypto.randomUUID()
  const record = await storeOutboundEmailRecord({
    account: hydratedAccount,
    input,
    direction: 'OUTBOUND',
    providerMessageId: generatedMessageId,
    threadId: null,
    rawMessageId: generatedMessageId,
  })

  if (attachments.length) {
    await persistAttachmentRows({ attachments, account: hydratedAccount, contactId: input.contactId, emailId: record.id })
  }

  return record
}

async function persistAttachmentRows(params: {
  attachments: Array<{ filename: string; contentType: string; buffer: Buffer }>
  account: EmailAccount
  contactId: string
  emailId: string
}) {
  await Promise.all(
    params.attachments.map(async (attachment) => {
      const upload = await saveEmailAttachment({
        companyId: params.account.companyId,
        contactId: params.contactId,
        filename: attachment.filename,
        contentType: attachment.contentType,
        buffer: attachment.buffer,
      })

      await prisma.emailAttachment.create({
        data: {
          companyId: params.account.companyId,
          contactId: params.contactId,
          emailId: params.emailId,
          accountId: params.account.id,
          fileName: attachment.filename,
          mimeType: attachment.contentType,
          size: upload.size,
          storageKey: upload.key,
          checksum: upload.hash,
        },
      })
    })
  )
}

import { subDays } from 'date-fns'
import { simpleParser, AddressObject } from 'mailparser'
import type { EmailAccount, EmailDirection } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { needsAccessTokenRefresh, refreshAccountAccessToken } from '@/lib/email/accounts'
import { getGmailMessage, listGmailMessages } from '@/lib/email/providers/gmail'
import { getOutlookMessage, listOutlookMessages } from '@/lib/email/providers/outlook'
import { saveEmailAttachment } from '@/lib/email/storage'

const MAX_MESSAGES_PER_RUN = 20
const LOOKBACK_DAYS = 7

type SimpleAddress = {
  address: string | null
  name?: string | null
}

type ParserAttachment = {
  filename?: string
  contentType?: string
  content?: Buffer | Uint8Array | string
  size?: number
}

export async function ingestRecentEmailsForAccount(accountId: string) {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  if (!account) {
    throw new Error('Email account not found')
  }

  const hydratedAccount = await ensureFreshAccount(account)
  if (!hydratedAccount.accessToken) {
    throw new Error('Email account token missing')
  }

  if (hydratedAccount.provider === 'gmail') {
    await ingestGmailAccount(hydratedAccount)
  } else {
    await ingestOutlookAccount(hydratedAccount)
  }
}

async function ingestGmailAccount(account: EmailAccount) {
  const since = `newer_than:${LOOKBACK_DAYS}d`
  const response = await listGmailMessages({
    accessToken: account.accessToken!,
    maxResults: MAX_MESSAGES_PER_RUN,
    q: since,
  })

  const ids = response.messages?.map((message) => message.id) ?? []
  if (!ids.length) return

  const existing = await prisma.email.findMany({
    where: { accountId: account.id, externalId: { in: ids } },
    select: { externalId: true },
  })
  const existingSet = new Set(existing.map((item) => item.externalId))

  for (const id of ids) {
    if (!id || existingSet.has(id)) {
      continue
    }

    const detail = await getGmailMessage({ accessToken: account.accessToken!, id, format: 'raw' })
    const rawData = detail.raw ? decodeBase64Url(detail.raw) : null
    if (!rawData) continue

    const parsed = await simpleParser(rawData)
    const messageId = parsed.messageId ?? id
    const fromAddress = parsed.from?.value?.[0]
    const recipient = parsed.to?.value?.[0]

    if (!fromAddress || !recipient) {
      continue
    }

    const direction: EmailDirection = fromAddress.address?.toLowerCase() === account.emailAddress ? 'OUTBOUND' : 'INBOUND'
    const counterparty = direction === 'INBOUND' ? fromAddress : recipient
    const contact = await findContactForEmail(account.companyId, counterparty.address ?? '')
    if (!contact) {
      continue
    }

    const toAddresses = serializeAddressList(parsed.to?.value)
    const ccAddresses = serializeAddressList(parsed.cc?.value)
    const bccAddresses = serializeAddressList(parsed.bcc?.value)
    const htmlBody = typeof parsed.html === 'string' ? parsed.html : null
    const snippet = buildSnippet(parsed.text ?? null, htmlBody)

    const emailRecord = await prisma.email.create({
      data: {
        companyId: account.companyId,
        contactId: contact.id,
        accountId: account.id,
        provider: account.provider,
        direction,
        subject: parsed.subject ?? '(no subject)',
        snippet,
        bodyHtml: htmlBody,
        bodyText: parsed.text ?? null,
        fromAddress: formatAddressDisplay(fromAddress) ?? '',
        replyToAddress: parsed.replyTo?.value?.[0]?.address?.toLowerCase() ?? null,
        toAddresses: toAddresses.length ? toAddresses : [],
        ccAddresses: ccAddresses.length ? ccAddresses : null,
        bccAddresses: bccAddresses.length ? bccAddresses : null,
        threadId: detail.threadId ?? null,
        messageId,
        externalId: id,
        sentAt: parsed.date ?? new Date(),
        receivedAt: parsed.date ?? new Date(),
      },
    })

    await persistInboundAttachments(parsed.attachments ?? [], account, contact.id, emailRecord.id)

    if (direction === 'INBOUND') {
      await prisma.activity.create({
        data: {
          companyId: account.companyId,
          contactId: contact.id,
          type: 'EMAIL_RECEIVED',
          subject: `Email: ${parsed.subject ?? '(no subject)'}`,
          description: snippet,
          metadata: { accountId: account.id, provider: account.provider, emailId: emailRecord.id },
        },
      })
    }
  }
}

async function ingestOutlookAccount(account: EmailAccount) {
  const since = subDays(new Date(), LOOKBACK_DAYS).toISOString()
  const response = await listOutlookMessages({
    accessToken: account.accessToken!,
    top: MAX_MESSAGES_PER_RUN,
    filter: `receivedDateTime ge ${since}`,
    select: ['id', 'internetMessageId'],
    orderby: 'receivedDateTime desc',
  })

  const messages = response.value ?? []
  const ids = messages.map((message: any) => message.id)
  if (!ids.length) return

  const existing = await prisma.email.findMany({
    where: { accountId: account.id, externalId: { in: ids } },
    select: { externalId: true },
  })
  const existingSet = new Set(existing.map((item) => item.externalId))

  for (const message of messages) {
    if (existingSet.has(message.id)) continue

    const detail = await getOutlookMessage({ accessToken: account.accessToken!, id: message.id, expandAttachments: true })
    const fromAddress = detail.from?.emailAddress
    const recipient = detail.toRecipients?.[0]?.emailAddress

    if (!fromAddress || !recipient) {
      continue
    }

    const direction: EmailDirection = fromAddress.address?.toLowerCase() === account.emailAddress ? 'OUTBOUND' : 'INBOUND'
    const counterparty = direction === 'INBOUND' ? fromAddress : recipient
    const contact = await findContactForEmail(account.companyId, counterparty.address ?? '')
    if (!contact) {
      continue
    }

    const toAddresses = serializeOutlookRecipients(detail.toRecipients)
    const ccAddresses = serializeOutlookRecipients(detail.ccRecipients)
    const bccAddresses = serializeOutlookRecipients(detail.bccRecipients)
    const bodyType = detail.body?.contentType?.toLowerCase()
    const preview = detail.bodyPreview ? detail.bodyPreview.slice(0, 240) : null
    const snippet =
      preview ??
      buildSnippet(bodyType === 'text' ? detail.body?.content ?? null : null, bodyType === 'html' ? detail.body?.content ?? null : null)

    const emailRecord = await prisma.email.create({
      data: {
        companyId: account.companyId,
        contactId: contact.id,
        accountId: account.id,
        provider: account.provider,
        direction,
        subject: detail.subject ?? '(no subject)',
        snippet,
        bodyHtml: bodyType === 'html' ? detail.body?.content ?? null : null,
        bodyText: bodyType === 'text' ? detail.body?.content ?? null : null,
        fromAddress: formatAddressDisplay(fromAddress) ?? '',
        replyToAddress: detail.replyTo?.[0]?.emailAddress?.address?.toLowerCase() ?? null,
        toAddresses: toAddresses.length ? toAddresses : [],
        ccAddresses: ccAddresses.length ? ccAddresses : null,
        bccAddresses: bccAddresses.length ? bccAddresses : null,
        threadId: detail.conversationId ?? null,
        messageId: detail.internetMessageId ?? message.id,
        externalId: message.id,
        sentAt: detail.sentDateTime ? new Date(detail.sentDateTime) : new Date(),
        receivedAt: detail.receivedDateTime ? new Date(detail.receivedDateTime) : new Date(),
      },
    })

    const attachments = detail.attachments ?? []
    await persistGraphAttachments(attachments, account, contact.id, emailRecord.id)

    if (direction === 'INBOUND') {
      await prisma.activity.create({
        data: {
          companyId: account.companyId,
          contactId: contact.id,
          type: 'EMAIL_RECEIVED',
          subject: `Email: ${detail.subject ?? '(no subject)'}`,
          description: snippet,
          metadata: { accountId: account.id, provider: account.provider, emailId: emailRecord.id },
        },
      })
    }
  }
}

async function ensureFreshAccount(account: EmailAccount) {
  if (needsAccessTokenRefresh(account)) {
    return refreshAccountAccessToken(account)
  }
  return account
}

async function findContactForEmail(companyId: string, email: string) {
  if (!email) return null
  const normalized = email.trim().toLowerCase()
  return prisma.contact.findFirst({ where: { companyId, email: normalized }, select: { id: true } })
}

async function persistInboundAttachments(
  attachments: ParserAttachment[],
  account: EmailAccount,
  contactId: string,
  emailId: string
) {
  if (!attachments.length) return

  await Promise.all(
    attachments.map(async (attachment) => {
      const buffer = bufferFromAttachment(attachment.content)
      if (!buffer || !attachment.filename) {
        return
      }

      const upload = await saveEmailAttachment({
        companyId: account.companyId,
        contactId,
        filename: attachment.filename,
        contentType: attachment.contentType ?? 'application/octet-stream',
        buffer,
      })

      await prisma.emailAttachment.create({
        data: {
          companyId: account.companyId,
          contactId,
          emailId,
          accountId: account.id,
          fileName: attachment.filename,
          mimeType: attachment.contentType ?? 'application/octet-stream',
          size: attachment.size ?? buffer.length,
          storageKey: upload.key,
          checksum: upload.hash,
        },
      })
    })
  )
}

async function persistGraphAttachments(
  attachments: any[],
  account: EmailAccount,
  contactId: string,
  emailId: string
) {
  if (!attachments.length) return

  await Promise.all(
    attachments
      .filter((attachment) => attachment['@odata.type'] === '#microsoft.graph.fileAttachment' && attachment.contentBytes)
      .map(async (attachment) => {
        const buffer = Buffer.from(attachment.contentBytes, 'base64')
        const upload = await saveEmailAttachment({
          companyId: account.companyId,
          contactId,
          filename: attachment.name,
          contentType: attachment.contentType ?? 'application/octet-stream',
          buffer,
        })

        await prisma.emailAttachment.create({
          data: {
            companyId: account.companyId,
            contactId,
            emailId,
            accountId: account.id,
            fileName: attachment.name,
            mimeType: attachment.contentType ?? 'application/octet-stream',
            size: attachment.size ?? buffer.length,
            storageKey: upload.key,
            checksum: upload.hash,
          },
        })
      })
  )
}

function decodeBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4
  const padded = padding ? normalized + '='.repeat(4 - padding) : normalized
  return Buffer.from(padded, 'base64')
}

function buildSnippet(text: string | null, html: string | null): string | null {
  if (text) {
    return text.slice(0, 240)
  }
  if (html) {
    return stripHtml(html).slice(0, 240)
  }
  return null
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function serializeAddressList(addresses?: AddressObject[] | null): SimpleAddress[] {
  if (!addresses?.length) return []
  const results: SimpleAddress[] = []
  for (const entry of addresses) {
    if (entry.address) {
      results.push({ address: entry.address.toLowerCase(), name: entry.name ?? null })
    }
    if (entry.group?.length) {
      results.push(...serializeAddressList(entry.group as AddressObject[]))
    }
  }
  return results
}

function serializeOutlookRecipients(
  recipients?: Array<{ emailAddress?: { address?: string; name?: string } }>
): SimpleAddress[] {
  if (!recipients?.length) return []
  const results: SimpleAddress[] = []
  for (const recipient of recipients) {
    const email = recipient.emailAddress?.address
    if (email) {
      results.push({ address: email.toLowerCase(), name: recipient.emailAddress?.name ?? null })
    }
  }
  return results
}

function formatAddressDisplay(address?: { address?: string | null; name?: string | null }) {
  if (!address?.address) {
    return address?.name ?? null
  }
  if (address.name) {
    return `${address.name} <${address.address}>`
  }
  return address.address
}

function bufferFromAttachment(content?: Buffer | Uint8Array | string) {
  if (!content) return null
  if (Buffer.isBuffer(content)) return content
  if (content instanceof Uint8Array) {
    return Buffer.from(content)
  }
  return Buffer.from(content)
}

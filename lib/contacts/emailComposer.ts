import type { EmailProvider, EmailTemplateScope } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type ContactEmailComposerData = {
  accounts: Array<{
    id: string
    provider: EmailProvider
    emailAddress: string
    displayName: string | null
    label: string | null
    syncStatus: string
    isPrimary: boolean
  }>
  templates: Array<{
    id: string
    name: string
    subject: string
    body: string
    scope: EmailTemplateScope
    isDefault: boolean
  }>
  signature: { id: string; name: string; content: string } | null
  suppressedRecipient: { email: string; reason: string | null } | null
}

export async function loadContactEmailComposerData(params: {
  companyId: string
  userId: string
  contactEmail: string | null
}): Promise<ContactEmailComposerData> {
  const normalizedEmail = params.contactEmail?.toLowerCase() ?? null

  const [accounts, templates, signature, preference] = await Promise.all([
    prisma.emailAccount.findMany({
      where: { companyId: params.companyId, userId: params.userId, deauthorizedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        provider: true,
        emailAddress: true,
        displayName: true,
        label: true,
        syncStatus: true,
        isPrimary: true,
      },
    }),
    prisma.emailTemplate.findMany({
      where: { companyId: params.companyId, scope: { in: ['crm', 'global'] } },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      select: { id: true, name: true, subject: true, body: true, scope: true, isDefault: true },
    }),
    prisma.emailSignature.findFirst({
      where: { companyId: params.companyId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, content: true },
    }),
    normalizedEmail
      ? prisma.emailRecipientPreference.findUnique({
          where: { companyId_email: { companyId: params.companyId, email: normalizedEmail } },
          select: { email: true, sendEnabled: true, reason: true },
        })
      : null,
  ])

  return {
    accounts,
    templates,
    signature,
    suppressedRecipient: preference && !preference.sendEnabled ? { email: preference.email, reason: preference.reason } : null,
  }
}

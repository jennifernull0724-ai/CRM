import type { EmailProvider, EmailTemplateScope } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const TEMPLATE_SCOPES: EmailTemplateScope[] = ['dispatch', 'work_orders', 'global']

export type DispatchEmailComposerData = {
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
  userRecipients: Array<{ id: string; name: string; email: string; role: string }>
}

export async function loadDispatchEmailComposerData(companyId: string): Promise<DispatchEmailComposerData> {
  const [accounts, templates, signature, users] = await Promise.all([
    prisma.emailAccount.findMany({
      where: { companyId, deauthorizedAt: null },
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
      where: { companyId, scope: { in: TEMPLATE_SCOPES } },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        subject: true,
        body: true,
        scope: true,
        isDefault: true,
      },
    }),
    prisma.emailSignature.findFirst({
      where: { companyId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, content: true },
    }),
    prisma.user.findMany({
      where: { companyId, disabled: false },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, email: true, role: true },
    }),
  ])

  const userRecipients = users
    .filter((user) => Boolean(user.email))
    .map((user) => ({ id: user.id, name: user.name, email: user.email!.toLowerCase(), role: user.role }))

  return {
    accounts,
    templates,
    signature,
    userRecipients,
  }
}

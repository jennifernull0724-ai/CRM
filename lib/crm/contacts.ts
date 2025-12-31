import type { ContactActivityState } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export type CrmContactRow = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  companyLabel: string
  status: ContactActivityState
  updatedAt: Date
  lastActivityAt: Date | null
  ownerName: string
}

export async function getCrmContacts(companyId: string): Promise<CrmContactRow[]> {
  const contacts = await prisma.contact.findMany({
    where: {
      companyId,
      archived: false,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      mobile: true,
      companyOverrideName: true,
      derivedCompanyName: true,
      activityState: true,
      updatedAt: true,
      lastActivityAt: true,
      owner: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })

  return contacts.map((contact) => ({
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone ?? contact.mobile,
    companyLabel: contact.companyOverrideName ?? contact.derivedCompanyName ?? '—',
    status: contact.activityState,
    updatedAt: contact.updatedAt,
    lastActivityAt: contact.lastActivityAt,
    ownerName: contact.owner.name ?? 'Unassigned',
  }))
}

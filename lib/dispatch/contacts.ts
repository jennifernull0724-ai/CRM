import { prisma } from '@/lib/prisma'

export type DispatchContactOption = {
  id: string
  name: string
  email: string | null
  company: string | null
}

export async function listDispatchContactOptions(companyId: string, limit = 50): Promise<DispatchContactOption[]> {
  const contacts = await prisma.contact.findMany({
    where: { companyId, archived: false },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      companyOverrideName: true,
      derivedCompanyName: true,
    },
  })

  return contacts.map((contact) => ({
    id: contact.id,
    name: `${contact.firstName} ${contact.lastName}`.trim(),
    email: contact.email,
    company: contact.companyOverrideName ?? contact.derivedCompanyName ?? null,
  }))
}

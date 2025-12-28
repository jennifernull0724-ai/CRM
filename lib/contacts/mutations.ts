import { Prisma, type Contact, type ContactActivityState } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { deriveCompanyNameFromEmail } from '@/lib/contacts/deriveCompany'

export type CreateContactDraft = {
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  mobile?: string | null
  jobTitle?: string | null
  companyLabel?: string | null
}

export type UpdateContactDraft = {
  firstName?: string
  lastName?: string
  phone?: string | null
  mobile?: string | null
  jobTitle?: string | null
  ownerId?: string | null
}

type ContactContext = {
  companyId: string
  actorId: string
  ownerId?: string | null
  source?: string
}

type ContactWithOwner = Prisma.ContactGetPayload<{
  include: {
    owner: { select: { id: true; name: true; email: true } }
  }
}>

function normalizeNullable(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function sanitizePhone(value?: string | null) {
  if (!value) return null
  const digits = value.replace(/[^0-9+]/g, '')
  return digits || null
}

export async function createContactRecord(draft: CreateContactDraft, context: ContactContext): Promise<ContactWithOwner> {
  const email = normalizeEmail(draft.email)
  const companyOverrideName = normalizeNullable(draft.companyLabel)
  const ownerId = context.ownerId ?? context.actorId

  const existing = await prisma.contact.findFirst({
    where: {
      companyId: context.companyId,
      email,
    },
  })

  if (existing) {
    throw new Error('Contact with this email already exists in this workspace')
  }

  const derivedCompanyName = deriveCompanyNameFromEmail(email)
  const contact = await prisma.contact.create({
    data: {
      companyId: context.companyId,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      email,
      phone: sanitizePhone(draft.phone),
      mobile: sanitizePhone(draft.mobile),
      jobTitle: normalizeNullable(draft.jobTitle),
      derivedCompanyName,
      companyOverrideName,
      ownerId,
      createdById: context.actorId,
      lastActivityAt: new Date(),
      activityState: 'NEW' as ContactActivityState,
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  })

  await prisma.activity.create({
    data: {
      companyId: context.companyId,
      type: 'CONTACT_CREATED',
      subject: `Contact created: ${contact.firstName} ${contact.lastName}`,
      description: context.source ? `Source: ${context.source}` : null,
      contactId: contact.id,
      userId: context.actorId,
    },
  })

  await prisma.accessAuditLog.create({
    data: {
      companyId: context.companyId,
      actorId: context.actorId,
      action: 'CONTACT_CREATED',
      metadata: {
        contactId: contact.id,
        email: contact.email,
        ownerId,
        source: context.source ?? 'unspecified',
      },
    },
  })

  return contact
}

export async function updateContactRecord(
  contactId: string,
  companyId: string,
  actorId: string,
  draft: UpdateContactDraft
): Promise<Contact> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, companyId },
  })

  if (!contact) {
    throw new Error('Contact not found in this workspace')
  }

  const updates: Prisma.ContactUpdateInput = {}

  if (draft.firstName !== undefined) {
    updates.firstName = draft.firstName.trim()
  }
  if (draft.lastName !== undefined) {
    updates.lastName = draft.lastName.trim()
  }
  if (draft.phone !== undefined) {
    updates.phone = sanitizePhone(draft.phone)
  }
  if (draft.mobile !== undefined) {
    updates.mobile = sanitizePhone(draft.mobile)
  }
  if (draft.jobTitle !== undefined) {
    updates.jobTitle = normalizeNullable(draft.jobTitle)
  }

  if (draft.ownerId) {
    const owner = await prisma.user.findFirst({ where: { id: draft.ownerId, companyId } })
    if (!owner) {
      throw new Error('Owner not found in this workspace')
    }
    updates.owner = { connect: { id: owner.id } }
  }

  const updated = await prisma.contact.update({
    where: { id: contact.id },
    data: {
      ...updates,
      lastActivityAt: new Date(),
      activityState: 'ACTIVE' as ContactActivityState,
    },
  })

  await prisma.activity.create({
    data: {
      companyId,
      type: 'CONTACT_UPDATED',
      subject: `Contact updated: ${updated.firstName} ${updated.lastName}`,
      contactId: updated.id,
      userId: actorId,
    },
  })

  await prisma.accessAuditLog.create({
    data: {
      companyId,
      actorId,
      action: 'CONTACT_UPDATED',
      metadata: {
        contactId: updated.id,
      },
    },
  })

  return updated
}

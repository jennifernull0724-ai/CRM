'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createContactRecord } from '@/lib/contacts/mutations'

async function requireOwnerOrAdmin() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    throw new Error('Unauthorized')
  }

  const normalizedRole = session.user.role?.toLowerCase()
  if (!['owner', 'admin'].includes(normalizedRole)) {
    throw new Error('Insufficient role')
  }

  return { companyId: session.user.companyId, userId: session.user.id, role: normalizedRole }
}

async function linkEmailToContact(emailId: string, contactId: string, companyId: string, actorId: string) {
  const email = await prisma.email.findFirst({ where: { id: emailId, companyId } })
  if (!email) {
    throw new Error('Email not found')
  }

  if (email.direction !== 'INBOUND') {
    throw new Error('Only inbound emails can be resolved')
  }

  if (!email.requiresContactResolution) {
    throw new Error('Email already linked')
  }

  await prisma.$transaction(async (tx) => {
    await tx.email.update({
      where: { id: emailId },
      data: { contactId, requiresContactResolution: false },
    })

    await tx.emailAttachment.updateMany({ where: { emailId }, data: { contactId } })

    await tx.activity.create({
      data: {
        companyId,
        contactId,
        type: 'EMAIL_LINKED_TO_CONTACT',
        subject: `Email: ${email.subject}`,
        description: email.snippet,
        metadata: { emailId },
        userId: actorId,
      },
    })

    await tx.accessAuditLog.create({
      data: {
        companyId,
        actorId,
        action: 'EMAIL_LINKED_TO_CONTACT',
        metadata: { emailId, contactId, from: email.fromAddress },
      },
    })
  })
}

export async function linkEmailToContactAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  const emailId = formData.get('emailId')?.toString() ?? ''
  const contactId = formData.get('contactId')?.toString() ?? ''

  if (!emailId || !contactId) {
    throw new Error('Email and contact are required')
  }

  await linkEmailToContact(emailId, contactId, companyId, userId)
  revalidatePath('/dashboard/admin/inbound-emails')
}

export async function createContactAndLinkAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()
  const emailId = formData.get('emailId')?.toString() ?? ''
  const firstName = formData.get('firstName')?.toString().trim()
  const lastName = formData.get('lastName')?.toString().trim()
  const email = formData.get('contactEmail')?.toString().trim().toLowerCase()
  const ownerId = formData.get('ownerId')?.toString().trim() || undefined

  if (!emailId || !firstName || !lastName || !email) {
    throw new Error('First name, last name, email, and emailId are required')
  }

  const contact = await createContactRecord(
    { firstName, lastName, email, jobTitle: null, mobile: null, phone: null, companyLabel: null },
    { companyId, actorId: userId, ownerId }
  )

  await linkEmailToContact(emailId, contact.id, companyId, userId)
  revalidatePath('/dashboard/admin/inbound-emails')
}

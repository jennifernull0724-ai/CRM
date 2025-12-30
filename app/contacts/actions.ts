"use server"
import { randomUUID } from 'crypto'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import {
	Prisma,
	AccessAuditAction,
	ContactActivityState,
	ContactCallDirection,
	ContactMeetingType,
	ContactSocialPlatform,
} from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createContactRecord, updateContactRecord } from '@/lib/contacts/mutations'
import { revalidateContactSurfaces } from '@/lib/contacts/cache'
import { sendMentionNotification } from '@/lib/email'
import { sanitizeNoteBody } from '@/lib/contacts/noteRichText'
import { sendContactEmail } from '@/lib/email/service'
import { normalizeRecipientList } from '@/lib/email/recipients'

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024
const MAX_ATTACHMENT_COUNT = 5

export type ActionState = { success: boolean; message?: string; contactId?: string; resetToken?: string }

type WorkspaceContext = {
	userId: string
	companyId: string
	role: string
	name: string
}

type ContactScope = {
	id: string
	companyId: string
	firstName: string
	lastName: string
	email: string
}

async function requireWorkspaceContext(): Promise<WorkspaceContext> {
	const session = await getServerSession(authOptions)
	if (!session?.user?.companyId) {
		throw new Error('Unauthorized')
	}
	return {
		userId: session.user.id,
		companyId: session.user.companyId,
		role: session.user.role.toLowerCase(),
		name: session.user.name ?? 'Workspace user',
	}
}

async function ensureContactScope(contactId: string, companyId: string): Promise<ContactScope> {
	const contact = await prisma.contact.findFirst({
		where: { id: contactId, companyId },
		select: { id: true, companyId: true, firstName: true, lastName: true, email: true },
	})

	if (!contact) {
		throw new Error('Contact not found in this workspace')
	}

	return contact
}

async function touchContactActivity(contactId: string, state: ContactActivityState = 'ACTIVE') {
	await prisma.contact.update({
		where: { id: contactId },
		data: { lastActivityAt: new Date(), activityState: state },
	})
}

async function logActivity(params: {
	companyId: string
	contactId: string
	userId: string
	type: string
	subject: string
	description?: string | null
	metadata?: Prisma.InputJsonValue
}) {
	await prisma.activity.create({
		data: {
			companyId: params.companyId,
			contactId: params.contactId,
			type: params.type,
			subject: params.subject,
			description: params.description ?? null,
			metadata: params.metadata ?? Prisma.JsonNull,
			userId: params.userId,
		},
	})
}

async function logAuditEvent(params: {
	companyId: string
	actorId: string
	action: AccessAuditAction
	metadata?: Prisma.InputJsonValue
	targetUserId?: string
}) {
	await prisma.accessAuditLog.create({
		data: {
			companyId: params.companyId,
			actorId: params.actorId,
			targetUserId: params.targetUserId,
			action: params.action,
			metadata: params.metadata ?? Prisma.JsonNull,
		},
	})
}

function resolveFormData(stateOrFormData: ActionState | FormData, maybeFormData?: FormData) {
	if (maybeFormData) {
		return maybeFormData
	}
	if (stateOrFormData instanceof FormData) {
		return stateOrFormData
	}
	throw new Error('Invalid form payload')
}

const createContactSchema = z.object({
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	email: z.string().email(),
	phone: z.string().optional(),
	mobile: z.string().optional(),
	jobTitle: z.string().optional(),
	companyLabel: z.string().optional(),
	source: z.string().optional(),
})

export async function createContactAction(prev: ActionState, formData: FormData): Promise<ActionState> {
	try {
		const { userId, companyId } = await requireWorkspaceContext()
		const payload = createContactSchema.parse({
			firstName: formData.get('firstName')?.toString(),
			lastName: formData.get('lastName')?.toString(),
			email: formData.get('email')?.toString(),
			phone: formData.get('phone')?.toString() ?? undefined,
			mobile: formData.get('mobile')?.toString() ?? undefined,
			jobTitle: formData.get('jobTitle')?.toString() ?? undefined,
			companyLabel: formData.get('companyLabel')?.toString() ?? undefined,
			source: formData.get('source')?.toString() ?? undefined,
		})

		const contact = await createContactRecord(payload, {
			companyId,
			actorId: userId,
			source: payload.source ?? 'contacts:index',
		})

		revalidateContactSurfaces(contact.id)

		return { success: true, contactId: contact.id, resetToken: randomUUID() }
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to create contact'
		return { success: false, message, resetToken: prev.resetToken }
	}
}

const updateContactSchema = z.object({
	contactId: z.string().min(1),
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	phone: z.string().optional(),
	mobile: z.string().optional(),
	jobTitle: z.string().optional(),
	ownerId: z.string().optional(),
})

export async function updateContactOverviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
	try {
		const { userId, companyId, role } = await requireWorkspaceContext()
		const data = updateContactSchema.parse({
			contactId: formData.get('contactId')?.toString(),
			firstName: formData.get('firstName')?.toString(),
			lastName: formData.get('lastName')?.toString(),
			phone: formData.get('phone')?.toString() ?? undefined,
			mobile: formData.get('mobile')?.toString() ?? undefined,
			jobTitle: formData.get('jobTitle')?.toString() ?? undefined,
			ownerId: formData.get('ownerId')?.toString() ?? undefined,
		})

		const contact = await prisma.contact.findFirst({ where: { id: data.contactId, companyId } })
		if (!contact) {
			throw new Error('Contact not found')
		}

		const isOwner = contact.ownerId === userId
		const isAdmin = role === 'admin' || role === 'owner'

		if (!isOwner && !isAdmin) {
			throw new Error('You do not have permission to edit this contact')
		}

		if (data.ownerId && !isAdmin) {
			throw new Error('Only admins or owners can reassign ownership')
		}

		await updateContactRecord(data.contactId, companyId, userId, {
			firstName: data.firstName,
			lastName: data.lastName,
			phone: data.phone,
			mobile: data.mobile,
			jobTitle: data.jobTitle,
			ownerId: data.ownerId,
		})

		revalidateContactSurfaces(data.contactId)

		return { success: true, contactId: data.contactId }
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to update contact'
		return { success: false, message }
	}
}

const createTaskSchema = z.object({
	title: z.string().min(1),
	dueDate: z.string().optional(),
	priority: z.enum(['low', 'medium', 'high']).default('medium'),
	ownerId: z.string().optional(),
	notes: z.string().optional(),
})

const updateTaskSchema = z.object({
	title: z.string().min(1),
	dueDate: z.string().optional(),
	priority: z.enum(['low', 'medium', 'high']).default('medium'),
	ownerId: z.string().optional(),
	notes: z.string().optional(),
})

async function ensureTaskScope(taskId: string, contactId: string, companyId: string) {
	const task = await prisma.task.findFirst({
		where: { id: taskId, contactId },
		include: { contact: { select: { id: true, companyId: true, firstName: true, lastName: true } } },
	})

	if (!task || task.contact.companyId !== companyId) {
		throw new Error('Task not found in this workspace')
	}

	return task
}

export async function createContactTaskAction(
	contactId: string,
	stateOrFormData: ActionState | FormData,
	maybeFormData?: FormData
): Promise<ActionState> {
	try {
		const formData = resolveFormData(stateOrFormData, maybeFormData)
		const { userId, companyId } = await requireWorkspaceContext()
		const contact = await ensureContactScope(contactId, companyId)
		const data = createTaskSchema.parse({
			title: formData.get('title')?.toString(),
			dueDate: formData.get('dueDate')?.toString() ?? undefined,
			priority: formData.get('priority')?.toString() ?? 'medium',
			ownerId: formData.get('ownerId')?.toString() ?? undefined,
			notes: formData.get('notes')?.toString() ?? undefined,
		})

		const ownerId = data.ownerId ?? userId
		if (data.ownerId) {
			const owner = await prisma.user.findFirst({ where: { id: data.ownerId, companyId } })
			if (!owner) {
				throw new Error('Owner not found in this workspace')
			}
		}

		const dueDate = data.dueDate ? new Date(data.dueDate) : null
		const task = await prisma.task.create({
			data: {
				title: data.title,
				dueDate,
				priority: data.priority,
				notes: data.notes ?? null,
				contactId: contact.id,
				assignedToId: ownerId,
				description: data.notes ?? null,
			},
		})

		await touchContactActivity(contact.id)
		await logActivity({
			companyId,
			contactId: contact.id,
			userId,
			type: 'TASK_CREATED',
			subject: `Task created: ${data.title}`,
			description: data.notes?.slice(0, 140) ?? null,
			metadata: { taskId: task.id, dueDate: dueDate?.toISOString() ?? null },
		})
		await logAuditEvent({
			companyId,
			actorId: userId,
			action: 'TASK_CREATED',
			metadata: { contactId: contact.id, taskId: task.id },
		})

		revalidateContactSurfaces(contact.id)

		return { success: true, contactId: contact.id, resetToken: randomUUID() }
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to create task'
		return { success: false, message }
	}
}

export async function updateContactTaskAction(
	contactId: string,
	taskId: string,
	stateOrFormData: ActionState | FormData,
	maybeFormData?: FormData
): Promise<ActionState> {
	try {
		const formData = resolveFormData(stateOrFormData, maybeFormData)
		const { userId, companyId } = await requireWorkspaceContext()
		await ensureContactScope(contactId, companyId)
		const task = await ensureTaskScope(taskId, contactId, companyId)
		const data = updateTaskSchema.parse({
			title: formData.get('title')?.toString(),
			dueDate: formData.get('dueDate')?.toString() ?? undefined,
			priority: formData.get('priority')?.toString() ?? 'medium',
			ownerId: formData.get('ownerId')?.toString() ?? undefined,
			notes: formData.get('notes')?.toString() ?? undefined,
		})

		if (data.ownerId) {
			const owner = await prisma.user.findFirst({ where: { id: data.ownerId, companyId } })
			if (!owner) {
				throw new Error('Owner not found in this workspace')
			}
		}

		const dueDate = data.dueDate ? new Date(data.dueDate) : null
		await prisma.task.update({
			where: { id: task.id },
			data: {
				title: data.title,
				dueDate,
				priority: data.priority,
				assignedToId: data.ownerId ?? task.assignedToId,
				notes: data.notes ?? null,
				description: data.notes ?? null,
			},
		})

		await touchContactActivity(contactId)
		await logActivity({
			companyId,
			contactId,
			userId,
			type: 'TASK_UPDATED',
			subject: `Task updated: ${data.title}`,
			metadata: { taskId, dueDate: dueDate?.toISOString() ?? null },
		})
		await logAuditEvent({
			companyId,
			actorId: userId,
			action: 'TASK_UPDATED',
			metadata: { contactId, taskId },
		})

		revalidateContactSurfaces(contactId)

		return { success: true, contactId }
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to update task'
		return { success: false, message }
	}
}

export async function completeContactTaskAction(
	contactId: string,
	taskId: string,
	stateOrFormData: ActionState | FormData,
	maybeFormData?: FormData
): Promise<ActionState> {
	try {
		resolveFormData(stateOrFormData, maybeFormData)
		const { userId, companyId } = await requireWorkspaceContext()
		const task = await ensureTaskScope(taskId, contactId, companyId)

		await prisma.task.update({
			where: { id: task.id },
			data: {
				completed: true,
				completedAt: new Date(),
			},
		})

		await touchContactActivity(contactId)
		await logActivity({
			companyId,
			contactId,
			userId,
			type: 'TASK_COMPLETED',
			subject: `Task completed: ${task.title}`,
			metadata: { taskId },
		})
		await logAuditEvent({
			companyId,
			actorId: userId,
			action: 'TASK_COMPLETED',
			metadata: { contactId, taskId },
		})

		revalidateContactSurfaces(contactId)

		return { success: true, contactId }
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to complete task'
		return { success: false, message }
	}
}

const noteSchema = z.object({
	body: z.string().min(1),
	mentions: z.array(z.string()).default([]),
})

export async function createContactNoteAction(
	contactId: string,
	prev: ActionState,
	formData: FormData
): Promise<ActionState> {
	try {
		const { userId, companyId, name } = await requireWorkspaceContext()
		const contact = await ensureContactScope(contactId, companyId)
		const mentionIds = Array.from(new Set(formData.getAll('mentionIds').map((id) => id.toString()).filter(Boolean)))
		const data = noteSchema.parse({
			body: formData.get('body')?.toString(),
			mentions: mentionIds,
		})

		const sanitized = sanitizeNoteBody(data.body)
		const note = await prisma.note.create({
			data: {
				content: sanitized,
				mentions: data.mentions.length ? JSON.stringify(data.mentions) : null,
				contactId: contact.id,
				createdById: userId,
			},
		})

		await touchContactActivity(contact.id)
		const plainText = sanitized.replace(/<[^>]*>/g, '')

		await logActivity({
			companyId,
			contactId: contact.id,
			userId,
			type: 'NOTE_ADDED',
			subject: 'Note added',
			description: plainText.slice(0, 140),
			metadata: { noteId: note.id },
		})
		await logAuditEvent({
			companyId,
			actorId: userId,
			action: 'NOTE_ADDED',
			metadata: { contactId: contact.id, noteId: note.id },
		})

		if (data.mentions.length) {
			const mentionUsers = await prisma.user.findMany({
				where: { id: { in: data.mentions }, companyId, disabled: false },
				select: { id: true, email: true, name: true },
			})

			const timelineLink = `${process.env.APP_URL ?? ''}/contacts/${contact.id}`
			await Promise.allSettled(
				mentionUsers.map(async (mentioned) => {
					await logAuditEvent({
						companyId,
						actorId: userId,
						targetUserId: mentioned.id,
						action: 'MENTION_CREATED',
						metadata: { contactId: contact.id, noteId: note.id },
					})

					if (mentioned.email) {
						await sendMentionNotification(
							mentioned.email,
							name,
							  plainText.slice(0, 280),
							timelineLink
						)
					}
				})
			)
		}

		revalidateContactSurfaces(contact.id)

		return { success: true, contactId: contact.id }
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to add note'
		return { success: false, message, resetToken: prev.resetToken }
	}
}

const callSchema = z.object({
	direction: z.nativeEnum(ContactCallDirection),
	result: z.string().min(1),
	duration: z.string().optional(),
	happenedAt: z.string().optional(),
	notes: z.string().optional(),
})

export async function logContactCallAction(
	contactId: string,
	stateOrFormData: ActionState | FormData,
	maybeFormData?: FormData
): Promise<ActionState> {
	try {
		const formData = resolveFormData(stateOrFormData, maybeFormData)
		const { userId, companyId } = await requireWorkspaceContext()
		const contact = await ensureContactScope(contactId, companyId)
		const data = callSchema.parse({
			direction: formData.get('direction')?.toString(),
			result: formData.get('result')?.toString(),
			duration: formData.get('duration')?.toString() ?? undefined,
			happenedAt: formData.get('happenedAt')?.toString() ?? undefined,
			notes: formData.get('notes')?.toString() ?? undefined,
		})

		const durationMinutes = data.duration ? parseInt(data.duration, 10) : null
		const happenedAt = data.happenedAt ? new Date(data.happenedAt) : new Date()

		const call = await prisma.contactCall.create({
			data: {
				companyId,
				contactId: contact.id,
				createdById: userId,
				direction: data.direction,
				result: data.result,
				durationMinutes,
				notes: data.notes ?? null,
				happenedAt,
			},
		})

		await touchContactActivity(contact.id)
		await logActivity({
			companyId,
			contactId: contact.id,
			userId,
			type: 'CALL_LOGGED',
			subject: `Call (${data.direction.toLowerCase()})`,
			description: data.result,
			metadata: { callId: call.id, durationMinutes },
		})
		await logAuditEvent({
			companyId,
			actorId: userId,
			action: 'CALL_LOGGED',
			metadata: { contactId: contact.id, callId: call.id },
		})

		revalidateContactSurfaces(contact.id)

		return { success: true, contactId: contact.id }
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to log call'
		return { success: false, message }
	}
}

const meetingSchema = z.object({
	meetingType: z.nativeEnum(ContactMeetingType),
	scheduledFor: z.string().optional(),
	duration: z.string().optional(),
	attendees: z.string().optional(),
	outcome: z.string().optional(),
	notes: z.string().optional(),
})

export async function logContactMeetingAction(
	contactId: string,
	stateOrFormData: ActionState | FormData,
	maybeFormData?: FormData
): Promise<ActionState> {
	try {
		const formData = resolveFormData(stateOrFormData, maybeFormData)
		const { userId, companyId } = await requireWorkspaceContext()
		const contact = await ensureContactScope(contactId, companyId)
		const data = meetingSchema.parse({
			meetingType: formData.get('meetingType')?.toString(),
			scheduledFor: formData.get('scheduledFor')?.toString() ?? undefined,
			duration: formData.get('duration')?.toString() ?? undefined,
			attendees: formData.get('attendees')?.toString() ?? undefined,
			outcome: formData.get('outcome')?.toString() ?? undefined,
			notes: formData.get('notes')?.toString() ?? undefined,
		})

		const scheduledFor = data.scheduledFor ? new Date(data.scheduledFor) : new Date()
		const durationMinutes = data.duration ? parseInt(data.duration, 10) : null
		const attendeeList = data.attendees
			? data.attendees
					.split(',')
					.map((item) => item.trim())
					.filter(Boolean)
			: []

		const meeting = await prisma.contactMeeting.create({
			data: {
				companyId,
				contactId: contact.id,
				createdById: userId,
				meetingType: data.meetingType,
				scheduledFor,
				durationMinutes,
				attendees: attendeeList.length ? attendeeList : Prisma.JsonNull,
				outcome: data.outcome ?? null,
				notes: data.notes ?? null,
			},
		})

		await touchContactActivity(contact.id)
		await logActivity({
			companyId,
			contactId: contact.id,
			userId,
			type: 'MEETING_LOGGED',
			subject: `${data.meetingType.toLowerCase()} meeting logged`,
			description: data.outcome ?? null,
			metadata: { meetingId: meeting.id },
		})
		await logAuditEvent({
			companyId,
			actorId: userId,
			action: 'MEETING_LOGGED',
			metadata: { contactId: contact.id, meetingId: meeting.id },
		})

		revalidateContactSurfaces(contact.id)

		return { success: true, contactId: contact.id }
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to log meeting'
		return { success: false, message }
	}
}

const socialSchema = z.object({
	platform: z.nativeEnum(ContactSocialPlatform),
	action: z.string().min(1),
	notes: z.string().optional(),
	occurredAt: z.string().optional(),
})

export async function logContactSocialAction(
	contactId: string,
	stateOrFormData: ActionState | FormData,
	maybeFormData?: FormData
): Promise<ActionState> {
	try {
		const formData = resolveFormData(stateOrFormData, maybeFormData)
		const { userId, companyId } = await requireWorkspaceContext()
		const contact = await ensureContactScope(contactId, companyId)
		const data = socialSchema.parse({
			platform: formData.get('platform')?.toString(),
			action: formData.get('action')?.toString(),
			notes: formData.get('notes')?.toString() ?? undefined,
			occurredAt: formData.get('occurredAt')?.toString() ?? undefined,
		})

		const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date()

		const social = await prisma.contactSocialTouch.create({
			data: {
				companyId,
				contactId: contact.id,
				createdById: userId,
				platform: data.platform,
				action: data.action,
				notes: data.notes ?? null,
				occurredAt,
			},
		})

		await touchContactActivity(contact.id)
		await logActivity({
			companyId,
			contactId: contact.id,
			userId,
			type: 'SOCIAL_LOGGED',
			subject: `${data.platform.toLowerCase()} touch`,
			description: data.action,
			metadata: { socialId: social.id },
		})
		await logAuditEvent({
			companyId,
			actorId: userId,
			action: 'SOCIAL_LOGGED',
			metadata: { contactId: contact.id, socialId: social.id },
		})

		revalidateContactSurfaces(contact.id)

		return { success: true, contactId: contact.id }
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to log social activity'
		return { success: false, message }
	}
}

const customActivitySchema = z.object({
	description: z.string().min(1),
	occurredAt: z.string().optional(),
	notes: z.string().optional(),
})

export async function logContactCustomActivityAction(
	contactId: string,
	stateOrFormData: ActionState | FormData,
	maybeFormData?: FormData
): Promise<ActionState> {
	try {
		const formData = resolveFormData(stateOrFormData, maybeFormData)
		const { userId, companyId } = await requireWorkspaceContext()
		const contact = await ensureContactScope(contactId, companyId)
		const data = customActivitySchema.parse({
			description: formData.get('description')?.toString(),
			occurredAt: formData.get('occurredAt')?.toString() ?? undefined,
			notes: formData.get('notes')?.toString() ?? undefined,
		})

		const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date()

		await logActivity({
			companyId,
			contactId: contact.id,
			userId,
			type: 'CUSTOM_ACTIVITY_LOGGED',
			subject: data.description,
			description: data.notes ?? null,
			metadata: { occurredAt: occurredAt.toISOString() },
		})
		await logAuditEvent({
			companyId,
			actorId: userId,
			action: 'CUSTOM_ACTIVITY_LOGGED',
			metadata: { contactId: contact.id, description: data.description },
		})

		await touchContactActivity(contact.id)
		revalidateContactSurfaces(contact.id)

		return { success: true, contactId: contact.id }
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to log custom activity'
		return { success: false, message }
	}
}

const emailComposerSchema = z.object({
	accountId: z.string().min(1),
	to: z.string().min(1),
	cc: z.string().optional(),
	bcc: z.string().optional(),
	subject: z.string().min(1),
	bodyHtml: z.string().min(1),
	bodyText: z.string().optional(),
})

function stripHtml(input: string): string {
	return input.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function sendContactEmailAction(
	contactId: string,
	stateOrFormData: ActionState | FormData,
	maybeFormData?: FormData
): Promise<ActionState> {
	const previousState: ActionState = stateOrFormData instanceof FormData ? { success: false } : stateOrFormData

	try {
		const formData = resolveFormData(stateOrFormData, maybeFormData)
		const { userId, companyId } = await requireWorkspaceContext()
		const contact = await ensureContactScope(contactId, companyId)
		const data = emailComposerSchema.parse({
			accountId: formData.get('accountId')?.toString(),
			to: formData.get('to')?.toString(),
			cc: formData.get('cc')?.toString() ?? undefined,
			bcc: formData.get('bcc')?.toString() ?? undefined,
			subject: formData.get('subject')?.toString(),
			bodyHtml: formData.get('bodyHtml')?.toString(),
			bodyText: formData.get('bodyText')?.toString() ?? undefined,
		})

		const account = await prisma.emailAccount.findFirst({
			where: { id: data.accountId, companyId, userId, deauthorizedAt: null },
		})

		if (!account) {
			throw new Error('Email account is not available in this workspace')
		}

		const toRecipients = normalizeRecipientList(data.to)
		if (toRecipients.length === 0) {
			throw new Error('At least one primary recipient is required')
		}

		const ccRecipients = normalizeRecipientList(data.cc)
		const bccRecipients = normalizeRecipientList(data.bcc)
		const everyone = [...toRecipients, ...ccRecipients, ...bccRecipients]
		const contactEmail = contact.email.toLowerCase()
		const includesContact = everyone.some((recipient) => recipient.email === contactEmail)
		if (!includesContact) {
			throw new Error('Contact email must be included')
		}
		const allEmails = everyone.map((recipient) => recipient.email)

		const suppressed = await prisma.emailRecipientPreference.findMany({
			where: { companyId, email: { in: allEmails } },
		})
		const blocked = suppressed.filter((preference) => !preference.sendEnabled)
		if (blocked.length > 0) {
			throw new Error(`Sending blocked for ${blocked.map((pref) => pref.email).join(', ')}`)
		}

		const files = formData.getAll('attachments').filter((value): value is File => value instanceof File && value.size > 0)
		if (files.length > MAX_ATTACHMENT_COUNT) {
			throw new Error(`Maximum ${MAX_ATTACHMENT_COUNT} attachments allowed`)
		}

		let totalBytes = 0
		const attachments = await Promise.all(
			files.map(async (file) => {
				if (file.size > MAX_ATTACHMENT_BYTES) {
					throw new Error(`${file.name} exceeds ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))}MB limit`)
				}
				totalBytes += file.size
				if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
					throw new Error('Attachments exceed total size limit')
				}
				const buffer = Buffer.from(await file.arrayBuffer())
				return {
					filename: file.name,
					contentType: file.type || 'application/octet-stream',
					buffer,
				}
			})
		)

		const textBody = data.bodyText?.trim() || stripHtml(data.bodyHtml)
		if (!textBody) {
			throw new Error('Email body cannot be empty')
		}

		const emailRecord = await sendContactEmail({
			accountId: account.id,
			companyId,
			contactId: contact.id,
			authorId: userId,
			to: toRecipients,
			cc: ccRecipients.length ? ccRecipients : undefined,
			bcc: bccRecipients.length ? bccRecipients : undefined,
			subject: data.subject,
			html: data.bodyHtml,
			text: textBody,
			attachments,
		})

		await touchContactActivity(contact.id)
		await logAuditEvent({
			companyId,
			actorId: userId,
			action: 'EMAIL_SENT',
			metadata: { contactId: contact.id, emailId: emailRecord.id, accountId: account.id },
		})
		revalidateContactSurfaces(contact.id)

		return { success: true, contactId: contact.id, message: 'Email sent', resetToken: randomUUID() }
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to send email'
		return { success: false, message, resetToken: previousState.resetToken }
	}
}


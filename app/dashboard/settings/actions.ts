'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile, deleteFile } from '@/lib/s3'
import { enforceCanUploadFile } from '@/lib/billing/enforcement'

export async function updateProfileAction(formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name')?.toString().trim()
  const password = formData.get('password')?.toString()
  const confirmPassword = formData.get('confirmPassword')?.toString()

  if (!name) {
    throw new Error('Name is required')
  }

  const data: { name: string; password?: string } = { name }

  if (password) {
    if (password.length < 12) {
      throw new Error('Password must be at least 12 characters')
    }

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match')
    }

    data.password = await bcrypt.hash(password, 12)
  }

  await prisma.user.update({ where: { id: session.user.id }, data })

  revalidatePath('/crm')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
}

const BRANDING_PDF_LOGO_KEY = 'branding_pdf_logo'
const BRANDING_DISPATCH_PDF_LOGO_KEY = 'branding_dispatch_pdf_logo'
const BRANDING_UI_LOGO_KEY = 'branding_ui_logo'
const BASE_BRANDING_REVALIDATE_PATHS = ['/dashboard/owner', '/dashboard/admin', '/settings/branding', '/settings/profile'] as const

function assertCanManageBranding(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session?.user?.id || !session.user.companyId) {
    throw new Error('Unauthorized')
  }

  const role = session.user.role
  if (!['owner', 'admin'].includes(role)) {
    throw new Error('Insufficient role')
  }
}

function revalidateBrandingTargets(...paths: string[]) {
  const deduped = Array.from(new Set([...BASE_BRANDING_REVALIDATE_PATHS, ...paths]))
  for (const path of deduped) {
    revalidatePath(path)
  }
}

export async function uploadPdfLogoAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertCanManageBranding(session)

  await enforceCanUploadFile(session.user.id)

  const file = formData.get('logo')
  if (!(file instanceof File)) {
    throw new Error('Logo file is required')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed for PDF logos')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const upload = await uploadFile(buffer, `companies/${session.user.companyId}/branding/pdf`, file.type)

  const value = {
    key: upload.key,
    fileName: file.name,
    contentType: file.type,
    size: upload.size,
    uploadedAt: new Date().toISOString(),
  }

  const existing = await prisma.systemSetting.findUnique({
    where: { companyId_key: { companyId: session.user.companyId, key: BRANDING_PDF_LOGO_KEY } },
  })

  await prisma.systemSetting.upsert({
    where: { companyId_key: { companyId: session.user.companyId, key: BRANDING_PDF_LOGO_KEY } },
    create: { companyId: session.user.companyId, key: BRANDING_PDF_LOGO_KEY, value, updatedById: session.user.id },
    update: { value, updatedById: session.user.id },
  })

  await prisma.accessAuditLog.create({
    data: {
      companyId: session.user.companyId,
      actorId: session.user.id,
      action: existing ? 'LOGO_UPDATED' : 'LOGO_UPLOADED',
      metadata: { target: 'estimating_pdf_logo', fileName: file.name },
    },
  })

  revalidateBrandingTargets('/estimating', '/estimating/settings')
}

export async function removePdfLogoAction() {
  const session = await getServerSession(authOptions)
  assertCanManageBranding(session)

  const existing = await prisma.systemSetting.findUnique({
    where: { companyId_key: { companyId: session.user.companyId, key: BRANDING_PDF_LOGO_KEY } },
  })

  if (!existing) {
    return
  }

  const value = existing.value as { key?: string } | null
  if (value?.key) {
    await deleteFile(value.key)
  }

  await prisma.systemSetting.delete({ where: { companyId_key: { companyId: session.user.companyId, key: BRANDING_PDF_LOGO_KEY } } })

  await prisma.accessAuditLog.create({
    data: {
      companyId: session.user.companyId,
      actorId: session.user.id,
      action: 'LOGO_UPDATED',
      metadata: { target: 'estimating_pdf_logo', action: 'removed' },
    },
  })

  revalidateBrandingTargets('/estimating', '/estimating/settings')
}

export async function uploadUiLogoAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertCanManageBranding(session)

  await enforceCanUploadFile(session.user.id)

  const file = formData.get('logo')
  if (!(file instanceof File)) {
    throw new Error('Logo file is required')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed for UI logos')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const upload = await uploadFile(buffer, `companies/${session.user.companyId}/branding/ui`, file.type)

  const value = {
    key: upload.key,
    fileName: file.name,
    contentType: file.type,
    size: upload.size,
    uploadedAt: new Date().toISOString(),
  }

  const existing = await prisma.systemSetting.findUnique({
    where: { companyId_key: { companyId: session.user.companyId, key: BRANDING_UI_LOGO_KEY } },
  })

  await prisma.systemSetting.upsert({
    where: { companyId_key: { companyId: session.user.companyId, key: BRANDING_UI_LOGO_KEY } },
    create: { companyId: session.user.companyId, key: BRANDING_UI_LOGO_KEY, value, updatedById: session.user.id },
    update: { value, updatedById: session.user.id },
  })

  await prisma.accessAuditLog.create({
    data: {
      companyId: session.user.companyId,
      actorId: session.user.id,
      action: existing ? 'LOGO_UPDATED' : 'LOGO_UPLOADED',
      metadata: { target: 'ui_shell_logo', fileName: file.name },
    },
  })

  revalidateBrandingTargets('/estimating', '/estimating/settings', '/dispatch', '/dispatch/work-orders')
}

export async function removeUiLogoAction() {
  const session = await getServerSession(authOptions)
  assertCanManageBranding(session)

  const existing = await prisma.systemSetting.findUnique({
    where: { companyId_key: { companyId: session.user.companyId, key: BRANDING_UI_LOGO_KEY } },
  })

  if (!existing) {
    return
  }

  const value = existing.value as { key?: string } | null
  if (value?.key) {
    await deleteFile(value.key)
  }

  await prisma.systemSetting.delete({ where: { companyId_key: { companyId: session.user.companyId, key: BRANDING_UI_LOGO_KEY } } })

  await prisma.accessAuditLog.create({
    data: {
      companyId: session.user.companyId,
      actorId: session.user.id,
      action: 'LOGO_UPDATED',
      metadata: { target: 'ui_shell_logo', action: 'removed' },
    },
  })

  revalidateBrandingTargets('/estimating', '/estimating/settings', '/dispatch', '/dispatch/work-orders')
}

export async function uploadDispatchPdfLogoAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertCanManageBranding(session)

  await enforceCanUploadFile(session.user.id)

  const file = formData.get('logo')
  if (!(file instanceof File)) {
    throw new Error('Logo file is required')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed for dispatch PDF logos')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const upload = await uploadFile(buffer, `companies/${session.user.companyId}/branding/dispatch`, file.type)

  const value = {
    key: upload.key,
    fileName: file.name,
    contentType: file.type,
    size: upload.size,
    uploadedAt: new Date().toISOString(),
  }

  const existing = await prisma.systemSetting.findUnique({
    where: { companyId_key: { companyId: session.user.companyId, key: BRANDING_DISPATCH_PDF_LOGO_KEY } },
  })

  await prisma.systemSetting.upsert({
    where: { companyId_key: { companyId: session.user.companyId, key: BRANDING_DISPATCH_PDF_LOGO_KEY } },
    create: { companyId: session.user.companyId, key: BRANDING_DISPATCH_PDF_LOGO_KEY, value, updatedById: session.user.id },
    update: { value, updatedById: session.user.id },
  })

  await prisma.accessAuditLog.create({
    data: {
      companyId: session.user.companyId,
      actorId: session.user.id,
      action: existing ? 'LOGO_UPDATED' : 'LOGO_UPLOADED',
      metadata: { target: 'dispatch_pdf_logo', fileName: file.name },
    },
  })

  revalidateBrandingTargets('/dispatch', '/dispatch/work-orders')
}

export async function removeDispatchPdfLogoAction() {
  const session = await getServerSession(authOptions)
  assertCanManageBranding(session)

  const existing = await prisma.systemSetting.findUnique({
    where: { companyId_key: { companyId: session.user.companyId, key: BRANDING_DISPATCH_PDF_LOGO_KEY } },
  })

  if (!existing) {
    return
  }

  const value = existing.value as { key?: string } | null
  if (value?.key) {
    await deleteFile(value.key)
  }

  await prisma.systemSetting.delete({ where: { companyId_key: { companyId: session.user.companyId, key: BRANDING_DISPATCH_PDF_LOGO_KEY } } })

  await prisma.accessAuditLog.create({
    data: {
      companyId: session.user.companyId,
      actorId: session.user.id,
      action: 'LOGO_UPDATED',
      metadata: { target: 'dispatch_pdf_logo', action: 'removed' },
    },
  })

  revalidateBrandingTargets('/dispatch', '/dispatch/work-orders')
}

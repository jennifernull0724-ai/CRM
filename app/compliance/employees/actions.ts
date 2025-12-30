'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { planAllowsFeature, type PlanKey } from '@/lib/billing/planTiers'
import type { ComplianceCategory } from '@prisma/client'
import { refreshEmployeeComplianceState } from '@/lib/compliance/status'
import { deleteFile, uploadComplianceCertificationImage, uploadComplianceFile } from '@/lib/s3'
import { logComplianceActivity } from '@/lib/compliance/activity'
import { createComplianceSnapshot } from '@/lib/compliance/snapshots'

const EMAIL_PATTERN = new RegExp('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$')

async function requireComplianceContext(level: 'core' | 'advanced' = 'core') {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    throw new Error('Unauthorized')
  }

  if (!['admin', 'owner'].includes(session.user.role as string)) {
    throw new Error('Compliance access restricted to owners/admins')
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'
  const hasCore = planAllowsFeature(planKey, 'compliance_core')
  const hasAdvanced = planAllowsFeature(planKey, 'advanced_compliance')

  if (level === 'core' && !hasCore && !hasAdvanced) {
    throw new Error('Compliance is not enabled on this plan')
  }

  if (level === 'advanced' && !hasAdvanced) {
    throw new Error('Advanced compliance is required for this operation')
  }

  return {
    userId: session.user.id,
    userRole: session.user.role,
    companyId: session.user.companyId,
    planKey,
  }
}

function toBoolean(value: FormDataEntryValue | null): boolean {
  if (value === null) return false
  if (typeof value === 'string') {
    return value === 'true' || value === 'on' || value === '1'
  }
  return Boolean(value)
}

export async function createEmployeeAction(formData: FormData) {
  const { companyId, userId } = await requireComplianceContext('core')

  const employeeId = formData.get('employeeId')?.toString().trim()
  const email = formData.get('email')?.toString().trim().toLowerCase()
  const firstName = formData.get('firstName')?.toString().trim()
  const lastName = formData.get('lastName')?.toString().trim()
  const title = formData.get('title')?.toString().trim()
  const role = formData.get('role')?.toString().trim()
  const active = toBoolean(formData.get('active'))
  const qrToken = crypto.randomUUID().replace(/-/g, '')

  if (!employeeId || !email || !firstName || !lastName || !title || !role) {
    throw new Error('Missing required employee fields')
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('Employee email is invalid')
  }

  const existing = await prisma.complianceEmployee.findFirst({
    where: { employeeId, companyId },
  })

  if (existing) {
    throw new Error('Employee ID already exists')
  }

  const employee = await prisma.complianceEmployee.create({
    data: {
      employeeId,
      firstName,
      lastName,
      title,
      role,
      active,
      companyId,
      qrToken,
      email,
      createdById: userId,
      updatedById: userId,
    },
  })

  await logComplianceActivity({
    companyId,
    actorId: userId,
    employeeId: employee.id,
    type: 'EMPLOYEE_CREATED',
    metadata: {
      employeeIdentifier: employeeId,
      role,
      title,
    },
  })

  await logComplianceActivity({
    companyId,
    actorId: userId,
    employeeId: employee.id,
    type: 'QR_GENERATED',
    metadata: {
      qrToken,
      source: 'employee_create',
    },
  })

  revalidatePath('/compliance/employees')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
}

export async function createCertificationAction(formData: FormData) {
  const { companyId, userId } = await requireComplianceContext('core')

  const employeeId = formData.get('employeeId')?.toString()
  const presetKey = formData.get('presetKey')?.toString() || null
  const customName = formData.get('customName')?.toString().trim() || null
  const category = formData.get('category')?.toString()
  const required = toBoolean(formData.get('required'))
  const issueDate = formData.get('issueDate')?.toString()
  const expiresAt = formData.get('expiresAt')?.toString()
  const proofEntries = formData.getAll('proofFiles')
  const proofFiles = proofEntries.filter((value): value is File => value instanceof File && value.size > 0)

  if (!employeeId || !category || !issueDate || !expiresAt) {
    throw new Error('Missing certification fields')
  }

  if (!proofFiles.length) {
    throw new Error('At least one proof file is required')
  }

  if (!presetKey && (!customName || customName.length < 3)) {
    throw new Error('Custom certification name too short')
  }

  const issueDateObj = new Date(issueDate)
  const expiresAtObj = new Date(expiresAt)

  if (Number.isNaN(issueDateObj.getTime()) || Number.isNaN(expiresAtObj.getTime())) {
    throw new Error('Issue and expiration dates must be valid')
  }

  if (expiresAtObj <= issueDateObj) {
    throw new Error('Expiration date must be after issue date')
  }

  const employeeExists = await prisma.complianceEmployee.findFirst({ where: { id: employeeId, companyId }, select: { id: true } })

  if (!employeeExists) {
    throw new Error('Employee not found')
  }

  let resolvedName = customName
  let resolvedCategory = category as ComplianceCategory
  if (presetKey) {
    const preset = await prisma.compliancePreset.findFirst({
      where: {
        companyId,
        baseKey: presetKey,
      },
    })

    if (!preset || (!preset.enabled && !preset.isOther)) {
      throw new Error('Preset disabled for this company')
    }

    resolvedName = preset.name
    resolvedCategory = preset.category
  }

  const certificationId = crypto.randomUUID()
  const proofPayloads = await Promise.all(
    proofFiles.map(async (file) => ({
      file,
      buffer: Buffer.from(await file.arrayBuffer()),
    }))
  )

  const uploads: { version: number; file: File; key: string; hash: string; bucket: string; size: number; mimeType: string }[] = []

  try {
    let version = 1
    for (const payload of proofPayloads) {
      const upload = await uploadComplianceCertificationImage({
        file: payload.buffer,
        companyId,
        employeeId,
        certificationId,
        version,
        contentType: payload.file.type || 'application/octet-stream',
      })
      uploads.push({
        version,
        file: payload.file,
        key: upload.key,
        hash: upload.hash,
        bucket: upload.bucket,
        size: upload.size,
        mimeType: payload.file.type,
      })
      version += 1
    }

    await prisma.$transaction(async (tx) => {
      await tx.complianceCertification.create({
        data: {
          id: certificationId,
          employeeId,
          presetKey: presetKey ?? undefined,
          customName: resolvedName,
          category: resolvedCategory,
          required,
          issueDate: issueDateObj,
          expiresAt: expiresAtObj,
        },
      })

      await tx.complianceCertificationImage.createMany({
        data: uploads.map((upload) => ({
          certificationId,
          version: upload.version,
          bucket: upload.bucket,
          objectKey: upload.key,
          filename: upload.file.name,
          mimeType: upload.mimeType,
          size: upload.size,
          sha256: upload.hash,
          uploadedById: userId,
        })),
      })
    })
  } catch (error) {
    await Promise.all(uploads.map((upload) => deleteFile(upload.key).catch(() => undefined)))
    throw error
  }

  await logComplianceActivity({
    companyId,
    actorId: userId,
    employeeId,
    certificationId,
    type: 'CERT_ADDED',
    metadata: {
      presetKey,
      customName: resolvedName,
      proofCount: uploads.length,
    },
  })

  await refreshEmployeeComplianceState(employeeId, { actorId: userId, companyId })
  revalidatePath('/compliance/employees')
  revalidatePath(`/compliance/employees/${employeeId}`)
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
}

export async function uploadComplianceDocumentAction(formData: FormData) {
  const { companyId, userId } = await requireComplianceContext('core')
  const employeeId = formData.get('employeeId')?.toString()
  const title = formData.get('title')?.toString()
  const file = formData.get('file') as File | null

  if (!employeeId || !file || !title) {
    throw new Error('Missing document data')
  }

  if (file.type !== 'application/pdf') {
    throw new Error('Documents must be uploaded as PDF')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const version =
    (await prisma.complianceDocument.count({ where: { employeeId } })) + 1

  const upload = await uploadComplianceFile(buffer, companyId, 'documents', file.name, file.type)

  const document = await prisma.complianceDocument.create({
    data: {
      employeeId,
      title,
      version,
      bucket: upload.bucket,
      objectKey: upload.key,
      filename: file.name,
      size: upload.size,
      sha256: upload.hash,
    },
  })

  await logComplianceActivity({
    companyId,
    actorId: userId,
    employeeId,
    type: version === 1 ? 'DOC_UPLOADED' : 'DOC_VERSIONED',
    metadata: {
      documentId: document.id,
      title,
      version,
      hash: upload.hash,
      objectKey: upload.key,
    },
  })

  revalidatePath(`/compliance/employees/${employeeId}`)
  revalidatePath('/compliance/documents')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
}

export async function createSnapshotAction(formData: FormData) {
  const { userId, companyId } = await requireComplianceContext('core')
  const employeeId = formData.get('employeeId')?.toString()

  if (!employeeId) {
    throw new Error('Employee ID required for snapshot')
  }

  await createComplianceSnapshot({ employeeId, createdById: userId, source: 'manual' })
  await refreshEmployeeComplianceState(employeeId, { actorId: userId, companyId })
  revalidatePath(`/compliance/employees/${employeeId}`)
  revalidatePath('/compliance/employees')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
}

export async function createInspectionSnapshotAction(formData: FormData) {
  const { userId, companyId } = await requireComplianceContext('advanced')
  const employeeId = formData.get('employeeId')?.toString()

  if (!employeeId) {
    throw new Error('Employee ID required')
  }

  await createComplianceSnapshot({ employeeId, createdById: userId, source: 'inspection' })
  await refreshEmployeeComplianceState(employeeId, { actorId: userId, companyId })
  revalidatePath(`/compliance/employees/${employeeId}`)
  revalidatePath('/compliance/employees')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
}

export async function setEmployeeActiveStateAction(formData: FormData) {
  const { companyId, userId } = await requireComplianceContext('core')
  const employeeId = formData.get('employeeId')?.toString()
  const active = formData.get('active') === 'true'

  if (!employeeId) {
    throw new Error('Employee ID required')
  }

  const employee = await prisma.complianceEmployee.findFirst({ where: { id: employeeId, companyId } })
  if (!employee) {
    throw new Error('Employee not found')
  }

  await prisma.complianceEmployee.update({ where: { id: employeeId }, data: { active, updatedById: userId } })

  await logComplianceActivity({
    companyId,
    actorId: userId,
    employeeId,
    type: active ? 'EMPLOYEE_REACTIVATED' : 'EMPLOYEE_DEACTIVATED',
    metadata: {
      previousState: employee.active,
      nextState: active,
    },
  })
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
  revalidatePath('/compliance/employees')
}

export async function updateCertificationAction() {
  throw new Error('Certification records are immutable. Create a new certification version instead.')
}

export async function deleteCertificationAction() {
  throw new Error('Certification records are immutable and cannot be deleted.')
}

export async function updateSnapshotAction() {
  throw new Error('Compliance snapshots are immutable. Generate a new snapshot instead.')
}

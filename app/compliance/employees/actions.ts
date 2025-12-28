'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { planAllowsFeature, type PlanKey } from '@/lib/billing/planTiers'
import type { ComplianceCategory } from '@prisma/client'
import { refreshEmployeeComplianceState } from '@/lib/compliance/status'
import { uploadComplianceCertificationImage, uploadComplianceFile } from '@/lib/s3'
import { logComplianceActivity } from '@/lib/compliance/activity'
import { createComplianceSnapshot } from '@/lib/compliance/snapshots'

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
  const { companyId } = await requireComplianceContext('core')

  const employeeId = formData.get('employeeId')?.toString().trim()
  const firstName = formData.get('firstName')?.toString().trim()
  const lastName = formData.get('lastName')?.toString().trim()
  const title = formData.get('title')?.toString().trim()
  const role = formData.get('role')?.toString().trim()
  const active = toBoolean(formData.get('active'))

  if (!employeeId || !firstName || !lastName || !title || !role) {
    throw new Error('Missing required employee fields')
  }

  const existing = await prisma.complianceEmployee.findFirst({
    where: { employeeId, companyId },
  })

  if (existing) {
    throw new Error('Employee ID already exists')
  }

  await prisma.complianceEmployee.create({
    data: {
      employeeId,
      firstName,
      lastName,
      title,
      role,
      active,
      companyId,
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

  if (!employeeId || !category || !issueDate || !expiresAt) {
    throw new Error('Missing certification fields')
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

  const certification = await prisma.complianceCertification.create({
    data: {
      employeeId,
      presetKey: presetKey ?? undefined,
      customName: resolvedName,
      category: resolvedCategory,
      required,
      issueDate: issueDateObj,
      expiresAt: expiresAtObj,
    },
  })

  await logComplianceActivity({
    employeeId,
    type: 'CERT_ADDED',
    metadata: {
      certificationId: certification.id,
      presetKey,
      customName: resolvedName,
      createdBy: userId,
    },
  })

  await refreshEmployeeComplianceState(employeeId)
  revalidatePath('/compliance/employees')
  revalidatePath(`/compliance/employees/${employeeId}`)
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
}

export async function uploadCertificationImageAction(formData: FormData) {
  const { companyId, userId } = await requireComplianceContext('core')
  let employeeId = formData.get('employeeId')?.toString()
  const certificationId = formData.get('certificationId')?.toString()
  const file = formData.get('file') as File | null

  if (!certificationId || !file) {
    throw new Error('Missing upload data')
  }

  const isImage = file.type.startsWith('image/')
  const isPdf = file.type === 'application/pdf'

  if (!isImage && !isPdf) {
    throw new Error('Only image or PDF uploads accepted')
  }

  const certification = await prisma.complianceCertification.findFirst({
    where: { id: certificationId, employee: { companyId } },
    select: { employeeId: true },
  })

  if (!certification) {
    throw new Error('Certification not found')
  }

  if (!employeeId) {
    employeeId = certification.employeeId
  }

  if (!employeeId) {
    throw new Error('Unable to resolve employee for certification')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const existingCount = await prisma.complianceCertificationImage.count({
    where: { certificationId },
  })
  const version = existingCount + 1

  const upload = await uploadComplianceCertificationImage({
    file: buffer,
    companyId,
    employeeId,
    certificationId,
    version,
    contentType: file.type,
  })

  await prisma.complianceCertificationImage.create({
    data: {
      certificationId,
      version,
      bucket: upload.bucket,
      objectKey: upload.key,
      filename: file.name,
      mimeType: file.type,
      size: upload.size,
      sha256: upload.hash,
      uploadedById: userId,
    },
  })

  await logComplianceActivity({
    employeeId,
    type: version === 1 ? 'CERT_IMAGE_UPLOADED' : 'CERT_IMAGE_VERSIONED',
    metadata: {
      certificationId,
      version,
      hash: upload.hash,
      size: upload.size,
      mimeType: file.type,
    },
  })

  await refreshEmployeeComplianceState(employeeId)
  revalidatePath(`/compliance/employees/${employeeId}`)
  revalidatePath('/compliance/employees')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
}

export async function uploadComplianceDocumentAction(formData: FormData) {
  const { companyId } = await requireComplianceContext('core')
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

  await prisma.complianceDocument.create({
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

  revalidatePath(`/compliance/employees/${employeeId}`)
  revalidatePath('/compliance/documents')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
}

export async function createSnapshotAction(formData: FormData) {
  const { userId } = await requireComplianceContext('core')
  const employeeId = formData.get('employeeId')?.toString()

  if (!employeeId) {
    throw new Error('Employee ID required for snapshot')
  }

  await createComplianceSnapshot({ employeeId, createdById: userId, source: 'manual' })
  await refreshEmployeeComplianceState(employeeId)
  revalidatePath(`/compliance/employees/${employeeId}`)
  revalidatePath('/compliance/employees')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
}

export async function createInspectionSnapshotAction(formData: FormData) {
  const { userId } = await requireComplianceContext('advanced')
  const employeeId = formData.get('employeeId')?.toString()

  if (!employeeId) {
    throw new Error('Employee ID required')
  }

  await createComplianceSnapshot({ employeeId, createdById: userId, source: 'inspection' })
  await refreshEmployeeComplianceState(employeeId)
  revalidatePath(`/compliance/employees/${employeeId}`)
  revalidatePath('/compliance/employees')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
}

export async function setEmployeeActiveStateAction(formData: FormData) {
  const { companyId } = await requireComplianceContext('core')
  const employeeId = formData.get('employeeId')?.toString()
  const active = formData.get('active') === 'true'

  if (!employeeId) {
    throw new Error('Employee ID required')
  }

  const employee = await prisma.complianceEmployee.findFirst({ where: { id: employeeId, companyId } })
  if (!employee) {
    throw new Error('Employee not found')
  }

  await prisma.complianceEmployee.update({ where: { id: employeeId }, data: { active } })
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
  revalidatePath('/compliance/employees')
}

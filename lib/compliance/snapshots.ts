import { prisma } from '@/lib/prisma'
import { logComplianceActivity } from './activity'
import { hashPayload } from '@/lib/utils/hash'

export async function createComplianceSnapshot({
  employeeId,
  createdById,
  source = 'manual',
}: {
  employeeId: string
  createdById: string
  source?: 'manual' | 'inspection' | 'print' | 'export' | 'dispatch'
}) {
  const employee = await prisma.complianceEmployee.findUnique({
    where: { id: employeeId },
    include: {
      company: {
        select: { name: true },
      },
      certifications: {
        include: {
          images: true,
        },
      },
    },
  })

  if (!employee) {
    throw new Error('Employee not found')
  }

  if (!employee.qrToken) {
    throw new Error('Employee missing QR token')
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      title: employee.title,
      role: employee.role,
      companyName: employee.company.name,
      complianceStatus: employee.complianceStatus,
    },
    certifications: employee.certifications.map((cert) => ({
      id: cert.id,
      presetKey: cert.presetKey,
      customName: cert.customName,
      category: cert.category,
      required: cert.required,
      issueDate: cert.issueDate.toISOString(),
      expiresAt: cert.expiresAt.toISOString(),
      status: cert.status,
      images: cert.images.map((image) => ({
        id: image.id,
        version: image.version,
        sha256: image.sha256,
        bucket: image.bucket,
        objectKey: image.objectKey,
        filename: image.filename,
      })),
    })),
  }

  const snapshotHash = hashPayload(payload)

  const snapshot = await prisma.complianceSnapshot.create({
    data: {
      employeeId,
      createdById,
      snapshotHash,
      payload,
    },
  })

  const token = employee.qrToken

  await prisma.complianceQrToken.upsert({
    where: { token },
    create: {
      employeeId,
      snapshotId: snapshot.id,
      token,
    },
    update: {
      snapshotId: snapshot.id,
      employeeId,
    },
  })

  await prisma.complianceEmployee.update({
    where: { id: employeeId },
    data: {
      complianceHash: snapshotHash,
      lastVerifiedAt: new Date(),
    },
  })

  await logComplianceActivity({
    companyId: employee.companyId,
    actorId: createdById,
    employeeId,
    type: 'SNAPSHOT_CREATED',
    metadata: { snapshotId: snapshot.id, hash: snapshotHash, source },
  })

  return { snapshot, token }
}

export async function getSnapshotByToken(token: string) {
  const record = await prisma.complianceQrToken.findUnique({
    where: { token },
    include: {
      snapshot: true,
      employee: {
        include: {
          company: true,
        },
      },
    },
  })

  if (!record) {
    return null
  }

  return record
}

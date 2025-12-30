'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { Prisma, type AccessAuditAction, type AssetStatus } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const OWNER_ADMIN_ROLES = ['owner', 'admin']
const ALLOWED_STATUSES: AssetStatus[] = ['IN_SERVICE', 'OUT_OF_SERVICE', 'MAINTENANCE']

async function requireOwnerOrAdmin() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    throw new Error('Unauthorized')
  }

  const role = session.user.role.toLowerCase()

  if (!OWNER_ADMIN_ROLES.includes(role)) {
    throw new Error('Insufficient role')
  }

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
  }
}

function revalidateAssetSurfaces() {
  revalidatePath('/dashboard/assets')
  revalidatePath('/dashboard/admin/assets')
  revalidatePath('/dispatch')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
}

const sanitizeText = (value: string | null | undefined): string | null => {
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

async function recordAssetAudit(
  companyId: string,
  actorId: string,
  action: AccessAuditAction,
  metadata: Record<string, unknown>
) {
  await prisma.accessAuditLog.create({
    data: {
      companyId,
      actorId,
      action,
      metadata,
    },
  })
}

export async function upsertAssetAction(formData: FormData) {
  const { companyId, userId } = await requireOwnerOrAdmin()

  const assetId = formData.get('assetId')?.toString().trim() || null
  const assetName = sanitizeText(formData.get('name')?.toString())
  const assetType = sanitizeText(formData.get('assetType')?.toString())
  const subType = sanitizeText(formData.get('subType')?.toString())
  const assetNumberRaw = sanitizeText(formData.get('assetNumber')?.toString())
  const statusInput = formData.get('status')?.toString()
  const statusRaw = statusInput ? (statusInput.trim().toUpperCase() as AssetStatus) : undefined
  const location = sanitizeText(formData.get('location')?.toString())
  const notes = sanitizeText(formData.get('notes')?.toString())

  if (!assetName || !assetType || !assetNumberRaw || !statusRaw) {
    throw new Error('Asset name, type, number, and status are required')
  }

  if (!ALLOWED_STATUSES.includes(statusRaw)) {
    throw new Error('Invalid asset status')
  }

  const normalizedAssetNumber = assetNumberRaw.toUpperCase()

  const payload = {
    assetName,
    assetType,
    subType,
    assetNumber: normalizedAssetNumber,
    status: statusRaw,
    location,
    notes,
  }

  try {
    if (assetId) {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.asset.findFirst({
          where: { id: assetId, companyId },
          select: {
            id: true,
            companyId: true,
            status: true,
            assetNumber: true,
            assetType: true,
            createdById: true,
          },
        })

        if (!existing) {
          throw new Error('Asset not found')
        }

        await tx.asset.update({
          where: { id: assetId },
          data: {
            ...payload,
            createdById: existing.createdById,
          },
        })

        await recordAssetAudit(companyId, userId, 'ASSET_UPDATED', {
          assetId,
          assetNumber: normalizedAssetNumber,
          assetType,
        })

        if (existing.status !== statusRaw) {
          await recordAssetAudit(companyId, userId, 'ASSET_STATUS_CHANGED', {
            assetId,
            assetNumber: normalizedAssetNumber,
            previousStatus: existing.status,
            nextStatus: statusRaw,
          })
        }
      })
    } else {
      await prisma.$transaction(async (tx) => {
        const asset = await tx.asset.create({
          data: {
            ...payload,
            companyId,
            createdById: userId,
          },
        })

        await recordAssetAudit(companyId, userId, 'ASSET_CREATED', {
          assetId: asset.id,
          assetNumber: normalizedAssetNumber,
          assetType,
          status: statusRaw,
        })
      })
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('Asset number must be unique per company')
    }
    throw error
  }

  revalidateAssetSurfaces()
}

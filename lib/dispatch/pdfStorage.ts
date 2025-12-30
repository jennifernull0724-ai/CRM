import type { WorkOrderPdf } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { uploadFile, getFileBuffer } from '@/lib/s3'
import { generateWorkOrderPdf } from '@/lib/dispatch/pdf'
import { getWorkOrderDetail } from '@/lib/dispatch/workOrders'
import { recordWorkOrderActivity } from '@/lib/dispatch/workOrderActivity'
import { assertWorkOrderMutable } from '@/lib/dispatch/workOrderLifecycle'

type PdfGenerationReason = 'manual-download' | 'manual-email' | 'auto-email' | 'assignment-change' | 'status-change'

type CreatePdfParams = {
  workOrderId: string
  companyId: string
  actorId: string
  reason: PdfGenerationReason
}

const DISPATCH_PDF_LOGO_KEY = 'branding_dispatch_pdf_logo'
const ESTIMATING_PDF_LOGO_KEY = 'branding_pdf_logo'

type BrandingAssetValue = {
  key?: string
}

async function loadCompanyPdfLogo(companyId: string): Promise<Buffer | null> {
  const settings = await prisma.systemSetting.findMany({
    where: { companyId, key: { in: [DISPATCH_PDF_LOGO_KEY, ESTIMATING_PDF_LOGO_KEY] } },
  })

  const prioritized = settings.find((entry) => entry.key === DISPATCH_PDF_LOGO_KEY) ?? settings.find((entry) => entry.key === ESTIMATING_PDF_LOGO_KEY)
  const value = (prioritized?.value as BrandingAssetValue | null) ?? null
  if (!value?.key) {
    return null
  }

  try {
    return await getFileBuffer(value.key)
  } catch {
    return null
  }
}

export async function createWorkOrderPdfVersion(params: CreatePdfParams): Promise<{ record: WorkOrderPdf; buffer: Buffer }> {
  const workOrder = await getWorkOrderDetail(params.workOrderId, params.companyId)
  if (!workOrder) {
    throw new Error('Work order not found')
  }

  assertWorkOrderMutable(workOrder.status)

  const [documents, logoBuffer, company] = await Promise.all([
    prisma.workOrderDocument.findMany({
      where: { companyId: params.companyId, workOrderId: params.workOrderId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, fileName: true, createdAt: true },
    }),
    loadCompanyPdfLogo(params.companyId),
    prisma.company.findUnique({ where: { id: params.companyId }, select: { name: true } }),
  ])

  const generatedAt = new Date()

  const payload = {
    id: workOrder.id,
    title: workOrder.title,
    status: workOrder.status,
    createdAt: workOrder.createdAt,
    dispatchStatus: workOrder.dispatchStatus,
    dispatchPriority: workOrder.dispatchPriority,
    generatedAt,
    version: 0, // placeholder, reset after version assignment
    company: {
      name: company?.name ?? null,
    },
    companyLogo: logoBuffer,
    notes: {
      operationsNotes: workOrder.operationsNotes,
      gateAccessCode: workOrder.gateAccessCode,
      onsitePocName: workOrder.onsitePocName,
      onsitePocPhone: workOrder.onsitePocPhone,
      specialInstructions: workOrder.specialInstructions,
    },
    contact: {
      name: workOrder.contact.name,
      email: workOrder.contact.email,
      jobTitle: workOrder.contact.jobTitle,
      company: workOrder.contact.company,
    },
    presets: workOrder.presets.map((preset) => ({
      name: preset.name,
      scope: preset.scope,
      notes: preset.overriddenNotes ?? preset.defaultNotes ?? null,
    })),
    assignments: workOrder.assignments.map((assignment) => ({
      employeeName: assignment.employeeName,
      employeeRole: assignment.employeeRole,
      assignedAt: assignment.assignedAt,
      complianceStatus: assignment.complianceStatus,
      overrideAcknowledged: assignment.overrideAcknowledged,
      overrideReason: assignment.overrideReason,
      missingCerts: (assignment.gapSummary?.missing ?? []).map((gap) => gap.label),
      expiringCerts: (assignment.gapSummary?.expiring ?? []).map((gap) => gap.label),
    })),
    assets: workOrder.assets.map((asset) => ({
      assetName: asset.assetName,
      assetType: asset.assetType,
      assetNumber: asset.assetNumber,
      statusAtAssignment: asset.statusAtAssignment,
      assignedAt: asset.assignedAt,
      removedAt: asset.removedAt,
    })),
    documents: documents.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      uploadedAt: doc.createdAt,
    })),
  }

  const { record, storageKey } = await prisma.$transaction(async (tx) => {
    const latest = await tx.workOrderPdf.aggregate({
      _max: { version: true },
      where: { workOrderId: params.workOrderId },
    })
    const version = (latest._max.version ?? 0) + 1
    const key = `companies/${params.companyId}/work-orders/${params.workOrderId}/pdfs/v${version}.pdf`
    payload.version = version
    const created = await tx.workOrderPdf.create({
      data: {
        companyId: params.companyId,
        workOrderId: params.workOrderId,
        generatedById: params.actorId,
        storageKey: key,
        fileSize: 0,
        version,
      },
    })
    return { record: created, storageKey: key }
  })

  payload.version = record.version
  const buffer = await generateWorkOrderPdf(payload)

  const finalizedRecord = await prisma.workOrderPdf.update({
    where: { id: record.id },
    data: { fileSize: buffer.length },
  })

  try {
    await uploadFile(buffer, storageKey, 'application/pdf')
  } catch (error) {
    await prisma.workOrderPdf.delete({ where: { id: finalizedRecord.id } })
    throw error
  }

  const timestamp = new Date().toISOString()

  await prisma.accessAuditLog.create({
    data: {
      companyId: params.companyId,
      actorId: params.actorId,
      action: 'PDF_GENERATED',
      metadata: {
        workOrderId: params.workOrderId,
        pdfId: finalizedRecord.id,
        version: finalizedRecord.version,
        reason: params.reason,
        storageKey: finalizedRecord.storageKey,
        fileSize: buffer.length,
        timestamp,
      },
    },
  })

  await recordWorkOrderActivity({
    companyId: params.companyId,
    workOrderId: params.workOrderId,
    actorId: params.actorId,
    type: 'PDF_GENERATED',
    metadata: {
      pdfId: finalizedRecord.id,
      version: finalizedRecord.version,
      storageKey: finalizedRecord.storageKey,
      reason: params.reason,
    },
  })

  return { record: finalizedRecord, buffer }
}

export async function getLatestWorkOrderPdf(workOrderId: string, companyId: string): Promise<WorkOrderPdf | null> {
  return prisma.workOrderPdf.findFirst({
    where: { workOrderId, companyId },
    orderBy: { version: 'desc' },
  })
}

export async function downloadWorkOrderPdf(record: WorkOrderPdf): Promise<Buffer> {
  return getFileBuffer(record.storageKey)
}

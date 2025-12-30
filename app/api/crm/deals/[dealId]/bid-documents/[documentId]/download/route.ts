import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDownloadUrl } from '@/lib/s3'

const CRM_ALLOWED_ROLES = new Set(['user'])

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ dealId: string; documentId: string }> }
) {
  const { dealId, documentId } = await context.params
  const session = await auth()

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const normalizedRole = (session.user.role ?? 'user').toLowerCase()
  if (!CRM_ALLOWED_ROLES.has(normalizedRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const record = await prisma.dealBidDocument.findFirst({
    where: {
      id: documentId,
      dealId,
      companyId: session.user.companyId,
      deal: { createdById: session.user.id },
    },
    select: {
      id: true,
      fileName: true,
      storageKey: true,
      dealId: true,
    },
  })

  if (!record) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const signedUrl = await getDownloadUrl(record.storageKey, 180)

  await prisma.accessAuditLog.create({
    data: {
      companyId: session.user.companyId,
      actorId: session.user.id,
      action: 'DEAL_BID_DOCUMENT_DOWNLOADED',
      metadata: {
        dealId: record.dealId,
        documentId: record.id,
        fileName: record.fileName,
      },
    },
  })

  return NextResponse.redirect(signedUrl)
}

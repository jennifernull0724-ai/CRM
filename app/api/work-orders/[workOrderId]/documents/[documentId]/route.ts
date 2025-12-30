import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDownloadUrl } from '@/lib/s3'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ workOrderId: string; documentId: string }> }
) {
  const { workOrderId, documentId } = await context.params
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const document = await prisma.workOrderDocument.findFirst({
    where: {
      id: documentId,
      workOrderId,
      companyId: session.user.companyId,
    },
    select: {
      id: true,
      storageKey: true,
    },
  })

  if (!document) {
    return new Response('Document not found', { status: 404 })
  }

  const signedUrl = await getDownloadUrl(document.storageKey, 120)
  return Response.redirect(signedUrl, 302)
}

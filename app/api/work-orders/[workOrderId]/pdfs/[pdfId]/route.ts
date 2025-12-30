import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDownloadUrl } from '@/lib/s3'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ workOrderId: string; pdfId: string }> }
) {
  const { workOrderId, pdfId } = await context.params
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const pdfRecord = await prisma.workOrderPdf.findFirst({
    where: {
      id: pdfId,
      workOrderId,
      companyId: session.user.companyId,
    },
    select: {
      id: true,
      storageKey: true,
      version: true,
    },
  })

  if (!pdfRecord) {
    return new Response('PDF not found', { status: 404 })
  }

  const signedUrl = await getDownloadUrl(pdfRecord.storageKey, 120)
  return Response.redirect(signedUrl, 302)
}

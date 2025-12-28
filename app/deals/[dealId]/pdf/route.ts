import { NextResponse } from 'next/server'

export async function GET(_: Request, context: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await context.params

  return NextResponse.json(
    {
      error: 'PDF generation not wired yet',
      dealId,
      requirement: 'Return approved, immutable version PDFs only.',
    },
    { status: 501 }
  )
}

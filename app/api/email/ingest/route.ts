import { NextResponse } from 'next/server'

// Ingestion is server-only; this route is intentionally disabled
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function POST() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

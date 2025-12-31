import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { enforceCanWrite, PricingEnforcementError } from '@/lib/billing/enforcement'
import { listContactsForCompany, type ContactListFilters } from '@/lib/contacts/listContacts'
import { createContactRecord } from '@/lib/contacts/mutations'

const contactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  jobTitle: z.string().optional(),
  companyLabel: z.string().optional(),
  source: z.string().optional(),
})

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function parseFilters(searchParams: URLSearchParams): ContactListFilters {
  return {
    search: searchParams.get('search') ?? undefined,
    archived: searchParams.get('archived') === 'true',
    hasOpenTasks: searchParams.get('hasOpenTasks') === 'true',
    hasOverdueTasks: searchParams.get('hasOverdueTasks') === 'true',
    hasCalls: searchParams.get('hasLoggedCalls') === 'true',
    hasMeetings: searchParams.get('hasMeetings') === 'true',
    lastActivityWindowDays: parseNumber(searchParams.get('lastActivityDays')) ?? null,
    sort: searchParams.get('sort') === 'activity' ? 'activity' : 'attention',
    page: parseNumber(searchParams.get('page')) ?? 1,
    perPage: parseNumber(searchParams.get('perPage')) ?? 25,
  }
}

// GET /api/contacts - List contacts with filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const filters = parseFilters(searchParams)
    const result = await listContactsForCompany(session.user.companyId, filters, {
      userId: session.user.id,
      role: session.user.role ?? 'user',
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/contacts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/contacts - Create contact
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Enforce pricing: Check if user can write
    try {
      await enforceCanWrite(session.user.id)
    } catch (error) {
      if (error instanceof PricingEnforcementError) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      throw error
    }

    const body = await req.json()
    const validated = contactSchema.parse(body)

    const contact = await createContactRecord(
      {
        firstName: validated.firstName,
        lastName: validated.lastName,
        email: validated.email,
        phone: validated.phone,
        mobile: validated.mobile,
        jobTitle: validated.jobTitle,
        companyLabel: validated.companyLabel,
      },
      {
        companyId: session.user.companyId,
        actorId: session.user.id,
        source: validated.source ?? 'api:contacts',
      }
    )

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('exists')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('POST /api/contacts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

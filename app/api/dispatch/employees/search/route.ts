import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchDispatchEmployees } from '@/lib/dispatch/employees'

const DISPATCH_CAPABLE_ROLES = ['dispatch', 'admin', 'owner']

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role.toLowerCase()

  if (!DISPATCH_CAPABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const query = url.searchParams.get('q') ?? ''
  const results = await searchDispatchEmployees(session.user.companyId, query)

  return NextResponse.json({ results })
}

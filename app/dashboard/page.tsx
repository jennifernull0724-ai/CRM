import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLE_DESTINATION: Record<string, string> = {
  user: '/dashboard/user',
  estimator: '/dashboard/estimator',
  dispatch: '/dashboard/dispatch',
  admin: '/dashboard/admin',
  owner: '/dashboard/owner',
}

export default async function DashboardRouterPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?from=/dashboard')
  }

  const role = session.user.role?.toLowerCase() ?? 'user'
  const destination = ROLE_DESTINATION[role] ?? ROLE_DESTINATION.user

  redirect(destination)
}

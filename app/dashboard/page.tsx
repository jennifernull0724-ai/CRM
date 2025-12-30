import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { resolveRoleDestination } from '@/lib/auth/roleDestinations'

export default async function DashboardEntryPoint() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const role = (session.user.role as string | undefined)?.toLowerCase()

  if (role === 'user') {
    redirect('/dashboard/user')
  }

  if (role === 'estimator') {
    redirect('/dashboard/estimator')
  }

  redirect(resolveRoleDestination(role))
}

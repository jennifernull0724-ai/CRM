import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveRoleDestination } from '@/lib/auth/roleDestinations'

export default async function AppResolverPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login?from=/app')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const destination = resolveRoleDestination(session.user.role)
  redirect(destination)
}

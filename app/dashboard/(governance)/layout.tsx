import { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/shells/dashboard-shell'
import { authOptions } from '@/lib/auth'
import { resolveRoleDestination, isOwnerOrAdmin } from '@/lib/auth/roleDestinations'
import { loadStandardSettings } from '@/lib/dashboard/standardSettings'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const normalizedRole = (session.user.role as string | undefined)?.toLowerCase()

  if (!isOwnerOrAdmin(normalizedRole)) {
    redirect(resolveRoleDestination(normalizedRole))
  }

  const standardSettings = await loadStandardSettings(session.user.companyId)

  return (
    <DashboardShell
      role={normalizedRole as 'owner' | 'admin'}
      userName={session.user.name ?? undefined}
      companyLogoUrl={standardSettings.branding.uiLogoUrl}
    >
      <div className="min-h-screen bg-slate-50">{children}</div>
    </DashboardShell>
  )
}

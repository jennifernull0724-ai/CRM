import type { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/shells/dashboard-shell'
import { authOptions } from '@/lib/auth'
import { loadStandardSettings } from '@/lib/dashboard/standardSettings'

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const normalizedRole = (session.user.role as string | undefined)?.toLowerCase()

  if (!normalizedRole || !['owner', 'admin'].includes(normalizedRole)) {
    redirect('/app')
  }

  const standardSettings = await loadStandardSettings(session.user.companyId)

  return (
    <DashboardShell
      role={normalizedRole as 'owner' | 'admin'}
      userName={session.user.name ?? undefined}
      companyLogoUrl={standardSettings.branding.uiLogoUrl}
    >
      <div className="min-h-screen bg-slate-50 p-6">{children}</div>
    </DashboardShell>
  )
}

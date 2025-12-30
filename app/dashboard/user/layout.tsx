import type { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { SurfaceShell, type ShellNavItem } from '@/components/shells/surface-shell'
import { authOptions } from '@/lib/auth'
import { loadStandardSettings } from '@/lib/dashboard/standardSettings'

const USER_DASHBOARD_NAV = [
  { path: '/dashboard/user', label: 'Dashboard', icon: 'dashboard' },
  { path: '/crm', label: 'CRM Workspace', icon: 'home' },
  { path: '/contacts', label: 'Contacts', icon: 'contacts' },
  { path: '/deals', label: 'Deals', icon: 'deals' },
] satisfies ShellNavItem[]

export default async function UserDashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const normalizedRole = (session.user.role as string | undefined)?.toLowerCase()
  if (normalizedRole !== 'user') {
    redirect('/dashboard')
  }

  const standardSettings = await loadStandardSettings(session.user.companyId)

  return (
    <SurfaceShell
      surfaceName="User Dashboard"
      companyLogoUrl={standardSettings.branding.uiLogoUrl}
      userName={session.user.name ?? undefined}
      userRoleLabel="Sales Workspace"
      navItems={USER_DASHBOARD_NAV}
    >
      <div className="min-h-screen bg-slate-50">{children}</div>
    </SurfaceShell>
  )
}

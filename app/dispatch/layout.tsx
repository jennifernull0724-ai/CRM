import type { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { DispatchShell } from '@/components/shells/dispatch-shell'
import { authOptions } from '@/lib/auth'
import { resolveRoleDestination } from '@/lib/auth/roleDestinations'
import { loadStandardSettings } from '@/lib/dashboard/standardSettings'

const DISPATCH_SURFACE_ROLES = new Set(['dispatch', 'admin', 'owner'])

export default async function DispatchLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const normalizedRole = (session.user.role as string | undefined)?.toLowerCase()

  if (!normalizedRole || !DISPATCH_SURFACE_ROLES.has(normalizedRole)) {
    redirect(resolveRoleDestination(normalizedRole))
  }

  const standardSettings = await loadStandardSettings(session.user.companyId)

  return (
    <DispatchShell
      userName={session.user.name ?? undefined}
      companyLogoUrl={standardSettings.branding.uiLogoUrl}
    >
      <div className="min-h-screen bg-slate-50">{children}</div>
    </DispatchShell>
  )
}

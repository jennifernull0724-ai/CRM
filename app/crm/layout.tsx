import type { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { CrmShell } from '@/components/shells/crm-shell'
import { authOptions } from '@/lib/auth'
import { loadStandardSettings } from '@/lib/dashboard/standardSettings'

export default async function CrmLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const standardSettings = await loadStandardSettings(session.user.companyId)

  return (
    <CrmShell
      userName={session.user.name ?? undefined}
      companyLogoUrl={standardSettings.branding.uiLogoUrl}
    >
      <div className="min-h-screen bg-slate-50">{children}</div>
    </CrmShell>
  )
}

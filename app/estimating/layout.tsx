import type { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { EstimatingShell } from '@/components/shells/estimating-shell'
import { authOptions } from '@/lib/auth'
import { requireEstimatorContext } from '@/lib/estimating/auth'
import { loadStandardSettings } from '@/lib/dashboard/standardSettings'

export default async function EstimatingLayout({ children }: { children: ReactNode }) {
  const [session, context] = await Promise.all([getServerSession(authOptions), requireEstimatorContext()])
  const standardSettings = await loadStandardSettings(context.companyId)

  return (
    <EstimatingShell
      userName={session?.user?.name ?? undefined}
      companyLogoUrl={standardSettings.branding.uiLogoUrl}
    >
      <div className="min-h-screen bg-slate-50">{children}</div>
    </EstimatingShell>
  )
}

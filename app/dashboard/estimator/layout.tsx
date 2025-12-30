import type { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { EstimatingShell } from '@/components/shells/estimating-shell'
import { authOptions } from '@/lib/auth'
import { requireEstimatorContext, type EstimatorContext } from '@/lib/estimating/auth'
import { loadStandardSettings } from '@/lib/dashboard/standardSettings'

export default async function EstimatorDashboardLayout({ children }: { children: ReactNode }) {
  let context: EstimatorContext
  try {
    context = await requireEstimatorContext()
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      redirect('/login')
    }
    redirect('/dashboard')
  }

  const [session, standardSettings] = await Promise.all([
    getServerSession(authOptions),
    loadStandardSettings(context.companyId),
  ])

  return (
    <EstimatingShell
      userName={session?.user?.name ?? undefined}
      companyLogoUrl={standardSettings.branding.uiLogoUrl}
    >
      <div className="min-h-screen bg-slate-50">{children}</div>
    </EstimatingShell>
  )
}

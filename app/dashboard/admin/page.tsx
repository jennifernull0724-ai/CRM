import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ContactAnalyticsCommand } from '@/app/dashboard/_components/contact-analytics-command'
import { AssetSummaryPanel } from '@/app/dashboard/_components/asset-summary-panel'
import { getAssetDashboardSummary } from '@/lib/assets/registry'

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?from=/dashboard/admin')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const role = session.user.role.toLowerCase()

  if (role === 'owner') {
    redirect('/dashboard/owner')
  }

  if (role !== 'admin') {
    redirect('/dashboard/user')
  }

  const summary = await getAssetDashboardSummary(session.user.companyId)

  return (
    <>
      <ContactAnalyticsCommand variant="admin" />
      <AssetSummaryPanel summary={summary} role="admin" />
      <div className="mx-auto mt-8 max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Dispatch presets</p>
            <p className="text-xs text-slate-500">Manage base + discipline execution presets.</p>
          </div>
          <Link
            href="/dashboard/admin/dispatch-presets"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Manage
          </Link>
        </div>
      </div>
    </>
  )
}

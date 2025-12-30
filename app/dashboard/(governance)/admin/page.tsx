import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveRoleDestination } from '@/lib/auth/roleDestinations'
import { ContactAnalyticsCommand } from '@/app/dashboard/_components/contact-analytics-command'
import { AssetSummaryPanel } from '@/app/dashboard/_components/asset-summary-panel'
import { ControlPlaneDashboard } from '@/app/dashboard/_components/control-plane-dashboard'
import { StandardSettingsQuickLinks } from '@/app/dashboard/_components/standard-settings-quick-links'

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
    redirect(resolveRoleDestination(role))
  }

  const payload = await fetchAdminDashboard()

  return (
    <>
      <ControlPlaneDashboard variant="admin" data={payload.data} planKey={payload.planKey} viewer={payload.viewer} />
      <StandardSettingsQuickLinks snapshot={payload.standardSettings} role="admin" />
      <ContactAnalyticsCommand variant="admin" data={payload.contactAnalytics} />
      <AssetSummaryPanel summary={payload.assetSummary} role="admin" />
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

async function fetchAdminDashboard() {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
  const protocol = headerList.get('x-forwarded-proto') ?? 'http'

  if (!host) {
    throw new Error('Missing host header for admin dashboard request')
  }

  const cookieStore = await cookies()
  const serializedCookies = cookieStore.getAll().map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
  const response = await fetch(`${protocol}://${host}/api/dashboard/admin`, {
    method: 'GET',
    headers: serializedCookies ? { Cookie: serializedCookies } : undefined,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Unable to load admin dashboard analytics')
  }

  return response.json()
}

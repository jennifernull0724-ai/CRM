import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { loadStandardSettings } from '@/lib/dashboard/standardSettings'
import { StandardSettingsPanel } from '@/app/dashboard/_components/standard-settings-panel'

export default async function SettingsProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?from=/settings/profile')
  }

  if (!session.user.companyId) {
    redirect('/login?from=/settings/profile')
  }

  const standardSettings = await loadStandardSettings(session.user.companyId)
  const role = (session.user.role as string)?.toLowerCase()
  const viewerRole = role === 'owner' || role === 'admin' ? (role as 'owner' | 'admin') : 'user'

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <header>
          <p className="text-sm uppercase tracking-wide text-slate-500">Settings</p>
          <h1 className="text-3xl font-bold text-slate-900">Profile & Email</h1>
          <p className="text-slate-600">Connect providers, manage templates, signatures, and profile settings.</p>
        </header>

        <StandardSettingsPanel
          viewer={{
            id: session.user.id,
            name: session.user.name ?? session.user.email ?? 'User',
            email: session.user.email ?? 'user@example.com',
            role: viewerRole,
          }}
          settings={standardSettings}
        />
      </div>
    </div>
  )
}

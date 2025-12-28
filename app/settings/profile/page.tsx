import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function SettingsProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?from=/settings/profile')
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <header>
          <p className="text-sm uppercase tracking-wide text-slate-500">Settings</p>
          <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
          <p className="text-slate-600">
            Connect Gmail/Outlook, set signatures, manage notifications. Starter plan restrictions still apply (no multi-user
            invites).
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">User</p>
          <p className="text-slate-900 text-lg mt-2">{session.user.name}</p>
          <p className="text-slate-600 text-sm">{session.user.email}</p>
          <p className="text-xs text-slate-500 mt-4">TODO: Add form + OAuth connectors for email integration.</p>
        </section>
      </div>
    </div>
  )
}

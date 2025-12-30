import Link from 'next/link'
import type { StandardSettingsSnapshot } from '@/lib/dashboard/standardSettings'

const formatDate = (input: string | null) => {
  if (!input) return 'Never updated'
  return new Date(input).toLocaleDateString()
}

const formatConnection = (connected: boolean, active: boolean) => {
  if (!connected) return 'Disconnected'
  return active ? 'Active' : 'Connected'
}

const roleAllowsBranding = (role: string) => role === 'owner' || role === 'admin'

const settingsDescription = {
  email: 'Gmail + Outlook connectors, template curation (≤5 surfaced here), signatures, read receipts, and recipient self-exclusion toggles live in Settings → Profile.',
  branding: 'Owner/Admin only — shell logo plus estimating & dispatch PDF logos live in Settings → Branding. Empty slots stay blank until you upload.',
  profile: 'Profile cards cover display name, timezone, and notification defaults. Email identity updates propagate instantly across CRM.',
}

type Props = {
  snapshot: StandardSettingsSnapshot
  role: 'user' | 'estimator' | 'dispatch' | 'admin' | 'owner'
}

export function StandardSettingsQuickLinks({ snapshot, role }: Props) {
  const templateNames = snapshot.email.templates.map((template) => template.name)
  const brandingAllowed = roleAllowsBranding(role)

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Standard settings</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Email, branding, and profile access</h2>
          <p className="text-sm text-slate-600">Dashboards stay read-only. Use these links to jump into the mutable settings surfaces.</p>
        </div>
        <Link className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" href="/settings">
          Open Settings
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Email integrations</p>
              <p className="text-xs text-slate-500">Gmail + Outlook status</p>
            </div>
            <Link className="text-xs font-semibold text-blue-600" href="/settings/profile">
              Manage
            </Link>
          </div>
          <dl className="mt-4 space-y-2 text-sm text-slate-600">
            <div className="flex justify-between">
              <dt>Gmail</dt>
              <dd className="font-semibold text-slate-900">{formatConnection(snapshot.email.gmail.connected, snapshot.email.gmail.active)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Outlook</dt>
              <dd className="font-semibold text-slate-900">{formatConnection(snapshot.email.outlook.connected, snapshot.email.outlook.active)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Recipient exclusions</dt>
              <dd className="font-semibold text-slate-900">{snapshot.email.recipientExclusionCount}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">{settingsDescription.email}</p>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Templates & signatures</p>
              <p className="text-xs text-slate-500">Surfaced from server aggregates</p>
            </div>
            <Link className="text-xs font-semibold text-blue-600" href="/settings/profile">
              Configure
            </Link>
          </div>
          <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Templates ({templateNames.length}/{snapshot.email.templateLimit})</p>
          {templateNames.length ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {templateNames.map((name) => (
                <li key={name} className="truncate">{name}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No templates stored.</p>
          )}
          <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">Signatures ({snapshot.email.signatures.length})</p>
          <p className="text-sm text-slate-700">
            Active: <span className="font-semibold text-slate-900">{snapshot.email.activeSignatureName ?? 'None'}</span>
          </p>
          <p className="mt-3 text-xs text-slate-500">Read receipts + attachment defaults travel with these templates.</p>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Profile</p>
              <p className="text-xs text-slate-500">Name, avatar, notifications</p>
            </div>
            <Link className="text-xs font-semibold text-blue-600" href="/settings/profile">
              Update
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-600">Display name + signature pairing update instantly across CRM, estimating, dispatch, and email sends.</p>
          <p className="mt-3 text-xs text-slate-500">{settingsDescription.profile}</p>
        </article>
      </div>

      {brandingAllowed ? (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Branding</p>
              <p className="text-xs text-slate-500">UI + estimating logos</p>
            </div>
            <Link className="text-xs font-semibold text-blue-600" href="/settings/branding">
              Branding hub
            </Link>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm text-slate-600">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Shell logo</dt>
              <dd className="font-semibold text-slate-900">{snapshot.branding.uiLogoUrl ? 'Uploaded' : 'Empty slot'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Estimating PDF logo</dt>
              <dd className="font-semibold text-slate-900">{snapshot.branding.pdfLogoUrl ? 'Uploaded' : 'Empty slot'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Dispatch PDF logo</dt>
              <dd className="font-semibold text-slate-900">
                {snapshot.branding.dispatchPdfLogoUrl ? 'Uploaded' : snapshot.branding.pdfLogoUrl ? 'Inheriting estimating logo' : 'Empty slot'}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Last update: {formatDate(snapshot.branding.lastUpdatedAt)} {snapshot.branding.lastUpdatedByName ? `by ${snapshot.branding.lastUpdatedByName}` : ''}
          </p>
          <p className="mt-2 text-xs text-slate-500">{settingsDescription.branding}</p>
        </div>
      ) : null}
    </section>
  )
}

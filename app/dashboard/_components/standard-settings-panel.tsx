import { formatDistanceToNow } from 'date-fns'
import type { StandardSettingsData } from '@/lib/dashboard/standardSettings'
import {
  manageEmailIntegrationAction,
  createEmailTemplateAction,
  updateEmailTemplateAction,
  deleteEmailTemplateAction,
  setDefaultEmailTemplateAction,
  createEmailSignatureAction,
  updateEmailSignatureAction,
  activateEmailSignatureAction,
  deleteEmailSignatureAction,
  upsertRecipientPreferenceAction,
} from '@/app/dashboard/actions'
import {
  updateProfileAction,
  uploadPdfLogoAction,
  removePdfLogoAction,
  uploadDispatchPdfLogoAction,
  removeDispatchPdfLogoAction,
} from '@/app/dashboard/settings/actions'

const emailProvidersList = [
  { key: 'gmail', label: 'Gmail Workspace' },
  { key: 'outlook', label: 'Microsoft 365' },
  { key: 'custom', label: 'Custom SMTP' },
] as const

const templateScopes = [
  { key: 'crm', label: 'CRM' },
  { key: 'estimating', label: 'Estimating' },
  { key: 'dispatch', label: 'Dispatch' },
  { key: 'work_orders', label: 'Work orders' },
  { key: 'global', label: 'Global' },
] as const

type Props = {
  viewer: {
    id: string
    name: string
    email: string
    role: 'owner' | 'admin' | 'user'
  }
  settings: StandardSettingsData
}

export function StandardSettingsPanel({ viewer, settings }: Props) {
  const integrationMap = settings.email.integrations.reduce<Record<string, (typeof settings.email.integrations)[number]>>(
    (acc, integration) => {
      acc[integration.provider] = integration
      return acc
    },
    {}
  )

  const activeSignature = settings.email.signatures.find((signature) => signature.isActive) ?? null
  const canManageBranding = viewer.role === 'owner' || viewer.role === 'admin'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-wide text-slate-500">Standard settings</p>
        <h2 className="text-2xl font-semibold text-slate-900">Email + identity controls</h2>
        <p className="text-sm text-slate-600">
          Applies instantly across CRM, estimating, and dispatch threads. {viewer.role === 'user' ? 'Owners still govern compliance and branding uploads.' : 'Share with every user dashboard.'}
        </p>
      </div>

      <div className="space-y-10">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Email integrations</h3>
            <p className="text-xs text-slate-500">Connect one provider at a time. No role gating.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {emailProvidersList.map((provider) => {
              const integration = integrationMap[provider.key]
              const connected = integration?.status === 'connected'
              return (
                <div key={provider.key} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{provider.label}</p>
                      <p className="text-xs text-slate-500">{connected ? 'Connected' : 'Disconnected'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${integration?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {integration?.isActive ? 'Active' : 'Idle'}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {integration?.connectedAt
                      ? `Connected ${formatDistanceToNow(new Date(integration.connectedAt), { addSuffix: true })}`
                      : 'No connection recorded'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <form action={manageEmailIntegrationAction}>
                      <input type="hidden" name="provider" value={provider.key} />
                      <input type="hidden" name="intent" value="connect" />
                      <button
                        type="submit"
                        className={`rounded-lg px-3 py-1 font-semibold ${connected ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white'}`}
                        disabled={connected}
                      >
                        {connected ? 'Connected' : 'Connect'}
                      </button>
                    </form>
                    {integration ? (
                      <form action={manageEmailIntegrationAction}>
                        <input type="hidden" name="provider" value={provider.key} />
                        <input type="hidden" name="intent" value="disconnect" />
                        <button type="submit" className="rounded-lg bg-rose-600 px-3 py-1 font-semibold text-white">
                          Disconnect
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Email templates</h3>
            {settings.email.templates.length ? (
              settings.email.templates.map((template) => (
                <div key={template.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{template.name}</p>
                      <p className="text-xs text-slate-500">
                        {templateScopes.find((scope) => scope.key === template.scope)?.label ?? template.scope} · Updated{' '}
                        {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
                        {template.updatedByName ? ` by ${template.updatedByName}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {template.isDefault ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">Default</span>
                      ) : (
                        <form action={setDefaultEmailTemplateAction}>
                          <input type="hidden" name="templateId" value={template.id} />
                          <button type="submit" className="rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-700">
                            Make default
                          </button>
                        </form>
                      )}
                      <form action={deleteEmailTemplateAction}>
                        <input type="hidden" name="templateId" value={template.id} />
                        <button type="submit" className="rounded-lg bg-rose-50 px-3 py-1 font-semibold text-rose-700">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                  <form action={updateEmailTemplateAction} className="mt-4 space-y-3">
                    <input type="hidden" name="templateId" value={template.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        name="name"
                        defaultValue={template.name}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Template name"
                      />
                      <input
                        name="subject"
                        defaultValue={template.subject}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Subject"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select name="scope" defaultValue={template.scope} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        {templateScopes.map((scope) => (
                          <option key={scope.key} value={scope.key}>
                            {scope.label}
                          </option>
                        ))}
                      </select>
                      <textarea
                        name="body"
                        defaultValue={template.body}
                        rows={3}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Body"
                      />
                    </div>
                    <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                      Save template
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No templates yet.</p>
            )}
          </div>
          <form action={createEmailTemplateAction} className="space-y-3 rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-semibold text-slate-700">Create template</p>
            <input name="name" placeholder="Template name" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="subject" placeholder="Subject" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select name="scope" required defaultValue="" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="" disabled>
                Select scope
              </option>
              {templateScopes.map((scope) => (
                <option key={scope.key} value={scope.key}>
                  {scope.label}
                </option>
              ))}
            </select>
            <textarea name="body" placeholder="Template body" rows={4} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <label className="inline-flex items-center gap-2 text-xs text-slate-500">
              <input type="checkbox" name="isDefault" value="true" /> Set as default for scope
            </label>
            <button type="submit" className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
              Save template
            </button>
          </form>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Signatures</h3>
            {settings.email.signatures.length ? (
              settings.email.signatures.map((signature) => (
                <div key={signature.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{signature.name}</p>
                      <p className="text-xs text-slate-500">
                        Created {formatDistanceToNow(new Date(signature.createdAt), { addSuffix: true })}
                        {signature.createdByName ? ` by ${signature.createdByName}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {signature.isActive ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">Active</span>
                      ) : (
                        <form action={activateEmailSignatureAction}>
                          <input type="hidden" name="signatureId" value={signature.id} />
                          <button type="submit" className="rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-700">
                            Activate
                          </button>
                        </form>
                      )}
                      <form action={deleteEmailSignatureAction}>
                        <input type="hidden" name="signatureId" value={signature.id} />
                        <button type="submit" className="rounded-lg bg-rose-50 px-3 py-1 font-semibold text-rose-700">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                  <form action={updateEmailSignatureAction} className="mt-3 space-y-2">
                    <input type="hidden" name="signatureId" value={signature.id} />
                    <input name="name" defaultValue={signature.name} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    <textarea
                      name="content"
                      defaultValue={signature.content}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                      Save signature
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No signatures stored.</p>
            )}
          </div>
          <form action={createEmailSignatureAction} className="space-y-3 rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-semibold text-slate-700">Create signature</p>
            <input name="name" placeholder="Name" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <textarea name="content" placeholder="Signature content" rows={4} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <label className="inline-flex items-center gap-2 text-xs text-slate-500">
              <input type="checkbox" name="isActive" value="true" /> Set active
            </label>
            <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Save signature
            </button>
          </form>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Recipient preferences</h3>
            {settings.email.recipientPreferences.length ? (
              settings.email.recipientPreferences.map((preference) => (
                <div key={preference.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{preference.email}</p>
                      <p className="text-xs text-slate-500">
                        Updated {formatDistanceToNow(new Date(preference.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <form action={upsertRecipientPreferenceAction}>
                      <input type="hidden" name="preferenceId" value={preference.id} />
                      <input type="hidden" name="sendEnabled" value={(!preference.sendEnabled).toString()} />
                      <input type="hidden" name="reason" value={preference.reason ?? ''} />
                      <button
                        type="submit"
                        className={`rounded-lg px-3 py-1 text-xs font-semibold ${preference.sendEnabled ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}
                      >
                        {preference.sendEnabled ? 'Pause sending' : 'Resume sending'}
                      </button>
                    </form>
                  </div>
                  <form action={upsertRecipientPreferenceAction} className="mt-3 space-y-2 text-sm">
                    <input type="hidden" name="preferenceId" value={preference.id} />
                    <input type="hidden" name="sendEnabled" value={preference.sendEnabled.toString()} />
                    <label className="text-xs text-slate-500">Reason / note</label>
                    <input
                      name="reason"
                      defaultValue={preference.reason ?? ''}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      placeholder="Optional internal note"
                    />
                    <button type="submit" className="w-full rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">
                      Save note
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No preferences recorded.</p>
            )}
          </div>
          <form action={upsertRecipientPreferenceAction} className="space-y-3 rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-semibold text-slate-700">Add recipient preference</p>
            <input name="email" type="email" placeholder="email@example.com" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select name="sendEnabled" defaultValue="true" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="true">Allow sending</option>
              <option value="false">Pause sending</option>
            </select>
            <input name="reason" placeholder="Reason / note" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Save preference
            </button>
            <p className="text-xs text-slate-500">Lists sync across email + drip tooling instantly.</p>
          </form>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <p className="text-sm font-semibold text-slate-700">Branding</p>
            <div className="mt-3 space-y-4 text-sm text-slate-600">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">CRM UI logo</p>
                {settings.branding.uiLogoUrl ? (
                  <img src={settings.branding.uiLogoUrl} alt="CRM UI logo" className="mt-2 h-16 w-auto rounded-lg border border-slate-200 bg-white object-contain" />
                ) : (
                  <p className="mt-2 text-slate-500">No logo uploaded.</p>
                )}
                {!canManageBranding ? <p className="mt-1 text-xs font-semibold text-slate-500">Owner/Admin only</p> : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Estimating PDF logo</p>
                {settings.branding.pdfLogoUrl ? (
                  <div className="space-y-3">
                    <img src={settings.branding.pdfLogoUrl} alt="PDF logo" className="mt-2 h-16 w-auto rounded-lg border border-slate-200 bg-white object-contain" />
                    <p className="text-xs text-slate-500">{settings.branding.pdfLogoFileName ?? 'Uploaded logo'}</p>
                    <form action={uploadPdfLogoAction} encType="multipart/form-data" className="flex flex-col gap-2 text-xs">
                      <input type="hidden" name="replace" value="true" />
                      <input name="logo" type="file" accept="image/*" className="text-xs text-slate-600" required disabled={!canManageBranding} />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-700 disabled:opacity-50"
                        disabled={!canManageBranding}
                      >
                        Replace logo
                      </button>
                    </form>
                    <form action={removePdfLogoAction}>
                      <button type="submit" className="text-xs font-semibold text-rose-600 disabled:opacity-50" disabled={!canManageBranding}>
                        Remove logo
                      </button>
                    </form>
                  </div>
                ) : (
                  <form action={uploadPdfLogoAction} encType="multipart/form-data" className="space-y-2">
                    <input name="logo" type="file" accept="image/*" required className="text-sm text-slate-600" disabled={!canManageBranding} />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      disabled={!canManageBranding}
                    >
                      Upload PDF logo
                    </button>
                    <p className="text-xs text-slate-500">PNG or SVG, 600×200 preferred.</p>
                  </form>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Dispatch PDF logo</p>
                {settings.branding.dispatchPdfLogoUrl ? (
                  <div className="space-y-3">
                    <img
                      src={settings.branding.dispatchPdfLogoUrl}
                      alt="Dispatch PDF logo"
                      className="mt-2 h-16 w-auto rounded-lg border border-slate-200 bg-white object-contain"
                    />
                    <p className="text-xs text-slate-500">{settings.branding.dispatchPdfLogoFileName ?? 'Uploaded logo'}</p>
                    <form action={uploadDispatchPdfLogoAction} encType="multipart/form-data" className="flex flex-col gap-2 text-xs">
                      <input type="hidden" name="replace" value="true" />
                      <input name="logo" type="file" accept="image/*" className="text-xs text-slate-600" required disabled={!canManageBranding} />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-700 disabled:opacity-50"
                        disabled={!canManageBranding}
                      >
                        Replace logo
                      </button>
                    </form>
                    <form action={removeDispatchPdfLogoAction}>
                      <button type="submit" className="text-xs font-semibold text-rose-600 disabled:opacity-50" disabled={!canManageBranding}>
                        Remove logo
                      </button>
                    </form>
                  </div>
                ) : (
                  <form action={uploadDispatchPdfLogoAction} encType="multipart/form-data" className="space-y-2">
                    <input name="logo" type="file" accept="image/*" required className="text-sm text-slate-600" disabled={!canManageBranding} />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      disabled={!canManageBranding}
                    >
                      Upload dispatch logo
                    </button>
                    <p className="text-xs text-slate-500">Defaults to the estimating logo when empty.</p>
                  </form>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Updated {settings.branding.lastUpdatedAt ? formatDistanceToNow(new Date(settings.branding.lastUpdatedAt), { addSuffix: true }) : 'never'}
                {settings.branding.lastUpdatedByName ? ` by ${settings.branding.lastUpdatedByName}` : ''}. Dispatch PDFs use this slot when available; otherwise they inherit the estimating logo.
              </p>
            </div>
          </div>
          <form action={updateProfileAction} className="rounded-2xl border border-slate-100 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Profile</p>
            <div>
              <label className="text-xs text-slate-500">Name</label>
              <input
                name="name"
                defaultValue={viewer.name}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Email (login)</label>
              <input value={viewer.email} disabled className="mt-1 w-full rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-500">New password</label>
                <input type="password" name="password" placeholder="Leave blank to keep" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Confirm password</label>
                <input type="password" name="confirmPassword" placeholder="Leave blank to keep" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
            </div>
            <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Save profile
            </button>
            <p className="text-xs text-slate-500">Passwords require 12+ characters. Changing name updates everywhere instantly.</p>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-sm text-slate-500">
            Active signature: {activeSignature ? `${activeSignature.name}` : 'not set'}. Email templates + signatures apply to every estimate dispatch + CRM thread regardless of role.
          </p>
        </div>
      </div>
    </section>
  )
}

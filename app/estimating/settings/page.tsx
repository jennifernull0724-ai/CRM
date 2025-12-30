import Image from 'next/image'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { EstimatePresetIndustry } from '@prisma/client'
import { requireEstimatorContext } from '@/lib/estimating/auth'
import { loadStandardSettings, type StandardSettingsData } from '@/lib/dashboard/standardSettings'
import { listEstimatingPresets, groupPresetsByIndustry } from '@/lib/estimating/presets'
import {
  manageEstimatingEmailIntegrationAction,
  createEstimatingEmailTemplateAction,
  updateEstimatingEmailTemplateAction,
  deleteEstimatingEmailTemplateAction,
  setDefaultEstimatingEmailTemplateAction,
  createEstimatingEmailSignatureAction,
  updateEstimatingEmailSignatureAction,
  activateEstimatingEmailSignatureAction,
  deleteEstimatingEmailSignatureAction,
  upsertEstimatingRecipientPreferenceAction,
  updatePresetDetailsFromSettingsAction,
  togglePresetFromSettingsAction,
  reorderPresetFromSettingsAction,
} from '@/app/estimating/settings/actions'
import {
  uploadPdfLogoAction,
  removePdfLogoAction,
  uploadUiLogoAction,
  removeUiLogoAction,
  uploadDispatchPdfLogoAction,
  removeDispatchPdfLogoAction,
} from '@/app/dashboard/settings/actions'

const TAB_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'templates', label: 'Templates' },
  { value: 'presets', label: 'Presets' },
  { value: 'branding', label: 'Branding' },
] as const

const EMAIL_PROVIDERS = [
  { key: 'gmail', label: 'Gmail Workspace' },
  { key: 'outlook', label: 'Microsoft 365' },
  { key: 'custom', label: 'Custom SMTP' },
] as const

const TEMPLATE_SCOPE_OPTIONS = [
  { key: 'estimating', label: 'Estimating only' },
  { key: 'global', label: 'Global shared' },
] as const

const INDUSTRY_LABELS: Record<EstimatePresetIndustry, string> = {
  BASE: 'Base',
  RAILROAD: 'Railroad',
  CONSTRUCTION: 'Construction',
  ENVIRONMENTAL: 'Environmental',
}

type TabValue = (typeof TAB_OPTIONS)[number]['value']

type SearchParams = Record<string, string | string[] | undefined>

const INDUSTRY_ORDER: EstimatePresetIndustry[] = ['BASE', 'RAILROAD', 'CONSTRUCTION', 'ENVIRONMENTAL']

function resolveActiveTab(value: SearchParams['tab']): TabValue {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return 'email'
  return TAB_OPTIONS.some((tab) => tab.value === raw) ? (raw as TabValue) : 'email'
}

export default async function EstimatingSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const { companyId, role } = await requireEstimatorContext()
  const activeTab = resolveActiveTab(searchParams.tab)

  const [standardSettings, presets] = await Promise.all([
    loadStandardSettings(companyId),
    listEstimatingPresets(companyId),
  ])

  const groupedPresets = groupPresetsByIndustry(presets)
  const canManageBranding = role === 'owner' || role === 'admin'

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Estimating console</p>
            <h1 className="text-3xl font-bold text-slate-900">Settings command center</h1>
            <p className="text-slate-600">
              Email integrations, templates, presets, and branding without touching deal workflows.
            </p>
          </div>
          <Link
            href="/settings/profile"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-400"
          >
            Go to profile settings
          </Link>
        </header>

        <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
          {TAB_OPTIONS.map((tab) => {
            const href = tab.value === 'email' ? '/estimating/settings' : `/estimating/settings?tab=${tab.value}`
            const active = tab.value === activeTab
            return (
              <Link
                key={tab.value}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        {activeTab === 'email' ? <EmailTab settings={standardSettings} /> : null}
        {activeTab === 'templates' ? <TemplatesTab settings={standardSettings} /> : null}
        {activeTab === 'presets' ? <PresetsTab groupedPresets={groupedPresets} /> : null}
        {activeTab === 'branding' ? (
          <BrandingTab settings={standardSettings} canManageBranding={canManageBranding} />
        ) : null}
      </div>
    </div>
  )
}

function EmailTab({ settings }: { settings: StandardSettingsData }) {
  const integrationMap = settings.email.integrations.reduce<Record<string, (typeof settings.email.integrations)[number]>>(
    (acc, integration) => {
      acc[integration.provider] = integration
      return acc
    },
    {}
  )

  const signatures = settings.email.signatures
  const preferences = settings.email.recipientPreferences

  return (
    <div className="space-y-10">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Email integrations</h2>
            <p className="text-sm text-slate-500">Live provider status shared across CRM, estimating, and dispatch.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {EMAIL_PROVIDERS.map((provider) => {
            const integration = integrationMap[provider.key]
            const connected = integration?.status === 'connected'
            return (
              <div key={provider.key} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{provider.label}</p>
                    <p className="text-xs text-slate-500">{connected ? 'Connected' : 'Disconnected'}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      integration?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {integration?.isActive ? 'Active' : 'Idle'}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {integration?.connectedAt
                    ? `Connected ${formatDistanceToNow(new Date(integration.connectedAt), { addSuffix: true })}`
                    : 'No connection recorded'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <form action={manageEstimatingEmailIntegrationAction}>
                    <input type="hidden" name="provider" value={provider.key} />
                    <input type="hidden" name="intent" value="connect" />
                    <button
                      type="submit"
                      className={`rounded-lg px-3 py-1 font-semibold ${
                        connected ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white'
                      }`}
                      disabled={connected}
                    >
                      {connected ? 'Connected' : 'Connect'}
                    </button>
                  </form>
                  {integration ? (
                    <form action={manageEstimatingEmailIntegrationAction}>
                      <input type="hidden" name="provider" value={provider.key} />
                      <input type="hidden" name="intent" value="disconnect" />
                      <button type="submit" className="rounded-lg bg-rose-100 px-3 py-1 font-semibold text-rose-700">
                        Disconnect
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Signatures</h3>
              <p className="text-sm text-slate-500">Shared across estimating send flows.</p>
            </div>
          </div>
          {signatures.length ? (
            <div className="space-y-4">
              {signatures.map((signature) => (
                <div key={signature.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{signature.name}</p>
                      <p className="text-xs text-slate-500">
                        Created {formatDistanceToNow(new Date(signature.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {signature.isActive ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">Active</span>
                      ) : (
                        <form action={activateEstimatingEmailSignatureAction}>
                          <input type="hidden" name="signatureId" value={signature.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-700"
                          >
                            Activate
                          </button>
                        </form>
                      )}
                      <form action={deleteEstimatingEmailSignatureAction}>
                        <input type="hidden" name="signatureId" value={signature.id} />
                        <button type="submit" className="rounded-lg bg-rose-50 px-3 py-1 font-semibold text-rose-700">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                  <form action={updateEstimatingEmailSignatureAction} className="mt-3 space-y-3 text-sm">
                    <input type="hidden" name="signatureId" value={signature.id} />
                    <input
                      name="name"
                      defaultValue={signature.name}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                    <textarea
                      name="content"
                      defaultValue={signature.content}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                    <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white">
                      Save signature
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No signatures saved.</p>
          )}
        </div>
        <form action={createEstimatingEmailSignatureAction} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Create signature</h3>
          <input name="name" placeholder="Signature name" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea name="content" placeholder="Signature content" rows={4} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" name="isActive" value="true" /> Set as active signature
          </label>
          <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Save signature
          </button>
        </form>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Recipient preferences</h3>
            <p className="text-xs text-slate-500">{preferences.length} entries</p>
          </div>
          {preferences.length ? (
            <div className="space-y-4">
              {preferences.map((preference) => (
                <div key={preference.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{preference.email}</p>
                      <p className="text-xs text-slate-500">
                        Updated {formatDistanceToNow(new Date(preference.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <form action={upsertEstimatingRecipientPreferenceAction}>
                      <input type="hidden" name="preferenceId" value={preference.id} />
                      <input type="hidden" name="sendEnabled" value={(!preference.sendEnabled).toString()} />
                      <input type="hidden" name="reason" value={preference.reason ?? ''} />
                      <button
                        type="submit"
                        className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                          preference.sendEnabled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {preference.sendEnabled ? 'Pause sending' : 'Resume sending'}
                      </button>
                    </form>
                  </div>
                  <form action={upsertEstimatingRecipientPreferenceAction} className="mt-3 space-y-2 text-sm">
                    <input type="hidden" name="preferenceId" value={preference.id} />
                    <input type="hidden" name="sendEnabled" value={preference.sendEnabled.toString()} />
                    <label className="text-xs text-slate-500">Reason / note</label>
                    <input
                      name="reason"
                      defaultValue={preference.reason ?? ''}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      placeholder="Optional note"
                    />
                    <button type="submit" className="w-full rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">
                      Save note
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No recipient overrides.</p>
          )}
        </div>
        <form action={upsertEstimatingRecipientPreferenceAction} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Add recipient preference</h3>
          <input
            name="email"
            type="email"
            placeholder="email@example.com"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select name="sendEnabled" defaultValue="true" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="true">Allow sending</option>
            <option value="false">Pause sending</option>
          </select>
          <input name="reason" placeholder="Reason / note" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Save preference
          </button>
          <p className="text-xs text-slate-500">Applies instantly to estimating send flows.</p>
        </form>
      </section>
    </div>
  )
}

function TemplatesTab({ settings }: { settings: StandardSettingsData }) {
  const scopedTemplates = settings.email.templates.filter((template) => ['estimating', 'global'].includes(template.scope))

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Estimating templates</h2>
            <p className="text-xs text-slate-500">{scopedTemplates.length} stored</p>
          </div>
          {scopedTemplates.length ? (
            <div className="space-y-4">
              {scopedTemplates.map((template) => (
                <div key={template.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{template.name}</p>
                      <p className="text-xs text-slate-500">
                        {TEMPLATE_SCOPE_OPTIONS.find((scope) => scope.key === template.scope)?.label ?? template.scope} · Updated{' '}
                        {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {template.isDefault ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">Default</span>
                      ) : (
                        <form action={setDefaultEstimatingEmailTemplateAction}>
                          <input type="hidden" name="templateId" value={template.id} />
                          <button type="submit" className="rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-700">
                            Make default
                          </button>
                        </form>
                      )}
                      <form action={deleteEstimatingEmailTemplateAction}>
                        <input type="hidden" name="templateId" value={template.id} />
                        <button type="submit" className="rounded-lg bg-rose-50 px-3 py-1 font-semibold text-rose-700">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                  <form action={updateEstimatingEmailTemplateAction} className="mt-3 space-y-3 text-sm">
                    <input type="hidden" name="templateId" value={template.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        name="name"
                        defaultValue={template.name}
                        className="rounded-lg border border-slate-200 px-3 py-2"
                        placeholder="Template name"
                      />
                      <input
                        name="subject"
                        defaultValue={template.subject}
                        className="rounded-lg border border-slate-200 px-3 py-2"
                        placeholder="Subject"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select name="scope" defaultValue={template.scope} className="rounded-lg border border-slate-200 px-3 py-2">
                        {TEMPLATE_SCOPE_OPTIONS.map((scope) => (
                          <option key={scope.key} value={scope.key}>
                            {scope.label}
                          </option>
                        ))}
                      </select>
                      <textarea
                        name="body"
                        defaultValue={template.body}
                        rows={3}
                        className="rounded-lg border border-slate-200 px-3 py-2"
                        placeholder="Template body"
                      />
                    </div>
                    <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white">
                      Save template
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No templates yet.</p>
          )}
        </div>
        <form action={createEstimatingEmailTemplateAction} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Create template</h3>
          <input name="name" placeholder="Template name" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="subject" placeholder="Subject" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select name="scope" defaultValue="estimating" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {TEMPLATE_SCOPE_OPTIONS.map((scope) => (
              <option key={scope.key} value={scope.key}>
                {scope.label}
              </option>
            ))}
          </select>
          <textarea name="body" placeholder="Template body" rows={5} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" name="isDefault" value="true" /> Set as default for scope
          </label>
          <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Save template
          </button>
          <p className="text-xs text-slate-500">Estimating + global scopes only to preserve CRM templates.</p>
        </form>
      </section>
    </div>
  )
}

function PresetsTab({ groupedPresets }: { groupedPresets: ReturnType<typeof groupPresetsByIndustry> }) {
  return (
    <div className="space-y-6">
      {INDUSTRY_ORDER.map((industry) => {
        const presets = groupedPresets[industry] ?? []
        return (
          <section key={industry} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">{INDUSTRY_LABELS[industry]}</h2>
              <p className="text-xs text-slate-500">{presets.length} presets</p>
            </div>
            {presets.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {presets.map((preset, index) => {
                  const unitCost = preset.defaultUnitCost ? Number(preset.defaultUnitCost).toString() : '0'
                  const atTop = index === 0
                  const atBottom = index === presets.length - 1
                  return (
                    <div key={preset.id} className="rounded-2xl border border-slate-100 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{preset.label}</p>
                          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                            {preset.isOther ? <span className="rounded-full bg-slate-200 px-2 py-0.5">Mandatory</span> : null}
                            {preset.locked ? <span className="rounded-full bg-slate-200 px-2 py-0.5">Locked</span> : null}
                            {!preset.enabled ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">Disabled</span> : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <form action={togglePresetFromSettingsAction}>
                            <input type="hidden" name="presetId" value={preset.id} />
                            <input type="hidden" name="enabled" value={(!preset.enabled).toString()} />
                            <button
                              type="submit"
                              className={`rounded-lg px-3 py-1 font-semibold ${
                                preset.enabled ? 'bg-rose-50 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                              }`}
                              disabled={preset.isOther && preset.enabled}
                            >
                              {preset.enabled ? 'Disable' : 'Enable'}
                            </button>
                          </form>
                          <div className="flex flex-col gap-1">
                            <form action={reorderPresetFromSettingsAction}>
                              <input type="hidden" name="presetId" value={preset.id} />
                              <input type="hidden" name="direction" value="up" />
                              <button
                                type="submit"
                                className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600"
                                disabled={atTop}
                              >
                                ↑
                              </button>
                            </form>
                            <form action={reorderPresetFromSettingsAction}>
                              <input type="hidden" name="presetId" value={preset.id} />
                              <input type="hidden" name="direction" value="down" />
                              <button
                                type="submit"
                                className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600"
                                disabled={atBottom}
                              >
                                ↓
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                      <form action={updatePresetDetailsFromSettingsAction} className="mt-3 space-y-3 text-sm">
                        <input type="hidden" name="presetId" value={preset.id} />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            name="label"
                            defaultValue={preset.label}
                            className="rounded-lg border border-slate-200 px-3 py-2"
                            disabled={preset.locked}
                          />
                          <input
                            name="unit"
                            defaultValue={preset.defaultUnit}
                            className="rounded-lg border border-slate-200 px-3 py-2"
                            disabled={preset.locked}
                          />
                        </div>
                        <textarea
                          name="description"
                          defaultValue={preset.defaultDescription}
                          rows={3}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          disabled={preset.locked}
                        />
                        <input
                          name="unitCost"
                          type="number"
                          step="0.01"
                          defaultValue={unitCost}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          disabled={preset.locked}
                        />
                        <button
                          type="submit"
                          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white"
                          disabled={preset.locked}
                        >
                          Save preset
                        </button>
                      </form>
                      {preset.locked ? (
                        <p className="mt-2 text-xs text-slate-500">System preset locked by compliance.</p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No presets yet.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}

function BrandingTab({ settings, canManageBranding }: { settings: StandardSettingsData; canManageBranding: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">UI logo</h2>
            <p className="text-sm text-slate-500">Shown across dashboards and estimator shell.</p>
          </div>
          {!canManageBranding ? <p className="text-xs font-semibold text-slate-500">Owner/Admin only</p> : null}
        </div>
        {settings.branding.uiLogoUrl ? (
          <div className="space-y-3">
            <Image
              src={settings.branding.uiLogoUrl}
              alt="UI logo"
              width={256}
              height={64}
              className="h-16 w-auto rounded-lg border border-slate-200 bg-white object-contain"
              unoptimized
            />
            <form action={uploadUiLogoAction} encType="multipart/form-data" className="flex flex-col gap-2 text-sm">
              <input name="logo" type="file" accept="image/*" required disabled={!canManageBranding} />
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700"
                disabled={!canManageBranding}
              >
                Replace logo
              </button>
            </form>
            <form action={removeUiLogoAction}>
              <button
                type="submit"
                className="text-xs font-semibold text-rose-600"
                disabled={!canManageBranding}
              >
                Remove logo
              </button>
            </form>
          </div>
        ) : (
          <form action={uploadUiLogoAction} encType="multipart/form-data" className="space-y-2 text-sm">
            <input name="logo" type="file" accept="image/*" required disabled={!canManageBranding} />
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
              disabled={!canManageBranding}
            >
              Upload UI logo
            </button>
            <p className="text-xs text-slate-500">PNG or SVG preferred, 600×200.</p>
          </form>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">PDF logo</h2>
            <p className="text-sm text-slate-500">Used for estimate + quote exports.</p>
          </div>
          {!canManageBranding ? <p className="text-xs font-semibold text-slate-500">Owner/Admin only</p> : null}
        </div>
        {settings.branding.pdfLogoUrl ? (
          <div className="space-y-3">
            <Image
              src={settings.branding.pdfLogoUrl}
              alt="PDF logo"
              width={256}
              height={64}
              className="h-16 w-auto rounded-lg border border-slate-200 bg-white object-contain"
              unoptimized
            />
            <p className="text-xs text-slate-500">{settings.branding.pdfLogoFileName ?? 'Uploaded logo'}</p>
            <form action={uploadPdfLogoAction} encType="multipart/form-data" className="flex flex-col gap-2 text-sm">
              <input type="hidden" name="replace" value="true" />
              <input name="logo" type="file" accept="image/*" required disabled={!canManageBranding} />
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700"
                disabled={!canManageBranding}
              >
                Replace logo
              </button>
            </form>
            <form action={removePdfLogoAction}>
              <button
                type="submit"
                className="text-xs font-semibold text-rose-600"
                disabled={!canManageBranding}
              >
                Remove logo
              </button>
            </form>
          </div>
        ) : (
          <form action={uploadPdfLogoAction} encType="multipart/form-data" className="space-y-2 text-sm">
            <input name="logo" type="file" accept="image/*" required disabled={!canManageBranding} />
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
              disabled={!canManageBranding}
            >
              Upload PDF logo
            </button>
            <p className="text-xs text-slate-500">Transparent PNG recommended.</p>
          </form>
        )}
        <p className="text-xs text-slate-500">
          {settings.branding.lastUpdatedAt
            ? `Branding last updated ${formatDistanceToNow(new Date(settings.branding.lastUpdatedAt), { addSuffix: true })}`
            : 'Branding not updated yet.'}
          {settings.branding.lastUpdatedByName ? ` · ${settings.branding.lastUpdatedByName}` : ''}
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Dispatch PDF logo</h2>
            <p className="text-sm text-slate-500">Work-order + dispatch PDFs. Inherits the estimating logo until you upload.</p>
          </div>
          {!canManageBranding ? <p className="text-xs font-semibold text-slate-500">Owner/Admin only</p> : null}
        </div>
        {settings.branding.dispatchPdfLogoUrl ? (
          <div className="space-y-3">
            <Image
              src={settings.branding.dispatchPdfLogoUrl}
              alt="Dispatch PDF logo"
              width={256}
              height={64}
              className="h-16 w-auto rounded-lg border border-slate-200 bg-white object-contain"
              unoptimized
            />
            <p className="text-xs text-slate-500">{settings.branding.dispatchPdfLogoFileName ?? 'Uploaded logo'}</p>
            <form action={uploadDispatchPdfLogoAction} encType="multipart/form-data" className="flex flex-col gap-2 text-sm">
              <input type="hidden" name="replace" value="true" />
              <input name="logo" type="file" accept="image/*" required disabled={!canManageBranding} />
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700"
                disabled={!canManageBranding}
              >
                Replace logo
              </button>
            </form>
            <form action={removeDispatchPdfLogoAction}>
              <button
                type="submit"
                className="text-xs font-semibold text-rose-600"
                disabled={!canManageBranding}
              >
                Remove logo
              </button>
            </form>
          </div>
        ) : (
          <form action={uploadDispatchPdfLogoAction} encType="multipart/form-data" className="space-y-2 text-sm">
            <input name="logo" type="file" accept="image/*" required disabled={!canManageBranding} />
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
              disabled={!canManageBranding}
            >
              Upload dispatch logo
            </button>
            <p className="text-xs text-slate-500">Defaults to the estimating logo until set.</p>
          </form>
        )}
        <p className="text-xs text-slate-500">Dispatch PDFs sync instantly; removing this logo reverts back to the estimating branding slot.</p>
      </section>
    </div>
  )
}

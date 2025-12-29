import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { DispatchPreset, DispatchPresetScope } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { listDispatchPresets } from '@/lib/dispatch/presets'
import {
  createDispatchPresetAction,
  updateDispatchPresetDetailsAction,
  toggleDispatchPresetAction,
  deleteDispatchPresetAction,
  moveDispatchPresetAction,
} from '@/app/dashboard/admin/dispatch-presets/actions'

const SCOPE_ORDER: DispatchPresetScope[] = ['BASE', 'CONSTRUCTION', 'RAILROAD', 'ENVIRONMENTAL']
const SCOPE_TITLES: Record<DispatchPresetScope, { title: string; helper: string }> = {
  BASE: { title: 'Base (Global)', helper: 'Always available on every work order.' },
  CONSTRUCTION: { title: 'Construction', helper: 'Additive scope for field execution.' },
  RAILROAD: { title: 'Railroad', helper: 'Specialized railroad controls.' },
  ENVIRONMENTAL: { title: 'Environmental', helper: 'Environmental + remediation scope.' },
}

export default async function DispatchPresetAdminPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?from=/dashboard/admin/dispatch-presets')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const role = session.user.role.toLowerCase()
  if (!['owner', 'admin'].includes(role)) {
    redirect('/dashboard/user')
  }

  const presets = await listDispatchPresets(session.user.companyId)
  const grouped = groupByScope(presets)

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Dispatch authority</p>
        <h1 className="text-3xl font-bold text-slate-900">Dispatch presets</h1>
        <p className="text-slate-600">
          Define the authorized scope of work for every dispatch. Base presets are always available. Locked presets keep regulators happy—only descriptions and notes can change.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create preset</h2>
        <p className="text-sm text-slate-500">Owners/admins can add scoped presets to extend execution controls.</p>
        <form action={createDispatchPresetAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="preset-scope">
              Scope
            </label>
            <select
              id="preset-scope"
              name="scope"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none"
              defaultValue="BASE"
            >
              {SCOPE_ORDER.map((scope) => (
                <option key={scope} value={scope}>
                  {SCOPE_TITLES[scope].title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="preset-name">
              Name
            </label>
            <input
              id="preset-name"
              name="name"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none"
              placeholder="e.g. Specialized inspection"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="preset-description">
              Description
            </label>
            <textarea
              id="preset-description"
              name="description"
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none"
              placeholder="Optional internal context"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="preset-defaultNotes">
              Default field notes
            </label>
            <textarea
              id="preset-defaultNotes"
              name="defaultNotes"
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none"
              placeholder="Guidance that pre-fills dispatch notes"
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
              Create preset
            </button>
          </div>
        </form>
      </section>

      {SCOPE_ORDER.map((scope) => (
        <section key={scope} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{SCOPE_TITLES[scope].title}</p>
              <p className="text-xs text-slate-500">{SCOPE_TITLES[scope].helper}</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {grouped[scope].length} presets
            </span>
          </header>

          {grouped[scope].length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No presets yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {grouped[scope].map((preset, index) => (
                <li key={preset.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{preset.name}</p>
                      <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-500">
                        {preset.locked ? <span className="font-semibold text-amber-600">Locked</span> : null}
                        {preset.isOther ? <span className="font-semibold text-emerald-600">Mandatory</span> : null}
                        {!preset.enabled ? <span className="font-semibold text-rose-600">Disabled</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <form action={moveDispatchPresetAction}>
                        <input type="hidden" name="presetId" value={preset.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button
                          type="submit"
                          disabled={index === 0}
                          className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ↑
                        </button>
                      </form>
                      <form action={moveDispatchPresetAction}>
                        <input type="hidden" name="presetId" value={preset.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          type="submit"
                          disabled={index === grouped[scope].length - 1}
                          className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ↓
                        </button>
                      </form>
                      {!preset.isOther && !preset.locked ? (
                        <form action={toggleDispatchPresetAction}>
                          <input type="hidden" name="presetId" value={preset.id} />
                          <input type="hidden" name="enabled" value={(!preset.enabled).toString()} />
                          <button
                            type="submit"
                            className={`rounded-full px-3 py-1 font-semibold ${preset.enabled ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-600'}`}
                          >
                            {preset.enabled ? 'Disable' : 'Enable'}
                          </button>
                        </form>
                      ) : null}
                      {!preset.locked && !preset.isOther ? (
                        <form action={deleteDispatchPresetAction}>
                          <input type="hidden" name="presetId" value={preset.id} />
                          <button
                            type="submit"
                            className="rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700"
                          >
                            Delete
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                  <form action={updateDispatchPresetDetailsAction} className="mt-4 space-y-3">
                    <input type="hidden" name="presetId" value={preset.id} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={`name-${preset.id}`}>
                          Name
                        </label>
                        <input
                          id={`name-${preset.id}`}
                          name="name"
                          defaultValue={preset.name}
                          disabled={preset.locked || preset.isOther}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={`default-${preset.id}`}>
                          Default notes
                        </label>
                        <textarea
                          id={`default-${preset.id}`}
                          name="defaultNotes"
                          defaultValue={preset.defaultNotes ?? ''}
                          rows={3}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={`description-${preset.id}`}>
                        Description
                      </label>
                      <textarea
                        id={`description-${preset.id}`}
                        name="description"
                        defaultValue={preset.description ?? ''}
                        rows={3}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                    <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                      Save changes
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}

function groupByScope(presets: DispatchPreset[]): Record<DispatchPresetScope, DispatchPreset[]> {
  return presets.reduce<Record<DispatchPresetScope, DispatchPreset[]>>((acc, preset) => {
    if (!acc[preset.scope]) {
      acc[preset.scope] = []
    }
    acc[preset.scope].push(preset)
    return acc
  }, {
    BASE: [],
    CONSTRUCTION: [],
    RAILROAD: [],
    ENVIRONMENTAL: [],
  } as Record<DispatchPresetScope, DispatchPreset[]>)
}

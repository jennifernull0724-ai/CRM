'use client'

import { useEffect, useMemo, useState } from 'react'

const STATUS_BADGES: Record<string, string> = {
  PASS: 'bg-emerald-100 text-emerald-700',
  INCOMPLETE: 'bg-amber-100 text-amber-700',
  FAIL: 'bg-rose-100 text-rose-700',
  EXPIRED: 'bg-rose-100 text-rose-700',
}

export type EmployeeSearchResult = {
  id: string
  name: string
  title: string
  role: string
  complianceStatus: string
  missingCerts: string[]
  expiringCerts: string[]
  needsOverride: boolean
}

type Props = {
  workOrderId: string
  disabled: boolean
  assignEmployeeAction: (formData: FormData) => Promise<void>
}

export function EmployeeAssignmentPanel({ workOrderId, disabled, assignEmployeeAction }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<EmployeeSearchResult[]>([])
  const [selected, setSelected] = useState<EmployeeSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }

    const controller = new AbortController()
    const fetchResults = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/dispatch/employees/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Unable to search employees')
        }
        const payload = await response.json()
        setResults(payload.results ?? [])
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Search failed. Try again.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
    return () => controller.abort()
  }, [query])

  const selectionState = useMemo(() => {
    if (!selected) return null
    return {
      missingCount: selected.missingCerts.length,
      expiringCount: selected.expiringCerts.length,
      badgeClass: STATUS_BADGES[selected.complianceStatus] ?? 'bg-slate-200 text-slate-800',
    }
  }, [selected])

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Crew assignment</p>
          <p className="text-xs text-slate-500">Search compliance employees only. CRM users never appear.</p>
        </div>
        {disabled ? <span className="text-xs font-semibold text-slate-500">Locked</span> : null}
      </div>

      <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={`employee-search-${workOrderId}`}>
        Search employees
      </label>
      <input
        id={`employee-search-${workOrderId}`}
        type="search"
        disabled={disabled}
        placeholder="Name, email, or role"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
      />
      <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">Minimum 2 characters. Compliance source only.</p>

      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}

      <div className="mt-4 space-y-2">
        {loading ? <p className="text-xs text-slate-500">Searching…</p> : null}
        {!loading && results.length === 0 && query.trim().length >= 2 ? (
          <p className="text-xs text-slate-500">No compliance employees match that search.</p>
        ) : null}
        {results.map((employee) => (
          <button
            key={employee.id}
            type="button"
            disabled={disabled}
            onClick={() => setSelected(employee)}
            className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
              selected?.id === employee.id ? 'border-slate-900 bg-slate-900/5' : 'border-slate-200 hover:border-slate-400'
            } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{employee.name}</p>
                <p className="text-xs text-slate-500">{employee.title || 'Role not set'} · {employee.role}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${STATUS_BADGES[employee.complianceStatus] ?? 'bg-slate-200 text-slate-800'}`}>
                {employee.complianceStatus}
              </span>
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
              Missing {employee.missingCerts.length} · Expiring {employee.expiringCerts.length}
              {employee.needsOverride ? ' · Override required' : ''}
            </p>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">{selected.name}</p>
              <p className="text-xs text-slate-500">{selected.title || 'Role not set'} · {selected.role}</p>
            </div>
            {selectionState ? (
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${selectionState.badgeClass}`}>
                {selected.complianceStatus}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Missing certs: {selected.missingCerts.length} · Expiring soon: {selected.expiringCerts.length}
            {selected.needsOverride ? ' · Override acknowledgement required' : ''}
          </p>

          {selected.missingCerts.length ? (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">Missing certifications</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                {selected.missingCerts.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {selected.expiringCerts.length ? (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Expiring soon</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                {selected.expiringCerts.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            <form action={assignEmployeeAction}>
              <input type="hidden" name="workOrderId" value={workOrderId} />
              <input type="hidden" name="employeeId" value={selected.id} />
              <input type="hidden" name="forceOverride" value="false" />
              <button
                type="submit"
                disabled={disabled || selected.needsOverride}
                className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Assign employee
              </button>
            </form>

            <form action={assignEmployeeAction} className="space-y-2">
              <input type="hidden" name="workOrderId" value={workOrderId} />
              <input type="hidden" name="employeeId" value={selected.id} />
              <input type="hidden" name="forceOverride" value="true" />
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={`override-reason-${workOrderId}`}>
                Override reason
              </label>
              <textarea
                id={`override-reason-${workOrderId}`}
                name="overrideReason"
                minLength={10}
                placeholder="List missing certs acknowledged and why dispatch is overriding."
                disabled={disabled || !selected.needsOverride}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-sm disabled:bg-slate-100"
                rows={3}
                required={selected.needsOverride}
              />
              <button
                type="submit"
                disabled={disabled || !selected.needsOverride}
                className="w-full rounded-xl border border-rose-600 px-3 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                Assign anyway (override)
              </button>
            </form>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:border-slate-400"
            >
              Clear selection
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

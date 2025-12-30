'use client'

import { useState, type FormEvent } from 'react'

type ImportRow = {
  row: number
  status: 'success' | 'error'
  message: string
  contactId?: string
}

type ImportSummary = {
  totalRows: number
  succeeded: number
  failed: number
}

export function BulkImportPanel() {
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setError('Select a CSV or XLSX file before importing')
      return
    }

    setPending(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? 'Import failed')
      }

      setSummary(payload.summary as ImportSummary)
      setRows(payload.rows as ImportRow[])
      setFile(null)
    } catch (err) {
      setSummary(null)
      setRows([])
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/50 p-5 text-slate-100">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Bulk import</p>
          <h3 className="text-xl font-semibold">HubSpot-grade contact ingestion</h3>
          <p className="text-sm text-slate-400">Headers required: Company, First Name, Last Name, Email, Phone. Job Title is optional.</p>
        </div>
        <form onSubmit={handleUpload} className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex cursor-pointer flex-col text-xs text-slate-400">
            <span className="text-slate-200">File</span>
            <input
              type="file"
              accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null)
                setSummary(null)
                setRows([])
                setError(null)
              }}
              className="rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
            />
          </label>
          <button
            type="submit"
            disabled={!file || pending}
            className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {pending ? 'Importing…' : 'Process import'}
          </button>
        </form>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-rose-400">{error}</p>
      ) : null}

      {summary ? (
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Rows processed</p>
              <p className="text-lg font-semibold">{summary.totalRows}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Succeeded</p>
              <p className="text-lg font-semibold text-emerald-400">{summary.succeeded}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Failed</p>
              <p className="text-lg font-semibold text-amber-300">{summary.failed}</p>
            </div>
          </div>
          {rows.length ? (
            <div className="mt-4 max-h-52 overflow-y-auto rounded-lg border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.row}-${row.message}`} className="border-t border-slate-800">
                      <td className="px-3 py-2 text-slate-200">{row.row}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            row.status === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-300">{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

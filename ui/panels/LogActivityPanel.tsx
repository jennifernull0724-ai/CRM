import React from 'react'

interface LogActivityPanelProps {
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function LogActivityPanel({ header, footer }: LogActivityPanelProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
      {header}
      <div className="grid gap-2">
        <label className="text-xs font-semibold text-slate-600">Activity type</label>
        <input className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" aria-label="Activity type" />
        <label className="text-xs font-semibold text-slate-600">Notes</label>
        <textarea className="min-h-[96px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" aria-label="Notes" />
      </div>
      {footer}
    </div>
  )
}

import React from 'react'

interface CreateRecordPanelProps {
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function CreateRecordPanel({ header, footer }: CreateRecordPanelProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
      {header}
      <div className="grid gap-2">
        <label className="text-xs font-semibold text-slate-600">Name</label>
        <input className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" aria-label="Name" />
        <label className="text-xs font-semibold text-slate-600">Owner</label>
        <input className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" aria-label="Owner" />
      </div>
      {footer}
    </div>
  )
}

import React from 'react'

interface EditPropertiesPanelProps {
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function EditPropertiesPanel({ header, footer }: EditPropertiesPanelProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
      {header}
      <div className="grid gap-2">
        <label className="text-xs font-semibold text-slate-600">Field</label>
        <input className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" aria-label="Field" />
        <label className="text-xs font-semibold text-slate-600">Value</label>
        <input className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" aria-label="Value" />
      </div>
      {footer}
    </div>
  )
}

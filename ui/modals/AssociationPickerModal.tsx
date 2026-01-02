import React from 'react'

interface AssociationPickerModalProps {
  title?: React.ReactNode
  chooser?: React.ReactNode
  actions?: React.ReactNode
}

export function AssociationPickerModal({ title, chooser, actions }: AssociationPickerModalProps) {
  return (
    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
      {title && <div className="text-base font-semibold text-slate-800">{title}</div>}
      <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-600" aria-label="Association chooser">
        {chooser}
      </div>
      <div className="mt-5 flex items-center justify-end gap-2">{actions}</div>
    </div>
  )
}

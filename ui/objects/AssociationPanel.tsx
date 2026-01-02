import React from 'react'

interface AssociationPanelProps {
  title?: React.ReactNode
  children?: React.ReactNode
}

export function AssociationPanel({ title, children }: AssociationPanelProps) {
  return (
    <aside className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {title && <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{title}</div>}
      <div className="grid gap-2">{children}</div>
    </aside>
  )
}

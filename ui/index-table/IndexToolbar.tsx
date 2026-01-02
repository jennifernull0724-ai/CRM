import React from 'react'

interface IndexToolbarProps {
  actions?: React.ReactNode
  children?: React.ReactNode
}

export function IndexToolbar({ actions, children }: IndexToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">{children}</div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  )
}

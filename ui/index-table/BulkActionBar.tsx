import React from 'react'

interface BulkActionBarProps {
  children?: React.ReactNode
  actions?: React.ReactNode
}

export function BulkActionBar({ children, actions }: BulkActionBarProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <div className="flex items-center gap-2">{children}</div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  )
}

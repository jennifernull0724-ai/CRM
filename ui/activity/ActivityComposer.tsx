import React from 'react'

interface ActivityComposerProps {
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function ActivityComposer({ header, footer }: ActivityComposerProps) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {header}
      <div className="min-h-[90px] rounded-lg border border-dashed border-slate-200 bg-slate-50" aria-label="Activity composer" />
      {footer}
    </div>
  )
}

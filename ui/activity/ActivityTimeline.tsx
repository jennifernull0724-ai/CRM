import React from 'react'

interface ActivityTimelineProps {
  children?: React.ReactNode
}

export function ActivityTimeline({ children }: ActivityTimelineProps) {
  return <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>
}

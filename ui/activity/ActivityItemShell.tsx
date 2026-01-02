import React from 'react'

interface ActivityItemShellProps {
  children?: React.ReactNode
}

export function ActivityItemShell({ children }: ActivityItemShellProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
      {children}
    </article>
  )
}

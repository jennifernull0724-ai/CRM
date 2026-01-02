import React from 'react'

interface IndexTableShellProps {
  children?: React.ReactNode
}

export function IndexTableShell({ children }: IndexTableShellProps) {
  return <div className="min-h-[220px] rounded-b-2xl bg-white px-4 py-4">{children}</div>
}

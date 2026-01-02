import React from 'react'

interface IndexColumnHeaderProps {
  children?: React.ReactNode
}

export function IndexColumnHeader({ children }: IndexColumnHeaderProps) {
  return <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{children}</div>
}

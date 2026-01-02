import React from 'react'

interface PrimaryNavRailProps {
  children?: React.ReactNode
  width?: number
}

export function PrimaryNavRail({ children, width = 72 }: PrimaryNavRailProps) {
  return (
    <nav
      className="relative flex h-full flex-col border-r border-slate-200 bg-white py-3"
      style={{ width }}
    >
      {children}
    </nav>
  )
}

import React from 'react'

interface SidePanelLayoutProps {
  children?: React.ReactNode
  width?: number
}

export function SidePanelLayout({ children, width = 360 }: SidePanelLayoutProps) {
  return (
    <aside
      className="fixed right-0 top-14 z-40 grid gap-3 border-l border-slate-200 bg-white p-4 shadow-2xl"
      style={{ width }}
    >
      {children}
    </aside>
  )
}

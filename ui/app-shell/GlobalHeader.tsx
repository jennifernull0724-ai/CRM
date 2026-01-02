import React from 'react'

interface GlobalHeaderProps {
  leftSlot?: React.ReactNode
  rightSlot?: React.ReactNode
  children?: React.ReactNode
}

export function GlobalHeader({ leftSlot, rightSlot, children }: GlobalHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
      <div className="flex items-center gap-3">
        {leftSlot}
        {children}
      </div>
      <div className="flex items-center gap-3">{rightSlot}</div>
    </header>
  )
}

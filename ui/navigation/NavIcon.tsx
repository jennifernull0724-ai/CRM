import React from 'react'

interface NavIconProps {
  children?: React.ReactNode
}

export function NavIcon({ children }: NavIconProps) {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold">
      {children}
    </span>
  )
}

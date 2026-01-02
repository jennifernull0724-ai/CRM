import React from 'react'

interface ObjectSubNavProps {
  children?: React.ReactNode
}

export function ObjectSubNav({ children }: ObjectSubNavProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
      {children}
    </div>
  )
}

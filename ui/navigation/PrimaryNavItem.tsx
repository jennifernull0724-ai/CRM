import React from 'react'

interface PrimaryNavItemProps {
  icon?: React.ReactNode
  label: string
  isActive?: boolean
}

export function PrimaryNavItem({ icon, label, isActive }: PrimaryNavItemProps) {
  return (
    <button
      type="button"
      className={`grid grid-cols-[44px_1fr] items-center gap-2 px-3 py-2 text-left text-sm font-semibold transition ${
        isActive ? 'text-orange-600 bg-orange-50' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}

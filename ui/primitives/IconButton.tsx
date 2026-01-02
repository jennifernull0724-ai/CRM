import React from 'react'

interface IconButtonProps {
  children?: React.ReactNode
  ariaLabel?: string
}

export function IconButton({ children, ariaLabel }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm"
    >
      {children}
    </button>
  )
}

import React from 'react'

interface PillProps {
  children?: React.ReactNode
  tone?: 'default' | 'accent'
}

export function Pill({ children, tone = 'default' }: PillProps) {
  const toneClass = tone === 'accent' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-700 border-slate-200'
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>
}

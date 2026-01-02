import React from 'react'

interface PropertySectionProps {
  title?: React.ReactNode
  children?: React.ReactNode
}

export function PropertySection({ title, children }: PropertySectionProps) {
  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {title && <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{title}</div>}
      <div className="grid gap-2 md:grid-cols-2">{children}</div>
    </section>
  )
}

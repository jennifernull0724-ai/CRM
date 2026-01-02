import React from 'react'

interface RecordPageLayoutProps {
  header: React.ReactNode
  leftColumn: React.ReactNode
  rightColumn: React.ReactNode
}

export function RecordPageLayout({ header, leftColumn, rightColumn }: RecordPageLayoutProps) {
  return (
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {header}
      <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        {leftColumn}
        {rightColumn}
      </div>
    </section>
  )
}

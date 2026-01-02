import React from 'react'

interface ObjectIndexLayoutProps {
  toolbar: React.ReactNode
  filters: React.ReactNode
  table: React.ReactNode
}

export function ObjectIndexLayout({ toolbar, filters, table }: ObjectIndexLayoutProps) {
  return (
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
      {toolbar}
      {filters}
      {table}
    </section>
  )
}

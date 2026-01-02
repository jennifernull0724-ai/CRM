import React from 'react'

interface AppLayoutProps {
  header: React.ReactNode
  primaryNav: React.ReactNode
  subNav?: React.ReactNode
  children?: React.ReactNode
}

export function AppLayout({ header, primaryNav, subNav, children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {header}
      <div className="grid" style={{ gridTemplateColumns: '72px 1fr' }}>
        {primaryNav}
        <main className="min-h-screen bg-slate-50">
          {subNav}
          {children}
        </main>
      </div>
    </div>
  )
}

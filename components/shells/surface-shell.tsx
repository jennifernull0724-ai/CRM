'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactElement, type ReactNode } from 'react'

export type ShellNavItem = {
  path: string
  label: string
  icon: ShellIcon
}

export type ShellIcon =
  | 'dashboard'
  | 'contacts'
  | 'deals'
  | 'tasks'
  | 'settings'
  | 'users'
  | 'console'
  | 'dispatch'
  | 'shield'
  | 'home'
  | 'activity'
  | 'email'
  | 'files'
  | 'reports'

type SurfaceShellProps = {
  surfaceName: string
  companyLogoUrl?: string | null
  userName?: string
  userRoleLabel?: string
  navItems: ShellNavItem[]
  children: ReactNode
}

const ICONS: Record<ShellIcon, ReactElement> = {
  dashboard: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v4h6V4h-6z" fill="currentColor" />
    </svg>
  ),
  contacts: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.31 0-6 1.79-6 4v1h12v-1c0-2.21-2.69-4-6-4z"
        fill="currentColor"
      />
    </svg>
  ),
  deals: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M4 7h16v2H4zm0 4h10v2H4zm0 4h7v2H4zm13 0 2.5-2.5L22 15l-3 3-2-2z" fill="currentColor" />
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M5 5h14v2H5zm0 6h9v2H5zm0 6h6v2H5zm10-3 2.5 2.5L22 13l-1.41-1.41-3.09 3.1-1.09-1.09z" fill="currentColor" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        d="M19.14 12.94a7.49 7.49 0 0 0 .06-.94 7.49 7.49 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.28 7.28 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 14.88 2h-3.76a.5.5 0 0 0-.49.42L10.27 5a7.28 7.28 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L3.72 8.52a.5.5 0 0 0 .12.64l2.03 1.58a7.49 7.49 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.4 1.05.73 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.76a.5.5 0 0 0 .49-.42l.36-2.54c.58-.21 1.13-.54 1.63-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15a3 3 0 1 1 3-3 3 3 0 0 1-3 3z"
        fill="currentColor"
      />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-1.46.8-2.75 2.05-3.67A8.42 8.42 0 0 0 8 13zm8 0a5.66 5.66 0 0 0-1.48.2 4.9 4.9 0 0 1 1.48 3.3v2h7v-2c0-2.66-5.33-4-7-4z" fill="currentColor" />
    </svg>
  ),
  console: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M4 5h16v14H4z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m8 12 3-3-3-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 17h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  dispatch: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M4 7h11v5h5l-2-4h-3V5H4zM2 9h2v6h14v2H7a3 3 0 0 1-6 0zm5 6a1 1 0 1 0 1 1 1 1 0 0 0-1-1zm12 0a1 1 0 1 0 1 1 1 1 0 0 0-1-1z" fill="currentColor" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M12 3 5 6v5c0 4.28 2.94 8.32 7 9 4.06-.68 7-4.72 7-9V6z" fill="currentColor" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="m12 5.69 5 4.5V19h-3v-4H10v4H7v-8.81l5-4.5m0-2.19L2 12h3v8h6v-4h2v4h6v-8h3Z" fill="currentColor" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M3 13h3l2-6 4 12 2-6h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M4 6h16v12H4z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m4 8 8 5 8-5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  files: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M6 4h7l5 5v11H6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M13 4v5h5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M4 20h16V4H4z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 14h2v3H8zm4-4h2v7h-2zm4-3h2v10h-2z" fill="currentColor" />
    </svg>
  ),
}

export function SurfaceShell({ surfaceName, companyLogoUrl, userName, userRoleLabel, navItems, children }: SurfaceShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 z-20 h-16 border-b border-slate-700 bg-slate-800 text-white">
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen((state) => !state)}
              className="rounded p-2 hover:bg-slate-700"
              aria-label="Toggle navigation"
              type="button"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">{surfaceName}</div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative rounded p-2 hover:bg-slate-700" type="button" aria-label="Notifications">
              🔔
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-orange-400" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-600 text-sm font-semibold">
                {userName?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="text-right text-xs">
                <div className="font-semibold leading-tight">{userName ?? 'User'}</div>
                {userRoleLabel ? <div className="text-[11px] uppercase tracking-wide text-white/60">{userRoleLabel}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`fixed top-16 bottom-0 left-0 z-10 border-r border-slate-800 bg-slate-900 text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex h-16 items-center border-b border-slate-800 px-4" aria-label="Company logo slot">
          {companyLogoUrl ? (
            <Image src={companyLogoUrl} alt="Company logo" width={160} height={40} className="h-8 w-auto" unoptimized />
          ) : (
            <div className="h-8 w-8 rounded border border-slate-700" />
          )}
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const active = pathname === item.path || pathname.startsWith(`${item.path}/`)
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`group flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                  active ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-lg" aria-hidden>
                  {ICONS[item.icon]}
                </span>
                <span
                  className={`whitespace-nowrap text-sm transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className={`pt-16 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <main className="min-h-[calc(100vh-4rem)] bg-slate-50">{children}</main>
      </div>
    </div>
  )
}

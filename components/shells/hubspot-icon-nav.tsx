'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

type NavItem = {
  path: string
  label: string
  icon: React.ReactNode
  badge?: number
}

type HubSpotIconNavProps = {
  items: NavItem[]
  showUpgrade?: boolean
}

export function HubSpotIconNav({ items, showUpgrade = false }: HubSpotIconNavProps) {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)

  const isActive = (path: string) => {
    if (path === '/dashboard/trial' || path === '/dashboard/user') {
      return pathname === path
    }
    return pathname.startsWith(path)
  }

  return (
    <nav
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={`fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-slate-200 bg-white shadow-sm transition-all duration-200 ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
    >
      {/* Logo Area */}
      <div className="flex h-16 items-center justify-center border-b border-slate-200">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
          <span className="text-sm font-bold">CRM</span>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-4">
        {items.map((item) => {
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                {item.icon}
              </div>
              {isExpanded && (
                <div className="flex flex-1 items-center justify-between">
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {/* Upgrade Button (Trial Only) */}
      {showUpgrade && (
        <div className="border-t border-slate-200 p-2">
          <Link
            href="/upgrade"
            className={`flex items-center gap-3 rounded-lg bg-blue-600 px-3 py-2.5 text-white transition-colors hover:bg-blue-700 ${
              isExpanded ? '' : 'justify-center'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" aria-hidden>
              <path
                d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l7.45 3.72L12 11.62 4.55 7.9 12 4.18zM4 9.5l7 3.5v7l-7-3.5v-7zm9 10.5v-7l7-3.5v7L13 20z"
                fill="currentColor"
              />
            </svg>
            {isExpanded && <span className="text-sm font-semibold">Upgrade</span>}
          </Link>
        </div>
      )}
    </nav>
  )
}

// Icon Components
export const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v4h6V4h-6z" />
  </svg>
)

export const ContactsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.31 0-6 1.79-6 4v1h12v-1c0-2.21-2.69-4-6-4z" />
  </svg>
)

export const DealsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M21 8V7H7V4c0-1.1.9-2 2-2h10v2h2V2c0-1.1-.9-2-2-2H9C7.9 0 7 .9 7 2v2H3c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h4v3h14v-8h-4V8h4zM5 17H3V6h4v11H5zm7-6h7v8h-7v-8z" />
  </svg>
)

export const TasksIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 4c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1.4c0-2 4-3.1 6-3.1s6 1.1 6 3.1V19z" />
  </svg>
)

export const EmailIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
)

export const DocumentsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
  </svg>
)

export const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M19.14 12.94a7.49 7.49 0 0 0 .06-.94 7.49 7.49 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.28 7.28 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 14.88 2h-3.76a.5.5 0 0 0-.49.42L10.27 5a7.28 7.28 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L3.72 8.52a.5.5 0 0 0 .12.64l2.03 1.58a7.49 7.49 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.4 1.05.73 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.76a.5.5 0 0 0 .49-.42l.36-2.54c.58-.21 1.13-.54 1.63-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15a3 3 0 1 1 3-3 3 3 0 0 1-3 3z" />
  </svg>
)

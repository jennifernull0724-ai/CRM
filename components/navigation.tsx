'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

type NavItem = { href: string; label: string }

type PersonaNav = {
  label: string
  homeHref: string
  items: NavItem[]
}

type PersonaKey = 'owner' | 'admin' | 'user' | 'estimator' | 'dispatch' | 'guest'

const NAVIGATION_MAP: Record<PersonaKey, PersonaNav> = {
  owner: {
    label: 'Owner Controls',
    homeHref: '/dashboard/owner',
    items: [
      { href: '/dashboard/owner', label: 'Dashboard' },
      { href: '/compliance', label: 'Compliance' },
      { href: '/settings', label: 'Settings' },
    ],
  },
  admin: {
    label: 'Admin Controls',
    homeHref: '/dashboard/admin',
    items: [
      { href: '/dashboard/admin', label: 'Dashboard' },
      { href: '/compliance', label: 'Compliance' },
      { href: '/settings', label: 'Settings' },
    ],
  },
  user: {
    label: 'Sales Workspace',
    homeHref: '/crm',
    items: [
      { href: '/crm', label: 'CRM Home' },
      { href: '/crm/contacts', label: 'Contacts' },
      { href: '/crm/deals', label: 'Deals' },
    ],
  },
  estimator: {
    label: 'Estimating',
    homeHref: '/estimating',
    items: [
      { href: '/estimating', label: 'Pipeline' },
      { href: '/estimating/settings', label: 'Settings' },
    ],
  },
  dispatch: {
    label: 'Dispatch',
    homeHref: '/dispatch',
    items: [
      { href: '/dispatch', label: 'Console' },
      { href: '/dispatch/work-orders', label: 'Work Orders' },
    ],
  },
  guest: {
    label: 'Workspace',
    homeHref: '/app',
    items: [{ href: '/app', label: 'Home' }],
  },
}

interface NavigationProps {
  role?: string | null
  userName?: string | null
}

export default function Navigation({ role, userName }: NavigationProps) {
  const pathname = usePathname()
  const normalizedRole = (role?.toLowerCase() as PersonaKey) ?? 'guest'
  const personaNav = NAVIGATION_MAP[normalizedRole] ?? NAVIGATION_MAP.guest
  const [isSigningOut, setIsSigningOut] = useState(false)

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`)

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <nav className="bg-slate-900 text-white shadow">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href={personaNav.homeHref} className="text-lg font-semibold tracking-wide">
            T-REX CRM
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            {personaNav.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-white/10 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {userName && (
            <div className="text-right text-xs leading-tight text-slate-200">
              <p className="font-semibold text-sm">{userName}</p>
              <p className="text-slate-400">{personaNav.label}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="rounded-full border border-white/30 px-4 py-1 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            {isSigningOut ? 'Signing Out…' : 'Sign Out'}
          </button>
        </div>
      </div>
    </nav>
  )
}

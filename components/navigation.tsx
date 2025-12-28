'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  return (
    <nav className="bg-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard/user" className="text-xl font-bold">
              T-REX CRM
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                href="/dashboard/user"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/dashboard')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/contacts"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/contacts')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Contacts
              </Link>
              <Link
                href="/deals"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/deals')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Deals
              </Link>
              <Link
                href="/settings"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/settings')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Settings
              </Link>
            </div>
          </div>
          <div>
            <Link
              href="/login"
              className="text-slate-300 hover:text-white text-sm font-medium"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

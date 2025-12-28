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
            <Link href="/" className="text-xl font-bold">
              CRM
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/') && pathname === '/'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/companies"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/companies')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Companies
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
                href="/projects"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/projects')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Projects
              </Link>
              <Link
                href="/activities"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/activities')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Activities
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

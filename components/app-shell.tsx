'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface AppShellProps {
  children: React.ReactNode
  userRole?: 'user' | 'estimator' | 'admin' | 'owner'
  userName?: string
  userEmail?: string
}

export default function AppShell({ children, userRole = 'user', userName, userEmail }: AppShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  const canAccessCompliance = userRole === 'admin' || userRole === 'owner'

  const navItems = [
    { path: '/dashboard/user', label: 'Dashboard', icon: '📊', roles: ['user', 'estimator', 'admin', 'owner'] },
    { path: '/contacts', label: 'Contacts', icon: '📇', roles: ['user', 'estimator', 'admin', 'owner'] },
    { path: '/deals', label: 'Deals / Estimating', icon: '💼', roles: ['user', 'estimator', 'admin', 'owner'] },
    { path: '/compliance', label: 'Compliance', icon: '🛡️', roles: ['admin', 'owner'] },
    { path: '/analytics', label: 'Analytics', icon: '📈', roles: ['admin', 'owner'] },
    { path: '/settings', label: 'Settings', icon: '⚙️', roles: ['user', 'estimator', 'admin', 'owner'] },
  ]

  const visibleNavItems = navItems.filter(item => item.roles.includes(userRole))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-800 text-white z-20 border-b border-slate-700">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-700 rounded"
            >
              ☰
            </button>
            <Link href="/dashboard/user" className="text-xl font-bold">
              T-REX AI OS
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-700 rounded relative">
              🔔
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                {userName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="text-sm">
                <div className="font-medium">{userName || 'User'}</div>
                <div className="text-xs text-slate-400">{userRole}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed top-16 left-0 bottom-0 bg-slate-900 text-white transition-all duration-300 z-10 ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <nav className="p-4 space-y-1">
          {visibleNavItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div
        className={`pt-16 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}

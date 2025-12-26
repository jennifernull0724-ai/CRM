'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Clock,
  Mail,
  Ruler,
  Shield,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronLeft,
  Search,
  Bell,
  User,
  LogOut,
  AlertCircle,
} from 'lucide-react'

interface AppShellProps {
  session: any
  children: React.ReactNode
}

export default function AppShell({ session, children }: AppShellProps) {
  const pathname = usePathname()
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isOwner = session?.user?.role === 'OWNER'
  const isAdmin = session?.user?.role === 'ADMIN' || isOwner

  const navigation = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      href: `/app/dashboard/${session?.user?.role?.toLowerCase() || 'user'}`,
      badge: null,
    },
    {
      name: 'Contacts',
      icon: Users,
      href: '/app/contacts',
      badge: null,
    },
    {
      name: 'Tasks',
      icon: CheckSquare,
      href: '/app/tasks',
      badge: 3, // Example badge
    },
    {
      name: 'Activity',
      icon: Clock,
      href: '/app/activity',
      badge: null,
    },
    {
      name: 'Email',
      icon: Mail,
      href: '/app/email',
      badge: null,
    },
    {
      name: 'Estimating',
      icon: Ruler,
      href: '/app/estimating/queue',
      badge: null,
    },
    {
      name: 'Compliance',
      icon: Shield,
      href: '/app/compliance',
      badge: null,
      adminOnly: true,
    },
    {
      name: 'Analytics',
      icon: BarChart3,
      href: '/app/analytics',
      badge: null,
      adminOnly: true,
    },
    {
      name: 'Settings',
      icon: Settings,
      href: '/app/settings/user',
      badge: null,
    },
  ]

  const visibleNavigation = navigation.filter(item => {
    // Owner sees everything
    if (isOwner) return true
    // Admin sees admin items
    if (isAdmin && item.adminOnly) return true
    // Regular users don't see admin-only items
    return !item.adminOnly
  })

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarExpanded ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-800">
          {sidebarExpanded ? (
            <span className="font-bold text-lg">Contractor CRM</span>
          ) : (
            <span className="font-bold text-xl">C</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {visibleNavigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                } flex items-center px-4 py-3 mb-1 transition-colors relative group`}
                title={!sidebarExpanded ? item.name : ''}
              >
                <Icon className="w-6 h-6 flex-shrink-0" />
                {sidebarExpanded && (
                  <span className="ml-3 font-medium">{item.name}</span>
                )}
                {item.badge && (
                  <span className={`${
                    sidebarExpanded ? 'ml-auto' : 'absolute -top-1 -right-1'
                  } bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center`}>
                    {item.badge}
                  </span>
                )}
                {/* Tooltip for collapsed state */}
                {!sidebarExpanded && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {item.name}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          className="h-12 flex items-center justify-center border-t border-gray-800 hover:bg-gray-800 transition-colors"
        >
          {sidebarExpanded ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* System State Banner - CRITICAL FOR PHASE 0.3 */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <span className="font-bold text-yellow-900">OWNER_SETUP</span>
                <span className="text-yellow-700 mx-2">—</span>
                <span className="text-yellow-700">Enforcement OFF</span>
              </div>
            </div>
            {isOwner && (
              <Link
                href="/app/settings/owner"
                className="text-sm text-yellow-700 hover:text-yellow-900 font-semibold underline"
              >
                Manage System State
              </Link>
            )}
          </div>
        </div>

        {/* Top Utility Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Breadcrumb / Page Title */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {pathname.includes('/dashboard') && 'Dashboard'}
                {pathname.includes('/contacts') && !pathname.includes('/dashboard') && 'Contacts'}
                {pathname.includes('/tasks') && 'Tasks'}
                {pathname.includes('/activity') && 'Activity'}
                {pathname.includes('/email') && 'Email'}
                {pathname.includes('/estimating') && 'Estimating'}
                {pathname.includes('/compliance') && 'Compliance'}
                {pathname.includes('/analytics') && 'Analytics'}
                {pathname.includes('/settings') && 'Settings'}
              </h1>
            </div>

            {/* Right Side - Search, Notifications, User */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search contacts..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-64"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
                <Bell className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {session?.user?.name?.[0] || session?.user?.email?.[0].toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900">
                      {session?.user?.name || session?.user?.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      {session?.user?.role}
                    </div>
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      href="/app/settings/user"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

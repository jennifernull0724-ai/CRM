import type { ReactNode } from 'react'
import { SurfaceShell, type ShellNavItem } from './surface-shell'

interface DashboardShellProps {
  role: 'owner' | 'admin'
  companyLogoUrl?: string | null
  userName?: string
  children: ReactNode
}

const OWNER_NAV: ShellNavItem[] = [
  { path: '/dashboard/owner', label: 'Control Plane', icon: 'dashboard' },
  { path: '/settings/users', label: 'Users & Roles', icon: 'users' },
  { path: '/settings', label: 'System Settings', icon: 'settings' },
]

const ADMIN_NAV: ShellNavItem[] = [
  { path: '/dashboard/admin', label: 'Control Plane', icon: 'dashboard' },
  { path: '/settings/users', label: 'Users & Roles', icon: 'users' },
  { path: '/settings', label: 'System Settings', icon: 'settings' },
]

export function DashboardShell({ role, companyLogoUrl, userName, children }: DashboardShellProps) {
  const navItems = role === 'owner' ? OWNER_NAV : ADMIN_NAV
  const label = role === 'owner' ? 'Owner Dashboard' : 'Admin Dashboard'

  return (
    <SurfaceShell
      surfaceName="Dashboards"
      companyLogoUrl={companyLogoUrl}
      userName={userName}
      userRoleLabel={label}
      navItems={navItems}
    >
      {children}
    </SurfaceShell>
  )
}

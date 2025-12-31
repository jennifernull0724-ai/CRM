import type { ReactNode } from 'react'
import { SurfaceShell, type ShellNavItem } from './surface-shell'

interface TrialShellProps {
  companyLogoUrl?: string | null
  userName?: string
  children: ReactNode
}

const TRIAL_NAV: ShellNavItem[] = [
  { path: '/dashboard/trial', label: 'Dashboard', icon: 'dashboard' },
  { path: '/contacts', label: 'Contacts', icon: 'contacts' },
  { path: '/crm/deals', label: 'Deals / Estimates', icon: 'deals' },
  { path: '/crm/tasks', label: 'Tasks', icon: 'tasks' },
  { path: '/activity', label: 'Activity', icon: 'activity' },
  { path: '/email', label: 'Email', icon: 'email' },
  { path: '/files', label: 'Files', icon: 'files' },
  { path: '/reports', label: 'Reports', icon: 'reports' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
]

export function TrialShell({ companyLogoUrl, userName, children }: TrialShellProps) {
  return (
    <SurfaceShell
      surfaceName="Starter Trial"
      companyLogoUrl={companyLogoUrl}
      userName={userName}
      userRoleLabel="Starter (Trial)"
      navItems={TRIAL_NAV}
    >
      {children}
    </SurfaceShell>
  )
}

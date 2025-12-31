import type { ReactNode } from 'react'
import { SurfaceShell, type ShellNavItem } from './surface-shell'

interface CrmShellProps {
  companyLogoUrl?: string | null
  userName?: string
  children: ReactNode
}

const CRM_NAV: ShellNavItem[] = [
  { path: '/crm', label: 'CRM Home', icon: 'home' },
  { path: '/contacts', label: 'Contacts', icon: 'contacts' },
  { path: '/crm/deals', label: 'Deals', icon: 'deals' },
  { path: '/crm/tasks', label: 'Tasks', icon: 'tasks' },
]

export function CrmShell({ companyLogoUrl, userName, children }: CrmShellProps) {
  return (
    <SurfaceShell
      surfaceName="CRM Home"
      companyLogoUrl={companyLogoUrl}
      userName={userName}
      userRoleLabel="Sales Workspace"
      navItems={CRM_NAV}
    >
      {children}
    </SurfaceShell>
  )
}

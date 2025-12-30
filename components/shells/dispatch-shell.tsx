import type { ReactNode } from 'react'
import { SurfaceShell, type ShellNavItem } from './surface-shell'

interface DispatchShellProps {
  companyLogoUrl?: string | null
  userName?: string
  children: ReactNode
}

const DISPATCH_NAV: ShellNavItem[] = [
  { path: '/dispatch', label: 'Console Home', icon: 'dispatch' },
  { path: '/dispatch/work-orders', label: 'Work Orders', icon: 'tasks' },
]

export function DispatchShell({ companyLogoUrl, userName, children }: DispatchShellProps) {
  return (
    <SurfaceShell
      surfaceName="Dispatch Console"
      companyLogoUrl={companyLogoUrl}
      userName={userName}
      userRoleLabel="Execution Authority"
      navItems={DISPATCH_NAV}
    >
      {children}
    </SurfaceShell>
  )
}

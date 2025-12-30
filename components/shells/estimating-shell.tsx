import type { ReactNode } from 'react'
import { SurfaceShell, type ShellNavItem } from './surface-shell'

interface EstimatingShellProps {
  companyLogoUrl?: string | null
  userName?: string
  children: ReactNode
}

const ESTIMATING_NAV: ShellNavItem[] = [
  { path: '/dashboard/estimator', label: 'Dashboard', icon: 'dashboard' },
  { path: '/estimating', label: 'Console Home', icon: 'console' },
  { path: '/estimating/settings', label: 'Pricing Settings', icon: 'settings' },
]

export function EstimatingShell({ companyLogoUrl, userName, children }: EstimatingShellProps) {
  return (
    <SurfaceShell
      surfaceName="Estimating Console"
      companyLogoUrl={companyLogoUrl}
      userName={userName}
      userRoleLabel="Pricing Authority"
      navItems={ESTIMATING_NAV}
    >
      {children}
    </SurfaceShell>
  )
}

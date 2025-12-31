import type { ReactNode } from 'react'
import { HubSpotIconNav, DashboardIcon, ContactsIcon, DealsIcon, TasksIcon, SettingsIcon } from './hubspot-icon-nav'

interface TrialShellProps {
  companyLogoUrl?: string | null
  userName?: string
  children: ReactNode
}

const TRIAL_NAV = [
  { path: '/dashboard/trial', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/contacts', label: 'Contacts', icon: <ContactsIcon /> },
  { path: '/settings', label: 'Settings', icon: <SettingsIcon /> },
]

export function TrialShell({ companyLogoUrl, userName, children }: TrialShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <HubSpotIconNav items={TRIAL_NAV} showUpgrade />
      <main className="ml-16 flex-1">
        {children}
      </main>
    </div>
  )
}

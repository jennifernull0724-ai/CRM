import type { ReactNode } from 'react'
import { HubSpotIconNav, DashboardIcon, ContactsIcon, DealsIcon, TasksIcon, SettingsIcon } from './hubspot-icon-nav'

interface UserShellProps {
  companyLogoUrl?: string | null
  userName?: string
  children: ReactNode
}

const USER_NAV = [
  { path: '/dashboard/user', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/contacts', label: 'Contacts', icon: <ContactsIcon /> },
  { path: '/crm/deals', label: 'Deals', icon: <DealsIcon /> },
  { path: '/crm/tasks', label: 'Tasks', icon: <TasksIcon /> },
  { path: '/settings', label: 'Settings', icon: <SettingsIcon /> },
]

export function UserShell({ companyLogoUrl, userName, children }: UserShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <HubSpotIconNav items={USER_NAV} showUpgrade={false} />
      <main className="ml-16 flex-1">
        {children}
      </main>
    </div>
  )
}

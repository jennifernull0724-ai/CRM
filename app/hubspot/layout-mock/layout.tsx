import type { Metadata } from 'next'
import { StyledComponentsRegistry } from '@/lib/styled-components/registry'

export const metadata: Metadata = {
  title: 'HubSpot UI Layout Mock',
  description: 'Layout-only reconstruction of HubSpot shell without CRM logic or data.',
  robots: { index: false, follow: false },
}

export default function HubSpotMockLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
}

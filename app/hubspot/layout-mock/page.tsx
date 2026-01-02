import type { Metadata } from 'next'
import { HubSpotLayoutMock } from '@/components/hubspot/layout-mock/hubspot-layout'

export const metadata: Metadata = {
  title: 'HubSpot Layout Mock | UI only',
  description: 'Structural, data-free HubSpot-style shell.',
}

export default function HubSpotLayoutMockPage() {
  return <HubSpotLayoutMock />
}

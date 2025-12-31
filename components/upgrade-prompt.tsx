'use client'

import Link from 'next/link'
import {
  describeFeature,
  getUpgradeMessage,
  planAllowsFeature,
  type PlanFeatureKey,
  type PlanKey,
} from '@/lib/billing/planTiers'

interface UpgradePromptProps {
  currentPlan: PlanKey
  feature: PlanFeatureKey
  message?: string
}

export function UpgradePrompt({ currentPlan, feature, message }: UpgradePromptProps) {
  const upgradeMessage = message || getUpgradeMessage(currentPlan, feature)
  const featureLabel = describeFeature(feature)
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
      <div className="text-yellow-800 font-medium mb-2">🔒 Feature Locked</div>
      <div className="text-sm uppercase tracking-wide text-yellow-600 mb-1">{featureLabel}</div>
      <p className="text-gray-700 mb-4">{upgradeMessage}</p>
      <Link
        href="/upgrade"
        className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
      >
        Upgrade Now
      </Link>
    </div>
  )
}

export function ReadOnlyBanner() {
  return (
    <div className="bg-red-50 border-b border-red-200 p-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-red-800 font-medium">⚠️ Read-Only Mode</span>
          <span className="text-red-700">Your trial has expired. Upgrade to continue making changes.</span>
        </div>
        <Link
          href="/upgrade"
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium text-sm"
        >
          Upgrade Now
        </Link>
      </div>
    </div>
  )
}

export function FeatureGate({
  children,
  currentPlan,
  requiredFeature,
  fallback,
}: {
  children: React.ReactNode
  currentPlan: PlanKey
  requiredFeature: PlanFeatureKey
  fallback?: React.ReactNode
}) {
  const hasAccess = planAllowsFeature(currentPlan, requiredFeature)
  
  if (!hasAccess) {
    return fallback || <UpgradePrompt currentPlan={currentPlan} feature={requiredFeature} />
  }
  
  return <>{children}</>
}

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ALLOWED_ESTIMATING_ROLES = ['owner', 'admin', 'estimator'] as const

export type EstimatorContext = {
  userId: string
  companyId: string
  role: (typeof ALLOWED_ESTIMATING_ROLES)[number]
}

export async function requireEstimatorContext(): Promise<EstimatorContext> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.companyId) {
    throw new Error('Unauthorized')
  }

  const normalizedRole = session.user.role.toLowerCase()
  if (!ALLOWED_ESTIMATING_ROLES.includes(normalizedRole as (typeof ALLOWED_ESTIMATING_ROLES)[number])) {
    throw new Error('Forbidden')
  }

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: normalizedRole as (typeof ALLOWED_ESTIMATING_ROLES)[number],
  }
}

import 'next-auth'
import 'next-auth/jwt'
import type { PlanKey } from '@/lib/billing/planTiers'

declare module 'next-auth' {
  interface User {
    id: string
    role: string
    companyId?: string
    planKey?: PlanKey
    starterStartedAt?: string | null
    starterExpiresAt?: string | null
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      companyId?: string
      planKey: PlanKey
      starterStartedAt?: string | null
      starterExpiresAt?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    companyId?: string
    planKey?: PlanKey
    starterStartedAt?: string | null
    starterExpiresAt?: string | null
    planRefreshedAt?: number
  }
}

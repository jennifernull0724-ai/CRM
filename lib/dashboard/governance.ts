import { prisma } from '@/lib/prisma'
import { getInviteToggle } from '@/lib/system/settings'

export const GOVERNANCE_ROLES = ['owner', 'admin', 'estimator', 'user', 'dispatch'] as const

export type GovernanceRole = (typeof GOVERNANCE_ROLES)[number]

export type GovernanceState = {
  invitesEnabled: boolean
  users: {
    id: string
    name: string
    email: string
    role: string
    disabled: boolean
    createdAt: Date
  }[]
  invites: {
    id: string
    email: string
    role: string
    expiresAt: Date
    createdAt: Date
  }[]
  auditLogs: {
    id: string
    action: string
    createdAt: Date
    actorName: string | null
    targetEmail: string | null
    metadata: Record<string, unknown> | null
  }[]
}

export async function getGovernanceState(companyId: string): Promise<GovernanceState> {
  const [invitesEnabled, users, invites, auditLogs] = await Promise.all([
    getInviteToggle(companyId),
    prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        disabled: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.userInvite.findMany({
      where: { companyId, revokedAt: null, acceptedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.accessAuditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        action: true,
        createdAt: true,
        metadata: true,
        actor: { select: { name: true, email: true } },
        targetUser: { select: { email: true } },
        targetInvite: { select: { email: true } },
      },
    }),
  ])

  return {
    invitesEnabled,
    users,
    invites,
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.createdAt,
      metadata: (log.metadata as Record<string, unknown> | null) ?? null,
      actorName: log.actor?.name ?? log.actor?.email ?? null,
      targetEmail: log.targetUser?.email ?? log.targetInvite?.email ?? null,
    })),
  }
}

const DAY = 1000 * 60 * 60 * 24

export type AttentionInput = {
  archived: boolean
  lastActivityAt: Date | null
  openTasks: Array<{ dueDate: Date | null }>
  hasOverdueTasks: boolean
  loggedCallCount: number
  meetingCount: number
}

export type AttentionResult = {
  score: number
  level: 'urgent' | 'watch' | 'stable'
  reasons: string[]
  primaryReason: string
}

export function evaluateContactAttention(input: AttentionInput): AttentionResult {
  if (input.archived) {
    return { score: 0, level: 'stable', reasons: ['Archived'], primaryReason: 'Archived' }
  }

  const reasons: string[] = []
  let score = 0
  const now = Date.now()
  const daysSinceActivity = input.lastActivityAt ? (now - input.lastActivityAt.getTime()) / DAY : Infinity

  if (input.hasOverdueTasks) {
    score += 70
    reasons.push('Overdue tasks')
  }

  if (input.openTasks.length && daysSinceActivity > 5) {
    score += 30
    reasons.push('Open tasks idling')
  }

  if (daysSinceActivity > 14) {
    score += 50
    reasons.push('No activity in 14+ days')
  } else if (daysSinceActivity > 7) {
    score += 25
    reasons.push('No touch in 7+ days')
  }

  if (!input.loggedCallCount) {
    score += 15
    reasons.push('No calls logged')
  }

  if (!input.meetingCount && daysSinceActivity > 21) {
    score += 15
    reasons.push('No meetings scheduled')
  }

  if (!reasons.length) {
    reasons.push('On track')
  }

  let level: AttentionResult['level'] = 'stable'
  if (score >= 70) {
    level = 'urgent'
  } else if (score >= 30) {
    level = 'watch'
  }

  return {
    score,
    level,
    reasons,
    primaryReason: reasons[0],
  }
}

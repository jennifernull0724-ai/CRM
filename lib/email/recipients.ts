import { z } from 'zod'
import type { EmailRecipientInput } from '@/lib/email/service'

export function normalizeRecipientList(raw?: string | null): EmailRecipientInput[] {
  if (!raw) return []
  const emails = raw
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const unique = Array.from(new Set(emails.map((value) => value.toLowerCase())))
  return unique.map((email) => {
    const parsed = z.string().email().safeParse(email)
    if (!parsed.success) {
      throw new Error(`Invalid email: ${email}`)
    }
    return { email: parsed.data }
  })
}

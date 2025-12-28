import 'dotenv/config'

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const normalizeDatabaseUrl = (value: string | undefined) => {
  if (!value) return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  // Defensively strip wrapping quotes in case the runtime env loader doesn't.
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1).trim()
      : trimmed

  return unquoted || undefined
}

const createPrismaClient = () => {
  const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL)

  if (!connectionString) {
    // For build time when DATABASE_URL might not be set
    return new PrismaClient({
      log: ['error', 'warn'],
      __internal: {
        engine: {
          tracing: false,
        },
      },
    })
  }

  // Prisma adapter-neon (v7+) expects Neon Pool *config* (or connection string),
  // not an already-constructed Pool instance.
  const adapter = new PrismaNeon({ connectionString })

  return new PrismaClient({
    adapter,
    log: ['error', 'warn'],
    __internal: {
      engine: {
        tracing: false,
      },
    },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

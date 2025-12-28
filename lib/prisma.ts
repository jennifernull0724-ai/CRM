import { PrismaClient } from '@prisma/client'
import { Pool } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL

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

  const pool = new Pool({ connectionString })
  const adapter = new PrismaNeon(pool)

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

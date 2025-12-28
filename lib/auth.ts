import { NextAuthOptions } from 'next-auth'
import type { Adapter } from 'next-auth/adapters'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import type { PlanKey } from '@/lib/billing/planTiers'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            company: {
              select: {
                id: true,
                planKey: true,
                starterStartedAt: true,
                starterExpiresAt: true,
              },
            },
          },
        })

        if (!user || !user.password) {
          throw new Error('Invalid credentials')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error('Invalid credentials')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId ?? undefined,
          planKey: (user.company?.planKey as PlanKey) ?? 'starter',
          starterStartedAt: user.company?.starterStartedAt?.toISOString() ?? null,
          starterExpiresAt: user.company?.starterExpiresAt?.toISOString() ?? null,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.companyId = user.companyId
        token.planKey = (user.planKey as PlanKey) ?? 'starter'
        token.starterStartedAt = user.starterStartedAt ?? null
        token.starterExpiresAt = user.starterExpiresAt ?? null
        token.planRefreshedAt = Date.now()
        return token
      }

      const shouldRefreshPlan =
        !token.planRefreshedAt || Date.now() - token.planRefreshedAt > 5 * 60 * 1000 || trigger === 'update'

      if (token.id && shouldRefreshPlan) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            role: true,
            companyId: true,
            company: {
              select: {
                planKey: true,
                starterStartedAt: true,
                starterExpiresAt: true,
              },
            },
          },
        })

        if (dbUser) {
          token.role = dbUser.role
          token.companyId = dbUser.companyId ?? undefined
          token.planKey = (dbUser.company?.planKey as PlanKey) ?? 'starter'
          token.starterStartedAt = dbUser.company?.starterStartedAt?.toISOString() ?? null
          token.starterExpiresAt = dbUser.company?.starterExpiresAt?.toISOString() ?? null
          token.planRefreshedAt = Date.now()
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        session.user.companyId = token.companyId as string | undefined
        session.user.planKey = (token.planKey as PlanKey) ?? 'starter'
        session.user.starterStartedAt = (token.starterStartedAt as string | null) ?? null
        session.user.starterExpiresAt = (token.starterExpiresAt as string | null) ?? null
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

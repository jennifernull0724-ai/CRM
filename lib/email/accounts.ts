import crypto from 'crypto'
import type { EmailAccount, EmailProvider } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  buildGoogleAuthUrl,
  exchangeGoogleCodeForTokens,
  fetchGoogleProfile,
  refreshGoogleAccessToken,
  getGoogleScopes,
} from '@/lib/email/providers/gmail'
import {
  buildOutlookAuthUrl,
  exchangeOutlookCodeForTokens,
  fetchOutlookProfile,
  refreshOutlookAccessToken,
  getOutlookScopes,
} from '@/lib/email/providers/outlook'

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.randomBytes(32))
}

function generateCodeChallenge(verifier: string): string {
  return base64UrlEncode(crypto.createHash('sha256').update(verifier).digest())
}

const PROVIDER_SCOPES: Record<EmailProvider, () => string[]> = {
  gmail: getGoogleScopes,
  outlook: getOutlookScopes,
}

export async function initiateEmailOAuth(params: {
  companyId: string
  userId: string
  provider: EmailProvider
  redirectUri: string
  scopes?: string[]
}) {
  const state = crypto.randomUUID()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  const scopes = params.scopes ?? PROVIDER_SCOPES[params.provider]()

  await prisma.emailOAuthState.create({
    data: {
      companyId: params.companyId,
      userId: params.userId,
      provider: params.provider,
      state,
      codeVerifier,
      redirectUri: params.redirectUri,
      scopes,
      expiresAt,
    },
  })

  const authorizationUrl =
    params.provider === 'gmail'
      ? buildGoogleAuthUrl({ state, codeChallenge, redirectUri: params.redirectUri, scopes })
      : buildOutlookAuthUrl({ state, codeChallenge, redirectUri: params.redirectUri, scopes })

  return { authorizationUrl, state, expiresAt }
}

export async function consumeEmailOAuthState(state: string) {
  const record = await prisma.emailOAuthState.findUnique({ where: { state } })
  if (!record) {
    throw new Error('Invalid or expired OAuth state')
  }

  await prisma.emailOAuthState.delete({ where: { id: record.id } })

  if (record.expiresAt < new Date()) {
    throw new Error('OAuth state has expired')
  }

  return record
}

export async function finalizeEmailAccount(params: {
  provider: EmailProvider
  code: string
  codeVerifier: string
  redirectUri: string
  companyId: string
  userId: string
}) {
  const tokens =
    params.provider === 'gmail'
      ? await exchangeGoogleCodeForTokens({ code: params.code, codeVerifier: params.codeVerifier, redirectUri: params.redirectUri })
      : await exchangeOutlookCodeForTokens({ code: params.code, codeVerifier: params.codeVerifier, redirectUri: params.redirectUri })

  const profile =
    params.provider === 'gmail'
      ? await fetchGoogleProfile(tokens.accessToken)
      : await fetchOutlookProfile(tokens.accessToken)

  return prisma.emailAccount.upsert({
    where: { companyId_emailAddress: { companyId: params.companyId, emailAddress: profile.email } },
    update: {
      userId: params.userId,
      provider: params.provider,
      displayName: profile.name ?? null,
      refreshToken: tokens.refreshToken ?? '',
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.expiresAt,
      scopes: tokens.scope ? tokens.scope.split(' ') : PROVIDER_SCOPES[params.provider](),
      syncStatus: 'idle',
      syncError: null,
      deauthorizedAt: null,
    },
    create: {
      companyId: params.companyId,
      userId: params.userId,
      provider: params.provider,
      emailAddress: profile.email,
      displayName: profile.name ?? null,
      refreshToken: tokens.refreshToken ?? '',
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.expiresAt,
      scopes: tokens.scope ? tokens.scope.split(' ') : PROVIDER_SCOPES[params.provider](),
      syncStatus: 'idle',
    },
  })
}

export async function refreshAccountAccessToken(account: EmailAccount) {
  if (!account.refreshToken) {
    throw new Error('Account missing refresh token')
  }

  const tokens =
    account.provider === 'gmail'
      ? await refreshGoogleAccessToken(account.refreshToken)
      : await refreshOutlookAccessToken(account.refreshToken)

  return prisma.emailAccount.update({
    where: { id: account.id },
    data: {
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.expiresAt,
      refreshToken: tokens.refreshToken ?? account.refreshToken,
      syncError: null,
    },
  })
}

export function needsAccessTokenRefresh(account: EmailAccount) {
  if (!account.accessToken || !account.accessTokenExpiresAt) {
    return true
  }

  const threshold = new Date(Date.now() + 2 * 60 * 1000)
  return account.accessTokenExpiresAt < threshold
}

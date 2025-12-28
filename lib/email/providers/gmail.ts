import { URLSearchParams } from 'url'

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
const GOOGLE_PROFILE_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

export type GoogleTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  token_type: string
  id_token?: string
}

export type GoogleTokens = {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  scope?: string
}

export function getGoogleScopes(): string[] {
  return [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
  ]
}

function requireGoogleClientConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth environment variables are not configured')
  }

  return { clientId, clientSecret }
}

export function buildGoogleAuthUrl(params: {
  state: string
  codeChallenge: string
  redirectUri: string
  scopes?: string[]
}) {
  const { clientId } = requireGoogleClientConfig()
  const url = new URL(GOOGLE_AUTH_BASE)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('scope', (params.scopes ?? getGoogleScopes()).join(' '))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

export async function exchangeGoogleCodeForTokens(params: {
  code: string
  codeVerifier: string
  redirectUri: string
}): Promise<GoogleTokens> {
  const { clientId, clientSecret } = requireGoogleClientConfig()
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: params.code,
    code_verifier: params.codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: params.redirectUri,
  })

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(`Google token exchange failed: ${payload}`)
  }

  const data = (await response.json()) as GoogleTokenResponse
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope,
  }
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const { clientId, clientSecret } = requireGoogleClientConfig()
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(`Google token refresh failed: ${payload}`)
  }

  const data = (await response.json()) as GoogleTokenResponse
  return {
    accessToken: data.access_token,
    refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope,
  }
}

export async function sendGmailMessage(params: {
  accessToken: string
  raw: string
  threadId?: string
}) {
  const response = await fetch(`${GMAIL_API_BASE}/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: params.raw, threadId: params.threadId }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to send Gmail message: ${text}`)
  }

  return response.json()
}

export type GmailListMessagesResponse = {
  messages?: Array<{ id: string; threadId: string }>
  nextPageToken?: string
  resultSizeEstimate: number
}

export async function listGmailMessages(params: {
  accessToken: string
  labelIds?: string[]
  pageToken?: string
  maxResults?: number
  q?: string
}) {
  const url = new URL(`${GMAIL_API_BASE}/messages`)
  if (params.labelIds?.length) {
    url.searchParams.set('labelIds', params.labelIds.join(','))
  }
  if (params.pageToken) {
    url.searchParams.set('pageToken', params.pageToken)
  }
  if (params.maxResults) {
    url.searchParams.set('maxResults', params.maxResults.toString())
  }
  if (params.q) {
    url.searchParams.set('q', params.q)
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to list Gmail messages: ${text}`)
  }

  return (await response.json()) as GmailListMessagesResponse
}

export async function getGmailMessage(params: {
  accessToken: string
  id: string
  format?: 'full' | 'metadata' | 'minimal' | 'raw'
}) {
  const url = new URL(`${GMAIL_API_BASE}/messages/${params.id}`)
  url.searchParams.set('format', params.format ?? 'full')

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to fetch Gmail message: ${text}`)
  }

  return response.json()
}

export async function getGmailAttachment(params: {
  accessToken: string
  messageId: string
  attachmentId: string
}): Promise<Buffer> {
  const url = `${GMAIL_API_BASE}/messages/${params.messageId}/attachments/${params.attachmentId}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to fetch Gmail attachment: ${text}`)
  }

  const payload = await response.json()
  const data = payload.data as string
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

export async function fetchGoogleProfile(accessToken: string): Promise<{ email: string; name?: string }> {
  const response = await fetch(GOOGLE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(`Failed to fetch Google profile: ${payload}`)
  }

  const data = (await response.json()) as { email?: string; name?: string }
  if (!data.email) {
    throw new Error('Google profile missing email address')
  }

  return { email: data.email.toLowerCase(), name: data.name }
}

import { URLSearchParams } from 'url'

const OUTLOOK_AUTH_BASE = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const OUTLOOK_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
const GRAPH_ME = `${GRAPH_BASE}/me`

export type OutlookTokenResponse = {
  token_type: string
  scope?: string
  expires_in: number
  ext_expires_in?: number
  access_token: string
  refresh_token?: string
  id_token?: string
}

export type OutlookTokens = {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  scope?: string
}

export function getOutlookScopes(): string[] {
  return ['offline_access', 'Mail.ReadWrite', 'Mail.Send', 'User.Read']
}

function requireOutlookClientConfig() {
  const clientId = process.env.OUTLOOK_OAUTH_CLIENT_ID
  const clientSecret = process.env.OUTLOOK_OAUTH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Outlook OAuth environment variables are not configured')
  }

  return { clientId, clientSecret }
}

export function buildOutlookAuthUrl(params: {
  state: string
  codeChallenge: string
  redirectUri: string
  scopes?: string[]
}) {
  const { clientId } = requireOutlookClientConfig()
  const url = new URL(OUTLOOK_AUTH_BASE)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('scope', (params.scopes ?? getOutlookScopes()).join(' '))
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

export async function exchangeOutlookCodeForTokens(params: {
  code: string
  codeVerifier: string
  redirectUri: string
}): Promise<OutlookTokens> {
  const { clientId, clientSecret } = requireOutlookClientConfig()
  const body = new URLSearchParams({
    client_id: clientId,
    scope: getOutlookScopes().join(' '),
    code: params.code,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: params.codeVerifier,
    client_secret: clientSecret,
  })

  const response = await fetch(OUTLOOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(`Outlook token exchange failed: ${payload}`)
  }

  const data = (await response.json()) as OutlookTokenResponse
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope,
  }
}

export async function refreshOutlookAccessToken(refreshToken: string): Promise<OutlookTokens> {
  const { clientId, clientSecret } = requireOutlookClientConfig()
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: getOutlookScopes().join(' '),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const response = await fetch(OUTLOOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(`Outlook token refresh failed: ${payload}`)
  }

  const data = (await response.json()) as OutlookTokenResponse
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope,
  }
}

export type OutlookRecipient = {
  emailAddress: {
    address: string
    name?: string
  }
}

export type OutlookAttachment = {
  '@odata.type': '#microsoft.graph.fileAttachment'
  name: string
  contentBytes: string
  contentType?: string
}

export async function sendOutlookMessage(params: {
  accessToken: string
  subject: string
  htmlBody?: string
  textBody?: string
  to: OutlookRecipient[]
  cc?: OutlookRecipient[]
  bcc?: OutlookRecipient[]
  attachments?: OutlookAttachment[]
  replyToId?: string
}) {
  const body = {
    message: {
      subject: params.subject,
      body: {
        contentType: params.htmlBody ? 'HTML' : 'Text',
        content: params.htmlBody ?? params.textBody ?? '',
      },
      toRecipients: params.to,
      ccRecipients: params.cc ?? [],
      bccRecipients: params.bcc ?? [],
      attachments: params.attachments ?? [],
      ...(params.replyToId
        ? {
            internetMessageHeaders: [
              { name: 'In-Reply-To', value: params.replyToId },
              { name: 'References', value: params.replyToId },
            ],
          }
        : {}),
    },
    saveToSentItems: true,
  }

  const response = await fetch(`${GRAPH_BASE}/me/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(`Failed to send Outlook message: ${payload}`)
  }
}

export async function listOutlookMessages(params: {
  accessToken: string
  top?: number
  filter?: string
  select?: string[]
  orderby?: string
  skipToken?: string
}) {
  const url = new URL(`${GRAPH_BASE}/me/messages`)
  if (params.top) url.searchParams.set('$top', params.top.toString())
  if (params.filter) url.searchParams.set('$filter', params.filter)
  if (params.orderby) url.searchParams.set('$orderby', params.orderby)
  if (params.select?.length) url.searchParams.set('$select', params.select.join(','))
  if (params.skipToken) url.searchParams.set('$skiptoken', params.skipToken)

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(`Failed to list Outlook messages: ${payload}`)
  }

  return response.json()
}

export async function getOutlookMessage(params: {
  accessToken: string
  id: string
  expandAttachments?: boolean
}) {
  const url = new URL(`${GRAPH_BASE}/me/messages/${params.id}`)
  if (params.expandAttachments) {
    url.searchParams.set('$expand', 'attachments')
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(`Failed to fetch Outlook message: ${payload}`)
  }

  return response.json()
}

export async function downloadOutlookAttachment(params: {
  accessToken: string
  messageId: string
  attachmentId: string
}): Promise<Buffer> {
  const url = `${GRAPH_BASE}/me/messages/${params.messageId}/attachments/${params.attachmentId}/$value`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(`Failed to download Outlook attachment: ${payload}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function fetchOutlookProfile(accessToken: string): Promise<{ email: string; name?: string }> {
  const response = await fetch(GRAPH_ME, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(`Failed to fetch Outlook profile: ${payload}`)
  }

  const data = (await response.json()) as { mail?: string; userPrincipalName?: string; displayName?: string }
  const email = (data.mail ?? data.userPrincipalName)?.toLowerCase()
  if (!email) {
    throw new Error('Outlook profile missing email address')
  }

  return { email, name: data.displayName }
}

import { cookies } from 'next/headers'

const FALLBACK_BASE_URL = 'http://localhost:3000'

function resolveBaseUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    FALLBACK_BASE_URL
  )
}

async function serializeCookies(): Promise<string | undefined> {
  const store = await cookies()
  const serialized = store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')
  return serialized.length ? serialized : undefined
}

export async function fetchContactAnalytics<T>(endpoint: string): Promise<T> {
  const baseUrl = resolveBaseUrl()
  const resolvedUrl = endpoint.startsWith('http') ? endpoint : new URL(endpoint, baseUrl).toString()
  const cookieHeader = await serializeCookies()
  const response = await fetch(resolvedUrl, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: 'no-store',
    next: { revalidate: 0 },
  })

  const payloadText = await response.text()

  if (!response.ok) {
    throw new Error(`Analytics request failed (${response.status}): ${payloadText || 'Unknown error'}`)
  }

  return payloadText ? (JSON.parse(payloadText) as T) : ({} as T)
}

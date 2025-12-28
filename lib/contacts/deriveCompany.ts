const GENERIC_DOMAINS = new Set(['gmail', 'yahoo', 'outlook', 'icloud', 'hotmail', 'live', 'aol'])

function normalizeLabel(input: string) {
  if (!input) return 'Unknown Organization'
  const cleaned = input.replace(/[^a-z0-9]/gi, ' ').trim()
  if (!cleaned) return 'Unknown Organization'
  return cleaned
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ')
}

export function deriveCompanyNameFromEmail(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  if (!domain) return 'Unknown Organization'

  const parts = domain.split('.')
  if (parts.length === 0) {
    return normalizeLabel(domain)
  }

  const root = parts.length > 2 ? parts[parts.length - 3] : parts[0]
  if (!root || GENERIC_DOMAINS.has(root)) {
    return 'Unknown Organization'
  }

  return normalizeLabel(root)
}

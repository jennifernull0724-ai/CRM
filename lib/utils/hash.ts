import crypto from 'crypto'

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

function canonicalize(value: Json): Json {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item as Json))
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, Json>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, canonicalize(val as Json)])

    return entries.reduce<Record<string, Json>>((acc, [key, val]) => {
      acc[key] = val
      return acc
    }, {})
  }

  return value
}

export function sha256(input: Buffer | string): string {
  const buffer = typeof input === 'string' ? Buffer.from(input) : input
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export function hashPayload(value: unknown): string {
  const canonicalValue = canonicalize(value as Json)
  const serialized = JSON.stringify(canonicalValue)
  return sha256(serialized)
}

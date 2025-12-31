import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import * as XLSX from 'xlsx'
import { createContactRecord } from '@/lib/contacts/mutations'
import type { PlanKey } from '@/lib/billing/planTiers'

const REQUIRED_HEADERS = ['company', 'first name', 'last name', 'email', 'phone']

function normalizeKey(value: string) {
  return value.trim().toLowerCase()
}

function normalizeValue(value: unknown) {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const planKey = (session.user.planKey as PlanKey) ?? 'starter'
    if (planKey === 'starter') {
      return NextResponse.json(
        { error: 'Bulk upload requires paid plan' },
        { status: 403 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File upload required' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json({ error: 'Unable to read spreadsheet' }, { status: 400 })
    }

    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    })

    if (!rows.length) {
      return NextResponse.json({ error: 'No rows detected in upload' }, { status: 400 })
    }

    const firstRow = rows[0]
    const normalizedHeaders = new Set(Object.keys(firstRow).map((key) => normalizeKey(key)))
    const missingHeaders = REQUIRED_HEADERS.filter((header) => !normalizedHeaders.has(header))

    if (missingHeaders.length) {
      return NextResponse.json(
        { error: `Missing required headers: ${missingHeaders.join(', ')}` },
        { status: 400 }
      )
    }

    const seenKeys = new Set<string>()
    const results: Array<{ row: number; status: 'success' | 'error'; message: string; contactId?: string }> = []
    let successCount = 0

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const rowNumber = index + 2 // account for header row
      const record = Object.keys(row).reduce<Record<string, string>>((acc, key) => {
        acc[normalizeKey(key)] = normalizeValue(row[key])
        return acc
      }, {})

      const firstName = record['first name']
      const lastName = record['last name']
      const email = record['email']
      const phone = record['phone']

      if (!firstName || !lastName || !email) {
        results.push({ row: rowNumber, status: 'error', message: 'Missing required values' })
        continue
      }

      const dedupKey = `${email.toLowerCase()}|${record['company']?.toLowerCase() ?? ''}`
      if (seenKeys.has(dedupKey)) {
        results.push({ row: rowNumber, status: 'error', message: 'Duplicate row within file' })
        continue
      }
      seenKeys.add(dedupKey)

      try {
        const contact = await createContactRecord(
          {
            firstName,
            lastName,
            email,
            phone,
            mobile: record['mobile'] ?? '',
            jobTitle: record['job title'] ?? '',
            companyLabel: record['company'] ?? '',
          },
          {
            companyId: session.user.companyId,
            actorId: session.user.id,
            source: 'bulk-import',
          }
        )

        results.push({ row: rowNumber, status: 'success', message: 'Contact created', contactId: contact.id })
        successCount += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to create contact'
        results.push({ row: rowNumber, status: 'error', message })
      }
    }

    return NextResponse.json({
      summary: {
        totalRows: rows.length,
        succeeded: successCount,
        failed: rows.length - successCount,
      },
      rows: results,
    })
  } catch (error) {
    console.error('POST /api/contacts/import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

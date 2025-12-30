import { NextRequest, NextResponse } from 'next/server'
import { ZodError, type ZodSchema } from 'zod'

const HTML_ACCEPT_PATTERN = /text\/html/i

export class FormValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super('FORM_VALIDATION_ERROR')
  }
}

interface FormResponseOptions {
  redirectPath?: string
  errors?: string[]
}

const toSerializableValue = (value: FormDataEntryValue) => (typeof value === 'string' ? value : value.name ?? '')

export async function parseInboundForm<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  const contentType = req.headers.get('content-type') || ''
  let payload: unknown

  if (contentType.includes('application/json')) {
    payload = await req.json()
  } else {
    const form = await req.formData()
    payload = Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, toSerializableValue(value)]))
  }

  try {
    return schema.parse(payload)
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((issue) => {
        const field = issue.path.join('.') || 'form'
        return `${field}: ${issue.message}`
      })

      throw new FormValidationError(errors)
    }

    throw error
  }
}

const prefersHtmlResponse = (req: NextRequest) => HTML_ACCEPT_PATTERN.test(req.headers.get('accept') || '')

export function formSuccessResponse(req: NextRequest, message: string, options: FormResponseOptions = {}) {
  if (options.redirectPath && prefersHtmlResponse(req)) {
    return NextResponse.redirect(new URL(options.redirectPath, req.url), { status: 303 })
  }

  return NextResponse.json({ success: true, message }, { status: 200 })
}

export function formErrorResponse(req: NextRequest, message: string, status = 400, options: FormResponseOptions = {}) {
  if (options.redirectPath && prefersHtmlResponse(req)) {
    return NextResponse.redirect(new URL(options.redirectPath, req.url), { status })
  }

  const payload: Record<string, unknown> = { success: false, message }

  if (options.errors?.length) {
    payload.errors = options.errors
  }

  return NextResponse.json(payload, { status })
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

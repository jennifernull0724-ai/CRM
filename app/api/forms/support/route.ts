import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sendSystemEmail } from '@/lib/email/sendSystemEmail'
import { FormValidationError, escapeHtml, formErrorResponse, formSuccessResponse, parseInboundForm } from '@/lib/forms/inboundForm'

const supportSchema = z.object({
  name: z.string().min(2, 'Name is required').max(120).trim(),
  company: z.string().max(180).trim().optional().default(''),
  email: z.string().email('Valid email required').max(254).trim(),
  module: z.string().max(160).trim().optional().default('General'),
  priority: z.enum(['p1', 'p2', 'p3']).default('p3'),
  message: z.string().min(10, 'Please describe the issue').max(3000).trim(),
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const payload = await parseInboundForm(req, supportSchema)

    await sendSystemEmail({
      recipient: 'support',
      subject: `Support Request (${payload.priority.toUpperCase()}) — ${payload.module}`,
      html: buildSupportHtml(payload),
      text: buildSupportText(payload),
      eventType: 'SUPPORT_FORM_SUBMITTED',
      formType: 'support',
      metadata: payload,
    })

    return formSuccessResponse(req, 'Support request received')
  } catch (error) {
    if (error instanceof FormValidationError) {
      return formErrorResponse(req, 'Invalid support request', 400, { errors: error.errors })
    }

    console.error('Support form submission failed', error)
    return formErrorResponse(req, 'Failed to submit support request', 500)
  }
}

type SupportPayload = z.infer<typeof supportSchema>

const buildSupportHtml = (payload: SupportPayload) => `
  <h2>Support Request</h2>
  <p><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
  ${payload.company ? `<p><strong>Company:</strong> ${escapeHtml(payload.company)}</p>` : ''}
  <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
  <p><strong>Module:</strong> ${escapeHtml(payload.module)}</p>
  <p><strong>Priority:</strong> ${escapeHtml(payload.priority.toUpperCase())}</p>
  <p><strong>Message:</strong></p>
  <p>${escapeHtml(payload.message)}</p>
`

const buildSupportText = (payload: SupportPayload) => {
  const lines = [
    'Support Request',
    `Name: ${payload.name}`,
    payload.company ? `Company: ${payload.company}` : null,
    `Email: ${payload.email}`,
    `Module: ${payload.module}`,
    `Priority: ${payload.priority.toUpperCase()}`,
    `Message: ${payload.message}`,
  ].filter(Boolean) as string[]

  return lines.join('\n')
}

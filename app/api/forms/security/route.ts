import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sendSystemEmail } from '@/lib/email/sendSystemEmail'
import { FormValidationError, escapeHtml, formErrorResponse, formSuccessResponse, parseInboundForm } from '@/lib/forms/inboundForm'

const securitySchema = z.object({
  name: z.string().min(2, 'Name is required').max(120).trim(),
  company: z.string().min(2, 'Company is required').max(180).trim(),
  email: z.string().email('Valid email required').max(254).trim(),
  role: z.string().max(120).trim().optional().default(''),
  systemArea: z.string().max(160).trim().optional().default('Security & Governance'),
  urgency: z.enum(['routine', 'elevated', 'critical']).default('routine'),
  message: z.string().min(20, 'Please include more detail').max(4000).trim(),
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const payload = await parseInboundForm(req, securitySchema)

    await sendSystemEmail({
      recipient: 'security',
      subject: `Security Inquiry (${payload.urgency.toUpperCase()})`,
      html: buildSecurityHtml(payload),
      text: buildSecurityText(payload),
      eventType: 'SECURITY_FORM_SUBMITTED',
      formType: 'security',
      metadata: payload,
    })

    return formSuccessResponse(req, 'Security request received')
  } catch (error) {
    if (error instanceof FormValidationError) {
      return formErrorResponse(req, 'Invalid security request', 400, { errors: error.errors })
    }

    console.error('Security form submission failed', error)
    return formErrorResponse(req, 'Failed to submit security request', 500)
  }
}

type SecurityPayload = z.infer<typeof securitySchema>

const buildSecurityHtml = (payload: SecurityPayload) => `
  <h2>Security Inquiry</h2>
  <p><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
  <p><strong>Company:</strong> ${escapeHtml(payload.company)}</p>
  <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
  ${payload.role ? `<p><strong>Role:</strong> ${escapeHtml(payload.role)}</p>` : ''}
  <p><strong>System Area:</strong> ${escapeHtml(payload.systemArea)}</p>
  <p><strong>Urgency:</strong> ${escapeHtml(payload.urgency)}</p>
  <p><strong>Message:</strong></p>
  <p>${escapeHtml(payload.message)}</p>
`

const buildSecurityText = (payload: SecurityPayload) => {
  const lines = [
    'Security Inquiry',
    `Name: ${payload.name}`,
    `Company: ${payload.company}`,
    `Email: ${payload.email}`,
    payload.role ? `Role: ${payload.role}` : null,
    `System Area: ${payload.systemArea}`,
    `Urgency: ${payload.urgency}`,
    `Message: ${payload.message}`,
  ].filter(Boolean) as string[]

  return lines.join('\n')
}

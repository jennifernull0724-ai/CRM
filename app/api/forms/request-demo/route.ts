import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sendSystemEmail } from '@/lib/email/sendSystemEmail'
import { FormValidationError, escapeHtml, formErrorResponse, formSuccessResponse, parseInboundForm } from '@/lib/forms/inboundForm'

const requestDemoSchema = z.object({
  name: z.string().min(2, 'Name is required').max(120).trim(),
  company: z.string().min(2, 'Company is required').max(180).trim(),
  email: z.string().email('Valid email required').max(254).trim(),
  industry: z.string().min(2, 'Industry is required').max(120).trim(),
  message: z.string().max(2000).trim().optional().default(''),
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const payload = await parseInboundForm(req, requestDemoSchema)

    await sendSystemEmail({
      recipient: 'requestDemo',
      subject: `Request Demo — ${payload.name} at ${payload.company}`,
      html: buildRequestDemoHtml(payload),
      text: buildRequestDemoText(payload),
      eventType: 'REQUEST_DEMO_SUBMITTED',
      formType: 'request-demo',
      metadata: payload,
    })

    return formSuccessResponse(req, 'Request received', { redirectPath: '/request-demo?success=true' })
  } catch (error) {
    if (error instanceof FormValidationError) {
      return formErrorResponse(req, 'Invalid request payload', 400, {
        redirectPath: '/request-demo?error=true',
        errors: error.errors,
      })
    }

    console.error('Request demo submission failed', error)
    return formErrorResponse(req, 'Failed to submit request', 500, { redirectPath: '/request-demo?error=true' })
  }
}

type RequestDemoPayload = z.infer<typeof requestDemoSchema>

const buildRequestDemoHtml = (payload: RequestDemoPayload) => `
  <h2>New Request Demo Submission</h2>
  <p><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
  <p><strong>Company:</strong> ${escapeHtml(payload.company)}</p>
  <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
  <p><strong>Industry:</strong> ${escapeHtml(payload.industry)}</p>
  ${payload.message ? `<p><strong>Message:</strong></p><p>${escapeHtml(payload.message)}</p>` : '<p><em>No additional message provided.</em></p>'}
`

const buildRequestDemoText = (payload: RequestDemoPayload) => {
  const lines = [
    'New Request Demo Submission',
    `Name: ${payload.name}`,
    `Company: ${payload.company}`,
    `Email: ${payload.email}`,
    `Industry: ${payload.industry}`,
    payload.message ? `Message: ${payload.message}` : 'Message: (none provided)',
  ]

  return lines.join('\n')
}

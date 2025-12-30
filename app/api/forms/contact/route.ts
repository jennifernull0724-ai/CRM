import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sendSystemEmail } from '@/lib/email/sendSystemEmail'
import { FormValidationError, escapeHtml, formErrorResponse, formSuccessResponse, parseInboundForm } from '@/lib/forms/inboundForm'

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required').max(120).trim(),
  company: z.string().max(180).trim().optional().default(''),
  email: z.string().email('Valid email required').max(254).trim(),
  phone: z.string().max(40).trim().optional().default(''),
  topic: z.string().max(120).trim().optional().default('General Inquiry'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000).trim(),
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const payload = await parseInboundForm(req, contactSchema)

    await sendSystemEmail({
      recipient: 'contact',
      subject: `Contact Form — ${payload.topic}`,
      html: buildContactHtml(payload),
      text: buildContactText(payload),
      eventType: 'CONTACT_FORM_SUBMITTED',
      formType: 'contact',
      metadata: payload,
    })

    return formSuccessResponse(req, 'Contact request received')
  } catch (error) {
    if (error instanceof FormValidationError) {
      return formErrorResponse(req, 'Invalid contact payload', 400, { errors: error.errors })
    }

    console.error('Contact form submission failed', error)
    return formErrorResponse(req, 'Failed to submit contact request', 500)
  }
}

type ContactPayload = z.infer<typeof contactSchema>

const buildContactHtml = (payload: ContactPayload) => `
  <h2>New Contact Submission</h2>
  <p><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
  ${payload.company ? `<p><strong>Company:</strong> ${escapeHtml(payload.company)}</p>` : ''}
  <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
  ${payload.phone ? `<p><strong>Phone:</strong> ${escapeHtml(payload.phone)}</p>` : ''}
  <p><strong>Topic:</strong> ${escapeHtml(payload.topic)}</p>
  <p><strong>Message:</strong></p>
  <p>${escapeHtml(payload.message)}</p>
`

const buildContactText = (payload: ContactPayload) => {
  const lines = [
    'New Contact Submission',
    `Name: ${payload.name}`,
    payload.company ? `Company: ${payload.company}` : null,
    `Email: ${payload.email}`,
    payload.phone ? `Phone: ${payload.phone}` : null,
    `Topic: ${payload.topic}`,
    `Message: ${payload.message}`,
  ].filter(Boolean) as string[]

  return lines.join('\n')
}

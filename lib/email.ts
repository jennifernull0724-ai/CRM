import type { ReactElement } from 'react'
import { Resend } from 'resend'
import type { SeatLimits } from '@/lib/billing/planTiers'
import { PostPurchaseWelcomeEmailTemplate, renderPostPurchaseWelcomeText } from '@/lib/email/templates/postPurchaseWelcome'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  react?: ReactElement
  from?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: Array<{
    filename: string
    content: Buffer
  }>
  tags?: Array<{ name: string; value: string }>
}

/**
 * Send email via Resend
 */
export async function sendEmail(params: SendEmailParams) {
  const { to, subject, html, text, react, from, cc, bcc, attachments, tags } = params

  if (!html && !react) {
    throw new Error('Email content (html or react) is required')
  }

  const result = await resend.emails.send({
    from: from || process.env.EMAIL_FROM!,
    to: Array.isArray(to) ? to : [to],
    subject,
    ...(html && { html }),
    ...(text && { text }),
    ...(react && { react }),
    ...(cc && { cc: Array.isArray(cc) ? cc : [cc] }),
    ...(bcc && { bcc: Array.isArray(bcc) ? bcc : [bcc] }),
    ...(attachments && { attachments }),
    ...(tags && { tags }),
  })

  return result
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: 'Welcome to T-REX AI OS',
    html: `
      <h1>Welcome to T-REX AI OS, ${name}!</h1>
      <p>Your account has been created successfully.</p>
      <p>You have a 14-day trial period to explore all features.</p>
      <p>Get started: <a href="${process.env.APP_URL}/app">Go to Dashboard</a></p>
      <p>Need help? Contact us at ${process.env.SUPPORT_EMAIL}</p>
    `,
  })
}

/**
 * Send deal PDF email
 */
export async function sendDealPdfEmail(
  to: string,
  subject: string,
  message: string,
  pdfBuffer: Buffer,
  dealName: string
) {
  return sendEmail({
    to,
    subject,
    html: `
      <p>${message}</p>
      <p>Please find the attached estimate for ${dealName}.</p>
      <p>Best regards,<br>T-REX AI OS Team</p>
    `,
    attachments: [
      {
        filename: `${dealName}-estimate.pdf`,
        content: pdfBuffer,
      },
    ],
  })
}

/**
 * Send task reminder
 */
export async function sendTaskReminder(to: string, taskTitle: string, dueDate: Date) {
  return sendEmail({
    to,
    subject: `Task Reminder: ${taskTitle}`,
    html: `
      <h2>Task Reminder</h2>
      <p><strong>${taskTitle}</strong></p>
      <p>Due: ${dueDate.toLocaleDateString()}</p>
      <p><a href="${process.env.APP_URL}/app">View in Dashboard</a></p>
    `,
  })
}

/**
 * Send mention notification
 */
export async function sendMentionNotification(
  to: string,
  mentionedBy: string,
  content: string,
  link: string
) {
  return sendEmail({
    to,
    subject: `${mentionedBy} mentioned you`,
    html: `
      <h2>You were mentioned</h2>
      <p><strong>${mentionedBy}</strong> mentioned you in a note:</p>
      <blockquote>${content}</blockquote>
      <p><a href="${link}">View Note</a></p>
    `,
  })
}

export interface PostPurchaseWelcomeEmailParams {
  to: string
  companyName: string
  planName: string
  planPriceLabel: string
  seatLimits: SeatLimits
  dashboardUrl: string
  supportEmail: string
  checklist: Array<{ title: string; detail: string; href?: string }>
  highlights: string[]
  templateVersion: string
}

export async function sendPostPurchaseWelcomeEmail(params: PostPurchaseWelcomeEmailParams) {
  const { to, companyName, planName, planPriceLabel, seatLimits, dashboardUrl, supportEmail, checklist, highlights, templateVersion } = params

  const templateProps = {
    companyName,
    planName,
    planPriceLabel,
    dashboardUrl,
    supportEmail,
    seatLimits,
    checklist,
    highlights,
  }

  return sendEmail({
    to,
    subject: `Welcome to T-REX AI OS — ${planName}`,
    react: PostPurchaseWelcomeEmailTemplate(templateProps),
    text: renderPostPurchaseWelcomeText(templateProps),
    tags: [
      { name: 'template', value: templateVersion },
      { name: 'plan', value: planName },
    ],
  })
}

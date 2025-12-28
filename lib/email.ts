import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  from?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: Array<{
    filename: string
    content: Buffer
  }>
}

/**
 * Send email via Resend
 */
export async function sendEmail(params: SendEmailParams) {
  const { to, subject, html, from, cc, bcc, attachments } = params

  const result = await resend.emails.send({
    from: from || process.env.EMAIL_FROM!,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(cc && { cc: Array.isArray(cc) ? cc : [cc] }),
    ...(bcc && { bcc: Array.isArray(bcc) ? bcc : [bcc] }),
    ...(attachments && { attachments }),
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
      <p>Get started: <a href="${process.env.APP_URL}/dashboard/user">Go to Dashboard</a></p>
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
      <p><a href="${process.env.APP_URL}/dashboard/user">View in Dashboard</a></p>
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

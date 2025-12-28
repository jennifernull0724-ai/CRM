import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const name = formData.get('name') as string
    const company = formData.get('company') as string
    const email = formData.get('email') as string
    const industry = formData.get('industry') as string
    const message = formData.get('message') as string || ''

    if (!name || !company || !email || !industry) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Send email to support
    await sendEmail({
      to: process.env.SUPPORT_EMAIL || 'jennnull4@gmail.com',
      subject: `Demo Request from ${name} at ${company}`,
      html: `
        <h2>New Demo Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Industry:</strong> ${industry}</p>
        ${message ? `<p><strong>Message:</strong></p><p>${message}</p>` : ''}
      `,
    })

    // Redirect to thank you page
    return NextResponse.redirect(new URL('/request-demo?success=true', req.url))
  } catch (error) {
    console.error('Request demo error:', error)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, company, phone, message } = body

    if (!name || !email || !company) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      )
    }

    // Log the demo request
    console.log('Demo request received:', {
      name,
      email,
      company,
      phone,
      message,
      timestamp: new Date().toISOString(),
    })

    // In production, this would:
    // 1. Save to database
    // 2. Send email to sales team
    // 3. Send confirmation email to requester
    // 4. Create entry in CRM

    return NextResponse.json({ 
      success: true,
      message: 'Demo request submitted successfully'
    })
  } catch (error) {
    console.error('Demo request error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

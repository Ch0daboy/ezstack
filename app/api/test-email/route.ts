import { auth } from '@clerk/nextjs/server'
import { sendEmail } from '@/lib/email/resend'
import { templates } from '@/lib/email/templates'
import { NextResponse } from 'next/server'

export async function POST() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // In a real app, you'd fetch the user's email from your database
    // For demo purposes, we'll use a test email
    const testEmail = process.env.RESEND_FROM_EMAIL || 'delivered@resend.dev'
    
    const emailData = templates.welcome('Test User')
    
    await sendEmail({
      to: testEmail,
      subject: emailData.subject,
      html: emailData.html,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

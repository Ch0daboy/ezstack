import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key-for-build')

export async function sendEmail({
  to,
  subject,
  html,
  from = process.env.RESEND_FROM_EMAIL || 'noreply@resend.dev',
}: {
  to: string | string[]
  subject: string
  html: string
  from?: string
}) {
  return resend.emails.send({ from, to, subject, html })
}


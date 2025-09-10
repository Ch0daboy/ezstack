import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env.local')
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: { data: { id: string }, type: string }

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as { data: { id: string }, type: string }
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occurred', { status: 400 })
  }

  const { id } = evt.data
  const eventType = evt.type

  console.log(`Webhook with ID of ${id} and type of ${eventType}`)

  // Handle different event types
  switch (eventType) {
    case 'user.created':
      console.log('User created:', evt.data)
      // TODO: Create user in Supabase
      // await createUserInSupabase({
      //   clerkId: evt.data.id,
      //   email: evt.data.email_addresses[0]?.email_address,
      //   firstName: evt.data.first_name,
      //   lastName: evt.data.last_name,
      // })
      break
    
    case 'user.updated':
      console.log('User updated:', evt.data)
      // TODO: Update user in Supabase
      break
    
    case 'user.deleted':
      console.log('User deleted:', evt.data)
      // TODO: Delete or anonymize user in Supabase
      break
    
    default:
      console.log(`Unhandled webhook event: ${eventType}`)
  }

  return NextResponse.json({ received: true })
}
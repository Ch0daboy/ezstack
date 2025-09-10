import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'
import { userOperations } from '@/lib/db/helpers'
import type { UserInsert } from '@/lib/types/database'

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

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occurred', { status: 400 })
  }

  const eventType = evt.type
  console.log(`Webhook with type ${eventType} received`)

  // Handle user.created event
  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data

    try {
      // Check if user already exists
      let user
      try {
        user = await userOperations.getByClerkId(id)
      } catch (error) {
        // User doesn't exist, create it
        const userData: UserInsert = {
          clerk_id: id,
          subscription_tier: 'free',
          credits_remaining: 100, // Initial free credits
          settings: {
            email_notifications: true,
            research_preferences: {
              enabled: true,
              depth: 'moderate',
              fact_checking: true,
              sources_required: 3
            }
          }
        }

        user = await userOperations.create(userData)
        console.log('User created in Supabase:', user.id)
      }

      return NextResponse.json({ 
        message: 'User synced successfully',
        userId: user.id 
      })
    } catch (error) {
      console.error('Error creating user in Supabase:', error)
      return new Response('Error syncing user', { status: 500 })
    }
  }

  // Handle user.updated event
  if (eventType === 'user.updated') {
    const { id } = evt.data

    try {
      const user = await userOperations.getByClerkId(id)
      
      if (user) {
        console.log('User update event received for:', user.id)
      }

      return NextResponse.json({ 
        message: 'User update processed',
        userId: user?.id 
      })
    } catch (error) {
      console.error('Error updating user:', error)
      return new Response('Error updating user', { status: 500 })
    }
  }

  // Handle user.deleted event
  if (eventType === 'user.deleted') {
    const { id } = evt.data

    try {
      const user = await userOperations.getByClerkId(id!)
      
      if (user) {
        // Mark user as deleted but keep data for integrity
        await userOperations.update(user.id, {
          settings: {
            ...user.settings,
            account_status: 'deleted'
          }
        })
        console.log('User marked as deleted:', user.id)
      }

      return NextResponse.json({ 
        message: 'User deletion processed',
        userId: user?.id 
      })
    } catch (error) {
      console.error('Error processing user deletion:', error)
      return new Response('Error processing deletion', { status: 500 })
    }
  }

  return NextResponse.json({ 
    message: 'Webhook received',
    type: eventType 
  })
}
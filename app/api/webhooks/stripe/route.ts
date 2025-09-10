import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { inngest } from '@/lib/inngest/client'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')!

  let event: import('stripe').Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error: unknown) {
    console.error('Webhook signature verification failed:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        
        // Trigger background job for payment processing
        await inngest.send({
          name: 'payment.initiated',
          data: {
            paymentId: session.id,
            email: session.customer_email,
            amount: `$${(session.amount_total! / 100).toFixed(2)}`,
            customerId: session.customer,
          },
        })
        
        console.log('Checkout session completed:', session.id)
        break
      }
      
      case 'customer.subscription.created': {
        const subscription = event.data.object
        console.log('Subscription created:', subscription.id)
        // Handle subscription creation
        break
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        console.log('Subscription updated:', subscription.id)
        // Handle subscription update
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        console.log('Subscription cancelled:', subscription.id)
        // Handle subscription cancellation
        break
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        console.log('Invoice payment succeeded:', invoice.id)
        // Handle successful payment
        break
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        console.log('Invoice payment failed:', invoice.id)
        // Handle failed payment
        break
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}

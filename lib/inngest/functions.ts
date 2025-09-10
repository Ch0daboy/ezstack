import { inngest } from "./client"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key-for-build')

export const sendWelcomeEmail = inngest.createFunction(
  { id: "send-welcome-email", name: "Send Welcome Email" },
  { event: "user.created" },
  async ({ event, step }) => {
    await step.run("send-email", async () => {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: event.data.email,
        subject: "Welcome to our SaaS!",
        html: `
          <div>
            <h1>Welcome ${event.data.name || "there"}!</h1>
            <p>Thank you for signing up for our service.</p>
            <p>Get started by exploring your dashboard.</p>
          </div>
        `,
      })
      
      return result
    })
  }
)

export const processPayment = inngest.createFunction(
  { id: "process-payment", name: "Process Payment" },
  { event: "payment.initiated" },
  async ({ event, step }) => {
    const paymentId = event.data.paymentId
    
    await step.sleep("wait-for-verification", "5s")
    
    await step.run("update-payment-status", async () => {
      // Here you would update your database
      console.log(`Processing payment ${paymentId}`)
      return { paymentId, status: "processed" }
    })
    
    await step.run("send-confirmation", async () => {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "billing@resend.dev",
        to: event.data.email,
        subject: "Payment Confirmation",
        html: `
          <div>
            <h1>Payment Confirmed</h1>
            <p>Your payment of ${event.data.amount} has been processed successfully.</p>
          </div>
        `,
      })
    })
  }
)

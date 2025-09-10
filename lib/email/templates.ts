export const templates = {
  welcome: (name: string) => ({
    subject: "Welcome to Our Platform!",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px;">
            <h1 style="color: #1a1a1a; margin-bottom: 20px;">Welcome ${name}! 🎉</h1>
            <p style="font-size: 16px; margin-bottom: 20px;">
              We're thrilled to have you join our community. Your account is now active and ready to use.
            </p>
            <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h2 style="color: #1a1a1a; font-size: 20px; margin-bottom: 15px;">Getting Started</h2>
              <ul style="padding-left: 20px;">
                <li>Complete your profile</li>
                <li>Explore the dashboard</li>
                <li>Connect your first integration</li>
              </ul>
            </div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
               style="display: inline-block; background-color: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
        </body>
      </html>
    `
  }),
  
  paymentSuccess: (amount: string, date: string) => ({
    subject: "Payment Successful",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px;">
            <h1 style="color: #1a1a1a; margin-bottom: 20px;">Payment Confirmed ✅</h1>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Your payment has been successfully processed.
            </p>
            <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h2 style="color: #1a1a1a; font-size: 18px; margin-bottom: 10px;">Payment Details</h2>
              <p><strong>Amount:</strong> ${amount}</p>
              <p><strong>Date:</strong> ${date}</p>
              <p><strong>Status:</strong> <span style="color: #10b981;">Completed</span></p>
            </div>
            <p style="font-size: 14px; color: #666;">
              A receipt has been sent to your registered email address.
            </p>
          </div>
        </body>
      </html>
    `
  }),
  
  passwordReset: (resetLink: string) => ({
    subject: "Password Reset Request",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px;">
            <h1 style="color: #1a1a1a; margin-bottom: 20px;">Password Reset Request</h1>
            <p style="font-size: 16px; margin-bottom: 20px;">
              We received a request to reset your password. Click the button below to create a new password.
            </p>
            <a href="${resetLink}" 
               style="display: inline-block; background-color: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">
              Reset Password
            </a>
            <p style="font-size: 14px; color: #666;">
              This link will expire in 1 hour. If you didn't request this, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `
  })
}

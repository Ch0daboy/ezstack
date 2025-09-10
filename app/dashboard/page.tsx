'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { usePostHog } from 'posthog-js/react'

export default function DashboardPage() {
  const { userId } = useAuth()
  const posthog = usePostHog()
  const [loading, setLoading] = useState(false)

  const handleTestEmail = async () => {
    setLoading(true)
    posthog?.capture('test_email_sent', { userId })
    
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
      })
      
      if (response.ok) {
        toast.success('Test email sent successfully!')
      } else {
        toast.error('Failed to send test email')
      }
    } catch {
      toast.error('Error sending email')
    } finally {
      setLoading(false)
    }
  }

  const handleTestEvent = () => {
    posthog?.capture('dashboard_test_event', {
      userId,
      timestamp: new Date().toISOString(),
    })
    toast.success('Event tracked in PostHog!')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome to your Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your user ID: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">{userId}</code>
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Overview of your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span className="text-sm font-medium">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Plan</span>
                <span className="text-sm font-medium">Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Usage</span>
                <span className="text-sm font-medium">0 / 100</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Email</CardTitle>
            <CardDescription>Send a test email via Resend</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleTestEmail} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Sending...' : 'Send Test Email'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>Track events with PostHog</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleTestEvent}
              variant="outline"
              className="w-full"
            >
              Track Test Event
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
            <CardDescription>Supabase integration ready</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect your Supabase project to start storing data.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Background Jobs</CardTitle>
            <CardDescription>Inngest functions configured</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Background jobs will process automatically when triggered.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            <CardDescription>Stripe ready to accept payments</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions and events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="text-sm font-medium">Account created</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Welcome to the platform</p>
              </div>
              <span className="text-xs text-gray-500">Just now</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="text-sm font-medium">Email verified</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Your email has been confirmed</p>
              </div>
              <span className="text-xs text-gray-500">2 minutes ago</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">First login</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Successfully authenticated</p>
              </div>
              <span className="text-xs text-gray-500">5 minutes ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <nav className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">SaaS Starter</h1>
          <div className="flex gap-4">
            <Link href="/sign-in">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16">
        <section className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-4">
            Build Your SaaS Faster
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            A complete starter template with authentication, payments, email, analytics, and more.
            Everything you need to launch your next project.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="text-lg px-8">
              Start Building Now
            </Button>
          </Link>
        </section>

        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle>🔐 Authentication</CardTitle>
              <CardDescription>Clerk + Supabase</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Secure authentication with Clerk and database integration with Supabase.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>💳 Payments</CardTitle>
              <CardDescription>Stripe Integration</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Accept payments, manage subscriptions, and handle webhooks with Stripe.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📧 Email</CardTitle>
              <CardDescription>Resend API</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Send transactional emails and notifications with beautiful templates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>⚡ Background Jobs</CardTitle>
              <CardDescription>Inngest Functions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Run background jobs and workflows reliably with Inngest.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📊 Analytics</CardTitle>
              <CardDescription>PostHog Tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track user behavior and product analytics with PostHog.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🎨 UI Components</CardTitle>
              <CardDescription>shadcn/ui</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Beautiful, accessible components built with Radix UI and Tailwind CSS.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="text-center py-16 border-t">
          <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Join thousands of developers building with our starter template.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg">Create Account</Button>
            </Link>
            <Link href="https://github.com">
              <Button size="lg" variant="outline">View on GitHub</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

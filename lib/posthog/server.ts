import { PostHog } from 'posthog-node'

export const posthogServer = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
  }
)

export async function captureServerEvent({
  distinctId,
  event,
  properties = {},
}: {
  distinctId: string
  event: string
  properties?: Record<string, any>
}) {
  posthogServer.capture({
    distinctId,
    event,
    properties,
  })
  
  // Flush events to ensure they're sent
  await posthogServer.flush()
}

'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PostHogProviderPrimitive } from 'posthog-js/react'
import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    capture_pageleave: true,
  })
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProviderPrimitive client={posthog}>
      <PostHogAuthWrapper>{children}</PostHogAuthWrapper>
    </PostHogProviderPrimitive>
  )
}

function PostHogAuthWrapper({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId } = useAuth()

  useEffect(() => {
    if (isSignedIn && userId) {
      posthog.identify(userId)
    } else {
      posthog.reset()
    }
  }, [isSignedIn, userId])

  return <>{children}</>
}

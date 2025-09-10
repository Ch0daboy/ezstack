# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Build and Development Commands

### Core Development
```bash
# Start development server with Turbopack
npm run dev

# Build for production with Turbopack
npm run build

# Start production server
npm run start

# Run ESLint
npm run lint

# Type checking (add to package.json if needed)
npx tsc --noEmit
```

### Service Setup Commands
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local

# Test Stripe webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# View Inngest dev dashboard (starts automatically with dev server)
# Access at: http://localhost:8288
```

### Adding Components
```bash
# Add new shadcn/ui components
npx shadcn@latest add [component-name]

# Example: Add button, card, and form components
npx shadcn@latest add button card form
```

## Architecture Overview

### Multi-Service Integration Pattern
This is a Next.js 15 application using App Router with a comprehensive third-party service integration architecture:

1. **Authentication Layer** (Clerk)
   - Middleware at `/middleware.ts` protects routes
   - Public routes: `/`, `/sign-in/*`, `/sign-up/*`, `/api/webhooks/*`, `/api/inngest/*`
   - Protected routes: Everything else (especially `/dashboard/*`)
   - Provider wraps entire app in `/app/layout.tsx`

2. **Database Layer** (Supabase)
   - Server client: `/lib/supabase/server.ts` - Uses SSR cookies for auth
   - Browser client: `/lib/supabase/client.ts` - For client-side operations
   - Handles PostgreSQL operations and real-time subscriptions

3. **Payment Processing** (Stripe)
   - Webhook handler: `/app/api/webhooks/stripe/route.ts`
   - Triggers Inngest background jobs on payment events
   - Server utilities in `/lib/stripe/server.ts` for API operations
   - Client utilities in `/lib/stripe/client.ts` for frontend integration

4. **Background Jobs** (Inngest)
   - Client configuration: `/lib/inngest/client.ts`
   - Functions defined in `/lib/inngest/functions.ts`
   - API endpoint at `/app/api/inngest/route.ts` serves the Inngest dashboard
   - Currently implements: `sendWelcomeEmail` and `processPayment` functions

5. **Email Service** (Resend)
   - Client in `/lib/email/resend.ts`
   - Templates in `/lib/email/templates.ts`
   - Integrated with Inngest for async email sending

6. **Analytics** (PostHog)
   - Provider in `/components/providers/posthog-provider.tsx`
   - Page view tracking component in `/components/posthog-page-view.tsx`
   - Server-side tracking utilities in `/lib/posthog/server.ts`

### Provider Hierarchy
The app uses a nested provider pattern in `/app/layout.tsx`:
```
ClerkProvider
  └── ThemeProvider (dark mode support)
      └── PostHogProvider (analytics)
          └── Application + Toaster (notifications)
```

### API Routes Structure
- `/api/inngest/*` - Inngest dashboard and function execution
- `/api/webhooks/stripe/*` - Stripe webhook processing
- `/api/test-email/*` - Email testing endpoint

### Component Organization
- `/components/ui/` - shadcn/ui components (Radix UI + Tailwind)
- `/components/providers/` - React context providers
- Uses "new-york" style from shadcn/ui with CSS variables

### Path Aliases
Configured in `tsconfig.json`:
- `@/*` maps to root directory
- Common imports: `@/components`, `@/lib`, `@/hooks`

## Key Integration Points

### Clerk + Supabase User Sync
When implementing user sync:
1. Listen to Clerk webhook events for user creation
2. Create corresponding user record in Supabase
3. Use `clerk_id` as the foreign key reference

### Stripe + Inngest Payment Flow
1. Stripe webhook receives payment event at `/api/webhooks/stripe`
2. Handler sends event to Inngest: `inngest.send({ name: 'payment.initiated', data: {...} })`
3. Inngest function processes payment asynchronously
4. Sends confirmation email via Resend

### Environment Variables Required
Critical services that must be configured in `.env.local`:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY` & `RESEND_FROM_EMAIL`
- `INNGEST_EVENT_KEY` & `INNGEST_SIGNING_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY` & `NEXT_PUBLIC_POSTHOG_HOST`

## Development Workflow

### Adding New Protected Pages
1. Create page in `/app/[route]/page.tsx`
2. Route is automatically protected by middleware (unless added to `isPublicRoute`)
3. Access user data via Clerk hooks: `useUser()`, `useAuth()`

### Adding Background Jobs
1. Define function in `/lib/inngest/functions.ts`
2. Export and register in `/app/api/inngest/route.ts`
3. Trigger via `inngest.send()` from any server-side code

### Database Migrations
1. Create migrations in Supabase dashboard or via SQL files
2. Always enable Row Level Security (RLS) on new tables
3. Create policies based on `auth.uid()` or custom claims

### Testing Webhooks Locally
1. Install Stripe CLI
2. Run: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Copy webhook signing secret to `.env.local`
4. Trigger test events: `stripe trigger [event-name]`

## Tech Stack Summary
- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 with CSS variables
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Authentication**: Clerk
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Background Jobs**: Inngest
- **Email**: Resend
- **Analytics**: PostHog
- **Dark Mode**: next-themes

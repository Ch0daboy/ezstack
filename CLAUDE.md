# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
# Start dev server with Turbopack (faster builds)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type check (no script defined - use directly)
npx tsc --noEmit
```

### Component Management
```bash
# Add shadcn/ui components
npx shadcn@latest add [component-name]
```

### Local Service Testing
```bash
# Test Stripe webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Architecture Overview

This is a Next.js 15 SaaS starter using App Router with a multi-service integration pattern:

### Service Integration Stack
- **Auth**: Clerk (middleware protects `/dashboard/*` routes)  
- **Database**: Supabase (PostgreSQL with RLS)
- **Payments**: Stripe (webhooks trigger background jobs)
- **Background Jobs**: Inngest (async processing)
- **Email**: Resend (transactional emails)
- **Analytics**: PostHog (client + server tracking)
- **UI**: shadcn/ui components with Tailwind CSS v4

### Key Integration Points

**Authentication Flow**:
- Middleware at `/middleware.ts` protects routes
- Public: `/`, `/sign-in/*`, `/sign-up/*`, `/api/webhooks/*`, `/api/inngest/*`
- Protected: Everything else (especially `/dashboard/*`)

**Payment Processing Flow**:
1. Stripe webhook (`/app/api/webhooks/stripe/route.ts`) receives events
2. Triggers Inngest background job via `inngest.send()`
3. Background job processes payment and sends email

**Provider Hierarchy** (in `/app/layout.tsx`):
```
ClerkProvider → ThemeProvider → PostHogProvider → App
```

### Critical File Locations

**Service Clients**:
- `/lib/supabase/server.ts` - Server-side DB operations
- `/lib/supabase/client.ts` - Client-side DB operations  
- `/lib/stripe/server.ts` - Server-side Stripe operations
- `/lib/inngest/client.ts` - Background job client
- `/lib/email/resend.ts` - Email client

**Background Jobs**:
- `/lib/inngest/functions.ts` - Job definitions
- `/app/api/inngest/route.ts` - Inngest endpoint

**Configuration**:
- `/middleware.ts` - Route protection
- `/next.config.ts` - PostHog proxying setup
- `/tsconfig.json` - Path aliases (`@/*` → root)

## Development Patterns

### Adding Protected Routes
Routes under `/app/` are automatically protected by middleware unless added to `isPublicRoute` in `/middleware.ts`.

### Background Job Pattern
1. Define function in `/lib/inngest/functions.ts`
2. Export in `/app/api/inngest/route.ts` 
3. Trigger via `inngest.send()` from server code

### Database Operations
Always use server client (`/lib/supabase/server.ts`) for server-side operations. Enable RLS on all Supabase tables.

### Environment Requirements
Critical `.env.local` variables:
- Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- Resend: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Inngest: `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- PostHog: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

## Code Conventions

- TypeScript strict mode enabled
- Path alias: `@/*` maps to root directory
- CSS: Tailwind v4 with CSS variables
- Components: shadcn/ui "new-york" style
- No test scripts defined - check with user before assuming test framework
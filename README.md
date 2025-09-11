# Next.js SaaS Starter Template

A complete, production-ready starter template for building SaaS applications with Next.js, featuring authentication, payments, email, analytics, and more.

## 🚀 Features

- **🔐 Authentication**: Clerk for user management and authentication
- **💾 Database**: Supabase for PostgreSQL database and real-time subscriptions
- **💳 Payments**: Stripe integration for subscriptions and one-time payments
- **📧 Email**: Resend for transactional emails with beautiful templates
- **⚡ Background Jobs**: Inngest for reliable background processing
- **📊 Analytics**: PostHog for product analytics and user tracking
- **🎨 UI Components**: shadcn/ui components with Tailwind CSS
- **🌙 Dark Mode**: Built-in dark mode support with next-themes
- **📱 Responsive**: Mobile-first responsive design
- **🔒 Type Safety**: Full TypeScript support

## 📋 Prerequisites

- Node.js 18+ and npm
- Git
- Accounts for the following services:
  - [Clerk](https://clerk.com)
  - [Supabase](https://supabase.com)
  - [Stripe](https://stripe.com)
  - [Resend](https://resend.com)
  - [Inngest](https://inngest.com)
  - [PostHog](https://posthog.com)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd nextjs-saas-starter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your service credentials (see Configuration section below)

4. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## ⚙️ Configuration

### Environment Variables

Copy `.env.local.example` to `.env.local` and configure the following:

#### Clerk Authentication
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```
Get these from your [Clerk Dashboard](https://dashboard.clerk.com).

#### Supabase Database
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```
Get these from your [Supabase Project Settings](https://app.supabase.com).

#### Stripe Payments
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
Get these from your [Stripe Dashboard](https://dashboard.stripe.com).

For webhook testing locally, use [Stripe CLI](https://stripe.com/docs/stripe-cli):
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

#### Resend Email
```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hello@yourdomain.com
```
Get the API key from [Resend Dashboard](https://resend.com/api-keys).

#### Inngest Background Jobs
```env
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```
Get these from your [Inngest Dashboard](https://app.inngest.com).

#### PostHog Analytics
```env
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```
Get these from your [PostHog Project Settings](https://app.posthog.com).

## 📁 Project Structure

```
nextjs-saas-starter/
├── app/                      # Next.js App Router pages
│   ├── api/                  # API routes
│   │   ├── inngest/          # Inngest endpoint
│   │   ├── test-email/       # Email testing endpoint
│   │   └── webhooks/         # Webhook handlers
│   │       └── stripe/       # Stripe webhook handler
│   ├── dashboard/            # Protected dashboard pages
│   ├── sign-in/              # Clerk sign-in page
│   ├── sign-up/              # Clerk sign-up page
│   ├── layout.tsx            # Root layout with providers
│   └── page.tsx              # Landing page
├── components/               # React components
│   ├── providers/            # Context providers
│   │   ├── clerk-provider.tsx
│   │   ├── posthog-provider.tsx
│   │   └── theme-provider.tsx
│   ├── ui/                   # shadcn/ui components
│   └── posthog-page-view.tsx # Page view tracker
├── lib/                      # Utility functions and configurations
│   ├── email/                # Email utilities
│   │   ├── resend.ts         # Resend client
│   │   └── templates.ts      # Email templates
│   ├── inngest/              # Inngest configuration
│   │   ├── client.ts         # Inngest client
│   │   └── functions.ts      # Background functions
│   ├── posthog/              # PostHog utilities
│   │   └── server.ts         # Server-side tracking
│   ├── stripe/               # Stripe utilities
│   │   ├── client.ts         # Client-side utilities
│   │   └── server.ts         # Server-side utilities
│   └── supabase/             # Supabase clients
│       ├── client.ts         # Browser client
│       └── server.ts         # Server client
├── middleware.ts             # Clerk authentication middleware
└── .env.local.example        # Environment variables template
```

## 🚦 Getting Started

### 1. Authentication Setup

The app uses Clerk for authentication. The middleware automatically protects routes under `/dashboard`.

To customize protected routes, edit `middleware.ts`:
```typescript
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  // Add more public routes here
])
```

### 2. Database Setup

Create your Supabase tables and configure Row Level Security (RLS) policies:

```sql
-- Example users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Example policy
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);
```

### 3. Payment Integration

1. Create products and prices in your Stripe Dashboard
2. Add the price IDs to your `.env.local`
3. Update the checkout session creation in `/lib/stripe/server.ts`
4. Configure webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`

### 4. Email Templates

Customize email templates in `/lib/email/templates.ts`. The starter includes:
- Welcome email
- Payment confirmation
- Password reset

### 5. Background Jobs

Add new Inngest functions in `/lib/inngest/functions.ts`:

```typescript
export const myFunction = inngest.createFunction(
  { id: "my-function", name: "My Function" },
  { event: "my.event" },
  async ({ event, step }) => {
    // Your function logic
  }
)
```

### 6. Analytics Tracking

Track custom events using PostHog:

```typescript
// Client-side
import { usePostHog } from 'posthog-js/react'

const posthog = usePostHog()
posthog?.capture('custom_event', { property: 'value' })

// Server-side
import { captureServerEvent } from '@/lib/posthog/server'

await captureServerEvent({
  distinctId: userId,
  event: 'server_event',
  properties: { key: 'value' }
})
```

## 🧪 Testing

## 🔌 API Overview (Selected)

Generation
- `POST /api/generation/outline`
- `POST /api/generation/lesson-plan`
- `POST /api/generation/script`
- `POST /api/generation/quiz`
- `POST /api/generation/enhance` (enhancement + variations)
- `POST /api/generation/content-variation`
- `POST /api/generation/batch`

Content & Export
- `POST /api/export` (pdf, docx, markdown, html)
- `POST /api/images`

Templates & Personas
- `GET /api/templates`
- `GET /api/personas`
- `GET /api/activities/templates`

Progress & Jobs
- `POST|GET /api/progress`
- `GET /api/jobs`

Preview & Onboarding
- `/preview/[lessonId]`
- `/onboarding`

### Local Development

```bash
npm run dev
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Building for Production

```bash
npm run build
npm run start
```

## 📦 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- [Netlify](https://www.netlify.com)
- [Railway](https://railway.app)
- [Render](https://render.com)
- Docker containers

## 🔧 Customization

### Adding New Pages

Create new pages in the `app/` directory:

```typescript
// app/new-page/page.tsx
export default function NewPage() {
  return <div>New Page</div>
}
```

### Adding Components

Add shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
```

### Extending the API

Add new API routes in `app/api/`:

```typescript
// app/api/custom/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Hello' })
}
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Resend Documentation](https://resend.com/docs)
- [Inngest Documentation](https://www.inngest.com/docs)
- [PostHog Documentation](https://posthog.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this starter for your own projects.

## 🙋 Support

If you have questions or need help, please:
1. Check the documentation above
2. Search existing issues
3. Create a new issue with details about your problem

---

Built with ❤️ using Next.js and modern web technologies.

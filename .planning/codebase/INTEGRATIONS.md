# External Integrations

**Analysis Date:** 2026-04-12

## APIs & External Services

**Authentication & Identity:**
- Supabase Auth - User authentication and session management
  - SDK/Client: `@supabase/ssr` (v0.8.0), `@supabase/supabase-js` (v2.95.3)
  - Auth method: Email/password sign-up and login
  - Session: Cookies (managed via Next.js middleware)

## Data Storage

**Database:**
- Supabase PostgreSQL
  - Connection: Environment variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Service Client: `SUPABASE_SERVICE_ROLE_KEY` (server-only)
  - Client SDK: `@supabase/supabase-js` and `@supabase/ssr`

**Tables:**
- `auth.users` - Managed by Supabase Auth
- `public.profiles` - User profile data (display_name, role)
- `public.transactions` - Transaction ledger (awards, purchases, adjustments)
- `public.store_items` - Store inventory
- `public.purchases` - Purchase records

**Views:**
- `public.leaderboard_view` - Computed user balances (read-only, materialized from transactions)

**Functions (RPC):**
- `purchase_item(p_user_id, p_item_id, p_quantity)` - Atomic purchase with row-level locking

**File Storage:**
- No cloud file storage configured
- Image URLs stored as text in `store_items.image_url` (external URLs only)

**Caching:**
- Next.js built-in caching (ISR, page caching)
- No external cache service configured

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Implementation: Email/password authentication
  - Location: `src/app/actions/auth.ts` handles login and signup
  - Session management: Via `@supabase/ssr` middleware

**Role-Based Access Control:**
- Roles stored in `public.profiles.role` (member, manager, admin)
- Enforced in:
  - Server actions: `src/app/actions/awards.ts`, `src/app/actions/store.ts`, etc.
  - Middleware: `src/lib/supabase/middleware.ts` (manager-only route protection)
  - RLS policies on all tables (defined in `supabase/schema.sql`)

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, Rollbar, etc.)
- Error handling via try/catch and error returns in server actions

**Logs:**
- Console logging only (no external logging service)
- Server-side errors returned to client as error messages

## CI/CD & Deployment

**Hosting:**
- Not configured (app-ready for any Node.js host: Vercel, Netlify, Railway, etc.)
- No Docker configuration present

**CI Pipeline:**
- Not configured (no GitHub Actions, GitLab CI, etc.)

**Environment Configuration:**
- `.env.local` for development
- `.env.local.example` documents required variables
- No staging/production environment setup documented

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Server-only service role key (secret)

**Secrets location:**
- `.env.local` (development)
- Server environment variables (production)
- Service role key never sent to client

## Webhooks & Callbacks

**Incoming:**
- Not configured (no webhook endpoints for external services)

**Outgoing:**
- Not configured (app does not call out to external webhooks)

**Supabase Triggers:**
- `on_auth_user_created` - Auto-creates profile in `public.profiles` when new auth user is created (defined in `supabase/schema.sql`)

## Client/Server Separation

**Browser Client:**
- `src/lib/supabase/client.ts` - Uses `createBrowserClient` from `@supabase/ssr`
- Accesses: Public tables via RLS, auth methods
- Environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Server Client:**
- `src/lib/supabase/server.ts` - Uses `createServerClient` from `@supabase/ssr`
- Accesses: All tables, auth methods, user context via cookies
- Used in: Next.js pages, server actions, middleware

**Service Client:**
- `src/lib/supabase/server.ts` - `createServiceClient()` function
- Uses: Service role key (server-only)
- Accesses: All tables without RLS restrictions
- Used in: Sensitive operations requiring elevated privileges

---

*Integration audit: 2026-04-12*

# Alt-F4 Bucks

The reward & points system for FRC Team 7558. Members earn Alt-F4 Bucks through contributions, attendance, and team activities, then spend them in the team store.

## Tech Stack

- **Next.js 16** (App Router, Server Actions)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (Auth, Postgres, RLS)
- **React Hook Form** + **Zod** (validation)

## Features

- **Public leaderboard** — top 25 members ranked by balance
- **Member dashboard** — view balance and transaction history
- **Team store** — browse and purchase items with Alt-F4 Bucks
- **Manager panel** — award/deduct bucks, manage store items, audit log
- **Transaction ledger** — balances computed from transactions (never stored directly)
- **Atomic purchases** — Postgres function prevents race conditions
- **Row Level Security** — enforced at the database level

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project. Note your project URL and keys.

### 2. Run the database schema

Open the **SQL Editor** in your Supabase dashboard and run the contents of:

```
supabase/schema.sql
```

This creates all tables, views, RLS policies, the purchase RPC function, and the auto-profile trigger.

### 3. (Optional) Seed sample store items

Run the contents of:

```
supabase/seed.sql
```

### 4. Configure environment variables

Copy the example env file:

```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

You can find these in **Supabase Dashboard → Settings → API**.

> **Important:** `SUPABASE_SERVICE_ROLE_KEY` is only used server-side and is never exposed to the client.

### 5. Configure Supabase Auth

In your Supabase dashboard under **Authentication → Settings**:

- Enable **Email** provider
- Optionally disable email confirmations for development (under Email Templates → Confirm signup toggle)

### 6. Install dependencies and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Promoting a user to manager

After a user signs up, promote them to manager via SQL:

```sql
UPDATE public.profiles
SET role = 'manager'
WHERE display_name = 'Their Name';
```

Or set `role = 'admin'` for full admin access.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home (public leaderboard)
│   ├── layout.tsx            # Root layout with nav
│   ├── login/page.tsx        # Auth page
│   ├── dashboard/page.tsx    # Member dashboard
│   ├── store/
│   │   ├── page.tsx          # Store grid
│   │   └── [id]/page.tsx     # Item detail + purchase
│   ├── manager/page.tsx      # Manager panel
│   ├── actions/              # Server actions
│   │   ├── auth.ts
│   │   ├── awards.ts
│   │   ├── purchases.ts
│   │   └── store.ts
│   └── api/auth/logout/      # Logout route
├── components/               # UI components
│   ├── ui/                   # shadcn/ui primitives
│   ├── nav.tsx
│   ├── leaderboard-table.tsx
│   ├── balance-card.tsx
│   ├── transaction-list.tsx
│   ├── store-grid.tsx
│   ├── purchase-dialog.tsx
│   ├── award-form.tsx
│   ├── store-management.tsx
│   └── audit-log.tsx
├── db/                       # Database query functions
│   ├── profiles.ts
│   ├── transactions.ts
│   ├── leaderboard.ts
│   └── store.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser client
│   │   ├── server.ts         # Server client + service client
│   │   └── middleware.ts     # Auth middleware
│   ├── types.ts
│   ├── constants.ts
│   └── utils.ts
└── middleware.ts              # Route protection
```

## Security

- **RLS policies** enforce data access at the database level
- **Middleware** redirects unauthenticated users from protected routes
- **Server actions** verify manager/admin role before write operations
- **Service role key** is never sent to the client
- **Atomic purchases** use a Postgres function with row-level locking to prevent race conditions and double-spending
- **Balances are computed**, not stored — derived from the transaction ledger

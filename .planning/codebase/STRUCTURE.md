# Codebase Structure

**Analysis Date:** 2026-04-12

## Directory Layout

```
alt-f4-bucks/
├── src/
│   ├── app/                    # Next.js App Router pages & actions
│   │   ├── actions/            # Server actions (mutations)
│   │   ├── api/                # API routes (minimal)
│   │   ├── dashboard/          # Protected user dashboard
│   │   ├── manager/            # Protected manager panel
│   │   ├── login/              # Public login/signup
│   │   ├── store/              # Public/protected store
│   │   ├── layout.tsx          # Root layout with nav
│   │   ├── page.tsx            # Public leaderboard home
│   │   └── globals.css         # Global Tailwind styles
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui primitives (generated)
│   │   ├── *.tsx               # Custom components
│   ├── db/                     # Database query functions
│   ├── lib/
│   │   ├── supabase/           # Supabase client setup
│   │   ├── types.ts            # TypeScript type definitions
│   │   ├── constants.ts        # Shared constants
│   │   └── utils.ts            # Helper functions
│   └── middleware.ts           # Next.js middleware for auth
├── supabase/
│   ├── schema.sql              # Database schema
│   ├── seed.sql                # Development seed data
│   └── migrations/             # Schema migrations (if any)
├── public/                     # Static assets
├── .planning/
│   └── codebase/               # This folder (generated docs)
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── tailwind.config.ts          # Tailwind CSS config
├── .env.local.example          # Example env vars
└── next.config.ts             # Next.js config
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router pages and layouts
- Contains: Page components (`.tsx`), layout wrappers, server actions
- Key files: 
  - `page.tsx` — public leaderboard homepage
  - `layout.tsx` — root layout with navigation, Toaster
  - `dashboard/page.tsx` — user dashboard (protected)
  - `manager/page.tsx` — manager panel (protected)
  - `store/page.tsx` — store page (protected)
  - `login/page.tsx` — public login/signup
  - `actions/` — server actions subdirectory

**`src/app/actions/`:**
- Purpose: Encapsulate server-side mutations with validation and authorization
- Contains: Form action functions
- Key files:
  - `auth.ts` — login, signup, logout
  - `awards.ts` — award bucks to users (manager only)
  - `purchases.ts` — purchase items (uses atomic RPC)
  - `store.ts` — create/update/toggle store items (manager only)

**`src/app/api/`:**
- Purpose: API routes (REST endpoints)
- Contains: Minimal API logic
- Key files:
  - `auth/logout/route.ts` — POST endpoint for logout form

**`src/components/`:**
- Purpose: Reusable React components
- Contains: Custom UI components + shadcn/ui primitives
- Key files:
  - `ui/` — shadcn/ui components (Button, Card, Dialog, etc.)
  - `nav.tsx` — sticky header with navigation and user menu
  - `award-form.tsx` — form for awarding bucks (manager)
  - `purchase-dialog.tsx` — dialog to confirm item purchase
  - `store-grid.tsx` — grid display of store items
  - `store-management.tsx` — form to create/edit items (manager)
  - `leaderboard-table.tsx` — table of ranked users
  - `balance-card.tsx` — displays user's current balance
  - `transaction-list.tsx` — list of user's recent transactions
  - `audit-log.tsx` — searchable/filterable transaction log (manager)

**`src/db/`:**
- Purpose: Database query functions with typed responses
- Contains: Query wrapper functions
- Key files:
  - `profiles.ts` — `getCurrentProfile()`, `getAllProfiles()`, `getProfileById()`
  - `transactions.ts` — `getUserTransactions()`, `getAllTransactions()`, `getUserBalance()`
  - `leaderboard.ts` — `getLeaderboard()`
  - `store.ts` — `getActiveStoreItems()`, `getAllStoreItems()`, `getStoreItem()`

**`src/lib/supabase/`:**
- Purpose: Supabase client configuration
- Contains: Client initialization
- Key files:
  - `client.ts` — Browser client (uses anon key)
  - `server.ts` — Server client (uses anon key) + service role client (uses service key, server-only)
  - `middleware.ts` — `updateSession()` for auth refresh

**`src/lib/`:**
- Purpose: Shared utilities and types
- Key files:
  - `types.ts` — TypeScript interfaces (Profile, Transaction, StoreItem, LeaderboardEntry)
  - `constants.ts` — `TRANSACTION_CATEGORIES` and `CATEGORY_LABELS`
  - `utils.ts` — Helper functions (likely Tailwind `cn()` from shadcn)

**`supabase/`:**
- Purpose: Database schema and migrations
- Contains: SQL files
- Key files:
  - `schema.sql` — Full schema definition (tables, RLS, triggers, RPC)
  - `seed.sql` — Sample data for development

## Key File Locations

**Entry Points:**
- `src/app/page.tsx` — Public leaderboard (home)
- `src/app/layout.tsx` — Root layout wrapper
- `src/middleware.ts` — Auth session middleware
- `src/app/login/page.tsx` — Login/signup page

**Configuration:**
- `tsconfig.json` — TypeScript strict mode, path aliases
- `tailwind.config.ts` — Tailwind CSS with shadcn defaults
- `next.config.ts` — Next.js config
- `.env.local` — Supabase URL, keys, and other secrets
- `.env.local.example` — Example env vars (committed)

**Core Logic:**
- `src/app/actions/` — All mutations (awards, purchases, store management)
- `src/db/` — All queries (read-only operations)
- `supabase/schema.sql` — RPC functions (e.g., `purchase_item`), RLS policies

**Testing:**
- No test files found in codebase (testing not yet implemented)

## Naming Conventions

**Files:**
- Page components: `page.tsx` in their directory (e.g., `src/app/dashboard/page.tsx`)
- Components: kebab-case (e.g., `award-form.tsx`, `balance-card.tsx`)
- Server actions: Named exports in `.ts` files (e.g., `export async function awardBucks()`)
- Database queries: Named exports in `.ts` files in `src/db/`
- UI primitives: kebab-case shadcn components (e.g., `button.tsx`, `dialog.tsx`)

**Directories:**
- kebab-case for feature directories (e.g., `src/app/manager/`, `src/components/ui/`)
- Organize by feature/concern, not by file type

**Functions:**
- camelCase for all functions (e.g., `awardBucks`, `getCurrentProfile`, `getLeaderboard`)
- Prefix with verb (get, create, update, delete, etc.)
- Prefix database functions with data source (e.g., `getActiveStoreItems` not just `getItems`)

**Variables & Constants:**
- camelCase for local variables
- UPPER_SNAKE_CASE for constants (e.g., `TRANSACTION_CATEGORIES`)
- `NAV_LINKS` for static config arrays

**Types:**
- PascalCase for all types (e.g., `Profile`, `Transaction`, `StoreItem`)
- `*Entry` suffix for computed/view types (e.g., `LeaderboardEntry`)

## Where to Add New Code

**New Feature (e.g., new manager capability):**
- Primary code: `src/app/actions/feature.ts` (server action with validation)
- Queries: `src/db/feature.ts` (if new data access needed)
- Components: `src/components/feature-*.tsx` (form, display, etc.)
- Page: `src/app/manager/page.tsx` (add tab/section for feature)
- Tests: `src/app/actions/feature.test.ts` (when testing added)

**New User-Facing Page:**
- Page component: `src/app/[section]/page.tsx`
- Components: `src/components/[feature]-*.tsx`
- Queries: Call existing functions from `src/db/`
- Actions: Create in `src/app/actions/` if mutations needed
- Add route to `NAV_LINKS` in `src/components/nav.tsx` with appropriate auth guards

**New Component (UI or feature):**
- File: `src/components/[name].tsx` (custom) or `src/components/ui/[name].tsx` (shadcn primitives)
- Props type: Define inline or in a dedicated `.types.ts` if complex
- Import shadcn primitives from `src/components/ui/`

**Utilities/Helpers:**
- Shared across components: `src/lib/utils.ts`
- Constants: `src/lib/constants.ts`
- Types: `src/lib/types.ts`

**Database Changes:**
- Schema: `supabase/schema.sql` (commit full schema, not migrations)
- RPC functions: Add to schema.sql
- RLS policies: Add to schema.sql
- Seed data: `supabase/seed.sql` for development

## Special Directories

**`src/components/ui/`:**
- Purpose: Generated shadcn/ui component library
- Generated: Yes (via `npx shadcn-ui@latest add [component]`)
- Committed: Yes (included in repo)
- Modification: Only customize Tailwind classes, don't change core logic

**`supabase/`:**
- Purpose: Database schema version control
- Generated: No (manually written SQL)
- Committed: Yes (schema and seed are part of version control)
- Modification: Edit `schema.sql` for schema changes; use Supabase migration tools in production

**`.planning/codebase/`:**
- Purpose: Auto-generated architecture documentation
- Generated: Yes (via `/gsd:map-codebase`)
- Committed: Not typically (for reference only)
- Modification: Read-only; generated by mapping agent

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (via `npm run build`)
- Committed: No (in `.gitignore`)
- Modification: Never edit; regenerated on each build

---

*Structure analysis: 2026-04-12*

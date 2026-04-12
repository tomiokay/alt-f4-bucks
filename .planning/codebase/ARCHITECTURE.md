# Architecture

**Analysis Date:** 2026-04-12

## Pattern Overview

**Overall:** Next.js server-driven application with transaction ledger pattern and role-based access control

**Key Characteristics:**
- Server-side rendering and server actions for security-critical operations
- Transaction ledger for immutable audit trail (balances computed, never stored)
- Row-level security (RLS) enforced at database layer
- Role-based authorization checks at both server and application level
- Atomic operations via Postgres RPC for race-condition-free purchases

## Layers

**Presentation Layer:**
- Purpose: Render UI and handle user interaction
- Location: `src/app/` (pages), `src/components/` (components)
- Contains: Next.js page components, form components, UI primitives (shadcn/ui)
- Depends on: Server actions (`src/app/actions/`), database queries (`src/db/`)
- Used by: Browser clients

**Server Action Layer:**
- Purpose: Handle form submissions and mutations with authorization enforcement
- Location: `src/app/actions/`
- Contains: `auth.ts` (login, signup, logout), `awards.ts` (award bucks), `purchases.ts` (buy items), `store.ts` (manage items)
- Depends on: Database layer (`src/db/`), Supabase clients, Zod validation
- Used by: Client components via form actions

**Database Query Layer:**
- Purpose: Encapsulate all database queries and provide typed interfaces
- Location: `src/db/`
- Contains: `profiles.ts` (user profiles), `transactions.ts` (ledger), `leaderboard.ts` (rankings), `store.ts` (items)
- Depends on: Supabase client
- Used by: Server actions, page components

**Authentication & Session Layer:**
- Purpose: Manage Supabase authentication and session state
- Location: `src/lib/supabase/`
- Contains: `client.ts` (browser client), `server.ts` (server client + service role), `middleware.ts` (session refresh)
- Depends on: @supabase/ssr, @supabase/supabase-js
- Used by: All server components and actions

**Type & Utility Layer:**
- Purpose: Define shared types and helper functions
- Location: `src/lib/types.ts`, `src/lib/utils.ts`, `src/lib/constants.ts`
- Contains: TypeScript types (`Profile`, `Transaction`, `StoreItem`), utility functions, transaction categories
- Depends on: Nothing
- Used by: All layers

## Data Flow

**User Authentication:**

1. User submits login/signup form on `/login`
2. `src/app/actions/auth.ts` validates input with Zod schema
3. Calls `supabase.auth.signInWithPassword()` or `supabase.auth.signUp()`
4. Supabase triggers `on_auth_user_created` trigger, auto-creates profile with `role = "member"`
5. Session token stored in cookies via middleware (`src/lib/supabase/middleware.ts`)
6. User redirected to `/dashboard`

**View Leaderboard:**

1. User visits `/` (home page)
2. `src/app/page.tsx` calls `getLeaderboard(25)` from `src/db/leaderboard.ts`
3. Query executes `SELECT * FROM leaderboard_view ORDER BY balance DESC`
4. `leaderboard_view` is a computed view that sums transaction amounts per user
5. Results rendered in `LeaderboardTable` component
6. Page revalidates every 30 seconds (ISR)

**Award Bucks (Manager Only):**

1. Manager submits award form on `/manager`
2. `src/app/actions/awards.ts` receives form data
3. Checks `profile.role` includes "manager" or "admin" (authorization)
4. Validates with Zod schema
5. Inserts row into `transactions` table with `type = "award"` and `by_user_id = profile.id`
6. Database RLS policy checks `auth.uid()` matches `by_user_id`
7. Revalidates `/manager`, `/dashboard`, `/` paths
8. User sees updated balance on leaderboard (computed from new transaction)

**Purchase Item:**

1. User selects item and quantity on `/store`
2. `src/app/components/purchase-dialog.tsx` submits to `src/app/actions/purchases.ts`
3. Validates input (item exists, quantity > 0)
4. Calls atomic RPC function: `purchase_item(p_user_id, p_item_id, p_quantity)`
5. RPC logic in Postgres:
   - Acquires row-level lock (`FOR UPDATE`) on user's leaderboard entry
   - Checks user has sufficient balance (computed from transactions)
   - Checks item has sufficient stock
   - Inserts transaction record with `type = "purchase"`
   - Updates item stock
6. If any check fails, RPC error returned (friendly message shown)
7. On success, paths revalidated; user sees updated balance

**Audit Log (Manager Only):**

1. Manager views audit log on `/manager`
2. `src/app/components/audit-log.tsx` renders filtering UI
3. Calls `getAllTransactions()` from `src/db/transactions.ts`
4. Query joins to profiles to show `to_user` and `by_user` names
5. Supports filtering by type, category, or user ID
6. All data fetched server-side, no client-side API calls

**State Management:**

- No Redux/Zustand; state lives in database
- Page components fetch fresh data on each render
- User session managed by Supabase (cookie-based)
- Form errors returned from server actions as `{ error: string }`
- Cache invalidation via `revalidatePath()` after mutations

## Key Abstractions

**Transaction Ledger:**
- Purpose: Immutable record of all balance changes (awards, purchases, adjustments)
- Examples: `src/db/transactions.ts`, Postgres `transactions` table
- Pattern: Append-only; balances always computed by summing transactions, never stored

**Profile:**
- Purpose: User metadata and role information
- Examples: `src/lib/types.ts` (Profile type), `src/db/profiles.ts` (queries)
- Pattern: Extends Supabase `auth.users` with display_name, role, created_at

**StoreItem:**
- Purpose: Purchasable item with price and stock
- Examples: `src/lib/types.ts` (StoreItem type), `src/db/store.ts` (queries)
- Pattern: Simple entity; `active` flag controls visibility in `/store`

**Role-Based Access Control (RBAC):**
- Purpose: Restrict operations by user role (member, manager, admin)
- Examples: `src/app/actions/awards.ts` line 24 checks `profile.role`
- Pattern: Authorization checked in server actions AND database RLS policies

## Entry Points

**Homepage (Leaderboard):**
- Location: `src/app/page.tsx`
- Triggers: Direct visit to `/`
- Responsibilities: Fetch top 25 users, render leaderboard, static ISR cache

**Dashboard:**
- Location: `src/app/dashboard/page.tsx`
- Triggers: Authenticated user visits `/dashboard`
- Responsibilities: Fetch user balance and recent transactions, show role info

**Login/Signup:**
- Location: `src/app/login/page.tsx`
- Triggers: Unauthenticated user visits `/login`
- Responsibilities: Render form, call `login()` or `signup()` actions

**Store:**
- Location: `src/app/store/page.tsx`
- Triggers: Authenticated user visits `/store`
- Responsibilities: Fetch active items, render grid, enable purchases

**Manager Panel:**
- Location: `src/app/manager/page.tsx`
- Triggers: Manager/admin visits `/manager`
- Responsibilities: Fetch all profiles and items, render tabs for award/store management/audit log

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: All pages
- Responsibilities: Fetch current user profile, render navigation, apply global styles

## Error Handling

**Strategy:** Validation-first approach with try-catch and error responses

**Patterns:**

- **Input Validation:** Zod schemas in all server actions (`src/app/actions/*.ts`) validate before database operations. Errors returned as `{ error: string }` to client.

- **Authorization Checks:** Server actions check `profile.role` before sensitive operations (awards, store management). Returns `{ error: "Unauthorized" }` if role insufficient.

- **Database Errors:** RPC functions (e.g., `purchase_item`) return Postgres errors, parsed into friendly messages in `src/app/actions/purchases.ts` (lines 40-51).

- **Missing Data:** Queries use `.single()` or nullish coalescing to handle missing records gracefully. Returns `null` or empty arrays.

- **Authentication:** `redirect("/login")` used in protected pages (e.g., `src/app/dashboard/page.tsx` line 11) if `getCurrentProfile()` returns null.

- **No Global Error Boundary:** Errors bubble up as exceptions; Next.js renders 500 page.

## Cross-Cutting Concerns

**Logging:** Uses `console` (no structured logging framework). Database transactions provide audit trail.

**Validation:** Zod v4 with `safeParse()` and `error.issues` array. Custom error messages for better UX.

**Authentication:** Supabase Auth (email/password). Session token in cookies managed by middleware.

**Authorization:** Role-based access control at server action layer + database RLS policies (defense in depth).

**Caching:**
- Page caching: ISR with `export const revalidate = 30` on homepage
- Path revalidation: `revalidatePath()` after mutations
- Database queries: No caching layer; Postgres handles performance

---

*Architecture analysis: 2026-04-12*

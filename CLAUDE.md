# CLAUDE.md — Alt-F4 Bucks

## Project Summary
FRC Team 7558 reward/points system. Members earn "Alt-F4 Bucks" via contributions, attendance, and team activities, then spend them in a team store.

## Tech Stack
- **Next.js 16** (App Router, Server Actions, Turbopack)
- **TypeScript** (strict)
- **Tailwind CSS v4** + **shadcn/ui**
- **Supabase** (Auth, Postgres, RLS)
- **React Hook Form** + **Zod v4**

## Key Architecture Decisions
- **Transaction ledger pattern** — balances are computed from `transactions` table, never stored directly.
- **Atomic purchases** — `purchase_item` Postgres RPC uses `FOR UPDATE` row-level locking to prevent race conditions.
- **RLS everywhere** — all tables have Row Level Security policies; server actions additionally verify roles.
- **Service role key** is server-only; never exposed to the client.

## Important Conventions
- **Zod v4** is installed (not v3). Use `error.issues` not `error.errors`. For `z.enum()` pass `{ error: "msg" }` not `{ errorMap: ... }`.
- Server actions live in `src/app/actions/`. DB query functions live in `src/db/`.
- Supabase clients: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (server + service role).
- UI primitives are in `src/components/ui/` (shadcn). Custom components are in `src/components/`.

## Database Tables
| Table | Purpose |
|-------|---------|
| `profiles` | Extends auth.users — display_name, role (member/manager/admin) |
| `transactions` | Ledger of all awards, purchases, adjustments |
| `store_items` | Items available in the team store |
| `purchases` | Purchase records linked to items and users |
| `leaderboard_view` | Computed view: user balances ranked descending |

## Roles
- **member** — default; can view leaderboard, dashboard, store; can purchase items
- **manager** — can award/deduct bucks, manage store items, view audit log
- **admin** — full access (same as manager currently)

## Running Locally
```bash
cp .env.local.example .env.local  # fill in Supabase credentials
npm install
npm run dev                        # http://localhost:3000
```

## Commands
- `npm run dev` — start dev server (Turbopack)
- `npm run build` — production build
- `npm run lint` — ESLint

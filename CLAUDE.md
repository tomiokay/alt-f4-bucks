# CLAUDE.md — Alt-F4 Bucks

## Project Summary
Polymarket-style prediction market for FRC (FIRST Robotics Competition). Users bet on match outcomes using a virtual currency called Alt-F4 Bucks (AF4). Dark, sleek UI inspired by Polymarket. Live data from The Blue Alliance API + Statbotics predictions.

## Tech Stack
- **Next.js 16** (App Router, Server Actions, Turbopack)
- **TypeScript** (strict)
- **Tailwind CSS v4** + **shadcn/ui**
- **Supabase** (Auth, Postgres, RLS)
- **Recharts** — probability history charts
- **Framer Motion** — animations
- **canvas-confetti** — win celebrations
- **React Hook Form** + **Zod v4**

## Key Architecture Decisions
- **Transaction ledger pattern** — balances are computed from `transactions` table, never stored directly.
- **Parimutuel betting** — pool-based betting where winners split the total pot proportionally.
- **Auto-sync** — `/api/sync` route polls TBA every 2 min, updates match_cache, and auto-resolves completed pools.
- **Atomic bets** — `place_pool_bet` Postgres RPC escrows funds with `FOR UPDATE` locking.
- **Atomic resolution** — `resolve_match_pool` RPC distributes payouts ensuring total in = total out.
- **RLS everywhere** — all tables have Row Level Security policies; server actions additionally verify roles.
- **Service role key** is server-only; never exposed to the client.

## Important Conventions
- **Zod v4** is installed (not v3). Use `error.issues` not `error.errors`. For `z.enum()` pass `{ error: "msg" }` not `{ errorMap: ... }`.
- Server actions live in `src/app/actions/`. DB query functions live in `src/db/`.
- Supabase clients: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (server + service role).
- UI primitives are in `src/components/ui/` (shadcn). Custom components are in `src/components/`.
- Home page components live in `src/components/home/`.
- External API wrappers: `src/lib/tba.ts` (The Blue Alliance), `src/lib/statbotics.ts` (match predictions).
- All external API calls have timeouts and `verbose: true` for debugging.

## Database Tables
| Table | Purpose |
|-------|---------|
| `profiles` | Extends auth.users — display_name, role (member/manager/admin) |
| `transactions` | Ledger of all awards, bets, payouts, adjustments |
| `match_cache` | Cached FRC match data from TBA (teams, scores, completion status) |
| `pool_bets` | User bets on match outcomes (side: red/blue, amount, payout) |
| `match_pool_summary` | View: aggregated pool sizes and bettor counts per match |
| `store_items` | Items available in the team store |
| `purchases` | Purchase records linked to items and users |
| `leaderboard_view` | Computed view: user balances ranked descending |

## Key RPCs
- `place_pool_bet(p_user_id, p_match_key, p_side, p_amount)` — atomic bet placement with balance check
- `resolve_match_pool(p_match_key, p_winning_side, p_result)` — distributes winnings to pool
- `purchase_item(p_user_id, p_item_id, p_quantity)` — atomic store purchase

## Routes
| Route | Purpose |
|-------|---------|
| `/` | Home feed — featured market with chart, breaking news, hot topics, market grid |
| `/betting` | All markets with match browser, event sync |
| `/popular` | Markets ranked by volume and activity |
| `/leaderboard` | Global rankings by portfolio value |
| `/dashboard` | User portfolio — positions, P&L, stats |
| `/store` | Team store |
| `/manager` | Admin panel — award bucks, manage store, audit log |
| `/login` | Auth — email/password login and signup |
| `/api/sync` | Auto-sync endpoint — fetches TBA data, resolves completed pools |

## Roles
- **member** — default; can bet, view markets/leaderboard/portfolio, use store
- **manager** — can award/deduct bucks, manage store items, view audit log
- **admin** — full access (same as manager currently)

## External APIs
- **The Blue Alliance (TBA)** — match schedules, scores, event data. Key: `TBA_API_KEY`
- **Statbotics** — match win probability predictions. No key required. Can be flaky — always wrapped in try/catch with timeouts.

## Running Locally
```bash
cp .env.local.example .env.local  # fill in Supabase + TBA credentials
npm install
npm run dev                        # http://localhost:3000
```

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)
- `TBA_API_KEY` — The Blue Alliance API key

## Deployment
- **Frontend**: Vercel (https://alt-f4-bucks.vercel.app)
- **Backend**: Supabase (Postgres + Auth + RLS)
- Env vars configured in Vercel project settings

## Commands
- `npm run dev` — start dev server (Turbopack)
- `npm run build` — production build
- `npm run lint` — ESLint

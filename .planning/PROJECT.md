# Alt-F4 Bucks — Betting System

## What This Is

A peer-to-peer betting system for FRC Team 7558's Alt-F4 Bucks reward platform. Team members can create and accept bets on FRC match outcomes — who wins, score predictions, over/under, closest score — wagering their Alt-F4 Bucks against each other. Match data is pulled from The Blue Alliance and Statbotics APIs, and bets auto-resolve when results are posted.

## Core Value

Team members can bet their Alt-F4 Bucks against each other on real FRC match outcomes, with results automatically resolved from live data.

## Requirements

### Validated

- ✓ User authentication with email/password — existing
- ✓ Transaction ledger pattern for balance tracking — existing
- ✓ Role-based access control (member/manager/admin) — existing
- ✓ Store and purchase system — existing
- ✓ Leaderboard with computed balances — existing
- ✓ Dashboard with balance display — existing

### Active

- [ ] Browse upcoming FRC matches from any event (pulled from TBA)
- [ ] Create a bet with type selection (match winner, exact score, over/under, closest wins)
- [ ] Set wager amount when proposing a bet
- [ ] Send bet request to another team member
- [ ] Accept or decline incoming bet requests
- [ ] View active/pending/completed bets
- [ ] Auto-resolve bets when TBA/Statbotics results are available
- [ ] Auto-payout winner's bucks via transaction ledger
- [ ] Prevent betting more bucks than current balance
- [ ] User-friendly betting UI with dedicated tab/page

### Out of Scope

- Betting against "the house" — this is peer-to-peer only
- Manager-curated match lists — any upcoming TBA match is available
- Manual result confirmation — auto-resolve only
- Max bet caps or manager betting controls — just balance check
- Real money or external currency — Alt-F4 Bucks only

## Context

- **Existing app:** Fully working Next.js 16 + Supabase app with auth, store, awards, leaderboard
- **Transaction pattern:** Balances computed from `transactions` table — betting payouts will use the same pattern
- **APIs:** The Blue Alliance (TBA) provides match schedules and results; Statbotics provides additional stats
- **TBA API:** Requires an API key, returns match data in JSON format
- **Users:** FRC Team 7558 members, mostly high school students — UI must be simple and intuitive
- **Existing UI:** shadcn/ui components, Tailwind CSS v4, dark mode support via next-themes

## Constraints

- **Tech stack**: Must use existing Next.js 16 + Supabase + shadcn/ui stack
- **Data integrity**: Betting transactions must use the same ledger pattern as purchases (atomic, auditable)
- **Balance check**: Server-side validation that bettor has sufficient balance before accepting bet
- **API dependency**: Match results depend on TBA API availability — need graceful handling if delayed
- **Zod v4**: Validation must use Zod v4 syntax (not v3)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Peer-to-peer betting (not house) | Simpler, more social, no need to manage odds | — Pending |
| Proposer sets wager amount | Simpler than custom amounts per side | — Pending |
| Auto-resolve from TBA | No manager overhead, instant gratification | — Pending |
| Any upcoming TBA match | Maximum flexibility, no curation needed | — Pending |
| Multiple bet types | Match winner, exact score, over/under, closest wins | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-12 after initialization*

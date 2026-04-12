# Architecture Research — FRC Betting System

**Researched:** 2026-04-12

## New Database Tables

### `bets` table
- `id` (uuid, PK)
- `proposer_id` (uuid, FK → profiles)
- `opponent_id` (uuid, FK → profiles)
- `match_key` (text) — TBA match key (e.g., `2026casj_qm1`)
- `event_key` (text) — TBA event key
- `bet_type` (text) — `match_winner`, `over_under`, `exact_score`, `closest_score`
- `bet_details` (jsonb) — type-specific data (predicted score, over/under line, chosen alliance)
- `wager_amount` (integer) — bucks wagered
- `status` (text) — `pending`, `accepted`, `declined`, `cancelled`, `resolved`
- `winner_id` (uuid, nullable) — who won (null = draw/void)
- `result_data` (jsonb, nullable) — TBA match result snapshot
- `created_at`, `updated_at`, `resolved_at` (timestamptz)

### `match_cache` table
- `match_key` (text, PK)
- `event_key` (text)
- `event_name` (text)
- `comp_level` (text) — qm, sf, f
- `match_number` (integer)
- `red_teams` (text[]) — team numbers
- `blue_teams` (text[]) — team numbers
- `scheduled_time` (timestamptz)
- `actual_time` (timestamptz, nullable)
- `red_score` (integer, nullable)
- `blue_score` (integer, nullable)
- `winning_alliance` (text, nullable)
- `is_complete` (boolean, default false)
- `fetched_at` (timestamptz)

## Integration with Existing Ledger

### Escrow Pattern
1. **Bet created:** No transaction yet (just a row in `bets`)
2. **Bet accepted:** Two `transactions` rows created:
   - Proposer: debit of wager_amount (category: `bet_escrow`)
   - Opponent: debit of wager_amount (category: `bet_escrow`)
3. **Bet resolved:** One `transactions` row:
   - Winner: credit of 2x wager_amount (category: `bet_won`)
4. **Bet cancelled/declined:** No escrow to reverse
5. **Bet voided (match cancelled):** Two refund transactions (category: `bet_refund`)

### Atomic Escrow RPC
Similar to existing `purchase_item` RPC — use `FOR UPDATE` locking:
- Check both players have sufficient balance
- Create both escrow transactions atomically
- Update bet status to `accepted`

## Data Flow

```
TBA API → match_cache table → Browse Matches UI
                                    ↓
                            Create Bet (pick match + type + wager)
                                    ↓
                            Send to Opponent → Notification
                                    ↓
                            Accept → Escrow RPC (lock funds)
                                    ↓
                            TBA API poll → Match Complete?
                                    ↓
                            Resolve Bet → Payout transaction
```

## Build Order
1. Database schema (bets table, match_cache, RPC functions)
2. TBA API client (fetch matches, fetch results)
3. Match browsing UI
4. Bet creation + acceptance flow
5. Auto-resolution system
6. Polymarket-style polish

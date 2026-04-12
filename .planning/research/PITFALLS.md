# Pitfalls Research — FRC Betting System

**Researched:** 2026-04-12

## Critical Pitfalls

### 1. Double-Spend / Insufficient Balance Race Condition
- **Risk:** Two bets accepted simultaneously drain more bucks than user has
- **Prevention:** Postgres RPC with `FOR UPDATE` row-level locking (same pattern as existing `purchase_item`)
- **Warning signs:** Balance goes negative in dev testing

### 2. TBA API Downtime or Delayed Results
- **Risk:** Match finishes but TBA hasn't posted results yet — bets stuck in limbo
- **Prevention:** Retry polling with backoff. Show "awaiting results" state. Never auto-cancel
- **Warning signs:** Bets in `accepted` status for hours after scheduled match time

### 3. FRC Match Edge Cases
- **Replayed matches:** TBA may update scores after initial post
- **Disqualifications:** Score changes after DQ — need to handle result updates
- **Prevention:** Only resolve bets on matches marked `winning_alliance` is set. Allow re-resolution if scores change within 1 hour
- **Ties:** Red/blue can tie — match_winner bets should handle draws (refund both)

### 4. Stale Match Data
- **Risk:** User bets on a match that already happened (cache not updated)
- **Prevention:** Check `scheduled_time` server-side before allowing bet creation. Refresh cache before showing match list

### 5. Orphaned Escrows
- **Risk:** Funds locked in escrow but bet never resolves (match cancelled, TBA error)
- **Prevention:** Admin tool to void bets and refund escrow. Expiry check for very old unresolved bets

### 6. Bet Sniping
- **Risk:** User sends bet request moments before match starts when they know the likely outcome
- **Prevention:** Close betting N minutes before scheduled match time (e.g., 5 min cutoff)

# Features Research — FRC Betting System

**Researched:** 2026-04-12
**UI Reference:** Polymarket

## Table Stakes (Must Have)

### Bet Creation & Acceptance
- **Create bet:** Select match, bet type, wager amount, send to opponent — **Complexity: Medium**
- **Accept/decline bet:** Notification-style inbox for incoming bets — **Complexity: Low**
- **Balance validation:** Can't bet more than you have (server-side check) — **Complexity: Low**
- **Escrow on accept:** Lock both parties' funds when bet is accepted — **Complexity: Medium**

### Bet Types (FRC-Specific)
- **Match Winner:** Which alliance (red/blue) wins — simplest, most common — **Complexity: Low**
- **Over/Under:** Total combined score over/under a number — **Complexity: Low**
- **Closest Score:** Both predict a score, closest to actual wins — **Complexity: Medium**
- **Exact Score:** Predict exact alliance score — high risk/reward — **Complexity: Low**

### Bet Lifecycle
- **States:** Draft → Pending (sent) → Accepted → Active (match in progress) → Resolved → Paid Out
- **Cancel:** Proposer can cancel before acceptance — **Complexity: Low**
- **Auto-resolve:** Pull TBA results, determine winner, pay out — **Complexity: Medium-High**

### Match Browsing
- **Upcoming matches:** Browse by event, filter by date — **Complexity: Medium**
- **Match details:** Show teams, time, event name — **Complexity: Low**
- **Match status:** Upcoming / In Progress / Completed — **Complexity: Low**

### Bet History & Tracking
- **My bets:** View pending, active, completed bets — **Complexity: Low**
- **Bet detail:** See bet type, opponent, wager, result — **Complexity: Low**
- **Win/loss record:** Simple stats — **Complexity: Low**

## Differentiators (Nice to Have)

### Polymarket-Style UI Patterns
- **Event cards:** Clean cards showing match with bet activity — like Polymarket market cards
- **Quick bet:** One-tap bet amounts (10, 25, 50, 100 bucks)
- **Live indicators:** Green dot for in-progress matches
- **Resolution animations:** Satisfying win/loss reveal

### Enhanced Data
- **Statbotics predictions:** Show EPA-based win probability before betting — helps inform bets
- **Team records:** Show alliance team records alongside match info
- **Betting trends:** "3 bets on Red, 1 on Blue" social proof

### Social Features
- **Betting leaderboard:** Most profitable bettors
- **Recent activity feed:** "Alex bet 50 bucks on Red in QM 15"
- **Bet comments/trash talk:** Optional flavor text on bets

## Anti-Features (Do NOT Build)

| Feature | Reason |
|---------|--------|
| House/pool betting | Adds complexity, needs odds management — peer-to-peer is simpler and more social |
| Real money | This is a team reward system, not gambling |
| Complex odds/spreads | Overcomplicates for a high school team app |
| Anonymous betting | Defeats the social/fun purpose |
| Automated bot betting | No AI opponents — human vs human only |
| Parlay/multi-match bets | Too complex for v1, could be v2 |

## Dependencies Between Features

```
Match Browsing → Bet Creation → Bet Acceptance → Auto-Resolution → Payout
                                                      ↑
                                              TBA API Integration
                                              Statbotics (optional)
```

- Match browsing is foundational — everything depends on having match data
- Bet creation/acceptance can work before auto-resolution (manual resolve as fallback)
- Statbotics predictions are additive — can launch without them

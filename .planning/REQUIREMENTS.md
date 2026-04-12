# Requirements: Alt-F4 Bucks — Betting System

**Defined:** 2026-04-12
**Core Value:** Team members can bet Alt-F4 Bucks against each other on FRC match outcomes

## v1 Requirements

### Match Data

- [ ] **MATCH-01**: User can browse upcoming FRC matches from any active event
- [ ] **MATCH-02**: Match list shows event name, teams (red/blue alliances), scheduled time
- [ ] **MATCH-03**: Match data is pulled from The Blue Alliance API and cached locally
- [ ] **MATCH-04**: Completed matches show final scores and winning alliance

### Betting

- [ ] **BET-01**: User can create a bet by selecting a match, bet type, wager amount, and opponent
- [ ] **BET-02**: Bet types available: match winner, over/under, exact score, closest score
- [ ] **BET-03**: User cannot bet more Alt-F4 Bucks than their current balance
- [ ] **BET-04**: Opponent receives bet request and can accept or decline
- [ ] **BET-05**: Accepted bets escrow both parties' wagers via transaction ledger
- [ ] **BET-06**: User can cancel a pending bet before it's accepted
- [ ] **BET-07**: Betting closes 5 minutes before scheduled match time

### Resolution

- [ ] **RES-01**: Bets auto-resolve when TBA reports match results
- [ ] **RES-02**: Winner receives payout (2x wager) via transaction ledger
- [ ] **RES-03**: Tied matches refund both parties' escrow
- [ ] **RES-04**: Match results are polled from TBA during active events

### User Interface

- [ ] **UI-01**: Dedicated betting page/tab accessible from main navigation
- [ ] **UI-02**: Polymarket-style event cards for matches with clean, intuitive layout
- [ ] **UI-03**: My Bets view showing pending, active, and completed bets
- [ ] **UI-04**: Bet detail showing type, opponent, wager, and result
- [ ] **UI-05**: Statbotics win probability displayed on match cards

## v2 Requirements

### Social
- **SOC-01**: Activity feed showing recent bets placed
- **SOC-02**: Betting leaderboard (most profitable bettors)
- **SOC-03**: Trash talk / comments on bets

### Advanced
- **ADV-01**: Parlay/multi-match bets
- **ADV-02**: Manager controls to disable betting or set limits

## Out of Scope

| Feature | Reason |
|---------|--------|
| House/pool betting | Peer-to-peer only — simpler, more social |
| Real money | Team reward currency only |
| Complex odds/lines | Not a sportsbook |
| Anonymous betting | Small team — transparency preferred |
| Non-FRC events | Keep focused on team interest |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MATCH-01 | Phase 1 | Pending |
| MATCH-02 | Phase 1 | Pending |
| MATCH-03 | Phase 1 | Pending |
| MATCH-04 | Phase 1 | Pending |
| BET-01 | Phase 1 | Pending |
| BET-02 | Phase 1 | Pending |
| BET-03 | Phase 1 | Pending |
| BET-04 | Phase 1 | Pending |
| BET-05 | Phase 1 | Pending |
| BET-06 | Phase 1 | Pending |
| BET-07 | Phase 1 | Pending |
| RES-01 | Phase 1 | Pending |
| RES-02 | Phase 1 | Pending |
| RES-03 | Phase 1 | Pending |
| RES-04 | Phase 1 | Pending |
| UI-01 | Phase 1 | Pending |
| UI-02 | Phase 1 | Pending |
| UI-03 | Phase 1 | Pending |
| UI-04 | Phase 1 | Pending |
| UI-05 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-04-12*

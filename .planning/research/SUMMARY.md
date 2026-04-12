# Research Summary — FRC Betting System

**Compiled:** 2026-04-12

## Key Findings

**Stack:** TBA API v3 (free, API key auth) + Statbotics API (public, no auth) provide all match data needed. Direct fetch calls — no third-party wrapper libraries needed.

**Table Stakes:** Match browsing, peer-to-peer bet creation/acceptance, 4 bet types (winner, over/under, exact score, closest score), auto-resolution from TBA, balance validation.

**Architecture:** Escrow pattern using existing transaction ledger. New `bets` and `match_cache` tables. Atomic escrow RPC like existing `purchase_item`. Poll TBA every 2-3 min during active events.

**Watch Out For:** Double-spend race conditions (use FOR UPDATE locking), TBA result delays (retry with backoff), FRC edge cases (ties, replays, DQs), bet sniping (5 min pre-match cutoff).

## Recommended Approach

Single phase — this is a focused feature addition to an existing app:
1. Database schema + RPC functions
2. TBA/Statbotics API client
3. Server actions (create bet, accept, resolve)
4. Polymarket-style UI (match browser, bet placement, my bets)
5. Auto-resolution polling

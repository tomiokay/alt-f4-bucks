# Stack Research — FRC Betting System

**Researched:** 2026-04-12

## External APIs

### The Blue Alliance (TBA) API v3
- **Base URL:** `https://www.thebluealliance.com/api/v3`
- **Auth:** `X-TBA-Auth-Key` header with API key (free, register at thebluealliance.com/account)
- **Rate Limits:** No strict published rate limit, but be respectful (~1 req/sec recommended)
- **Key Endpoints:**
  - `GET /events/{year}` — list all events for a year
  - `GET /event/{event_key}/matches` — all matches for an event (e.g., `2026casj`)
  - `GET /event/{event_key}/matches/simple` — simplified match data
  - `GET /match/{match_key}` — single match details with scores
  - `GET /match/{match_key}/simple` — simplified single match
  - `GET /team/frc{team_number}/events/{year}` — events a team is attending
- **Match Key Format:** `{event_key}_{comp_level}{set_number}m{match_number}` (e.g., `2026casj_qm1`)
- **Match Data Includes:** alliances (red/blue), scores, winner, comp_level (qm/sf/f), time, score_breakdown
- **ETag/If-Modified-Since:** TBA supports conditional requests for efficient polling
- **Confidence:** High — well-documented, stable API used by FRC community for years

### Statbotics API
- **Base URL:** `https://api.statbotics.io/v3`
- **Auth:** No API key required (public)
- **Rate Limits:** Undocumented, be respectful
- **Key Endpoints:**
  - `GET /matches` — query matches with filters (year, event, team)
  - `GET /match/{match_key}` — match details with EPA predictions
  - `GET /team_matches` — team-specific match data
  - `GET /event/{event_key}` — event-level stats
- **Data Includes:** EPA (Expected Points Added) ratings, win probabilities, predicted scores
- **Useful for:** Pre-match predictions/odds display, showing win probability alongside bets
- **Confidence:** Medium-High — API is maintained but less documented than TBA

## Integration Strategy

### API Client
- **Recommendation:** Direct `fetch()` calls via Next.js server actions — no need for a third-party library
- **Why:** TBA and Statbotics are simple REST APIs. Adding a wrapper library adds dependency overhead for no benefit
- **Pattern:** Create `src/lib/tba.ts` and `src/lib/statbotics.ts` with typed fetch wrappers

### Polling Strategy for Auto-Resolution
- **Approach:** Server-side polling via Supabase Edge Function or Next.js API route on a cron schedule
- **During active events:** Poll TBA every 2-3 minutes for match results
- **Off-event:** No polling needed
- **Alternative considered:** TBA webhooks exist but require a publicly accessible endpoint — polling is simpler for this use case
- **Confidence:** High — polling is the standard approach for TBA integrations

### Caching
- **TBA data:** Cache event/match schedules in Supabase table (refreshed daily during events)
- **Statbotics data:** Fetch on-demand for predictions, cache briefly (5-10 min)
- **Why Supabase cache vs in-memory:** Match schedules are shared across all users, persist across server restarts

## What NOT to Use
- **No third-party TBA npm packages** — they're outdated and poorly maintained. Direct fetch is better
- **No WebSocket/real-time for TBA** — TBA doesn't offer real-time streams. Polling is the way
- **No complex odds calculation libraries** — this is peer-to-peer, not a sportsbook. No odds needed

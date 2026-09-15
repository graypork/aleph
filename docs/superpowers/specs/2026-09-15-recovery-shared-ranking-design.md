# RECOVERY Shared Ranking + Wind Clarity Design

## Scope

Extend the existing RECOVERY Vite mini-game so normal play has clearly observable upper/lower wind phases and successful normal runs can be ranked across multiple computers using a shared persistent store. The existing 20-run difficulty experiment remains isolated from public ranking.

## User-visible behavior

### Normal game mode
- `/play/` always starts normal play. Legacy `?test=` / `?safe=` URL-driven test entry is removed.
- Safe landing speed remains `3.5`.
- Normal play starts with upper wind magnitude `1.20–1.40`.
- Between rocket spawn `y=70` and upper-half boundary `y=200`, wind changes exactly three times:
  1. `0.45–0.60`
  2. `1.50–1.70`
  3. `0.50–0.75`
- At `y>=200`, the game switches to the lower-wind system: initial magnitude `0.45–1.45`, then random changes every `3–6s`.
- Telemetry shows a phase label: `UPPER · STRONG`, `UPPER · WEAK`, `UPPER · VERY STRONG`, `UPPER · LATE`, or `LOWER`.
- `WIND SHIFT` remains visible long enough to notice each transition.

### Player name and ranking
- Before a normal game can start, the player enters a public nickname/callsign.
- The UI explicitly says `닉네임 · 실명 입력 금지`.
- Nicknames are normalized to uppercase and must match `[A-Z0-9_-]{2,12}`.
- The current nickname is kept in `sessionStorage` so the same browser tab can replay without re-entering it. It is not used as the shared ranking store.
- Only successful **normal-mode** landings are submitted to the shared ranking.
- Difficulty-test runs never submit ranking data.
- Ranking order:
  1. higher recovery quality first;
  2. if quality ties, shorter landing time first.
- A nickname owns one ranking row. A later score replaces it only when it is better under the ranking rules.
- The public panel shows TOP 10.
- Rankings are loaded on page load, after a successful score submission, and when the user presses a refresh button. No WebSocket/realtime subscription is required. Therefore PC2 sees PC1's saved record on refresh.
- If the ranking service is unavailable, gameplay still works and the ranking panel shows an unavailable state.

## Architecture

### Browser
`src/game/ranking-client.js`
- nickname normalization/validation
- sessionStorage helpers
- `fetchRanking()` and `submitRanking()` wrappers around `/api/ranking`

`src/game/play.js`
- remains the game coordinator
- blocks normal game start until a valid nickname exists
- submits only successful normal runs
- refreshes ranking after accepted submission
- never submits during the 20-run difficulty flow
- tracks and renders explicit wind phase state

`play/index.html` / `src/game/play.css`
- nickname/callsign controls
- TOP 10 ranking table/panel
- wind phase label
- loading/error/empty states

### Server
`api/ranking.js`
- Vercel Function with GET and POST
- server-only access to Upstash REST credentials
- never exposes standard Redis token to the browser
- rejects malformed nicknames, quality values outside `0–100`, and landing times outside `(0,30]`
- POST updates a nickname only if its encoded ranking score is better
- GET returns TOP 10 ranking rows

`api/ranking-store.js`
- focused Upstash REST helper and ranking encoding/comparison logic
- Redis keys are versioned (`recovery:ranking:v1`, `recovery:ranking:records:v1`)

## Shared storage

Use Upstash Redis REST because this game needs only a tiny shared persistent leaderboard. Required Vercel environment variables:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

The token is server-side only; no `VITE_` prefix and no secret value committed to Git.

Ranking score encoding preserves the exact rule:
- `quality * 1_000_000 + (1_000_000 - round(timeSeconds * 1000))`
- one quality point outweighs every valid time difference
- within equal quality, a smaller time produces the larger encoded score

Redis structures:
- sorted set `recovery:ranking:v1`: member = normalized nickname, score = encoded ranking score
- hash `recovery:ranking:records:v1`: field = nickname, value = JSON `{ nickname, quality, timeSeconds, updatedAt }`

POST uses `ZADD ... GT CH`; the record hash is updated only when the sorted-set score was added/improved.

## Failure behavior

- Missing server credentials: API returns HTTP 503 with `RANKING_UNAVAILABLE`.
- Storage/network failure: API returns 503; browser displays a ranking error but does not interrupt gameplay.
- Invalid nickname/score payload: API returns 400.
- Failed landing: never calls ranking POST.
- Test-mode landing: never calls ranking POST.

## Privacy and assignment constraints

- The interface requests a pseudonymous callsign only and explicitly prohibits real names.
- No email, account, device ID, IP-derived identity, or other personal field is collected by application code.
- No Upstash secret is present in browser bundles, public UI, repository source, or assignment submission.
- Existing 20-run data and fixed scenarios remain unchanged.

## Verification

Automated tests cover:
- exactly three upper-half wind transitions in normal play
- lower-wind transition remains separate
- no legacy URL-driven test mode
- nickname normalization/validation
- ranking comparator/encoded ordering
- same nickname keeps only its best result
- failed/test runs do not submit
- missing ranking credentials degrade safely
- ranking UI states exist
- existing game tests continue passing

Manual browser verification covers:
- PC1 submits a successful score
- PC2 refreshes `/play/` and sees PC1's row
- a worse score from the same nickname does not replace the best score
- equal quality with faster time does replace it
- wind phase labels visibly progress through upper phases and then `LOWER`

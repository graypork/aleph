# RECOVERY Shared Ranking + Wind Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an across-computer persistent TOP 10 ranking to normal RECOVERY play while making the normal-game upper/lower wind phases explicit and keeping the 20-run difficulty experiment isolated.

**Architecture:** The browser remains a static Vite game and calls a new `/api/ranking` Vercel Function. The function stores one best record per normalized nickname in Upstash Redis via its REST API; the browser fetches rankings on load/refresh and after successful normal-game submissions. Wind phase state remains client-side and is rendered directly in telemetry.

**Tech Stack:** Vite, vanilla JavaScript, Node.js Vercel Functions, Upstash Redis REST API, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-15-recovery-shared-ranking-design.md`

## Global Constraints

- `/play/` must always start normal mode; remove legacy `?test=` / `?safe=` mode selection.
- Default safe landing speed stays `3.5`.
- Upper wind changes exactly three times before `y=200`; lower wind is a separate system after `y>=200`.
- 20-run fixed scenarios and 3.5→4.0 experiment data remain unchanged.
- Ranking includes successful normal runs only.
- Ranking order is recovery quality descending, then landing time ascending.
- One normalized nickname has one best record.
- Nicknames are uppercase `[A-Z0-9_-]{2,12}` and UI says `닉네임 · 실명 입력 금지`.
- TOP 10 is shared across computers and persists via server-side storage.
- No Redis secret may enter a browser bundle or repository.
- Ranking failure must not block gameplay.

---

### Task 1: Ranking domain rules

**Files:**
- Create: `src/game/ranking.js`
- Create: `tests/ranking.test.js`

**Interfaces:**
- Produces: `normalizeNickname(value)`, `isValidNickname(value)`, `encodeRankingScore(quality, timeSeconds)`, `isBetterRecord(next, current)`.

- [ ] **Step 1: Write failing domain tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeNickname,
  isValidNickname,
  encodeRankingScore,
  isBetterRecord,
} from '../src/game/ranking.js'

test('nickname is trimmed and normalized to uppercase callsign', () => {
  assert.equal(normalizeNickname(' miles_7 '), 'MILES_7')
  assert.equal(isValidNickname('MILES_7'), true)
  assert.equal(isValidNickname('황건희'), false)
  assert.equal(isValidNickname('A'), false)
})

test('quality outranks time and faster time breaks equal-quality ties', () => {
  assert.ok(encodeRankingScore(97, 29.9) > encodeRankingScore(96, 1.0))
  assert.ok(encodeRankingScore(97, 17.2) > encodeRankingScore(97, 19.2))
  assert.equal(isBetterRecord({ quality: 97, timeSeconds: 17.2 }, { quality: 97, timeSeconds: 19.2 }), true)
})
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test tests/ranking.test.js`
Expected: FAIL because `src/game/ranking.js` does not exist.

- [ ] **Step 3: Implement the minimal ranking rules**

```js
export function normalizeNickname(value) {
  return String(value ?? '').trim().toUpperCase()
}

export function isValidNickname(value) {
  return /^[A-Z0-9_-]{2,12}$/.test(normalizeNickname(value))
}

export function encodeRankingScore(quality, timeSeconds) {
  const qualityInt = Math.round(quality)
  const millis = Math.round(timeSeconds * 1000)
  return qualityInt * 1_000_000 + (1_000_000 - millis)
}

export function isBetterRecord(next, current) {
  if (!current) return true
  return encodeRankingScore(next.quality, next.timeSeconds) > encodeRankingScore(current.quality, current.timeSeconds)
}
```

- [ ] **Step 4: Run the test and confirm GREEN**

Run: `node --test tests/ranking.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/ranking.js tests/ranking.test.js
git commit -m "feat: define recovery ranking rules"
```

### Task 2: Server-side shared ranking store and API

**Files:**
- Create: `api/ranking-store.js`
- Create: `api/ranking.js`
- Create: `tests/ranking-api.test.js`

**Interfaces:**
- Consumes: `normalizeNickname`, `isValidNickname`, `encodeRankingScore` from `src/game/ranking.js`.
- Produces: `readTopRankings(limit)`, `saveBestRanking(record)` and HTTP GET/POST `/api/ranking`.

- [ ] **Step 1: Write failing API/store tests using an injected command function**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateRankingPayload, rankRows } from '../api/ranking-store.js'

test('ranking payload rejects invalid names and impossible values', () => {
  assert.equal(validateRankingPayload({ nickname: 'MILES', quality: 97, timeSeconds: 18.4 }).ok, true)
  assert.equal(validateRankingPayload({ nickname: '황건희', quality: 97, timeSeconds: 18.4 }).ok, false)
  assert.equal(validateRankingPayload({ nickname: 'MILES', quality: 101, timeSeconds: 18.4 }).ok, false)
  assert.equal(validateRankingPayload({ nickname: 'MILES', quality: 97, timeSeconds: 31 }).ok, false)
})

test('rankRows orders quality desc then time asc and assigns rank', () => {
  const rows = rankRows([
    { nickname: 'B', quality: 96, timeSeconds: 10 },
    { nickname: 'C', quality: 97, timeSeconds: 19 },
    { nickname: 'A', quality: 97, timeSeconds: 17 },
  ])
  assert.deepEqual(rows.map((row) => [row.rank, row.nickname]), [[1, 'A'], [2, 'C'], [3, 'B']])
})
```

- [ ] **Step 2: Run the tests and confirm RED**

Run: `node --test tests/ranking-api.test.js`
Expected: FAIL because server ranking module does not exist.

- [ ] **Step 3: Implement Upstash REST command helper and validation**

Use `fetch(process.env.UPSTASH_REDIS_REST_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.UPSTASH_REDIS_REST_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(command) })`. Throw `RANKING_UNAVAILABLE` when either environment variable is missing.

Use keys:
```js
const RANKING_KEY = 'recovery:ranking:v1'
const RECORDS_KEY = 'recovery:ranking:records:v1'
```

Save flow:
```js
const changed = await command(['ZADD', RANKING_KEY, 'GT', 'CH', encodedScore, nickname])
if (changed === 1) {
  await command(['HSET', RECORDS_KEY, nickname, JSON.stringify(record)])
}
```

Read flow:
```js
const names = await command(['ZRANGE', RANKING_KEY, 0, limit - 1, 'REV'])
const values = names.length ? await command(['HMGET', RECORDS_KEY, ...names]) : []
```

- [ ] **Step 4: Implement `api/ranking.js`**

GET returns:
```json
{ "rankings": [{ "rank": 1, "nickname": "MILES", "quality": 97, "timeSeconds": 18.42 }] }
```

POST accepts:
```json
{ "nickname": "MILES", "quality": 97, "timeSeconds": 18.42 }
```

Responses:
- 200 accepted/improved or existing best retained
- 400 invalid payload
- 405 unsupported method
- 503 missing credentials/storage failure

- [ ] **Step 5: Run ranking tests and confirm GREEN**

Run: `node --test tests/ranking*.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/ranking.js api/ranking-store.js tests/ranking-api.test.js
git commit -m "feat: add shared recovery ranking API"
```

### Task 3: Browser nickname and ranking client

**Files:**
- Create: `src/game/ranking-client.js`
- Create: `tests/ranking-client.test.js`

**Interfaces:**
- Consumes: ranking domain rules.
- Produces: `loadSessionNickname(storage)`, `saveSessionNickname(storage, nickname)`, `fetchRankings(fetchImpl)`, `submitRanking(fetchImpl, record)`.

- [ ] **Step 1: Write failing client tests**

Test that session nickname round-trips, malformed stored nickname returns blank, GET parses rankings, and POST sends JSON to `/api/ranking`.

- [ ] **Step 2: Confirm RED**

Run: `node --test tests/ranking-client.test.js`
Expected: FAIL because `ranking-client.js` does not exist.

- [ ] **Step 3: Implement minimal client helpers**

Use session key `recovery-game:player-nickname:v1`; `fetchRankings()` calls GET `/api/ranking`; `submitRanking()` calls POST `/api/ranking` with `Content-Type: application/json` and throws a normalized error on non-2xx responses.

- [ ] **Step 4: Confirm GREEN**

Run: `node --test tests/ranking-client.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/ranking-client.js tests/ranking-client.test.js
git commit -m "feat: add ranking browser client"
```

### Task 4: Make normal/test mode separation explicit and render wind phases

**Files:**
- Modify: `src/game/play.js`
- Modify: `play/index.html`
- Modify: `src/game/play.css`
- Modify: `tests/requirements.test.js`
- Modify: `tests/scenario.test.js`

**Interfaces:**
- Normal mode uses `createRandomScenario()` only.
- Difficulty mode is entered only through `startDifficultyTest()`.

- [ ] **Step 1: Add failing source/behavior tests**

Require:
- no `URLSearchParams` / `TEST_INDEX` legacy mode branch in `play.js`
- `upperWindSchedule.length === 3`
- phase labels exist in the public HTML
- wind pulse duration is at least `0.9s`

- [ ] **Step 2: Confirm RED**

Run: `node --test tests/requirements.test.js tests/scenario.test.js`
Expected: at least the legacy-query and phase-label assertions fail.

- [ ] **Step 3: Implement the mode/wind UI changes**

Remove legacy query parsing. Keep `runSafeLandingSpeed = 3.5` outside active 20-run test. Add `#wind-phase` and derive phase from `nextUpperWindIndex` / lower state:
```js
const phases = ['UPPER · STRONG', 'UPPER · WEAK', 'UPPER · VERY STRONG', 'UPPER · LATE']
const phase = lowerWindStartedAt === null ? phases[Math.min(nextUpperWindIndex, 3)] : 'LOWER'
```
Set wind shift pulse to `elapsed + 0.9`.

- [ ] **Step 4: Confirm GREEN**

Run: `node --test tests/requirements.test.js tests/scenario.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/play.js play/index.html src/game/play.css tests/requirements.test.js tests/scenario.test.js
git commit -m "fix: clarify normal wind phases"
```

### Task 5: Player entry and TOP 10 UI integration

**Files:**
- Modify: `play/index.html`
- Modify: `src/game/play.css`
- Modify: `src/game/play.js`
- Create: `tests/ranking-ui.test.js`

**Interfaces:**
- Consumes `ranking-client.js`.
- Normal START requires a valid session nickname.
- Successful normal `finishRun()` submits `{ nickname, quality, timeSeconds: elapsed }`.

- [ ] **Step 1: Write failing UI/integration tests**

Assert source contains:
- nickname input and `닉네임 · 실명 입력 금지`
- ranking list/table and refresh button
- test mode guard around score submission
- score submission only inside landing-success path
- ranking reload after accepted POST

- [ ] **Step 2: Confirm RED**

Run: `node --test tests/ranking-ui.test.js`
Expected: FAIL because ranking UI/integration is absent.

- [ ] **Step 3: Add player/callsign UI**

Add a compact panel before the game world with:
- `#player-nickname` input, maxlength 12, autocomplete off
- `#player-save` button
- `#player-error`
- copy `닉네임 · 실명 입력 금지 · 영문/숫자/_/- 2~12자`

If a valid session nickname already exists, populate it and permit START. Invalid/missing nickname keeps normal START disabled or redirects focus to the input.

- [ ] **Step 4: Add ranking panel**

Add TOP 10 rows with states `LOADING`, `EMPTY`, `ERROR`, and a manual `랭킹 새로고침` button. Render each row as rank / nickname / quality / time.

- [ ] **Step 5: Integrate score submission**

On a successful landing only when `runTestConfig === null`, call `submitRanking()`. Do not block the result overlay while the request is pending. On completion, call `fetchRankings()` and rerender. On error, keep gameplay/result intact and show ranking unavailable.

- [ ] **Step 6: Confirm GREEN**

Run: `node --test tests/ranking-ui.test.js tests/ranking-client.test.js tests/ranking.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add play/index.html src/game/play.css src/game/play.js src/game/ranking-client.js tests/ranking-ui.test.js
git commit -m "feat: add player ranking experience"
```

### Task 6: Deployment safety, setup guide, and final regression

**Files:**
- Create: `RANKING-SETUP.md`
- Modify: `APPLY-AND-PUSH.sh`
- Modify: `tests/compliance.test.js`

**Interfaces:**
- Deployment requires `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel Production environment.

- [ ] **Step 1: Add failing compliance assertions**

Assert no source file contains an actual Redis endpoint/token value and that public HTML does not include `UPSTASH_REDIS_REST_TOKEN`.

- [ ] **Step 2: Confirm RED/GREEN appropriately**

Run: `node --test tests/compliance.test.js`
Expected: PASS once assertions are written against secret-free source; if an accidental secret is present this test must fail and the secret must be removed before continuing.

- [ ] **Step 3: Write exact setup guide**

`RANKING-SETUP.md` must instruct the user to create/attach an Upstash Redis database, add exactly these Production env vars in Vercel, and redeploy:
```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```
It must explicitly say never to prefix the token with `VITE_` and never commit the value.

- [ ] **Step 4: Update the apply/push script**

The script must run:
```bash
node --test tests/*.test.js
npm run build
git add api play src tests RANKING-SETUP.md APPLY-AND-PUSH.sh
git commit -m "feat: add shared recovery ranking"
git push origin main
```
with `set -euo pipefail` and no push after test/build failure.

- [ ] **Step 5: Run full verification**

Run:
```bash
node --test tests/*.test.js
npm run build
```
Expected: zero failing tests and Vite build exit code 0.

- [ ] **Step 6: Manual multi-PC verification after credentials are configured**

1. PC1 opens `/play/`, enters `MILES`, succeeds, and sees its row.
2. PC2 opens or refreshes `/play/` and sees `MILES` without sharing browser storage.
3. PC1 records a worse `MILES` result; PC2 refreshes and the old best remains.
4. PC1 records equal quality with a faster time; PC2 refreshes and the faster time replaces it.
5. Run the 20-run test and confirm no test result appears in TOP 10.
6. Normal game wind label advances `UPPER · STRONG → WEAK → VERY STRONG → LATE → LOWER`.

- [ ] **Step 7: Final commit if documentation/script changed after Task 5**

```bash
git add RANKING-SETUP.md APPLY-AND-PUSH.sh tests/compliance.test.js
git commit -m "docs: add shared ranking deployment setup"
```

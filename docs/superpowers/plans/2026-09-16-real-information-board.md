# Assignment 04 Real Information Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/board/` page that records Seoul's real current temperature by KST date, preserves exactly two live evidence dates, compares them, and deterministically replays the official T04 failure fixtures without mixing synthetic and live data.

**Architecture:** A Vercel server function fetches keyless Open-Meteo data, normalizes it, and persists live evidence in Upstash Redis using a hash keyed by KST `record_date`. Pure shared modules implement normalization, date derivation, daily upsert semantics, comparison, and fixture replay; the client uses a separate in-memory synthetic state for the Failure Lab. Official fixture assets are copied unchanged under `public/t04-fixtures/` and verified against the supplied SHA-256 manifest.

**Tech Stack:** Vite, vanilla ES modules, Node `node:test`, Vercel Functions, Upstash Redis REST, Open-Meteo Forecast API.

**Spec:** `docs/superpowers/specs/2026-09-16-real-information-board-design.md`

## Global Constraints

- Result route is `/board/`; existing `/`, `/play/`, `/studio/` remain behaviorally unchanged.
- Live signal is Seoul current `temperature_2m`, unit `°C`, timezone `Asia/Seoul`, keyless Open-Meteo source.
- Same `signal_id + record_date` is updated, not duplicated.
- Exactly two distinct real KST evidence dates are preserved; a third distinct date is displayed live but not appended.
- Synthetic fixtures never write live Redis evidence.
- Five failures must preserve the last good value and expose distinct `error_code` states.
- Official fixture contents are copied byte-for-byte and SHA-256 verified.
- Upstash secret values remain server-only; no secret plaintext is returned to the browser or committed.
- T04-C22–C24 remain incomplete until a successful second real fetch on a different KST date.

---

### Task 1: Official fixture package and deterministic state core

**Files:**
- Create: `public/t04-fixtures/**`
- Create: `src/board/model.js`
- Create: `src/board/replay.js`
- Test: `tests/board-model.test.js`
- Test: `tests/board-replay.test.js`
- Test: `tests/board-assets.test.js`

**Interfaces:**
- Produces `kstDate(iso)`, `validateNormalizedReading(reading)`, `comparisonFor(rows, current)`, `upsertDailyRow(rows, reading)`, `createReplayState()`, `runFixture(state, fixture)`.

- [ ] Write tests for KST dates, schema validation, same-day stable-ID update, next-day insert, delta calculation, five failure codes, stale preservation, and recover-D2.
- [ ] Run `node --test tests/board-model.test.js tests/board-replay.test.js tests/board-assets.test.js` and confirm RED because board modules/assets are missing.
- [ ] Copy the official package files unchanged to `public/t04-fixtures/` and implement the minimal pure model/replay modules matching `adapter-reset.example.js` semantics.
- [ ] Re-run the three tests and confirm PASS.

### Task 2: Live Open-Meteo adapter

**Files:**
- Create: `api/board-live-adapter.js`
- Test: `tests/board-live-adapter.test.js`

**Interfaces:**
- Produces `buildOpenMeteoUrl()`, `normalizeOpenMeteoPayload(payload, fetchedAt)`, `fetchLiveReading(fetchImpl, now)`.

- [ ] Write tests for exact source URL shape, no API key, source observation time normalization with `+09:00`, unit/value/schema validation, timeout/non-2xx/schema errors.
- [ ] Run `node --test tests/board-live-adapter.test.js` and confirm RED.
- [ ] Implement the keyless Open-Meteo adapter with typed errors and a bounded timeout.
- [ ] Re-run and confirm PASS.

### Task 3: Redis persistence with two-date evidence cap

**Files:**
- Create: `api/board-store.js`
- Test: `tests/board-store.test.js`

**Interfaces:**
- Produces `createBoardStore(command)`, `listEvidenceDays()`, `saveLiveReading(reading, rawSnapshot)`, `readLastGood()`.

- [ ] Write tests proving same-date update preserves `record_id/server_created_at`, second date inserts, third date is rejected from evidence append, sorted rows are returned, and receipts contain canonical `t04_day` payload fields.
- [ ] Run `node --test tests/board-store.test.js` and confirm RED.
- [ ] Implement Redis hash persistence with an atomic Lua HGET/HLEN/HSET gate for the two-date cap.
- [ ] Re-run and confirm PASS.

### Task 4: Public live API

**Files:**
- Create: `api/board/live.js`
- Test: `tests/board-api.test.js`

**Interfaces:**
- GET `/api/board/live` returns `{ ok, reading, status, evidenceDays, comparison, rawCheck, receipts, evidenceLocked }`; failure returns typed stale payload when a last good row exists.

- [ ] Write handler tests with injected adapter/store dependencies for fresh success, stale upstream failure, and last-good preservation.
- [ ] Run `node --test tests/board-api.test.js` and confirm RED.
- [ ] Implement handler factory plus default Vercel handler.
- [ ] Re-run and confirm PASS.

### Task 5: Review UI and synthetic Failure Lab

**Files:**
- Create: `board/index.html`
- Create: `src/board/board.js`
- Create: `src/board/board.css`
- Modify: `vite.config.js`
- Modify: `src/assignment-link.js`
- Test: `tests/board-requirements.test.js`
- Test: `tests/board-ui-contract.test.js`

**Interfaces:**
- Live UI consumes `/api/board/live`; Failure Lab loads `/t04-fixtures/fixtures/*.json` and maintains in-memory replay state only.

- [ ] Write markup/source contract tests covering visible value/unit/source/source time/fetch time/timezone/freshness, history, refresh, five failure buttons, retry/recover, synthetic label, and new Vite board entry.
- [ ] Run the UI tests and confirm RED.
- [ ] Implement responsive `/board/` UI, live renderer, raw/stored/display check, daily history, honest 1/2 waiting state, and Failure Lab with distinct messages/actions.
- [ ] Re-run and confirm PASS.

### Task 6: Evidence, security scan, and full regression

**Files:**
- Create: `scripts/verify-t04-assets.mjs`
- Create: `evidence/t04-package-hash-check.md`
- Create: `evidence/t04-fixture-transitions.md`
- Create: `evidence/t04-secret-scan.md`
- Create: `evidence/t04-live-evidence-status.md`
- Create: `APPLY-FIX-ASSIGNMENT-04.md`
- Create: `APPLY-ASSIGNMENT-04.sh`
- Test: `tests/board-evidence.test.js`

**Interfaces:**
- Verification script exits nonzero on any manifest mismatch; evidence explicitly marks real day 1/day 2 as pending until deployed live calls occur rather than fabricating them.

- [ ] Write evidence tests for package ID, 17 manifest-listed hashes, five failure transitions, and absence of literal secret values/personal records in board files.
- [ ] Run evidence tests and confirm RED.
- [ ] Generate hash/fixture/security evidence from actual verification commands and add deployment/day-1/day-2 instructions.
- [ ] Run `node --test tests/*.test.js` and confirm all project tests pass.
- [ ] Run `npm run build` when Vite is available; if unavailable in this environment, record the dependency limitation and make the apply script run `npm ci`, tests, and build before commit/push.

### Task 7: Package the overlay

**Files:**
- Create user artifact: `/mnt/data/assignment-04-real-information-board.zip`

- [ ] Package only Assignment 04 new/modified files plus immutable official fixtures, spec, plan, evidence, and apply script.
- [ ] Run `unzip -t` on the ZIP.
- [ ] Compute SHA-256 of the ZIP.
- [ ] Provide the apply commands and state that C22–C24 require the second real KST date after deployment.

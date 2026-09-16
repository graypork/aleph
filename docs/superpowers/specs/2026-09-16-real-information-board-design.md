# Assignment 04 — Real Information Board Design

## Goal

Add a public `/board/` page to `graypork/aleph` that shows one real, non-personal, dynamically changing public value, preserves one record per Asia/Seoul day, compares the two required real dates, and honestly preserves the last good value when live or synthetic data fails.

## Source signal

- Signal: Seoul current air temperature (`temperature_2m`)
- Unit: `°C`
- Public upstream: Open-Meteo Forecast API
- Coordinates: Seoul City Hall reference point, latitude `37.5665`, longitude `126.9780`
- Timezone: `Asia/Seoul`
- Authentication: none; no API key or secret is required by the upstream
- Live source URL is stored with every real daily record.
- Upstream observation time comes from Open-Meteo `current.time`; app fetch time is kept separately.

## Public product route

- Result: `/board/`
- Existing `/`, `/play/`, and `/studio/` remain behaviorally unchanged.
- Review page requires no account, login, authentication, invitation, password, OAuth, or CAPTCHA.

## Architecture

### 1. Live path

Browser calls `GET /api/board/live`.

The Vercel function:
1. fetches the keyless Open-Meteo current-temperature endpoint,
2. validates the upstream payload,
3. normalizes it to the T04 normalized-reading contract,
4. derives `record_date` from a server timestamp in `Asia/Seoul`,
5. upserts the daily record in Redis,
6. returns the current reading, the persisted evidence-day list, status, and day-over-day comparison.

The browser never invents a live value. It displays the server response.

### 2. Persistent real evidence

Reuse the project's existing server-only Upstash Redis REST credentials:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

No new browser secret is introduced.

Keys are namespaced away from Assignment 2:

- `t04:live:days:v1` — hash keyed by `record_date`
- `t04:live:status:v1` — last fetch status / last good date metadata if needed

Each daily row stores:

- `record_id`
- `signal_id`
- `record_date`
- `source_url`
- `source_observed_at`
- `normalized_value`
- `unit`
- `source_name`
- `first_fetched_at`
- `last_fetched_at`
- `server_created_at`

Same KST date is updated under the same field, so repeated success does not create duplicates.

### 3. Exactly two real evidence dates

The grading contract requires exactly two real KST-date receipts. The board therefore has a bounded evidence window:

- the first distinct live KST date creates evidence day 1,
- the second distinct live KST date creates evidence day 2,
- once two distinct real dates are preserved, later live fetches may display the current value but do not append a third evidence row.

This prevents accidental failure of T04-C22 after the required two-day collection is complete. Same-day re-fetches update the existing day before the two-day evidence window is complete.

### 4. Live failure behavior

If Open-Meteo is unreachable, rejects the request, or returns an invalid schema:

- return a typed live error,
- do not delete or overwrite the last persisted normal reading,
- return that last reading as `stale` when one exists,
- show a retry action and a human-readable explanation.

Live errors are not used as substitutes for the five required synthetic fixture tests.

### 5. Synthetic Failure Lab

The official public T04 fixture package is copied into the project under `public/t04-fixtures/` without changing fixture contents.

A separate client-side replay state uses the same normalization/storage/comparison semantics as live data, but never writes to the real Redis evidence keys.

The reviewer can run:

- `T04-NORMAL-D1-A`
- `T04-NORMAL-D1-B`
- `T04-NORMAL-D2`
- `T04-TIMEOUT`
- `T04-AUTH-401`
- `T04-RATE-429`
- `T04-OFFLINE`
- `T04-SCHEMA-BREAK`
- `T04-RECOVER-D2`

Failure replay begins from D1-A → D1-B, so every failure preserves value `105`, one daily row, and shows `stale` plus its specific error code.

Recovery is D1-A → D1-B → TIMEOUT → RECOVER-D2. Before retry: `stale / timeout`, one row, last good `105`. After retry: `fresh / none`, two rows, exactly one `2026-08-25` row, value `120`.

Synthetic fixtures are visibly labeled `SYNTHETIC TEST DATA` and are never mixed with live evidence.

## Comparison rule

For two stored rows with the same unit:

`signed_delta = current.normalized_value - previous.normalized_value`

UI displays:

- increase: `+N.N °C`
- decrease: `-N.N °C`
- unchanged: `0.0 °C`

The two rows are ordered by actual persisted KST `record_date`. The same pure comparison function is used for live history and deterministic fixture replay.

## UI

### Live board

Show in one reviewable screen:

- value
- unit
- source name and clickable source URL
- source observation time
- app/server fetched time
- `Asia/Seoul`
- `FRESH` or `STALE`
- yesterday comparison when two evidence dates exist
- daily evidence table (0, 1, or exactly 2 rows)
- `새로 조회` button

Before day 2, show an explicit honest state such as `실제 둘째 날짜 기록을 기다리는 중 · 1/2` instead of fabricating a comparison.

### Failure Lab

Show:

- reset
- normal D1 sequence
- five named failure buttons
- recovery demo
- current synthetic value
- `fresh/stale`
- exact `error_code`
- synthetic daily-row count
- retry action on failure

Each failure has a distinct explanation and next action.

## Official asset integrity

Store the package ID and manifest verification evidence. The delivered archive contains 18 entries and the 17 manifest-listed files are SHA-256 verified against `asset-manifest.json`; the ZIP cannot list/hash itself by contract.

No fixture payload is edited for testing.

## Security and privacy

- No personal data is collected or displayed.
- No nickname, account, device identifier, IP-derived identity, or user record is stored.
- Open-Meteo uses no client secret.
- Upstash credentials remain server-only and are referenced only through `process.env` in server functions.
- No secret value is returned in API responses or committed to Git.
- Synthetic fixture payloads contain synthetic values only.

## Evidence

Keep repository evidence, not submission-form clutter:

- package/hash verification
- one normal live raw → normalized/stored → displayed comparison
- secret scan result
- five fixture failure transitions
- D1 same-day upsert row count
- D2 next-day row creation
- real day 1 server record
- real day 2 server record when the next KST date arrives
- final delta recalculation

The platform submission itself contains only result URL, immutable source URL, 4-line verification, and 3-line AI/student judgment.

## Source URL at final submission

T04-C35 requires the submitted source URL to contain an immutable 40- or 64-character lowercase hexadecimal commit identifier. Final submission will therefore use:

`https://github.com/graypork/aleph/tree/<40-character-commit-sha>`

not the moving repository root URL.

## Verification strategy

Automated Node tests cover:

- normalized reading validation
- KST date generation
- same-date upsert
- next-date insert
- delta calculation
- each five failure types
- stale last-good preservation
- recovery D2 transition
- two-day evidence-window cap
- live upstream adapter normalization with a deterministic sample response
- server payload validation / secret absence
- public board markup requirements

Manual/browser verification covers:

- real Open-Meteo fetch
- one-screen metadata visibility
- retry UX
- responsive review page
- Network/source secret scan
- next-real-KST-day collection.

## Day-1 / Day-2 operational boundary

Implementation and synthetic verification can finish on day 1. T04-C22–C24 remain incomplete until a successful second real fetch occurs on a different Asia/Seoul calendar date. No synthetic clock manipulation or fabricated record is permitted to satisfy those criteria.

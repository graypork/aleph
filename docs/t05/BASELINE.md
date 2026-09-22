# T05 Baseline — Failure Lab batch report

## Improvement
Add one small improvement to Assignment 04: a **Run all failure checks** action in `/board/` that replays the five official synthetic failures from the same D1 baseline and shows a single comparison table. Existing individual controls remain unchanged.

## Frozen source
- Repository: `graypork/aleph`
- Start commit: `387f21c2243055e3bd825a0059892dda3fd3e43f`
- Start route: `/board/`

## Common limits (fixed before AI A work)
- Time limit: **60 minutes per AI**
- User-to-AI request limit: **8 requests per AI**
- Internal tool calls are not counted as user requests.

## Same initial request for AI A and AI B
> Continue the T05 Failure Lab batch-report improvement from the provided repository state. Do not delete, loosen, or change the expected values of the frozen 10 checks. Use only the repository and the handoff document as context. Keep Assignment 04's existing live-data and individual Failure Lab behavior intact. Run the same 10 checks and report actual pass/fail results.

## Frozen checks — exactly 10
| ID | User/input action | Observable expected value |
|---|---|---|
| T05-FIX-01 | Run the batch check with D1-A → D1-B → TIMEOUT | one report row shows `stale / timeout / 105 / 1` |
| T05-FIX-02 | Run the batch check with D1-A → D1-B → AUTH-401 | one report row shows `stale / auth / 105 / 1` |
| T05-FIX-03 | Run the batch check with D1-A → D1-B → RATE-429 | one report row shows `stale / rate_limit / 105 / 1` |
| T05-FIX-04 | Run the batch check with D1-A → D1-B → OFFLINE | one report row shows `stale / offline / 105 / 1` |
| T05-FIX-05 | Run the batch check with D1-A → D1-B → SCHEMA-BREAK | one report row shows `stale / schema_error / 105 / 1` |
| T05-FIX-06 | Finish all five batch scenarios | exactly 5 rows exist and every row keeps value `105` with daily row count `1` |
| T05-FIX-07 | Inspect the completed batch report | rows stay in order `timeout, auth, rate_limit, offline, schema_error` |
| T05-FIX-08 | Click `#run-all-failures` | `#failure-report-body` receives the five result rows |
| T05-FIX-09 | Click `#replay-reset` after a batch run | batch report clears and synthetic state returns to `none / none / 0` |
| T05-FIX-10 | After TIMEOUT, click the recovery action | recovery summary shows `fresh / none / 120 / 2` |

## Freeze rule
From AI A start onward: **0 deleted checks, 0 loosened checks, 0 changed expected values.**

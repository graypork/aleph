# T05-A-HANDOFF

> Assignment 05 · AI A → AI B handoff  
> Repository: `graypork/aleph`  
> Branch: `t05-ai-a-handoff`  
> AI A start version: `387f21c2243055e3bd825a0059892dda3fd3e43f`  
> **AI A handoff version ID: `6da1129ef98e8b2b2a15556a6057b9768fe16021`**

AI B must begin by confirming that the checked-out repository commit is exactly the handoff version ID above. Previous chat history is intentionally not part of the handoff.

## 1. 목표

Continue one small improvement to Assignment 04's `/board/` Failure Lab.

The improvement is a **Run all failure checks** action that:

- starts each scenario from the same `D1-A → D1-B` synthetic baseline,
- runs the five official failure fixtures in this fixed order:
  `timeout → auth → rate_limit → offline → schema_error`,
- renders one five-row comparison report,
- keeps the existing individual Failure Lab controls working,
- clears the batch report when the synthetic state is reset,
- exposes the timeout → recovery result as `fresh / none / 120 / 2`.

The 10 fixed checks were frozen before AI A implementation began. AI B must complete the feature **without deleting, weakening, or changing any expected value in those 10 checks**.

Common limits fixed before work:

- Time limit: **60 minutes per AI**
- User-to-AI request limit: **8 requests per AI**
- Internal tool calls are not counted as user requests.

Same initial task rule for both A and B:

> Continue the T05 Failure Lab batch-report improvement from the provided repository state. Do not delete, loosen, or change the expected values of the frozen 10 checks. Use only the repository and the handoff document as context. Keep Assignment 04's existing live-data and individual Failure Lab behavior intact. Run the same 10 checks and report actual pass/fail results.

## 2. 현재 상태

Repository state at handoff:

- Branch: `t05-ai-a-handoff`
- AI A start commit: `387f21c2243055e3bd825a0059892dda3fd3e43f`
- AI A handoff commit: `6da1129ef98e8b2b2a15556a6057b9768fe16021`
- Base feature: Assignment 04 `/board/`
- Fixed checks: exactly 10
- AI A final fixed-check result: **7/10 PASS, 3/10 FAIL**
- Passing: `T05-FIX-01` through `T05-FIX-07`
- Failing: `T05-FIX-08`, `T05-FIX-09`, `T05-FIX-10`

AI A added `src/board/failure-report.js`.

Already implemented there:

- `FAILURE_BATCH_ORDER`
- same D1 baseline for every scenario
- `runFailureBatch(loadFixture)`
- deterministic five-row result order
- last-good value `105`
- one daily row for each failure result

Current failing gaps:

- **T05-FIX-08**: public board does not yet contain/wire
  - `#run-all-failures`
  - `#failure-report-body`
  - `runFailureBatch` rendering into the report body
- **T05-FIX-09**:
  - `clearFailureReport` is not implemented/wired
  - `#replay-reset` does not clear the batch report
- **T05-FIX-10**:
  - `runRecoverySummary(loadFixture)` is not implemented in `failure-report.js`
  - board UI does not yet expose/render a recovery summary

AI A usage record:

- Start: `2026-09-18T14:28:50+09:00`
- End: `2026-09-18T14:32:08+09:00`
- Actual working time: `3m 18s`
- User-to-AI requests used: `1`
- Fixed-suite executions with at least one FAIL: `2`
- Round 1: `0/10 PASS`
- Round 2: `7/10 PASS`
- Deleted checks: `0`
- Loosened checks: `0`
- Changed expected values: `0`

## 3. 실행 명령

First confirm the repository version in a fresh work folder.

```bash
cd ~/Desktop
rm -rf t05-b-work
git clone --branch t05-ai-a-handoff --single-branch https://github.com/graypork/aleph.git t05-b-work
cd t05-b-work
git rev-parse HEAD
```

Expected SHA before any AI B changes:

```text
6da1129ef98e8b2b2a15556a6057b9768fe16021
```

If the SHA differs, stop and resolve the version mismatch before implementation.

Install dependencies if needed:

```bash
npm ci
```

Run the fixed 10 checks exactly as frozen:

```bash
node --test tests/t05-fixed.test.js
```

Expected starting result at this handoff:

```text
tests 10
pass 7
fail 3
```

After implementation, run the **same unchanged** fixed suite again:

```bash
node --test tests/t05-fixed.test.js
```

Required completion result:

```text
tests 10
pass 10
fail 0
```

Then verify regressions and production build:

```bash
node --test tests/*.test.js
npm run build
```

Before committing, verify that the fixed test file was not altered:

```bash
git diff 6da1129ef98e8b2b2a15556a6057b9768fe16021 -- tests/t05-fixed.test.js
```

Expected output: empty.

Also inspect the final source diff:

```bash
git status --short
git diff --stat 6da1129ef98e8b2b2a15556a6057b9768fe16021
```

## 4. 통과 검사

These are the frozen checks. Do not change their IDs, inputs, or expected values.

| ID | Input / action | Observable expected value | A handoff |
|---|---|---|---|
| `T05-FIX-01` | Run batch with D1-A → D1-B → TIMEOUT | `stale / timeout / 105 / 1` | PASS |
| `T05-FIX-02` | Run batch with D1-A → D1-B → AUTH-401 | `stale / auth / 105 / 1` | PASS |
| `T05-FIX-03` | Run batch with D1-A → D1-B → RATE-429 | `stale / rate_limit / 105 / 1` | PASS |
| `T05-FIX-04` | Run batch with D1-A → D1-B → OFFLINE | `stale / offline / 105 / 1` | PASS |
| `T05-FIX-05` | Run batch with D1-A → D1-B → SCHEMA-BREAK | `stale / schema_error / 105 / 1` | PASS |
| `T05-FIX-06` | Finish all five batch scenarios | exactly 5 rows; every row keeps value `105`, row count `1` | PASS |
| `T05-FIX-07` | Inspect completed batch report | order is `timeout, auth, rate_limit, offline, schema_error` | PASS |
| `T05-FIX-08` | Click `#run-all-failures` | `#failure-report-body` receives the five result rows | FAIL |
| `T05-FIX-09` | Click `#replay-reset` after batch run | batch report clears; synthetic state returns to `none / none / 0` | FAIL |
| `T05-FIX-10` | After TIMEOUT, click recovery action | recovery summary is `fresh / none / 120 / 2` | FAIL |

Freeze rule from AI A start onward:

- deleted fixed checks: **0**
- loosened fixed checks: **0**
- changed expected values: **0**

Keep those counts at zero.

## 5. 남은 문제

Only the final integration for `T05-FIX-08` through `T05-FIX-10` remains.

### T05-FIX-08 — batch report UI integration

`board/index.html` currently has the existing individual controls but no batch-report UI.

Required observable hooks:

```text
#run-all-failures
#failure-report-body
```

`src/board/board.js` must use `runFailureBatch` and render all five rows into that report body.

Do not replace or remove the existing individual failure buttons.

### T05-FIX-09 — reset must clear batch report

The existing reset currently resets only `replayState`.

Add a clear operation named/wired as expected by the frozen test:

```text
clearFailureReport
```

When `#replay-reset` is clicked:

- `replayState = createReplayState()`
- normal synthetic state renders as `none / none / 0`
- batch report is cleared

### T05-FIX-10 — recovery summary

`src/board/failure-report.js` does not yet export:

```text
runRecoverySummary
```

It must reproduce:

```text
D1-A → D1-B → TIMEOUT → RECOVER-D2
```

and return exactly:

```js
{
  freshness: 'fresh',
  error_code: 'none',
  value: 120,
  row_count: 2,
}
```

`src/board/board.js` must use that helper and render a recovery-summary UI hook matching the frozen test (`recovery-summary` or `recoverySummary`).

## 6. 다음 행동

AI B should proceed in this order:

1. Confirm `git rev-parse HEAD` equals `6da1129ef98e8b2b2a15556a6057b9768fe16021`.
2. Run `node --test tests/t05-fixed.test.js` once and confirm the inherited state is `7 PASS / 3 FAIL`.
3. Read only the repository and this handoff to understand the remaining work.
4. Implement `T05-FIX-08`.
5. Implement `T05-FIX-09`.
6. Implement `T05-FIX-10`.
7. Run the **same unchanged** `tests/t05-fixed.test.js`.
8. If any fixed check fails, fix implementation only; do not change the test.
9. Reach `10/10 PASS`.
10. Run all repository tests and `npm run build`.
11. Commit the completed implementation on `t05-ai-a-handoff`.
12. Report:
    - AI B actual working time,
    - AI B user-request count,
    - number of fixed-suite execution rounds that contained at least one FAIL,
    - final fixed-check pass count,
    - AI B start commit,
    - AI B final commit SHA,
    - confirmation that fixed-test deletions/loosening/expected-value changes are all zero.

For Assignment 05 evidence, preserve the order:

```text
AI A start
→ AI A end / handoff
→ AI B start
→ AI B end
```

## 7. 건드리지 말 것

Do **not** modify these rules or contracts:

- Do not delete any of the 10 tests in `tests/t05-fixed.test.js`.
- Do not loosen assertions in `tests/t05-fixed.test.js`.
- Do not change any expected value in `tests/t05-fixed.test.js`.
- Do not change `docs/t05/BASELINE.md` to make implementation easier.
- Do not alter the official T04 fixture payloads under `public/t04-fixtures/`.
- Do not change Assignment 04 live-data storage/evidence semantics.
- Do not remove or break the existing individual Failure Lab controls.
- Do not mix synthetic Failure Lab data with real live evidence.
- Do not introduce login, account creation, OAuth, CAPTCHA, personal data, or plaintext secrets.
- Do not use previous AI conversation history as implementation context.
- Do not silently change the handoff version ID.

The handoff is valid only for the exact AI A end commit:

```text
6da1129ef98e8b2b2a15556a6057b9768fe16021
```

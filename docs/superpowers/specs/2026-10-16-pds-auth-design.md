# T07 PlanDoSee Diary 2 — Auth Design

Date: 2026-10-16
Base T06 commit: `3991af641a4cf5de88f043032596b1c8ec0d30b4`
Target branch: `t07-pds-auth`

## 1. Goal

Extend the final T06 PlanDoSee diary without replacing it. T07 must make the diary private per account, prove that unauthorized requests fail, preserve the existing PLAN → DO → SEE workflow, and add the five-day observation/rule-change evidence required by the assignment.

Success means:

- `/pds/` is publicly reachable, but its first screen is authentication only.
- Email/password sign-up, sign-in and sign-out work.
- All PDS records are owned by one authenticated user and never mix between users.
- The same protected request succeeds while signed in and fails after sign-out.
- Cross-account read/update/delete attempts fail in both directions without changing the other account's data.
- Password material is handled by Supabase Auth, never stored by PlanDoSee, and never printed in evidence.
- Export returns only the signed-in user's records.
- Account deletion removes or cascades the user's PlanDoSee data and clearly explains the result before deletion.
- A five-day experiment records exactly five different Asia/Seoul dates, with one planning-rule change after Day 2 and before Day 3.
- Submission evidence contains masked secrets only.

## 2. Chosen approach

Use **Supabase Auth** with email/password plus exact-pinned `@supabase/supabase-js` **2.117.3** in `package.json` and the lockfile.

Supabase Auth is selected because the application already uses Supabase Postgres, and Auth integrates with Postgres ownership checks and Row Level Security. Password hashing remains inside the established Auth service rather than being recreated in application code. Supabase documents password storage as bcrypt with a randomly generated salt per password hash.

The browser uses the public/publishable Supabase key only. `SUPABASE_SECRET_KEY` remains server-only.

For this assignment environment, **email confirmation is disabled** so a newly created email/password account can sign in immediately and the sign-up/sign-in flow is reproducible without relying on an external mail inbox. This is documented as an assignment-specific simplification, not as production email-security hardening.

### Considered but not selected

1. **Custom password/session implementation** — rejected because it would make the assignment larger while increasing the chance of password-storage and session-security mistakes.
2. **Firebase Auth** — rejected because it adds a second identity platform while the database is already Supabase.
3. **Direct browser-to-Postgres CRUD** — rejected as the primary application path because T06 already has a Vercel API layer and T07 needs clear request/response evidence at stable `/api/pds/*` endpoints.

## 3. Authentication and session model

### Browser auth

- A client-only Supabase Auth client is initialized with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- The first `/pds/` view contains only sign-in/sign-up UI until a valid session exists.
- Sign-up uses `auth.signUp({ email, password })`.
- Sign-in uses `auth.signInWithPassword({ email, password })`.
- All failed password sign-ins shown to the user are mapped to one neutral message so a nonexistent email and a wrong password are indistinguishable in the PlanDoSee UI.
- Sign-out uses `auth.signOut({ scope: 'local' })` for the current session and then clears application state.
- Access/refresh tokens must never be placed in query strings or URLs.

### Protected API requests

Every existing `/api/pds/*` data endpoint becomes authenticated. The browser sends the current access token only in `Authorization: Bearer <masked-token>`.

The API:

1. Rejects requests with no bearer token with `401`.
2. Validates the token against Supabase Auth and obtains the authenticated user ID.
3. Passes the user JWT to PostgREST with the publishable key so Postgres evaluates requests as `authenticated`, not as the server secret role.
4. Never trusts `user_id`, `owner_id`, email, or account identifiers supplied in URL/query/body/header data as ownership evidence.

### Immediate post-logout rejection

Supabase access JWTs can remain cryptographically valid until their `exp` time even after refresh-token revocation. T07 therefore adds a **private session-active check** used by protected PDS RLS policies:

- Read the verified JWT `session_id` claim.
- Confirm that the session still exists in `auth.sessions` for the authenticated user.
- Implement the lookup in a non-exposed private schema function used only by RLS.
- The function is `SECURITY DEFINER` only because `authenticated` cannot read `auth.sessions`; it sets a fixed `search_path`, compares both `auth.uid()` and the JWT `session_id`, and is not directly executable by `anon` or `authenticated`.
- All protected table policies require both row ownership and an active session.

This makes the same bearer token fail against PDS data immediately after its Supabase session has been removed on sign-out.

### Password change

A password-change flow is included because T07-C114 requires old session material to stop working after password change as well as logout.

- The authenticated browser uses Supabase Auth `updateUser({ password, currentPassword })`; version 2.117.3 supports current-password verification.
- Password values go only to Supabase Auth and are never included in PlanDoSee API logs or evidence.
- After a successful password change, the browser performs global sign-out so existing Supabase sessions are revoked.
- The private session-active RLS check then rejects prior bearer values immediately.

## 4. Ownership and database model

### Existing T06 data

The six PDS tables remain the core diary data:

- `plans`
- `plan_revisions`
- `tasks`
- `work_logs`
- `completion_events`
- `plan_reviews`

The final T06 records are migrated to the user's primary T07 account. Migration must preserve IDs, dates, task states, completion events, revision history, review data and work-log values.

### Ownership columns

Add `owner_id uuid references auth.users(id) on delete cascade` where ownership cannot be safely inferred without joining through a parent. `plans.owner_id` is the canonical owner. Child-table policies derive ownership through their parent relations rather than accepting a client-supplied owner.

Expected ownership path:

- plan → `plans.owner_id`
- plan revision → revision.plan_id → plan.owner_id
- task → task.plan_id → plan.owner_id
- work log → work_log.task_id → task.plan_id → plan.owner_id
- completion event → completion_event.task_id → task.plan_id → plan.owner_id
- plan review → review.plan_id → plan.owner_id

### RLS

All six existing tables keep RLS enabled and receive explicit policies for `authenticated` users.

- SELECT: current user owns the parent plan and session-active check passes.
- INSERT: new row resolves to a plan owned by current user and session-active check passes.
- UPDATE: both `USING` and `WITH CHECK` enforce the same ownership relation.
- DELETE where allowed: ownership relation and active session required.
- `anon` receives no diary access.

The review view remains `security_invoker=true` or is replaced with an equivalent owner-safe query so it cannot bypass RLS.

The server secret key is reserved for administrative maintenance, migration and account deletion only. Normal diary requests must not use it.

## 5. Five-day experiment model

T07 adds a small authenticated section inside SEE, not a separate product.

### Experiment configuration

One current experiment per owner stores:

- question
- metric name
- unit
- calculation rule
- missing-value rule
- duplicate-value rule
- outlier rule
- rounding rule
- week start day
- original planning rule
- created date/time

Initial fixed configuration:

- Question: `계획한 작업시간과 실제 작업시간의 차이를 줄일 수 있는가?`
- Metric: `계획 대비 실제 작업시간 오차율`
- Unit: `%`
- Calculation: `abs(actual_minutes - estimated_minutes) / estimated_minutes * 100`
- Missing value: if no valid estimated/actual pair exists for the date, the day remains incomplete and is excluded from aggregate calculations until filled; it is not silently converted to zero.
- Duplicate value: one observation per owner/experiment/Asia-Seoul date; a second save updates the same daily record rather than creating a second counted value.
- Outlier: preserve the original value and record the reason; do not trim or winsorize it.
- Rounding: one decimal place after calculating the full-precision value.
- Week starts: Monday.
- Original planning rule: `예상시간은 구현에 직접 필요한 시간만 기준으로 잡는다.`

### Daily observations

`pds_daily_observations` stores one row per exact Asia/Seoul calendar date:

- owner
- experiment
- record_date
- estimated_minutes
- actual_minutes
- calculated metric value
- optional note
- created/updated timestamps

A unique constraint on `(experiment_id, record_date)` prevents duplicate counted days.

The UI shows count, sum and average from the same five underlying values and lists the source rows used in the calculation.

### Rule change

`pds_rule_changes` stores exactly one T07 planning-rule change for the experiment:

- changed_at
- before_rule
- after_rule
- reason
- Day 1 reference
- Day 2 reference

The planned change is:

- Before: `예상시간은 구현에 직접 필요한 시간만 기준으로 잡는다.`
- After: `검증이 필요한 작업은 구현 예상시간에 검증시간 30%를 별도로 추가한다.`

The application blocks this record unless two distinct earlier daily observations exist, and blocks Day 3 completion unless the rule change has been recorded. The five required daily observations themselves must be entered on five real Asia/Seoul dates; future dates are rejected.

No future Day 2–5 records will be pre-seeded.

## 6. Export and account deletion

### Export

`GET /api/pds/export` is authenticated and exports one JSON file containing only the current user's:

- plans and revisions
- tasks
- work logs
- completion events
- plan reviews/review aggregates
- experiment configuration
- five-day observations
- rule-change history

No email, password hash, access token, refresh token, service key or session secret is included.

### Account deletion

The account area explains before deletion that PlanDoSee data will be deleted with the account.

Deletion flow:

1. Authenticate the current session.
2. Delete/cascade owned PlanDoSee rows.
3. Revoke sessions.
4. Delete the Supabase Auth user through server-only admin credentials.
5. Clear browser auth state and return to the login screen.

Deletion is destructive and must use an explicit confirmation UI.

## 7. Evidence generation

Evidence is a first-class deliverable. Create `docs/t07/AUTH-IMPLEMENTATION.md` with six required sections:

1. 무엇으로 붙였나
2. 왜 그걸 골랐나
3. 어디를 어떻게 고쳤나
4. 안 열리는 것을 확인한 기록
5. AI와 나
6. 아직 못 막은 것

Section 3 maps sign-up, sign-in, sign-out and data-read flows to concrete source paths.

Section 4 records paired HTTP evidence with all credentials masked:

- authenticated success vs unauthenticated rejection
- authenticated success vs same token after logout rejection
- account A → account B read/update/delete rejection
- account B → account A read/update/delete rejection
- forged account identifiers ignored/rejected
- lists contain zero rows owned by the other account
- target-account counts before/after denied writes are unchanged

Evidence examples must show status code, method, path, masked Authorization/cookie value where relevant, request body without passwords, and response body. Passwords are represented only as `<redacted>` and JWT/session values as short masked prefixes such as `eyJhb…생략`.

Password evidence includes two test accounts created with the same test password and two masked `auth.users.encrypted_password` hashes showing different bcrypt values. The plaintext password is never written to repository evidence.

## 8. UI

Preserve the current minimal PLAN / DO / SEE visual system.

Unauthenticated state:

- centered PlanDoSee mark
- email/password fields
- Sign in primary action
- Sign up secondary action
- neutral error message
- no diary data, plan titles or summary metrics in initial HTML/state

Authenticated state:

- existing PlanDoSee shell
- account email/status in a compact header control
- sign-out action
- account/security drawer for password change, export and account deletion
- five-day experiment block in SEE

Do not add a new framework or component library.

## 9. Error behavior

- No auth token/session: `401` with a generic authentication-required body.
- Auth token invalid/expired/revoked: `401`.
- Valid user requesting another owner's object: return `404` to hide object existence for object-by-id requests; owner-filtered lists return zero foreign rows.
- Wrong password vs nonexistent email: same PlanDoSee UI message.
- Duplicate signup: no second Auth user is created; UI does not expose whether the email already exists.
- Passwords/tokens are never echoed in application errors.

## 10. Files expected to change

Frontend:

- `pds/index.html`
- `pds/app.js`
- `pds/style.css`
- new `pds/auth.js` or equivalent focused auth client module

API/server:

- existing `api/pds/*.js`
- new auth/session/account endpoints under `api/pds/`
- `src/pds-server/supabase.js`
- store modules under `src/pds-server/`
- new focused auth helper rather than duplicating bearer/session parsing in each endpoint

Database/contracts:

- committed T07 SQL migration
- new T07 schema contract, keeping `contracts/pds-schema-v2.json` as the historical T06 contract

Tests/evidence:

- existing `tests/pds/*.test.mjs`
- new auth/ownership/session/five-day tests
- `docs/t07/AUTH-IMPLEMENTATION.md`
- `docs/t07/VERIFICATION.md` if separating raw request evidence improves readability

Dependencies:

- exact-pinned `@supabase/supabase-js` 2.117.3 plus lockfile changes
- no other runtime dependency unless implementation proves it is required

## 11. Test strategy

Use TDD for every behavioral change.

Required automated tests include:

- unauthenticated API returns 401
- login screen hides diary UI/data until auth state is valid
- generic login failure message is identical for wrong password/nonexistent account at app boundary
- owner filter cannot be overridden by query/header/body values
- A cannot read/update/delete B object
- B cannot read/update/delete A object
- denied mutation does not alter target rows
- list contains only current owner rows
- successful protected request becomes rejected after session revocation
- existing completion idempotency remains intact per owner
- export is owner-scoped
- experiment rejects future dates and sixth counted day
- one record per date
- rule change cannot occur before Day 2 and must exist before Day 3 is accepted
- sum/average use the same source values and rounding rule
- account deletion path removes owned data
- secret/key patterns absent from browser bundle and repository evidence

After implementation:

- run all PDS tests
- run Vite production build
- run Supabase security/performance advisors
- inspect RLS policies and grants
- inspect production runtime errors
- execute real two-account HTTP checks against the deployed app
- verify T07 branch history contains T06 commit `3991af641a4cf5de88f043032596b1c8ec0d30b4`

## 12. Security boundaries and non-goals

Must protect:

- passwords
- access/refresh/session values
- server secret key
- user ownership boundaries
- account deletion

Explicitly not claimed as solved in T07:

- application-level brute-force/rate limiting beyond Supabase's built-in protections
- MFA
- email confirmation in this assignment environment
- custom SMTP/password-recovery production hardening
- device/session management UI
- audit-log retention suitable for compliance

The final submission's section ⑥ will name at least the missing application-level brute-force/rate-limit control and explain why repeated credential guessing remains a risk.

## 13. Five-day timing

The five-day evidence must use real Asia/Seoul dates. Starting from 2026-10-16, the earliest valid sequence is:

- Day 1: 2026-10-16
- Day 2: 2026-10-17
- Rule change: after the Day 2 save and before the Day 3 save
- Day 3: 2026-10-18
- Day 4: 2026-10-19
- Day 5: 2026-10-20

Implementation must not fabricate future daily records. The app may be fully deployable before Day 5, but T07 is not considered fully complete until the five real-date records and the between-Day-2-and-Day-3 rule change exist.
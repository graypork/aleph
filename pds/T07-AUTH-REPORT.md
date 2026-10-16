# ALEPH 과제 7 — PlanDoSee 인증·격리 검증 보고서

## 1. 인증 방식

- 인증: Supabase Auth 이메일 + 비밀번호
- 클라이언트: `@supabase/supabase-js` 2.117.3, 버전을 고정한 `esm.sh` 모듈
- 세션: Supabase access token + `session_id`
- 비밀번호 저장·검증: 애플리케이션이 직접 저장하지 않고 Supabase Auth에 위임
- 데이터 권한: 브라우저/서버의 일반 CRUD는 로그인 사용자의 JWT를 PostgREST로 전달하고 PostgreSQL RLS가 최종 소유권을 판정
- 서버 secret: 일반 CRUD에는 사용하지 않고 계정 삭제와 기존 health check의 관리자 작업에만 한정

### 선택 이유

기존 PlanDoSee가 Supabase PostgreSQL을 사용하고 있어 별도 인증 서버나 자체 비밀번호 저장소를 추가하지 않고 같은 서비스의 Auth/JWT/RLS 경계를 사용할 수 있다. 사용자 ID는 `auth.uid()`로 DB 정책에 직접 연결되고, 자식 데이터는 Plan 또는 Experiment 소유자를 따라가므로 애플리케이션의 필터 실수만으로 다른 사용자의 자료가 노출되지 않도록 했다.

## 2. 주요 소스 위치

- 브라우저 인증: `pds/auth.js`
- 로그인 게이트·로그아웃·비밀번호 변경·계정 삭제 UI: `pds/t07.js`
- bearer 검증·Auth user 확인·관리자 계정 삭제: `src/pds-server/auth.js`
- 사용자 JWT 기반 PostgREST 요청: `src/pds-server/supabase.js`
- Plan/Task/Work Log/Review 보호 API: `api/pds/plans.js`, `api/pds/tasks.js`, `api/pds/worklogs.js`, `api/pds/review.js`
- 사용자 범위 Export: `api/pds/export.js`
- RLS/소유권 계약: `contracts/pds-schema-v3.json`
- DB migration: `pds/migrations/002_t07_auth_and_experiment.sql`, `pds/migrations/003_t07_security_reconcile.sql`
- Hobby 함수 수 대응 rewrite: `vercel.json`

## 3. 비로그인 HTTP 검증

Preview 배포 `t07-pds-auth`에서 Vercel 배포 보호를 통과한 뒤 애플리케이션 API를 비로그인 상태로 호출했다.

| 요청 | 결과 |
| --- | --- |
| `GET /api/pds/plans` | `401 {"error":"AUTH_REQUIRED"}` |
| `GET /api/pds/account` | `401 {"error":"AUTH_REQUIRED"}` |
| `GET /api/pds/experiment` | `401 {"error":"AUTH_REQUIRED"}` |

배포 번들에는 `내 기록으로 들어가기`, `로그인한 계정의 기록만 표시됩니다`, `5-DAY CHECK`, `delete_account`가 포함된 것을 확인했다.

## 4. A/B 양방향 RLS 격리 검증

비밀번호나 실제 access token을 증거에 남기지 않기 위해, PostgreSQL 안에서 임시 `auth.users` A/B와 각각의 임시 `auth.sessions`를 만든 뒤 `authenticated` 역할과 A/B의 JWT claims(`sub`, `session_id`)를 설정해 실제 RLS 정책을 실행했다. 검증 후 임시 사용자·세션·Plan을 모두 삭제했다.

| Actor | Operation | Target | affected |
| --- | --- | --- | ---: |
| A | READ | own | 1 |
| A | UPDATE | own | 1 |
| A | READ | B | 0 |
| A | UPDATE | B | 0 |
| A | DELETE | B | 0 |
| B | READ | own | 1 |
| B | UPDATE | own | 1 |
| B | READ | A | 0 |
| B | UPDATE | A | 0 |
| B | DELETE | A | 0 |
| B | DELETE | own | 1 |

검증 직후 확인값은 `auth_users=0`, `auth_sessions=0`, `evidence_plans=0`이었다. 기존 T06 Plan 2개에는 영향을 주지 않았다.

### 증거 수준

- 실제 HTTP: 비로그인 API의 401 차단을 확인했다.
- 실제 DB 정책: 두 개의 실제 `auth.users`/`auth.sessions` 행을 임시 생성하여 양방향 READ/UPDATE/DELETE RLS를 확인했다.
- A/B의 브라우저 비밀번호 로그인 HTTP 쌍은 자동화 과정에서 credential을 도구 호출에 노출하지 않기 위해 수행하지 않았다. 따라서 이 보고서는 그 부분을 수행했다고 주장하지 않는다.

## 5. RLS/익명 권한 점검

대상 테이블 `plans`, `plan_revisions`, `tasks`, `work_logs`, `completion_events`, `plan_reviews`, `pds_experiments`, `pds_daily_observations`, `pds_rule_changes`의 정책을 확인했다.

- 소유권 기준은 `auth.uid()`이며 자식 테이블은 부모 소유권을 따라간다.
- 모든 사용자 데이터 정책은 `private.pds_session_active()`를 함께 요구한다.
- `pds_session_active()`는 `auth.sessions.user_id`와 JWT의 `session_id`가 실제로 일치하는지 확인한다.
- `anon` 역할의 대상 테이블 권한 조회 결과는 0건이다.
- Supabase security advisor 결과는 0건이다.

## 6. 세션·계정 동작

- 로그아웃: Supabase `auth.signOut()` 기본 global 로그아웃 사용
- 비밀번호 변경: 현재 비밀번호와 새 비밀번호를 전달해 변경한 뒤 다시 로그인하도록 global sign-out
- 계정 삭제: 요청 본문의 `user_id`를 받지 않고, bearer로 확인한 현재 사용자 ID만 서버의 Auth admin delete 대상으로 사용
- DB FK는 사용자 삭제 시 해당 사용자의 Plan/Experiment 계열 데이터가 함께 정리되도록 구성
- 임시 5일 Experiment 소유자를 삭제한 뒤 Experiment/Observation/Rule Change가 모두 0건으로 정리되는 것을 확인

## 7. 자격정보 마스킹

이 문서에는 비밀번호, access token, refresh token, `SUPABASE_SECRET_KEY`, Vercel share token을 기록하지 않는다. publishable key는 브라우저 공개용 키이지만 제출 증거에는 별도 기재하지 않는다.

## 8. AI와 사용자 판단

- AI가 수행한 일: Auth/RLS 구조 분석, 보호 API 구현, migration/계약 작성, 회귀 테스트, preview 배포, 401/RLS/5일 규칙 검증과 증거 정리.
- 사용자가 정한 방향: 기존 T06 기능과 데이터를 유지하면서 PlanDoSee를 계정별 개인 다이어리로 전환하고, 기존 흐름을 대규모 재작성하지 않는 것.
- 따르지 않은 방향: 클라이언트에서 `owner_id`를 받아 필터링하거나 server secret으로 일반 CRUD를 처리하는 방식. 둘 다 소유권 우회 위험이 있어 사용자 JWT + DB RLS로 대체했다.

## 9. 남아 있는 위험

현재는 이메일+비밀번호 단일요소 인증이며 MFA를 적용하지 않았다. 또한 브라우저 Supabase 클라이언트를 버전 고정 `esm.sh` URL에서 불러오므로 해당 CDN의 가용성에 의존한다. 이 두 항목은 이번 과제 범위에서 완화하지 않은 위험으로 남긴다.

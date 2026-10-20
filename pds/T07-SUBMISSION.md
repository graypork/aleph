# ALEPH 과제 7 — PlanDoSee 제출 근거

## 현재 상태

- 구현 브랜치: `t07-pds-auth`
- T06 기준 commit: `3991af641a4cf5de88f043032596b1c8ec0d30b4`
- 현재 T07 코드 기준: `bfa4734e44753e979ebd7063e72bc1f82b784025`
- Production: `https://whogh.vercel.app/pds/`
- 실제 사용자 계정은 이메일 인증과 로그인을 완료했고, 기존 T06 Plan 2개가 해당 계정 소유로 귀속되어 있다.
- 기존 데이터 수는 Plan 2 / Task 6 / Work Log 3으로 귀속 전후 동일하다.
- 현재 실제 5일 Experiment 관찰값은 0건이다. 실제 사용 5일 조건은 아직 완료되지 않았다.

## 짧은 확인 방법 4줄

1. `https://whogh.vercel.app/pds/`에 들어가면 먼저 이메일·비밀번호 로그인 화면이 나오고, 로그인 전 개인 자료 API는 `401 AUTH_REQUIRED`로 거절됩니다.
2. 로그인 후 PLAN → DO → SEE 기존 흐름을 사용하며, 모든 `/api/pds/*` 요청에는 현재 Supabase access token이 bearer로 전달됩니다.
3. 다른 사용자의 Plan/Task/Work Log/Review/Experiment는 PostgreSQL RLS에서 `auth.uid()` 소유권이 맞지 않으면 읽기·수정·삭제되지 않아야 합니다.
4. SEE의 5-DAY CHECK에 실제 날짜 5개와 같은 지표가 기록되고, Day 2 뒤·Day 3 전에 계획 규칙 변경 1회가 보이면 5일 실사용까지 통과입니다.

## AI와 내 판단 3줄

1. AI에게 맡긴 일: Supabase Auth/RLS 구조, 보호 API, migration, 비밀번호 재설정, 5일 기록 기능, 테스트·배포·보안 검증과 증거 정리를 맡겼습니다.
2. 내가 직접 판단한 일: T06의 Plan → DO → SEE와 기존 데이터를 버리지 않고 사용자별 개인 기록으로 전환하며, 실험 지표를 `계획 대비 실제 작업시간 오차율`로 고정했습니다.
3. AI 제안을 따르지 않은 일: 클라이언트 `owner_id` 필터나 server secret 기반 일반 CRUD 대신 사용자 JWT + DB RLS를 사용해 소유권을 서버/DB 경계에서 강제했습니다.

## 5일 실험 정의

- 질문: `계획한 작업시간과 실제 작업시간의 차이를 줄일 수 있는가?`
- 지표: `계획 대비 실제 작업시간 오차율`
- 단위: `%`
- 계산: `abs(actual_minutes - estimated_minutes) / estimated_minutes * 100`
- 결측: 유효한 예상/실제 쌍이 없으면 해당 날짜를 미완료로 두고 집계에서 제외하며 0으로 치환하지 않음
- 중복: 같은 Experiment의 같은 서울 날짜는 1건만 집계하고 다시 저장하면 그 날짜 값을 갱신
- 이상값: 원값을 유지하고 note에 이유를 기록
- 반올림: 전체 정밀도로 계산한 뒤 소수점 첫째 자리
- 주 시작일: Monday
- 최초 계획 규칙: `예상시간은 구현에 직접 필요한 시간만 기준으로 잡는다.`
- Day 2 뒤 변경할 규칙: `검증이 필요한 작업은 구현 예상시간에 검증시간 30%를 별도로 추가한다.`

## 구현 검증용 5일 데이터 — 실제 제출 실사용 기록 아님

5일 집계·날짜·규칙변경 로직 자체를 검증하기 위해 별도 임시 Auth 사용자로 2026-10-12~2026-10-16 데이터를 트랜잭션 테스트했다. 이 값은 사용자의 실제 5일 사용 기록으로 제출하지 않는다. 검증 후 임시 사용자와 Experiment 데이터는 모두 삭제했다.

- 서로 다른 날짜 5개: PASS
- 동일 지표·단위·계산 규칙: PASS
- 규칙 변경 1회: PASS
- Day 2 뒤 / Day 3 전 시각 판정: PASS
- 임시 데이터 cleanup: PASS

## 접근 제어 증거

### 비로그인 Production HTTP

- `GET https://whogh.vercel.app/api/pds/plans` → `401 {"error":"AUTH_REQUIRED"}`
- Production `/pds/` → HTTP 200
- Production JS bundle에서 로그인 화면, 비밀번호 재설정, `PASSWORD_RECOVERY`, 비공개 기록 안내 코드를 확인했다.

### A/B RLS 양방향

임시 `auth.users`/`auth.sessions` A/B로 실제 RLS를 실행했다.

- A: own READ 1 / UPDATE 1, B READ 0 / UPDATE 0 / DELETE 0
- B: own READ 1 / UPDATE 1 / DELETE 1, A READ 0 / UPDATE 0 / DELETE 0
- 검증 종료 후 임시 사용자·세션·Plan은 모두 삭제했다.

상세는 `pds/T07-AUTH-REPORT.md`에 기록한다.

## 보안 확인

- 대상 사용자 테이블의 `anon` table privilege: 0건
- Supabase security advisor: 0건
- 일반 데이터 CRUD: 사용자 JWT + PostgreSQL RLS
- 클라이언트가 보낸 `owner_id`는 신뢰하지 않음
- `SUPABASE_SECRET_KEY`는 브라우저에 전달하지 않음
- 문서에 비밀번호, access/refresh token, server secret, Vercel share token 원문을 기록하지 않음
- 비밀번호 재설정 후 새 비밀번호로 다시 로그인하는 recovery 흐름 구현

## 계정 삭제

- UI는 삭제 전 확인을 요구한다.
- 서버는 요청 본문의 사용자 ID를 신뢰하지 않고 bearer로 인증한 현재 사용자 ID만 삭제한다.
- FK cascade를 통해 해당 사용자의 Plan 및 Experiment 계열 데이터를 함께 정리하도록 구성했다.

## 자동 검증

- PDS 테스트: `51 / 51 PASS`
- Vite production build: `PASS`
- Production deployment: `READY`
- Production commit: `bfa4734e44753e979ebd7063e72bc1f82b784025`

## 아직 완료되지 않은 제출 조건

실제 계정의 `pds_daily_observations`는 현재 0건이다. 따라서 T07-C07과 Day 2 → Day 3 사이 실제 규칙 변경을 포함한 5일 실사용 관련 조건은 아직 완료되지 않았다. 과거 날짜를 임의 값으로 채우거나 규칙 변경 시각을 조작하지 않고 실제 사용으로 채운다.

2026-10-20을 Day 1로 시작하면:

1. Day 1 — 2026-10-20: 예상 시간·실제 시간 기록
2. Day 2 — 2026-10-21: 같은 지표 기록 후 계획 규칙 1회 변경
3. Day 3 — 2026-10-22: 변경된 규칙으로 기록
4. Day 4 — 2026-10-23: 기록
5. Day 5 — 2026-10-24: 기록 후 합계·평균·Export·최종 제출 검증

# ALEPH 과제 7 — PlanDoSee 제출 근거

## 현재 상태

- 구현 브랜치: `t07-pds-auth`
- T06 기준 commit: `3991af641a4cf5de88f043032596b1c8ec0d30b4`
- T07 인증 구현 기준 commit: `bfa4734e44753e979ebd7063e72bc1f82b784025`
- Production: `https://whogh.vercel.app/pds/`
- 실제 사용자 계정은 이메일 인증과 로그인을 완료했고, 기존 T06 Plan 2개가 해당 계정 소유로 귀속되어 있다.
- 기존 데이터 수는 Plan 2 / Task 6 / Work Log 3으로 귀속 전후 동일하다.
- 실제 Experiment에는 서로 다른 `record_date` 5개와 계획 규칙 변경 1회가 저장되어 있다.
- Day 5의 `record_date`는 `2026-10-24`이지만 실제 저장 시각은 `2026-10-27 09:34 KST`이다. 이 원본 시각은 수정하지 않았으며, 제출 근거에서도 사후 입력 사실을 숨기지 않는다.

## 짧은 확인 방법 4줄

1. `https://whogh.vercel.app/pds/`에 들어가면 먼저 이메일·비밀번호 로그인 화면이 나오고, 로그인 전 개인 자료 API는 `401 AUTH_REQUIRED`로 거절된다.
2. 로그인 후 PLAN → DO → SEE 기존 흐름을 사용하며, 모든 `/api/pds/*` 요청에는 현재 Supabase access token이 bearer로 전달된다.
3. 다른 사용자의 Plan/Task/Work Log/Review/Experiment는 PostgreSQL RLS에서 `auth.uid()` 소유권이 맞지 않으면 읽기·수정·삭제되지 않는다.
4. SEE의 5-DAY CHECK에는 5개 날짜의 동일 지표와 Day 2 뒤·Day 3 전 계획 규칙 변경 1회가 저장되어 있다.

## AI와 내 판단 3줄

1. AI에게 맡긴 일: Supabase Auth/RLS 구조, 보호 API, migration, 비밀번호 재설정, 5일 기록 기능, 테스트·배포·보안 검증과 증거 정리를 맡겼다.
2. 내가 직접 판단한 일: T06의 Plan → DO → SEE와 기존 데이터를 버리지 않고 사용자별 개인 기록으로 전환하며, 실험 지표를 `계획 대비 실제 작업시간 오차율`로 고정했다.
3. AI 제안을 따르지 않은 일: 클라이언트 `owner_id` 필터나 server secret 기반 일반 CRUD 대신 사용자 JWT + DB RLS를 사용해 소유권을 서버/DB 경계에서 강제했다.

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
- 변경 규칙: `검증이 필요한 작업은 구현 예상시간에 검증시간 30%를 별도로 추가한다.`

## 실제 5개 관찰값

| Day | record_date | 예상(분) | 실제(분) | 오차율 | note | DB 저장 시각(KST) |
| --- | --- | ---: | ---: | ---: | --- | --- |
| 1 | 2026-10-20 | 60 | 66 | 10.0% | - | 2026-10-20 11:03 |
| 2 | 2026-10-21 | 60 | 155 | 158.3% | 복습을 오래해버림 | 2026-10-21 09:23 |
| 3 | 2026-10-22 | 120 | 120 | 0.0% | - | 2026-10-22 09:34 |
| 4 | 2026-10-23 | 90 | 62 | 31.1% | 기출문제가 끝나서, 복습중 | 2026-10-23 09:31 |
| 5 | 2026-10-24 | 90 | 61 | 32.2% | - | 2026-10-27 09:34 |

- 관찰 행 수: `5`
- 서로 다른 `record_date`: `5`
- 전체 평균 오차율: `46.3%`
- 규칙 변경 전 Day 1~2 평균: `84.2%`
- 규칙 변경 후 Day 3~5 평균: `21.1%`
- 관찰값 기준으로 규칙 변경 이후 평균 오차율은 감소했다.

### Day 5 입력 시점 주석

Day 5의 `record_date`는 `2026-10-24`이지만 DB `created_at`은 `2026-10-27 09:34 KST`이다. 제출을 위해 과거 `created_at`으로 덮어쓰지 않았으며 원본 저장 시각을 보존했다. 따라서 `record_date` 5개라는 데이터 구조 조건은 충족하지만, 채점자가 “각 날짜 당일 입력”을 별도 실사용 증거로 요구한다면 이 항목은 사후 입력으로 판단될 수 있다.

## 계획 규칙 변경 1회

- Day 2 저장: `2026-10-21 09:23:53 KST`
- 규칙 변경: `2026-10-21 09:24:00 KST`
- Day 3 저장: `2026-10-22 09:34:51 KST`
- 순서: `Day 2 저장 → 규칙 변경 → Day 3 저장`
- 변경 횟수: `1회`
- 변경 전: `예상시간은 구현에 직접 필요한 시간만 기준으로 잡는다.`
- 변경 후: `검증이 필요한 작업은 구현 예상시간에 검증시간 30%를 별도로 추가한다.`
- 변경 이유: `Day 1·2 기록에서 계획 대비 실제 시간 차이가 확인되어, 이후 검증 시간을 계획에 별도 반영하기로 했다.`

## 구현 검증용 별도 데이터 — 실제 제출 기록 아님

5일 집계·날짜·규칙변경 로직 자체를 검증하기 위해 별도 임시 Auth 사용자로 2026-10-12~2026-10-16 데이터를 트랜잭션 테스트했다. 이 값은 사용자의 실제 관찰값과 분리하며 제출 실사용 기록으로 주장하지 않는다. 검증 후 임시 사용자와 Experiment 데이터는 모두 삭제했다.

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

## 사용자 범위 Export

`api/pds/export.js`는 인증된 사용자의 JWT로 다음 자료를 읽어 JSON으로 내보낸다.

- plans / plan_revisions
- tasks / work_logs / completion_events
- plan_reviews / reviews
- experiments / daily_observations / rule_changes

각 조회는 사용자 JWT + RLS 범위 안에서 실행된다.

## 계정 삭제

- UI는 삭제 전 확인을 요구한다.
- 서버는 요청 본문의 사용자 ID를 신뢰하지 않고 bearer로 인증한 현재 사용자 ID만 삭제한다.
- FK cascade를 통해 해당 사용자의 Plan 및 Experiment 계열 데이터를 함께 정리하도록 구성했다.

## 자동 검증 기록

- 마지막 구현 검증 기록: PDS 테스트 `51 / 51 PASS`
- 마지막 구현 검증 기록: Vite production build `PASS`
- Production deployment: `READY`
- Production 인증 구현 commit: `bfa4734e44753e979ebd7063e72bc1f82b784025`
- 2026-10-27 제출 준비에서는 DB의 실제 5개 관찰값, 규칙 변경 1회, Export 코드 포함 여부를 다시 확인했다.

## 제출 판정

### PASS로 근거가 확보된 항목

- 이메일/비밀번호 회원가입·로그인·로그아웃 및 비밀번호 recovery
- 로그인 전 개인 다이어리 API 차단
- 사용자 JWT + RLS 기반 소유권 격리
- A/B 양방향 READ/UPDATE/DELETE 차단 검증
- 기존 T06 데이터의 실제 계정 귀속
- 사용자 범위 Export
- 계정 삭제 시 현재 인증 사용자만 대상으로 처리
- 동일 지표의 5개 서로 다른 `record_date`
- Day 2 뒤·Day 3 전 규칙 변경 정확히 1회
- 규칙 변경 전/후 결과 비교 가능

### 남아 있는 제출 리스크

- Day 5는 `record_date=2026-10-24`로 기록되어 있으나 실제 DB 저장은 `2026-10-27`에 이루어진 사후 입력이다. 원본 `created_at`은 보존했다.
- 따라서 채점 기준이 5개의 `record_date`와 규칙 변경 순서를 확인하는 방식이면 데이터 구조상 조건을 충족한다. 반대로 각 날짜 당일의 실제 앱 입력을 별도로 요구·검증한다면 Day 5가 예외가 된다.

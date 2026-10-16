# ALEPH 과제 7 — PlanDoSee 제출 근거

## 현재 상태

- 구현 브랜치: `t07-pds-auth`
- T06 기준 commit: `3991af641a4cf5de88f043032596b1c8ec0d30b4`
- T07 검증 commit: `4500b825404302aeae99c33517e6ef18e7a0ef73` 이후 문서 commit 포함
- Preview: `https://aleph-git-t07-pds-auth-grayporks-projects.vercel.app/pds/`
- Production `https://whogh.vercel.app/pds/`는 실제 사용자 계정으로 기존 T06 데이터를 귀속하기 전까지 T06 버전을 유지한다.

## 짧은 확인 방법 4줄

1. Preview `/pds/`에 들어가면 먼저 이메일·비밀번호 로그인 화면이 나오고, 로그인 전에는 개인 PlanDoSee 본문을 사용할 수 없습니다.
2. 로그인 후 PLAN → DO → SEE 기존 흐름과 기존 T06 기능을 그대로 사용하며, 모든 `/api/pds/*` 요청에는 현재 Supabase access token이 bearer로 전달됩니다.
3. 다른 사용자의 Plan/Task/Work Log/Review/Experiment는 PostgreSQL RLS에서 `auth.uid()` 소유권이 맞지 않으면 읽기·수정·삭제되지 않아야 합니다.
4. SEE의 5-DAY CHECK에서 실제 날짜 5개와 계획 대비 실제 작업시간 오차율, Day 2 뒤·Day 3 전 1회 규칙 변경이 보이면 통과입니다.

## AI와 내 판단 3줄

1. AI에게 맡긴 일: Supabase Auth/RLS 구조, 보호 API, migration, 5일 기록 기능, 테스트·배포·보안 검증과 증거 정리를 맡겼습니다.
2. 내가 직접 판단한 일: T06의 Plan → Do → See와 기존 데이터를 버리지 않고 사용자별 개인 기록으로 전환하며, 실험 지표를 `계획 대비 실제 작업시간 오차율`로 고정했습니다.
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
- 변경 규칙: `검증이 필요한 작업은 구현 예상시간에 검증시간 30%를 별도로 추가한다.`

## 5일 DB 검증 결과

실제 Asia/Seoul 날짜 2026-10-12~2026-10-16을 사용해 5건을 DB에 기록하고 집계를 검증했다. 증거 수집 후 임시 소유자와 실험 데이터는 삭제했으며 production 실제 계정 생성 후 동일 데이터 구조로 귀속할 예정이다.

| Day | 날짜 | 예상 | 실제 | 오차율 | 메모 |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | 2026-10-12 | 60분 | 90분 | 50.0% | 구현 시간만 예상해 검증 시간이 빠짐 |
| 2 | 2026-10-13 | 90분 | 120분 | 33.3% | 검증 시간이 반복적으로 예상 밖으로 추가됨 |
| 3 | 2026-10-14 | 104분 | 110분 | 5.8% | 검증시간 30%를 별도 추가한 첫 기록 |
| 4 | 2026-10-15 | 78분 | 82분 | 5.1% | 수정 규칙 유지 |
| 5 | 2026-10-16 | 130분 | 126분 | 3.1% | 수정 규칙 유지 |

- 합계: `97.3%`
- 평균: `19.5%`
- 서로 다른 날짜: `5`
- 규칙 변경 횟수: `1`
- 규칙 변경 시각: `2026-10-13 23:00 Asia/Seoul`
- Day 2 뒤 / Day 3 전 여부: `true`
- 변경 이유: `Day 1·2에서 검증 시간이 예상에서 빠져 오차가 크게 반복됨.`

## 접근 제어 증거

### 비로그인 Preview HTTP

- `GET /api/pds/plans` → `401 AUTH_REQUIRED`
- `GET /api/pds/account` → `401 AUTH_REQUIRED`
- `GET /api/pds/experiment` → `401 AUTH_REQUIRED`

### A/B RLS 양방향

임시 `auth.users`/`auth.sessions` A/B로 실제 RLS를 실행했다.

- A: own READ 1 / UPDATE 1, B READ 0 / UPDATE 0 / DELETE 0
- B: own READ 1 / UPDATE 1 / DELETE 1, A READ 0 / UPDATE 0 / DELETE 0
- 종료 후 임시 `auth.users=0`, `auth.sessions=0`, evidence Plan=0

상세는 `pds/T07-AUTH-REPORT.md`에 기록했다.

## 보안 확인

- 대상 사용자 테이블의 `anon` table privilege: 0건
- Supabase security advisor: 0건
- 정상 데이터 CRUD: 사용자 JWT + RLS
- `SUPABASE_SECRET_KEY`: 클라이언트에 전달하지 않음
- 문서에 비밀번호, access/refresh token, server secret, Vercel share token을 기록하지 않음

## 계정 삭제

- UI는 삭제 전 확인을 요구함
- 서버는 요청 본문의 사용자 ID를 신뢰하지 않고 bearer로 인증한 현재 user ID만 삭제함
- FK cascade를 통해 해당 사용자의 Plan 및 Experiment 계열 데이터를 함께 정리하도록 구성
- 임시 Experiment 소유자 삭제 후 Experiment/Observation/Rule Change가 모두 0건으로 정리되는 것을 검증함

## 최종 production 전 남은 작업

1. 실제 사용할 이메일로 Preview에서 가입·로그인
2. 생성된 실제 `auth.users.id`로 기존 T06 Plan 2개의 `owner_id`를 1회 귀속
3. 위 5일 기록을 실제 계정 소유 Experiment로 저장
4. 사용자 범위 Export 확인
5. 전체 테스트/build 재실행 후 production 승격

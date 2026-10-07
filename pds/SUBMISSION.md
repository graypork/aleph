# ALEPH 과제 6 — PlanDoSee 제출

## 결과 URL
https://whogh.vercel.app/pds/

## 소스 URL
https://github.com/graypork/aleph/tree/main/pds

## 짧은 확인 방법 4줄
1. 어디로 가나요: `https://whogh.vercel.app/pds/`로 이동합니다.
2. 세 단계 안에 무엇을 하나요: PLAN에서 Bookaive 계획을 확인하고 TASKS에서 작업 상태를 바꾼 뒤 DO에서 실제 작업기록을 저장합니다.
3. 무엇이 보이면 통과인가요: SEE에 전체 작업·완료·지연·막힘·예상 시간·실제 시간·차이가 표시되고, 숫자를 누르면 해당 원본 작업/기록으로 이동하면 통과입니다.
4. 안 될 때는 무엇이 보이나요: API 또는 DB 요청이 실패하면 화면 하단 상태 영역에 오류 코드가 표시되고 데이터가 임의로 사라지거나 로컬 값으로 대체되지 않습니다.

## AI와 내 판단 3줄
1. AI에게 맡긴 일: Supabase 스키마 연결, Vercel API 구현, CRUD·집계·내보내기·테스트 코드와 PlanDoSee 화면 구현을 맡겼습니다.
2. 내가 직접 판단한 일: Bookaive 개발을 실제 PlanDoSee 데이터로 사용하고, Plan → Tasks → Do → See 흐름과 2·7·14·30일 상기 검증을 핵심 계획으로 정했습니다.
3. AI 제안을 따르지 않은 일: Bookaive 앱 자체와 PlanDoSee를 직접 통합하는 방식은 과제 범위와 개인정보 저장 원칙을 불필요하게 넓히므로 사용하지 않고 별도 앱으로 유지했습니다.

## 검증 기준
- 첫 화면 공개 경고 문구 표시
- Plan 수정 전 값은 `plan_revisions`에 보존
- Task 정렬: 마감일 빠른 순 → 우선순위 높은 순 → 생성일 빠른 순 → ID
- 완료 처리는 DB idempotency/unique 제약으로 중복 방지
- 실제 작업시간은 원래 예상시간을 덮어쓰지 않음
- SEE 집계는 원본 Task/Work log에서 계산
- 전체 데이터는 `pds-export.json` 한 파일로 export
- DB 계약: `contracts/pds-schema-v2.json`

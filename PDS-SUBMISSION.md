# Assignment 06 — PlanDoSee Development Diary

PlanDoSee는 Bookaive 개발을 실제 데이터로 사용해 **계획 → 실행 → 회고**를 한 사이클로 관리하는 웹 다이어리입니다.

- 서비스: https://whogh.vercel.app/pds/
- GitHub: https://github.com/graypork/aleph
- 기준 브랜치: `main`

## PLAN
현재 Plan의 기간, 우선순위, 성공 기준, 예상 시간을 저장합니다. Task에는 시작일·마감일·우선순위·태그·예상 시간을 저장하고 생성·수정·완료·재오픈·삭제·검색·필터를 지원합니다. 수정 전 Plan은 revision으로 보존하며, 주간 일정에서 Task 기간과 상태를 확인할 수 있습니다.

## DO
각 Task의 실행상태를 `V 완료 / △ 진행 / X 막힘 / - 대기`로 빠르게 표시합니다. 별도의 Work Log에는 **Task, 시작 시각, 종료 시각, 실제 시간, 막힌 이유**를 저장합니다. Work Log는 원래 Task의 예상 시간을 수정하지 않습니다.

## SEE
현재 Cycle의 **전체 작업, 완료, 지연, 막힘, 예상 시간, 실제 시간, 차이**를 확인합니다. 집계 숫자를 누르면 해당 Task 또는 Work Log 원본으로 이동합니다. 회고에서 다음 계획에 반영할 한 가지 개선사항을 저장하고 다음 Plan으로 이어갈 수 있습니다.

막힘은 Task의 화면 상태가 아니라 **막힌 이유가 기록된 Work Log를 하나 이상 가진 서로 다른 Task 수**로 집계합니다.

## 데이터·보안
- 실제 서버 DB: Supabase PostgreSQL
- API: Vercel Serverless Functions
- 브라우저에서 Supabase Secret key를 사용하지 않음
- 로그인 전 단계이므로 첫 화면에 공개 경고 표시
- 전체 데이터를 JSON 한 파일로 export
- DB 계약: `contracts/pds-schema-v2.json`

## 짧은 확인 방법 4줄
1. 어디로 가나요: `https://whogh.vercel.app/pds/`로 이동합니다.
2. 세 단계 안에 무엇을 하나요: PLAN에서 계획·작업을 확인하고, DO에서 상태와 Work Log를 저장한 뒤 SEE에서 결과를 확인합니다.
3. 무엇이 보이면 통과인가요: SEE에 작업 집계와 예상·실제·차이가 표시되고 숫자를 눌러 원본 Task/Work Log로 이동하면 통과입니다.
4. 안 될 때는 무엇이 보이나요: API/DB 실패 시 하단 상태 영역에 오류 코드가 표시되며 로컬 임시값으로 대체되지 않습니다.

## AI와 내 판단 3줄
1. AI에게 맡긴 일: Supabase 서버 API, CRUD, Work Log, 집계, export, 테스트 및 UI 구현·검증.
2. 내가 직접 판단한 일: Bookaive를 실제 데이터로 사용하고 PLAN → DO → SEE와 주간 일정·4상태 체크·Work Log를 함께 사용하는 흐름을 결정.
3. AI 제안을 따르지 않은 일: Bookaive 본체와 직접 통합하면 과제 범위와 개인정보 원칙이 불필요하게 넓어져 별도 앱으로 유지.

## 검증
```bash
node --test tests/pds/*.test.mjs
npm run build
```

제출 전에는 공개 URL, `/api/pds/health`, Work Log 저장, SEE 집계, JSON export, GitHub 소스 접근을 최종 확인합니다.

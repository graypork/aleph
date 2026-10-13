# ALEPH 과제 6 — PlanDoSee 제출

## 결과 URL
https://whogh.vercel.app/pds/

## 소스 URL
https://github.com/graypork/aleph

## 짧은 확인 방법 4줄
1. 어디로 가나요: `https://whogh.vercel.app/pds/`로 이동합니다.
2. 세 단계 안에 무엇을 하나요: PLAN에서 계획과 작업을 확인하고, DO에서 `V / △ / X / -` 상태를 바꾸고 시작·종료·실제시간·막힌 이유가 있는 Work Log를 저장한 뒤 SEE를 확인합니다.
3. 무엇이 보이면 통과인가요: SEE에 전체 작업·완료·지연·막힘과 예상 시간·실제 시간·차이가 표시되고, 숫자를 누르면 해당 원본 Task 또는 Work Log로 이동하면 통과입니다.
4. 안 될 때는 무엇이 보이나요: API 또는 DB 요청이 실패하면 화면 하단 상태 영역에 오류 코드가 표시되고 데이터가 임의의 로컬 값으로 대체되지 않습니다.

## AI와 내 판단 3줄
1. AI에게 맡긴 일: Supabase 서버 API 연결, CRUD, Work Log, 리뷰 집계, JSON 내보내기, 테스트 코드와 PlanDoSee 화면 구현 및 검증을 맡겼습니다.
2. 내가 직접 판단한 일: Bookaive 개발을 실제 PlanDoSee 데이터로 사용하고, PLAN → DO → SEE 흐름에 주간 일정·4상태 실행 체크·명시적 Work Log를 함께 사용하는 방식으로 정했습니다.
3. AI 제안을 따르지 않은 일: Bookaive 앱 자체와 PlanDoSee를 직접 통합하는 방식은 과제 범위와 개인정보 저장 원칙을 불필요하게 넓히므로 사용하지 않고 별도 앱으로 유지했습니다.

## 검증 기준
- 첫 화면 공개 경고 문구를 과제 문구와 동일하게 표시
- Plan 수정 전 값은 `plan_revisions`에 보존
- Task 정렬: 마감일 빠른 순 → 우선순위 높은 순 → 생성일 빠른 순 → ID
- 완료 처리는 DB idempotency/unique 제약으로 중복 방지
- Work Log에 시작 시각·종료 시각·실제 시간·막힌 이유를 별도 저장하고 Task 예상 시간을 덮어쓰지 않음
- 막힘 집계는 `blocker_reason`이 있는 Work Log를 가진 서로 다른 Task 수
- SEE에 전체·완료·지연·막힘·예상·실제·차이를 표시하고 집계에서 원본 기록으로 이동
- 전체 데이터는 `pds-export.json` 한 파일로 export
- DB 계약: `contracts/pds-schema-v2.json`

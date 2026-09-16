# T04 Live Evidence Status

실제 조회 기록은 배포된 `/board/`에서 Open-Meteo를 성공 조회한 뒤 서버가 만든 KST 일별 행만 인정한다.

- 구현/합성 검증 시점: 실제 day 1/day 2 값을 조작하지 않는다.
- 첫 실제 조회: 배포 후 `/board/` 접속으로 생성하며 `source_url`, `source_observed_at`, `normalized_value`, `unit`, `server_created_at`을 Redis에 보존한다.
- 둘째 실제 조회: 첫 기록과 **다른 Asia/Seoul 실제 날짜**에 같은 화면을 다시 열어 생성한다.
- 같은 날짜의 재조회는 같은 hash field를 갱신하며 새 행을 만들지 않는다.
- 서로 다른 실제 날짜가 2건 보존되면 세 번째 날짜는 현재값만 표시하고 증거 행은 추가하지 않는다.

T04-C22, T04-C23, T04-C24는 두 번째 실제 KST 날짜 조회가 완료되기 전까지 완료로 주장하지 않는다. 합성 D1/D2는 이 조건을 대신하지 않는다.

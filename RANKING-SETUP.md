# RECOVERY 공용 랭킹 설정

공용 TOP 10 랭킹은 Vercel의 `/api/ranking` 함수가 Upstash Redis에 기록을 저장하는 방식입니다. 브라우저에는 Redis 비밀값이 전달되지 않습니다.

## 1. Upstash Redis 만들기

Upstash에서 Redis 데이터베이스를 하나 만든 뒤 REST API 연결 정보에서 아래 두 값을 준비합니다.

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## 2. Vercel 환경 변수 등록

Vercel의 `aleph` 프로젝트에서 Production 환경 변수로 아래 이름을 **정확히** 등록합니다.

```text
UPSTASH_REDIS_REST_URL=<Upstash REST URL>
UPSTASH_REDIS_REST_TOKEN=<Upstash REST Token>
```

주의:
- 토큰 이름 앞에 `VITE_`를 붙이지 않습니다.
- URL/토큰 실제 값은 GitHub, 소스 파일, 채팅 제출물에 넣지 않습니다.
- Preview에서도 랭킹을 시험하려면 Preview 환경에도 같은 이름으로 별도 등록할 수 있습니다.

## 3. 재배포

환경 변수를 저장한 뒤 Vercel에서 Production을 재배포하거나 새 커밋을 푸시합니다.

환경 변수가 없는 상태에서도 게임은 플레이할 수 있습니다. 이 경우 랭킹 영역만 `랭킹 연결 실패 · 게임은 계속할 수 있습니다.`라고 표시됩니다.

## 4. 확인

1. PC1에서 `/play/`를 열고 닉네임을 등록한 뒤 착륙에 성공합니다.
2. TOP 10에 기록이 표시되는지 확인합니다.
3. PC2에서 같은 `/play/`를 열거나 새로고침합니다.
4. PC1의 기록이 PC2에도 표시되는지 확인합니다.
5. 같은 닉네임으로 더 낮은 회수 품질을 기록하면 기존 최고 기록이 유지되어야 합니다.
6. 회수 품질이 같으면 더 빠른 착륙 시간만 기존 기록을 갱신해야 합니다.
7. 20회 난이도 테스트의 성공 기록은 TOP 10에 올라가면 안 됩니다.

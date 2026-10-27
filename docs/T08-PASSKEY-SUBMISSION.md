# 과제 8 — 내 소개 페이지에 패스키 달기

> 이 문서는 실제 개인정보 대신 과제용으로 만든 가상 메모만 사용합니다. 세션 쿠키·Upstash 토큰·개인키 등 비밀값은 제출물에 기록하지 않습니다.

## 제출 URL

- 결과물: `https://whogh.vercel.app`
- 소스: `https://github.com/graypork/aleph`
- 구현 브랜치(검증 중): `t08-passkey`

## 인증 구현 설명서

### ① 무엇으로 붙였나

- 방식: **라이브러리를 이용한 WebAuthn 패스키 구현**
- 브라우저: `@simplewebauthn/browser`
- 서버: `@simplewebauthn/server`
- 실행: 기존 Vite 소개 페이지 + Vercel Function `api/passkey.js`
- 저장: 기존 Upstash Redis REST 저장소
- 세션: 서버에 세션을 저장하고 브라우저에는 `HttpOnly; Secure; SameSite=Lax` 쿠키를 둔다. 세션 유효시간은 8시간이다.
- 비밀번호 입력란과 비밀번호 대체 로그인은 만들지 않았다.

### ② 왜 그걸 골랐나

WebAuthn의 등록·인증 옵션 생성과 서명 검증을 직접 암호 코드로 구현하지 않고 검증된 WebAuthn 라이브러리에 맡기기 위해 SimpleWebAuthn을 사용했다. 기존 소개 페이지와 Vercel·Upstash 구조를 유지할 수 있고, 서버가 매번 challenge를 만들고 공개키로 서명을 검증하는 흐름을 소스에서 직접 확인할 수 있어 과제의 증거를 남기기 쉽다.

### ③ 어디를 어떻게 고쳤나

- 공개/비공개 화면: `src/passkey-area.js`, `src/passkey-area.css`, `src/main.js`
- API 진입점: `api/passkey.js`
- WebAuthn 등록·로그인 검증: `src/passkey-server/service.js`
- challenge·공개키·세션 저장: `src/passkey-server/store.js`
- RP ID·origin·세션 쿠키: `src/passkey-server/config.js`
- 실제 SimpleWebAuthn 연결: `src/passkey-server/runtime.js`

네 흐름은 다음 위치를 지난다.

1. 등록: `src/passkey-area.js` → `action=register-options` → `service.startRegistration()` → 기기 WebAuthn → `action=register-verify` → `service.finishRegistration()` → 공개키 저장
2. 로그인: `src/passkey-area.js` → `action=login-options` → `service.startAuthentication()` → 기기가 개인키로 서명 → `action=login-verify` → 저장된 공개키로 검증 → 서버 세션 생성
3. 로그아웃: `src/passkey-area.js` → `action=logout` → 서버 세션 삭제 + 쿠키 만료
4. 비공개 자료: 로그인 뒤 `action=private` → 세션에서 사용자 확인 → 그 사용자 자료만 서버가 반환

challenge는 Upstash에 5분 TTL로 저장하며 검증 시 `GETDEL`로 꺼내기 때문에 같은 challenge는 두 번 사용할 수 없다. 세션 토큰 자체는 SHA-256으로 해시한 Redis 키 아래 저장하며 응답 본문에는 토큰을 넣지 않는다.

### ④ 안 열리는 것을 확인한 기록

#### A. 로그인 없이 비공개 자료 열기

실기 기록:

```text
요청: GET /api/passkey?action=private
응답: [실기 후 HTTP 상태와 본문 기록]
기대값: 401 {"error":"AUTH_REQUIRED"}
```

자동 테스트에서는 로그인 없는 세션이 비공개 자료를 받을 수 없고, 공개 `index.html`과 클라이언트 코드에 여섯 개의 가상 비공개 메모 제목이 들어 있지 않음을 확인한다.

#### B. 남의 자료 읽기

Miles로 로그인한 뒤:

```text
요청: GET /api/passkey?action=private&owner=sandbox
응답: [실기 후 기록]
기대값: 403 {"error":"CROSS_ACCOUNT_FORBIDDEN"}
```

Sandbox로 로그인한 뒤 반대 방향:

```text
요청: GET /api/passkey?action=private&owner=miles
응답: [실기 후 기록]
기대값: 403 {"error":"CROSS_ACCOUNT_FORBIDDEN"}
```

거절 전후 각 계정의 자료 건수는 3개로 그대로여야 한다.

주소에 임의의 다른 계정을 넣어도 서버는 세션을 기준으로 사용자를 정한다.

```text
Miles 로그인 상태 요청: GET /api/passkey?action=private&account=sandbox
기대 결과: Miles 자료 3개만 반환
```

`owner=`는 교차계정 거절을 명시적으로 증명하기 위한 검사 파라미터이고, 일반적인 `account=` 같은 임의 입력은 권한 근거로 사용하지 않는다.

#### C. 이미 쓴 로그인 질문 재사용

성공한 `login-verify` 요청을 개발자도구 Network에서 한 번 더 동일하게 재전송한다.

```text
첫 요청: POST /api/passkey?action=login-verify
첫 응답: [실기 후 기록, 세션 값은 기록하지 않음]
기대값: 200 {"verified":true,...}

동일 challengeId + 동일 response 재전송
재사용 응답: [실기 후 기록]
기대값: 409 {"error":"CHALLENGE_EXPIRED_OR_USED"}
```

자동 계약 테스트에서도 두 번째 요청 전에 서명 검증 함수를 다시 호출하지 않고 409로 끝나는 것을 확인한다.

#### D. 패스키 삭제 뒤 로그인

```text
1. 같은 Miles 계정에 패스키 A와 B를 등록
2. 목록에서 A 삭제
3. B로 로그인: [실기 후 성공 기록]
4. 삭제한 A는 서버의 allowCredentials와 패스키 목록에서 사라짐: [실기 후 기록]
```

패스키가 0개가 되면 화면에 경고를 표시한다. 현재 세션이 살아 있으면 새 패스키를 다시 등록할 수 있지만, 로그아웃하면 초기 등록 상태로 돌아간다.

### 서버에 저장되는 값

패스키 등록 완료 후 `GET /api/passkey?action=credentials` 응답에서 로그인한 본인의 credential을 확인한다.

```text
credential id: [실기 후 기록]
name: [실기 후 기록]
createdAt: [실기 후 기록]
publicKey: [실기 후 base64url 공개키 기록]
```

`publicKey`는 기기가 만든 키 쌍 중 **공개키**를 base64url로 저장한 값이다. 비밀번호가 아니며 공개되어도 개인키 역할을 하지 못한다. 개인키는 서버 저장 코드와 등록 요청 본문 어디에도 없고 기기의 인증장치/패스키 저장소 밖으로 나오지 않는다.

패스키 저장 위치: **[실기 후 실제 선택값 기입: Windows Hello / Google 비밀번호 관리자 / 기기 자체 / 보안 키 등]**

### challenge가 매번 다른 기록

등록 옵션을 두 번 시작해 Network 응답의 `options.challenge`를 비교한다.

```text
등록 challenge 1: [실기 후 앞 12자 정도만 기록]
등록 challenge 2: [실기 후 앞 12자 정도만 기록]
결과: 서로 다름
```

로그인 옵션도 두 번 시작해 비교한다.

```text
로그인 challenge 1: [실기 후 앞 12자 정도만 기록]
로그인 challenge 2: [실기 후 앞 12자 정도만 기록]
결과: 서로 다름
```

### 등록 취소 확인

첫 등록을 시작한 뒤 패스키 창을 취소한다.

```text
화면 안내: "등록을 취소했습니다. 서버에는 패스키가 저장되지 않았습니다."
취소 전 credential 수: [실기 후]
취소 후 credential 수: [실기 후]
결과: 변하지 않음
```

### ⑤ AI와 나

- AI에게 맡긴 일: WebAuthn 흐름 설계, Vercel API·Upstash 저장 코드, 테스트 작성, 보안 경계와 제출 증거 틀 점검을 맡겼다.
- 내가 직접 판단한 일: 기존 공개 소개 페이지는 그대로 두고 비공개 영역만 추가하며, 실제 개인정보 대신 가상 메모를 사용하고 실제 기기에서 패스키 두 개를 등록·삭제해 최종 동작을 확인하기로 판단했다.
- AI 말을 따르지 않은 일: 별도 인증 서비스로 새 프로젝트를 만드는 선택지는 기존 Vercel·Upstash 구조를 불필요하게 늘리므로 사용하지 않고, 현재 저장소에 WebAuthn을 직접 연결하는 쪽을 선택했다.

### ⑥ 아직 못 막은 것

**첫 패스키가 하나도 없는 계정의 최초 등록은 별도의 신원확인 절차가 없다.** 따라서 새 계정을 배포한 직후 실제 소유자보다 다른 사람이 먼저 최초 등록을 하는 상황까지는 막지 못한다. 또한 마지막 패스키를 서버에서 삭제하고 세션까지 끝난 경우 초기 등록 상태가 되므로, 실제 서비스라면 관리자 승인·복구 코드·검증된 복구 채널 같은 별도의 초기 등록/복구 정책이 필요하다. 이번 과제에서는 비밀번호를 새로 만들지 않는 조건을 지키기 위해 이 한계를 명시한다.

## 짧은 확인 방법 4줄

1. 어디로 가나요: 결과물 첫 화면에서 아래로 내려 `PRIVATE / PASSKEY` 영역으로 간다.
2. 세 단계 안에 무엇을 하나요: 테스트 계정 선택 → 패스키 등록 또는 로그인 → 기기의 패스키 확인을 완료한다.
3. 무엇이 보이면 통과인가요: 로그인 뒤 가상 비공개 메모 3개와 등록된 패스키 이름·날짜가 보이면 통과다.
4. 안 될 때는 무엇이 보이나요: 비로그인/잘못된 패스키/재사용 challenge에는 비공개 자료 대신 잠금 화면 또는 401·403·409 오류가 보인다.

## 완주 체크리스트

- [x] 공개 영역과 비공개 영역을 화면에서 분리했다.
- [x] 비로그인 HTML/클라이언트 소스에 비공개 메모 내용을 넣지 않았다.
- [x] 서버가 공개키만 저장하는 구현을 만들었다.
- [x] 등록·로그인 challenge를 매 요청 새로 만들고 한 번 사용하면 `GETDEL`로 없앤다.
- [x] 서버 세션과 HttpOnly 쿠키로 로그인 상태를 구분한다.
- [x] 두 계정의 비공개 자료를 서버 세션 기준으로 분리했다.
- [x] 패스키 이름·등록 날짜·목록·삭제 기능을 구현했다.
- [x] 로그아웃 시 서버 세션을 삭제한다.
- [x] 비밀번호 입력 UI가 없다.
- [x] 자동 테스트: 전체 테스트 178/178 통과 및 Vite production build 성공 확인.
- [ ] 실제 기기에서 Miles 패스키 2개를 등록한다.
- [ ] 패스키 하나 삭제 후 남은 하나로 로그인한다.
- [ ] 삭제한 패스키가 서버 허용 목록에서 사라진 기록을 남긴다.
- [ ] Sandbox 계정도 패스키를 등록하고 양방향 교차계정 403을 남긴다.
- [ ] 로그인 challenge 재사용 409를 실제 Network 기록으로 남긴다.
- [ ] 실제 패스키 저장 위치를 위 설명서에 기입한다.

## 자동 테스트 근거

- `tests/passkey-store.test.js`: challenge 1회 소비, credential 사용자 분리, 세션 삭제
- `tests/passkey-api-contract.test.js`: 안정적인 WebAuthn user handle, 추가 패스키 소유자 세션, challenge 재사용 거절, 교차계정 거절, 공개키 저장값
- `tests/passkey-ui-contract.test.js`: 공개 HTML에 비공개 내용 없음, 비밀번호 입력란 없음, 로그인 뒤에만 private API 호출, 패스키 목록/삭제/취소 안내

최종 실기 증거는 브라우저의 실제 인증장치가 필요하므로 위 `[실기 후 ...]` 칸에는 실제 수행 결과만 기록한다. 자동 테스트 결과를 실제 기기 결과처럼 바꾸어 적지 않는다.

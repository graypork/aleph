# 과제 8 — 내 소개 페이지에 패스키 달기

> 이 문서는 실제 개인정보 대신 과제용으로 만든 가상 메모만 사용합니다. 세션 쿠키·Upstash 토큰·개인키 등 비밀값은 제출물에 기록하지 않습니다.

## 제출 URL

- 결과물: `https://whogh.vercel.app`
- 소스: `https://github.com/graypork/aleph`
- 제출 기준 브랜치: `main`

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

흐름은 다음 위치를 지난다.

1. 등록: `src/passkey-area.js` → `action=register-options` → `service.startRegistration()` → 기기 WebAuthn → `action=register-verify` → `service.finishRegistration()` → 공개키 저장
2. 로그인: `src/passkey-area.js` → `action=login-options` → `service.startAuthentication()` → 기기가 개인키로 서명 → `action=login-verify` → 저장된 공개키로 검증 → 서버 세션 생성
3. 로그아웃: `src/passkey-area.js` → `action=logout` → 서버 세션 삭제 + 쿠키 만료
4. 비공개 자료: 로그인 뒤 `action=private` → 세션에서 사용자 확인 → 그 사용자 자료만 서버가 반환

challenge는 Upstash에 5분 TTL로 저장하며 검증 시 `GETDEL`로 꺼내기 때문에 같은 challenge는 두 번 사용할 수 없다. 세션 토큰 자체는 SHA-256으로 해시한 Redis 키 아래 저장하며 응답 본문에는 토큰을 넣지 않는다.

## 증거 분류

- **실제 iPhone 실기:** Miles 첫 패스키 등록, Face ID 인증, 비공개 메모 표시, 로그아웃 뒤 같은 패스키로 재로그인 성공.
- **Production 자동 실기:** 실제 `whogh.vercel.app` API에 요청해 401·403·409와 challenge 변경을 확인. 403·409 확인에는 Chromium의 임시 가상 WebAuthn 인증기를 사용했고, 검증 뒤 Sandbox credential을 삭제하고 로그아웃했다.
- **자동 계약 테스트:** 세션 소유권, 계정 격리, 공개키 저장, challenge 1회 소비, credential 삭제 등 서버 계약을 Node 테스트로 확인.

실제 기기에서 수행하지 않은 항목은 자동 테스트 결과로 대체해 완료했다고 적지 않는다.

### ④ 안 열리는 것을 확인한 기록

#### A. 로그인 없이 비공개 자료 열기

2026-10-28 production 직접 요청:

```text
요청: GET /api/passkey?action=private
응답: HTTP 401
본문: {"error":"AUTH_REQUIRED"}
결과: PASS
```

자동 테스트에서도 로그인 없는 세션이 비공개 자료를 받을 수 없고, 공개 `index.html`과 클라이언트 코드에 가상 비공개 메모 내용이 들어 있지 않음을 확인한다.

#### B. 남의 자료 읽기

Production 자동 실기에서는 임시 Sandbox 패스키 세션으로 Miles 자료를 요청했다.

```text
요청: GET /api/passkey?action=private&owner=miles
세션: Sandbox
응답: HTTP 403
본문: {"error":"CROSS_ACCOUNT_FORBIDDEN"}
결과: PASS
```

검증용 Sandbox credential은 확인 직후 삭제했다.

반대 방향인 Miles → Sandbox는 별도의 실제 production 요청을 캡처하지 않았다. 대신 자동 계약 테스트에서 Miles 세션에 `ownerUserId='sandbox'`를 넣었을 때 다음 결과를 확인한다.

```text
403 {"error":"CROSS_ACCOUNT_FORBIDDEN"}
```

따라서 **양방향 권한 로직은 자동 테스트로 확인되며, 실제 production 실기는 Sandbox → Miles 한 방향만 별도 캡처했다.**

일반적인 `account=` 같은 임의 입력은 권한 근거로 사용하지 않고 세션 소유자를 기준으로 자료를 정한다.

#### C. 이미 쓴 로그인 질문 재사용

2026-10-28 production에서 임시 Sandbox WebAuthn credential로 정상 로그인을 한 뒤 동일한 `challengeId + response`를 다시 보냈다.

```text
첫 login-verify 응답: HTTP 200
동일 요청 재전송: HTTP 409
재사용 응답: {"error":"CHALLENGE_EXPIRED_OR_USED"}
결과: PASS
```

자동 계약 테스트에서도 두 번째 요청 전에 서명 검증 함수를 다시 호출하지 않고 409로 끝나는 것을 확인한다.

#### D. 실제 Miles 패스키 등록·재로그인

실제 iPhone에서 수행했다.

```text
1. Miles 선택
2. 첫 패스키 등록
3. iPhone Face ID 인증
4. Miles 비공개 메모 3개와 등록된 패스키 1개 표시 확인
5. 로그아웃
6. Miles 선택 → 패스키로 들어가기
7. 같은 iPhone 패스키 + Face ID로 재인증
8. 비공개 메모가 다시 표시됨
결과: PASS
```

실제 화면에서 패스키 이름은 `localDevice`, 등록일은 `2026-10-27`로 확인했다.

#### E. 패스키 2개 등록 → 하나 삭제 → 남은 패스키 로그인

**미실행.** 같은 iPhone의 동일 플랫폼 인증기에 두 번째 Miles credential을 추가하는 과정에서 등록이 완료되지 않았고, 사용자가 이 실기 시나리오는 생략하기로 결정했다.

```text
Miles 패스키 A/B 2개 등록: 미실행
A 삭제: 미실행
B로 로그인: 미실행
삭제한 A가 allowCredentials/목록에서 사라지는 실제 기기 증거: 미실행
```

다만 credential 목록·삭제·소유자 제한·0개 경고 로직은 구현 및 자동 테스트로 확인한다.

### 서버에 저장되는 값

패스키는 서버에 개인키가 아니라 공개키 credential만 저장한다. 실제 iPhone 실기에서 화면으로 확인한 값은 다음과 같다.

```text
계정: Miles
name: localDevice
createdAt: 2026-10-27 (UI 표시 기준)
credential id: 실제 기기 실기에서 별도 복사하지 않음
publicKey: 실제 기기 실기에서 별도 복사하지 않음
```

`publicKey`는 기기가 만든 키 쌍 중 **공개키**를 base64url로 저장한 값이다. 비밀번호가 아니며 공개되어도 개인키 역할을 하지 못한다. 개인키는 서버 저장 코드와 등록 요청 본문 어디에도 없고 인증장치/패스키 저장소 밖으로 나오지 않는다.

패스키 저장 위치: **iPhone의 플랫폼 패스키 — 인증 시 Face ID 사용**

### challenge가 매번 다른 기록

2026-10-28 production에서 옵션 요청을 두 번씩 보내 앞 12자만 비교했다.

```text
등록 challenge 1: QFjmAHCADelu
등록 challenge 2: XNQhCVjB4KAm
결과: 서로 다름 (PASS)

로그인 challenge 1: rF9IOLpBgTM8
로그인 challenge 2: scaBWzdYHtT_
결과: 서로 다름 (PASS)
```

검사용 challenge는 검증에 사용하지 않았으며 TTL 만료 대상으로 남는다.

### 등록 취소 확인

의도적으로 등록 창을 열고 취소한 뒤 credential 수를 전후 비교하는 별도 실기는 수행하지 않았다. 다만 클라이언트는 `NotAllowedError`를 받으면 다음 안내를 표시하도록 구현돼 있다.

```text
"등록을 취소했습니다. 서버에는 패스키가 저장되지 않았습니다."
```

등록 검증이 완료되기 전에는 credential 저장 단계가 실행되지 않는 구조이며 자동 테스트로 등록 흐름을 분리해 검증한다.

### ⑤ AI와 나

- AI에게 맡긴 일: WebAuthn 흐름 설계, Vercel API·Upstash 저장 코드, 테스트 작성, 보안 경계 점검, production 401·403·409 및 challenge 변경 검증, 제출 증거 정리를 맡겼다.
- 내가 직접 판단한 일: 기존 공개 소개 페이지는 그대로 두고 비공개 영역만 추가하며 실제 개인정보 대신 가상 메모를 사용했다. 실제 iPhone에서 Miles 패스키 등록과 재로그인을 확인했고, 별도 저장소가 필요한 두 번째 패스키 등록·삭제 실기는 생략하기로 결정했다.
- AI 말을 따르지 않은 일: 별도 인증 서비스로 새 프로젝트를 만드는 선택지는 기존 Vercel·Upstash 구조를 불필요하게 늘리므로 사용하지 않고, 현재 저장소에 WebAuthn을 직접 연결하는 쪽을 선택했다.

### ⑥ 아직 못 막은 것

**첫 패스키가 하나도 없는 계정의 최초 등록은 별도의 신원확인 절차가 없다.** 따라서 새 계정을 배포한 직후 실제 소유자보다 다른 사람이 먼저 최초 등록을 하는 상황까지는 막지 못한다. 또한 마지막 패스키를 서버에서 삭제하고 세션까지 끝난 경우 초기 등록 상태가 되므로, 실제 서비스라면 관리자 승인·복구 코드·검증된 복구 채널 같은 별도의 초기 등록/복구 정책이 필요하다. 이번 과제에서는 비밀번호를 새로 만들지 않는 조건을 지키기 위해 이 한계를 명시한다.

## 짧은 확인 방법 4줄

1. 어디로 가나요: 결과물 첫 화면에서 아래로 내려 `PRIVATE / PASSKEY` 영역으로 간다.
2. 세 단계 안에 무엇을 하나요: 테스트 계정 선택 → 패스키 등록 또는 로그인 → 기기의 패스키 확인을 완료한다.
3. 무엇이 보이면 통과인가요: 로그인 뒤 가상 비공개 메모 3개와 등록된 패스키 이름·날짜가 보이면 통과다.
4. 안 될 때는 무엇이 보이나요: 비로그인/교차계정/재사용 challenge에는 비공개 자료 대신 잠금 화면 또는 401·403·409 오류가 보인다.

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
- [x] 자동 테스트: 전체 테스트 182/182 통과 및 Vite production build 성공 확인.
- [x] 실제 iPhone에서 Miles 첫 패스키를 등록하고 Face ID 인증 뒤 비공개 자료를 확인했다.
- [x] 실제 iPhone에서 로그아웃 뒤 기존 Miles 패스키로 재로그인했다.
- [x] production 비로그인 private 요청이 401 `AUTH_REQUIRED`임을 확인했다.
- [x] production Sandbox 세션에서 Miles 자료 요청이 403 `CROSS_ACCOUNT_FORBIDDEN`임을 확인했다.
- [x] production에서 정상 login-verify 200 뒤 동일 요청 재사용이 409 `CHALLENGE_EXPIRED_OR_USED`임을 확인했다.
- [x] production 등록·로그인 challenge가 연속 요청마다 달라지는 것을 확인했다.
- [x] 실제 패스키 저장 위치를 iPhone 플랫폼 패스키/Face ID로 기록했다.
- [ ] 실제 Miles 패스키 2개를 등록한다. **사용자 결정으로 생략.**
- [ ] 패스키 하나 삭제 후 남은 하나로 로그인한다. **위 항목과 함께 생략.**
- [ ] 삭제한 Miles 패스키가 서버 허용 목록에서 사라진 실제 기기 기록을 남긴다. **위 항목과 함께 생략.**
- [ ] Miles → Sandbox 방향의 403을 별도 production 실기로 캡처한다. **자동 계약 테스트로는 확인됨.**
- [ ] 등록 창 취소 전후 credential 수를 실제 기기에서 비교한다. **UI/자동 테스트만 확인됨.**

## 자동 테스트 근거

- `tests/passkey-store.test.js`: challenge 1회 소비, credential 사용자 분리, 세션 삭제
- `tests/passkey-api-contract.test.js`: 안정적인 WebAuthn user handle, 추가 패스키 소유자 세션, challenge 재사용 거절, 교차계정 거절, 공개키 저장값
- `tests/passkey-ui-contract.test.js`: 공개 HTML에 비공개 내용 없음, 비밀번호 입력란 없음, 로그인 뒤에만 private API 호출, 패스키 목록/삭제/취소 안내
- `tests/passkey-platform-authenticator.test.js`: 첫 패스키의 현재 기기 선호와 데스크톱 hybrid 로그인 힌트

최종 제출에서는 위 증거 분류를 유지한다. 자동 테스트 또는 가상 인증기 결과를 실제 iPhone 실기 결과처럼 바꾸어 적지 않는다.

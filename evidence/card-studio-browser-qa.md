# Card Studio 브라우저 QA 기록

검사 환경: Chromium headless, 1366×768 및 390×844. Vite 의존성이 없는 격리 환경에서 동일한 `src/studio/*.js` 모듈 소스를 하나의 QA 실행 컨텍스트로 결합해 실제 Canvas/File/Blob/localStorage 동작을 검사했다. 배포 후에는 `https://whogh.vercel.app/studio/`에서 시크릿 창 수동 확인을 한 번 더 수행한다.

| 항목 | 결과 |
|---|---|
| 첫 화면 IMAGE/TEXT/비율/미리보기 컨트롤 | PASS — 1366×768 viewport 안에서 모두 visible |
| PNG 불러오기 | PASS |
| JPEG 불러오기 | PASS |
| 지원하지 않는 `text/plain` | PASS — 거부 사유 표시, 문구/이미지명/화면비 유지 |
| 1:1 미리보기 ↔ PNG | PASS — 1080×1080, 픽셀 동일 |
| 4:5 미리보기 ↔ PNG | PASS — 1080×1350, 픽셀 동일 |
| 9:16 미리보기 ↔ PNG | PASS — 1080×1920, 픽셀 동일 |
| 템플릿 3개 생성 | PASS |
| 템플릿 불러오기/수정/삭제 | PASS — `템플릿 1 수정`, `템플릿 2` 남음 |
| 새로고침 상당 재초기화 후 템플릿 유지 | PASS — 수정/삭제 결과 2개 유지 |
| 손상 JSON | PASS — 오류 표시, 기존 2개 유지 |
| 필수 항목 누락 JSON | PASS — 오류 표시, 기존 2개 유지 |
| 정상 JSON 복원 | PASS — 임시 3개 상태에서 저장된 2개 상태로 복원 |
| JPEG 완성본 메타데이터 | PASS — EXIF 항목 0개 |
| 가로 overflow | PASS — 1366×768 / 390×844 모두 없음 |
| Console red error | PASS — 0건 |

## 화면/파일 일치 검사 방식

동일 편집 상태에서 화면의 `#preview-canvas`를 PNG로 캡처한 뒤, 실제 `PNG 다운로드` 버튼이 만든 파일을 열어 픽셀 단위로 비교했다. 1:1·4:5·9:16 세 비율 모두 차이 영역이 0이었다. 이는 화면과 파일이 동일한 `renderStudioCanvas()` → `renderComposition()` 경로를 사용한다는 자동 테스트와 함께 확인했다.

## 배포 뒤 남은 확인

- 결과물 URL과 GitHub 소스 URL을 새 시크릿 창에서 로그인 없이 열기(T03-C01).
- 배포된 페이지에서 세 비율의 미리보기/다운로드를 사람 눈으로도 한 번 대조하기(T03-C11~C13).
- 최종 공개 파일/화면에서 개인정보·비밀값이 없는지 마지막으로 확인한 뒤 제출문 4줄/3줄 작성하기(T03-C29~C32).

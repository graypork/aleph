# Assignment 03 · Card Studio 적용 안내

## 결과 경로
- 공개 편집기: `https://whogh.vercel.app/studio/`
- 소스: `https://github.com/graypork/aleph`

## 적용
ZIP을 `~/Desktop/ghpg`에 덮어쓴 뒤 아래를 실행합니다.

```bash
cd ~/Desktop/ghpg
chmod +x APPLY-ASSIGNMENT-03.sh
./APPLY-ASSIGNMENT-03.sh
```

스크립트는 기존 `/`와 `/play/` 소스를 건드리지 않고 Assignment 03 관련 파일만 Git에 추가합니다. `node_modules/.bin/vite`가 없으면 먼저 `npm ci`를 실행하고, 이어서 다음 검사를 수행합니다.

```bash
node --test tests/*.test.js
npm run build
```

두 검사가 모두 통과한 뒤 `feat: add card studio assignment` 커밋을 만들고 `main`에 push합니다.

## 배포 후 수동 확인
1. 새 시크릿 창에서 `https://whogh.vercel.app/studio/`가 로그인 없이 열리는지 확인합니다.
2. PNG/JPEG를 각각 불러오고, `.txt` 파일은 거부되면서 기존 편집 내용이 유지되는지 확인합니다.
3. 1:1·4:5·9:16에서 문구를 가장자리와 줄바꿈 위치에 놓고 미리보기와 내려받은 파일을 나란히 비교합니다.
4. 템플릿 3개 생성 → 하나 불러오기 → 하나 수정 → 하나 삭제 → 새로고침 후 결과가 유지되는지 확인합니다.
5. 정상 JSON, 문법 손상 JSON, 필수 항목 누락 JSON을 각각 가져와 기존 템플릿 보존 여부를 확인합니다.
6. `evidence/card-studio-output-*.png` 3개가 열리고 권한/메타데이터 증거 파일이 있는지 확인합니다.

## 제출 전
수동 확인까지 끝난 뒤에만 최종 4줄 확인 방법과 3줄 AI/학생 판단을 작성합니다.

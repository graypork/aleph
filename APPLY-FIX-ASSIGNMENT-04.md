# Assignment 04 적용 / 제출 전 확인

## 공개 결과물

배포 후 결과물 주소:

`https://whogh.vercel.app/board/`

## 적용

```bash
unzip -o ~/Downloads/assignment-04-real-information-board.zip -d ~/Desktop/ghpg
cd ~/Desktop/ghpg
chmod +x APPLY-ASSIGNMENT-04.sh
./APPLY-ASSIGNMENT-04.sh
```

스크립트는 공식 asset SHA-256 검증 → 전체 Node 테스트 → Vite build 순서가 모두 성공한 뒤에만 Assignment 04 파일을 commit/push 합니다.

## 실제 날짜 증거

1. 배포 완료 뒤 `/board/`를 열어 첫 실제 조회가 `FRESH`인지 확인합니다.
2. `실제 기록 1/2`와 KST 일별 기록 한 행을 확인합니다.
3. **다른 Asia/Seoul 실제 날짜**에 다시 `/board/`를 열어 `2/2 · 보존 완료`를 만듭니다.
4. 두 저장값으로 변화값을 직접 뺀 결과와 화면의 `이전 실제 기록 대비` 값이 같은지 확인합니다.

날짜를 개발자 도구나 fixture로 조작해 C22–C24를 채우지 않습니다.

## 최종 소스 URL

T04-C35 때문에 저장소 루트 URL이 아니라 최종 commit의 **40자리 소문자 SHA**를 포함한 주소를 제출합니다.

```bash
git rev-parse HEAD
```

출력값이 `<sha>`라면:

`https://github.com/graypork/aleph/tree/<sha>`

형태로 제출합니다.

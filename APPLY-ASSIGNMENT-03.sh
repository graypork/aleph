#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

branch="$(git branch --show-current)"
if [[ "$branch" != "main" ]]; then
  echo "ERROR: 현재 브랜치가 main이 아닙니다: ${branch:-DETACHED}"
  echo "main 브랜치에서 다시 실행하세요."
  exit 1
fi

if [[ ! -x node_modules/.bin/vite ]]; then
  npm ci
fi

node --test tests/*.test.js
npm run build

test -f dist/studio/index.html || {
  echo "ERROR: dist/studio/index.html 이 생성되지 않았습니다."
  exit 1
}

git add \
  studio \
  src/studio \
  src/assignment-link.js \
  vite.config.js \
  tests/studio-*.test.js \
  scripts/generate-studio-evidence.mjs \
  evidence/card-studio-* \
  docs/superpowers/specs/2026-09-15-card-studio-design.md \
  docs/superpowers/plans/2026-09-15-card-studio.md \
  APPLY-FIX-ASSIGNMENT-03.md \
  APPLY-ASSIGNMENT-03.sh

if git diff --cached --quiet; then
  echo "변경사항이 없어 커밋/푸시를 건너뜁니다."
  exit 0
fi

git commit -m "feat: add card studio assignment"
git push origin main

echo "완료: 테스트 → 빌드 → 커밋 → main 푸시"
echo "배포 확인: https://whogh.vercel.app/studio/"

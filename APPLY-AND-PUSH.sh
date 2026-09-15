#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

branch="$(git branch --show-current)"
if [[ "$branch" != "main" ]]; then
  echo "ERROR: 현재 브랜치가 main이 아닙니다: ${branch:-DETACHED}"
  echo "main 브랜치에서 다시 실행하세요."
  exit 1
fi

node --test tests/*.test.js
npm run build

git add \
  api \
  play \
  src/game \
  tests \
  RANKING-SETUP.md \
  APPLY-AND-PUSH.sh \
  docs/superpowers/specs/2026-09-15-recovery-shared-ranking-design.md \
  docs/superpowers/plans/2026-09-15-recovery-shared-ranking.md

if git diff --cached --quiet; then
  echo "변경사항이 없어 커밋/푸시를 건너뜁니다."
  exit 0
fi

git commit -m "feat: add shared recovery ranking"
git push origin main

echo "완료: 테스트 → 빌드 → 커밋 → main 푸시"

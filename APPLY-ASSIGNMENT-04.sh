#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ "$(git branch --show-current)" != "main" ]; then
  echo "ERROR: run this from the aleph main branch checkout." >&2
  exit 1
fi

node scripts/verify-t04-assets.mjs
node --test tests/*.test.js

if [ ! -x node_modules/.bin/vite ]; then
  npm ci
fi
npm run build

git add \
  board \
  src/board \
  api/board-live-adapter.js \
  api/board-store.js \
  api/board \
  public/t04-fixtures \
  tests/board-*.test.js \
  evidence/t04-*.md \
  scripts/verify-t04-assets.mjs \
  docs/superpowers/specs/2026-09-16-real-information-board-design.md \
  docs/superpowers/plans/2026-09-16-real-information-board.md \
  vite.config.js \
  src/assignment-link.js \
  APPLY-FIX-ASSIGNMENT-04.md \
  APPLY-ASSIGNMENT-04.sh

git commit -m "feat: add real information board"
git push origin main

echo
echo "Pushed Assignment 04. After Vercel deploys, open:"
echo "  https://whogh.vercel.app/board/"
echo "Immutable source URL:"
echo "  https://github.com/graypork/aleph/tree/$(git rev-parse HEAD)"

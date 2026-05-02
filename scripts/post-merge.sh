#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

# Push to GitHub automatically after each task merge
if [ -n "$GITHUB_TOKEN" ]; then
  REPO_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/vineettalwar/goals.ac.git"
  git push "$REPO_URL" HEAD:main --force
  echo "GitHub sync complete."
else
  echo "Warning: GITHUB_TOKEN not set, skipping GitHub sync."
fi

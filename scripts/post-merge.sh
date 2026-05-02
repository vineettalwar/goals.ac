#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

# Push to GitHub automatically after each task merge
if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN is not set. GitHub sync cannot proceed." >&2
  exit 1
fi

# Configure git credential helper to supply the token without embedding
# it in the remote URL (avoids token exposure in logs/process lists)
git config credential.helper '!f() { echo "username=x-access-token"; echo "password='"$GITHUB_TOKEN"'"; }; f'

# Fast-forward push only — will fail loudly if remote has diverged
git push origin HEAD:main

echo "GitHub sync complete."

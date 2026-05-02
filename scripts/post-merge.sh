#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

# Push to GitHub automatically after each task merge
if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN is not set. GitHub sync cannot proceed." >&2
  echo "Hint: add GITHUB_TOKEN as a Replit Secret with 'repo' scope." >&2
  exit 1
fi

# Use a temporary askpass script so the token is never written to .git/config
ASKPASS_SCRIPT=$(mktemp)
chmod 700 "$ASKPASS_SCRIPT"
printf '#!/bin/bash\ncase "$1" in\n  *Username*) echo "x-access-token" ;;\n  *Password*) printf "%%s" "$GITHUB_TOKEN" ;;\nesac\n' > "$ASKPASS_SCRIPT"

# Fast-forward push only — fails loudly if remote has diverged
GIT_ASKPASS="$ASKPASS_SCRIPT" git push origin HEAD:main

# Clean up askpass script immediately after use
rm -f "$ASKPASS_SCRIPT"

echo "GitHub sync complete."

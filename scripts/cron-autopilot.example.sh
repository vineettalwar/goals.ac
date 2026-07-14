#!/usr/bin/env bash
# External cron example for autopilot article sweep (backup to pg-boss worker crons).
# Schedule: every 6 hours — 0 */6 * * *
#
# Usage:
#   export CRON_SECRET=your-secret
#   export GOALS_AC_URL=https://goals.ac
#   ./scripts/cron-autopilot.example.sh

set -euo pipefail

: "${CRON_SECRET:?Set CRON_SECRET}"
: "${GOALS_AC_URL:=https://goals.ac}"

curl -fsS \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${GOALS_AC_URL}/api/cron/generate-articles"

echo ""
echo "OK — contentGenerateSweep enqueued at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

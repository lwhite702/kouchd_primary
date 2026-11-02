#!/usr/bin/env bash
set -euo pipefail

# Smoke test script for Kouchd deployment verification.
# Usage: ./scripts/smoke.sh [TARGET_URL]
# Defaults to http://localhost:3000 if not specified.

BASE_URL="${1:-http://localhost:3000}"
HEALTH_ENDPOINT="${BASE_URL%/}/api/health"

echo "Verifying health endpoint: ${HEALTH_ENDPOINT}"

HTTP_STATUS=$(curl -s -o /tmp/kouchd_health_response.json -w "%{http_code}" "${HEALTH_ENDPOINT}" || echo "000")

if [[ "${HTTP_STATUS}" -ne 200 ]]; then
  echo "ERROR: Health check failed with status ${HTTP_STATUS}"
  cat /tmp/kouchd_health_response.json 2>/dev/null || true
  exit 1
fi

echo "Health check passed (status 200)."
cat /tmp/kouchd_health_response.json 2>/dev/null || true
echo ""

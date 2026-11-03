#!/usr/bin/env bash
set -euo pipefail

# Smoke test script for Kouchd deployment verification.
# Usage: ./scripts/smoke.sh [TARGET_URL]
# Defaults to http://localhost:3000 if not specified.

BASE_URL="${1:-http://localhost:3000}"
HEALTH_ENDPOINT="${BASE_URL%/}/api/health"

# A per-run file keeps concurrent runs from reading each other's output.
RESPONSE_FILE="$(mktemp)"
trap 'rm -f "${RESPONSE_FILE}"' EXIT

echo "Verifying health endpoint: ${HEALTH_ENDPOINT}"

# Bounded timeouts so a server that accepts the connection but never answers
# cannot hang the check. curl already prints 000 on a transport error.
if ! HTTP_STATUS=$(curl -s --connect-timeout 5 --max-time 15 -o "${RESPONSE_FILE}" -w "%{http_code}" "${HEALTH_ENDPOINT}"); then
  HTTP_STATUS="000"
fi

if [[ "${HTTP_STATUS}" != "200" ]]; then
  echo "ERROR: Health check failed with status ${HTTP_STATUS}"
  cat "${RESPONSE_FILE}" 2>/dev/null || true
  exit 1
fi

echo "Health check passed (status 200)."
cat "${RESPONSE_FILE}"
echo ""

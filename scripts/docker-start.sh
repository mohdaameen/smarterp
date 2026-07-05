#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then
    kill "${API_PID}" 2>/dev/null || true
  fi

  if [[ -n "${WEB_PID:-}" ]]; then
    kill "${WEB_PID}" 2>/dev/null || true
  fi

  wait "${API_PID:-}" 2>/dev/null || true
  wait "${WEB_PID:-}" 2>/dev/null || true
}

trap cleanup INT TERM

node apps/api/dist/server.js &
API_PID=$!

(
  cd apps/web
  node ../../node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0
) &
WEB_PID=$!

wait -n "${API_PID}" "${WEB_PID}"
EXIT_CODE=$?
cleanup
exit "${EXIT_CODE}"

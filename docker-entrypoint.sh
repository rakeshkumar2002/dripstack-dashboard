#!/bin/sh
# Turn a silent misconfiguration into a loud crash. Without DASHBOARD_API_URL the
# app falls back to http://localhost:4000, which in production means every request
# fails from the user's browser with no server-side signal at all.
set -e
if [ -z "${DASHBOARD_API_URL:-}" ] && [ "${NODE_ENV}" = "production" ]; then
  echo "FATAL: DASHBOARD_API_URL is not set; the dashboard would call http://localhost:4000" >&2
  echo "       Set it to the DripStack API's public origin (== APP_BASE_URL in dripstack-backend)." >&2
  exit 1
fi
exec "$@"

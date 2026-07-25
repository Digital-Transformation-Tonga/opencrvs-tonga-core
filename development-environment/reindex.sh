# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.
#
# OpenCRVS is also distributed under the terms of the Civil Registration
# & Healthcare Disclaimer located at http://opencrvs.org/license.
#
# Copyright (C) The OpenCRVS Authors located at https://github.com/opencrvs/opencrvs-core/blob/master/AUTHORS.

#!/usr/bin/env bash
set -euo pipefail

EVENTS_URL="${EVENTS_URL:-http://localhost:5555/}"
AUTH_URL="${AUTH_URL:-http://localhost:4040/}"
# How often (seconds) to poll the status endpoint
POLL_INTERVAL="${POLL_INTERVAL:-10}"
# Maximum number of poll iterations (~3 hours at the default interval)
MAX_POLLS="${MAX_POLLS:-1080}"

get_reindexing_token() {
  local res
  res=$(curl -s "${AUTH_URL%/}/internal/reindexing-token" || true)
  local token
  token=$(echo "$res" | jq -r '.token // empty' 2>/dev/null || true)
  if [ -z "$token" ] || [ "$token" = "null" ]; then
    echo "ERROR: Failed to retrieve reindexing token from ${AUTH_URL%/}/internal/reindexing-token. Response: ${res}" >&2
    return 1
  fi
  echo "$token"
}

# Fires POST /events/reindex in a background subshell.
# If an error occurs, it prints to stderr so it is visible in development logs.
fire_trigger() {
  local token=$1
  (
    local response http_code
    response=$(curl -s -w "\n%{http_code}" \
      -X POST \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      "${EVENTS_URL%/}/events/reindex" 2>&1 || echo "CURL_ERROR 000")
    
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
      echo "  [Trigger Warning] POST /events/reindex returned HTTP ${http_code}: $(echo "$response" | head -n -1)" >&2
    fi
  ) &
}

# Returns the most recent active or new reindex status document,
# as a compact JSON object, or empty string if none found yet.
fetch_latest_run_since() {
  local token=$1 since=$2
  local response
  
  response=$(curl -s \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    "${EVENTS_URL%/}/events/reindex" || true)
  
  if echo "$response" | jq -e 'type == "array"' >/dev/null 2>&1; then
    echo "$response" | jq -c --arg since "$since" \
      'map(select(.status == "running" or .timestamp >= $since)) | sort_by(.timestamp) | reverse | .[0] // empty' || true
  else
    if [ -n "$response" ]; then
      echo "  [Poll Warning] GET /events/reindex response: ${response}" >&2
    fi
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

# Capture wall-clock time BEFORE fetching the token so it is always
# earlier than the status document the server writes. Stored timestamps
# include milliseconds (e.g. 2026-03-06T09:53:08.123Z), so we keep only
# the first 19 chars (YYYY-MM-DDTHH:MM:SS) for the comparison to avoid
# the '.' < 'Z' string-sort trap.
TRIGGER_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S")

echo "Requesting reindex token..."
TOKEN=$(get_reindexing_token)

echo "Triggering reindex..."
fire_trigger "$TOKEN"

echo "Polling reindex status..."
polls=0
first_poll=true
while true; do
  if [[ "$first_poll" == true ]]; then
    sleep 3
    first_poll=false
  else
    sleep "$POLL_INTERVAL"
  fi
  polls=$((polls + 1))

  RUN=$(fetch_latest_run_since "$TOKEN" "$TRIGGER_TIME")

  if [[ -z "$RUN" ]]; then
    echo "  Waiting for reindex to start... (${polls})"

    if (( polls > MAX_POLLS )); then
      echo "ERROR: timed out waiting for reindex to start."
      exit 1
    fi
    continue
  fi

  STATUS=$(echo "$RUN" | jq -r '.status')
  PROCESSED=$(echo "$RUN" | jq -r '.progress.processed')

  case "$STATUS" in
    running)
      echo "  Running... ${PROCESSED} events processed so far"
      if (( polls > MAX_POLLS )); then
        echo "ERROR: reindex timed out after $((polls * POLL_INTERVAL)) seconds."
        exit 1
      fi
      ;;
    completed)
      echo "  Reindex completed — ${PROCESSED} events processed."
      exit 0
      ;;
    failed)
      ERROR=$(echo "$RUN" | jq -r '.error_message // "unknown error"')
      echo "  ERROR: reindex failed: ${ERROR}"
      exit 1
      ;;
    *)
      echo "  Unknown status '${STATUS}' — continuing to poll..."
      if (( polls > MAX_POLLS )); then
        exit 1
      fi
      ;;
  esac
done
#!/usr/bin/env bash
# Pre-warm the self-hosted RSSHub cache before fetch.py runs.
#
# /anthropic/research can take ~100s on a cold cache (RSSHub fetches each
# paper page individually). fetch.py's per-source TIMEOUT is 30s, so a cold
# fetch would FAIL the source. This script is invoked by cron at xx:08, five
# minutes before run-agent.sh fires at xx:13, so RSSHub's 24h cache is fresh
# when fetch.py asks for the same URL.
#
# Each route is fetched serially so a slow one doesn't crowd the others;
# we don't care about output, only that RSSHub's internal cache is populated.

set -u

RSSHUB="http://127.0.0.1:3007"
ROUTES=(
  "/anthropic/research"
  "/anthropic/engineering"
  "/anthropic/red"
)

for route in "${ROUTES[@]}"; do
    curl -s --max-time 180 "$RSSHUB$route" -o /dev/null || true
done

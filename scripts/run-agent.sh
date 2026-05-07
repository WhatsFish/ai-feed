#!/usr/bin/env bash
# Fired by cron. Starts a headless Claude Code agent that runs the
# daily synthesis described in agent-task.md, then logs one cost_event row.
set -euo pipefail

PROJECT_DIR="/home/liharr/src/ai-feed"
CLAUDE_BIN="/home/liharr/.nvm/versions/node/v24.15.0/bin/claude"
COST_ENV="/home/liharr/.config/cost-tracker.env"
# Rough per-run estimate. Claude Code uses subscription quota — there's no
# per-call API to read exact $ from. Override via env to tune as we observe
# real usage over time.
AGENT_COST_USD_ESTIMATE="${AGENT_COST_USD_ESTIMATE:-0.50}"

cd "$PROJECT_DIR"

START_TS=$(date -u +%s)
START_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

set +e
"$CLAUDE_BIN" -p "$(cat agent-task.md)" \
  --dangerously-skip-permissions \
  --max-budget-usd 2 \
  --add-dir "$PROJECT_DIR"
EXIT=$?
set -e

END_TS=$(date -u +%s)
DURATION_MS=$(( (END_TS - START_TS) * 1000 ))

# Best-effort cost logging — never let a logging failure mask the agent's exit.
if [ -f "$COST_ENV" ]; then
    set +e
    # shellcheck disable=SC1090
    source "$COST_ENV"
    METADATA="{\"started_at\":\"$START_ISO\",\"exit_code\":$EXIT,\"script\":\"run-agent.sh\"}"
    docker exec -e PGPASSWORD="$COST_PG_PASSWORD" "$COST_DB_CONTAINER" \
        psql -h "$COST_PG_HOST" -p "$COST_PG_PORT" -U "$COST_PG_USER" -d "$COST_PG_DB" \
        -c "INSERT INTO cost_event (service, provider, cost_usd, duration_ms, metadata) \
            VALUES ('claude-code-agent', 'anthropic', $AGENT_COST_USD_ESTIMATE, $DURATION_MS, '$METADATA'::jsonb);" \
        > /dev/null 2>&1 || true
    set -e
fi

exit $EXIT

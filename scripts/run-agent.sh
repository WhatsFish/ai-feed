#!/usr/bin/env bash
# Fired by cron. Starts a headless Claude Code agent that runs the
# daily synthesis described in agent-task.md.
set -euo pipefail

PROJECT_DIR="/home/liharr/src/ai-feed"
CLAUDE_BIN="/home/liharr/.nvm/versions/node/v24.15.0/bin/claude"

cd "$PROJECT_DIR"

exec "$CLAUDE_BIN" -p "$(cat agent-task.md)" \
  --dangerously-skip-permissions \
  --max-budget-usd 1 \
  --add-dir "$PROJECT_DIR"

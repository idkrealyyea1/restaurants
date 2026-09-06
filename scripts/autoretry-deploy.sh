#!/usr/bin/env bash
# Auto-retry `wasmer deploy` until it succeeds or the process is stopped.
# Usage: autoretry-deploy.sh [interval_seconds] [max_attempts]
# Logs to /tmp/wasmer_deploy.log; exits 0 on success, 1 on failure/max attempts.

INTERVAL="${1:-240}"     # every 4 min by default
MAX="${2:-600}"          # up to 600 attempts (generous)
LOG="/tmp/wasmer_deploy.log"
HOME_DIR="$HOME"

cd "$HOME_DIR/Desktop/restaurants" || { echo "could not cd to project" >>"$LOG"; exit 1; }

echo "=== auto-deploy loop started $(date) ===" >>"$LOG"

for i in $(seq 1 "$MAX"); do
  echo "--- attempt $i $(date) ---" >>"$LOG"
  if wasmer deploy --build-remote >>"$LOG" 2>&1; then
    echo "=== SUCCESS on attempt $i $(date) ===" >>"$LOG"
    exit 0
  fi
  echo "--- attempt $i failed; retrying in ${INTERVAL}s ---" >>"$LOG"
  sleep "$INTERVAL"
done

echo "=== gave up after $MAX attempts $(date) ===" >>"$LOG"
exit 1

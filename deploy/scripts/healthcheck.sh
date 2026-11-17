#!/usr/bin/env bash
# ================================================================================
# YYC³ MusAI —— 健康检查
# 用法：bash deploy/scripts/healthcheck.sh [url] [retries] [intervalSeconds]
# 退出码：0 健康 / 1 不健康
# ================================================================================
set -euo pipefail

URL="${1:-http://127.0.0.1:${MUSAI_PORT:-3250}/health}"
RETRIES="${2:-10}"
INTERVAL="${3:-2}"

for _ in $(seq 1 "$RETRIES"); do
  if body="$(curl -fsS --max-time 3 "$URL" 2>/dev/null)"; then
    echo "[health] OK $URL -> $body"
    exit 0
  fi
  sleep "$INTERVAL"
done

echo "[health] FAIL $URL（${RETRIES} 次尝试未通过）" >&2
exit 1

#!/usr/bin/env bash
# ================================================================================
# YYC³ MusAI —— 回滚到上一可用镜像
#
# 用法：bash deploy/scripts/rollback.sh [tag]
#   tag 缺省取 deploy/.state/current-tag（最近一次健康检查通过的版本）
# ================================================================================
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$DEPLOY_DIR/.state"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"
IMAGE="${MUSAI_IMAGE:-yyc3/musai-server}"
PORT="${MUSAI_PORT:-3250}"
TARGET="${1:-$(cat "$STATE_DIR/current-tag" 2>/dev/null || true)}"

if [[ -z "$TARGET" ]]; then
  echo "[rollback] 未指定目标版本，且 deploy/.state/current-tag 为空" >&2
  exit 1
fi

if ! docker image inspect "${IMAGE}:${TARGET}" >/dev/null 2>&1; then
  echo "[rollback] 本地不存在镜像 ${IMAGE}:${TARGET}" >&2
  exit 1
fi

echo "[rollback] 回滚到 ${IMAGE}:${TARGET} ..."
MUSAI_TAG="$TARGET" docker compose -f "$COMPOSE_FILE" up -d --no-build

if bash "$DEPLOY_DIR/scripts/healthcheck.sh" "http://127.0.0.1:${PORT}/health" 15 2; then
  printf '%s' "$TARGET" > "$STATE_DIR/current-tag"
  echo "[rollback] 完成：${IMAGE}:${TARGET}"
  exit 0
fi

echo "[rollback] 目标版本仍未通过健康检查，请人工介入" >&2
exit 1

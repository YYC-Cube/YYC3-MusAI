#!/usr/bin/env bash
# ================================================================================
# YYC³ MusAI —— 部署（构建 → 启动 → 健康检查 → 失败自动回滚）
#
# 用法：bash deploy/scripts/deploy.sh [tag]
#   tag 缺省取当前 git 短 SHA；镜像名由 MUSAI_IMAGE 覆盖，宿主机端口由 MUSAI_PORT 覆盖
# 前置：cp deploy/musai-server.env.example deploy/musai-server.env 并填真实值
# ================================================================================
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"
STATE_DIR="$DEPLOY_DIR/.state"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"
IMAGE="${MUSAI_IMAGE:-yyc3/musai-server}"
PORT="${MUSAI_PORT:-3250}"
TAG="${1:-$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"

if [[ ! -f "$DEPLOY_DIR/musai-server.env" ]]; then
  echo "[deploy] 缺少 deploy/musai-server.env，请先复制模板并填写" >&2
  exit 1
fi

mkdir -p "$STATE_DIR"
PREV="$(cat "$STATE_DIR/current-tag" 2>/dev/null || true)"
echo "[deploy] 目标镜像 ${IMAGE}:${TAG}；上一版本：${PREV:-无}"

echo "[deploy] 构建镜像..."
docker build -f "$DEPLOY_DIR/Dockerfile" -t "${IMAGE}:${TAG}" "$ROOT_DIR"

echo "[deploy] 启动 ${IMAGE}:${TAG} ..."
MUSAI_TAG="$TAG" docker compose -f "$COMPOSE_FILE" up -d --no-build

if bash "$DEPLOY_DIR/scripts/healthcheck.sh" "http://127.0.0.1:${PORT}/health" 15 2; then
  printf '%s' "$TAG" > "$STATE_DIR/current-tag"
  echo "[deploy] 部署成功：${IMAGE}:${TAG}"
  exit 0
fi

echo "[deploy] 健康检查失败，开始回滚..." >&2
if [[ -n "$PREV" ]]; then
  bash "$DEPLOY_DIR/scripts/rollback.sh" "$PREV"
else
  echo "[deploy] 无可用上一版本，保留容器供排查：docker logs musai-server" >&2
fi
exit 1

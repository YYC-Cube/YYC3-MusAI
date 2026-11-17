#!/usr/bin/env bash
# ================================================================================
# YYC³ MusAI —— 部署到 NAS（yyc3-45）
#
# 流程：本机构建 linux/amd64 镜像 → docker save → rsync → 远端 docker load
#       → compose up → /health 校验 → 失败自动回滚上一 tag
#
# 用法：bash deploy/scripts/deploy-nas.sh [tag]
# 可覆盖：NAS_HOST / NAS_DIR / NAS_DOCKER / NAS_COMPOSE / MUSAI_PORT
# 前置：远端 $NAS_DIR/musai-server.env 已存在（首次会自动放入模板，需人工填值）
# ================================================================================
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"
IMAGE="yyc3-musai-server"
NAS_HOST="${NAS_HOST:-yyc3-45}"
NAS_DIR="${NAS_DIR:-/Volume3/docker/yyc3-musai-server}"
NAS_DOCKER="${NAS_DOCKER:-/Volume3/@apps/DockerEngine/dockerd/bin/docker}"
NAS_COMPOSE="${NAS_COMPOSE:-/Volume3/@apps/DockerEngine/dockerd/bin/docker-compose}"
PORT="${MUSAI_PORT:-3250}"
TAG="${1:-$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
TARBALL="${IMAGE}-${TAG}.tar.gz"

echo "[deploy-nas] 目标 ${NAS_HOST}:${NAS_DIR}，镜像 ${IMAGE}:${TAG}"

ssh "$NAS_HOST" "mkdir -p '${NAS_DIR}/data/logs' '${NAS_DIR}/backups'" >/dev/null
# 首次部署：远端 env 不存在时放入模板（不覆盖已有配置）
if ! ssh "$NAS_HOST" "test -f '${NAS_DIR}/musai-server.env'"; then
  echo "[deploy-nas] 远端缺少 musai-server.env，写入模板后中止，请先填值再重跑" >&2
  scp "$DEPLOY_DIR/nas/musai-server.env.example" "$NAS_HOST:${NAS_DIR}/musai-server.env" >/dev/null
  exit 2
fi

echo "[deploy-nas] 构建 linux/amd64 镜像（arm64 宿主需 buildx 模拟）..."
docker build --platform linux/amd64 -f "$DEPLOY_DIR/Dockerfile" -t "${IMAGE}:${TAG}" "$ROOT_DIR"

echo "[deploy-nas] 导出镜像..."
docker save "${IMAGE}:${TAG}" | gzip > "/tmp/${TARBALL}"

echo "[deploy-nas] 传输镜像与编排文件..."
rsync -av "/tmp/${TARBALL}" "${NAS_HOST}:${NAS_DIR}/backups/" >/dev/null
scp "$DEPLOY_DIR/nas/docker-compose.yml" "$NAS_HOST:${NAS_DIR}/docker-compose.yml" >/dev/null

PREV="$(ssh "$NAS_HOST" "cat '${NAS_DIR}/.current-tag' 2>/dev/null || true")"
echo "[deploy-nas] 上一版本：${PREV:-无}"

echo "[deploy-nas] 远端加载镜像..."
ssh "$NAS_HOST" "${NAS_DOCKER} load -i '${NAS_DIR}/backups/${TARBALL}'" >/dev/null

start_container() {
  local tag="$1"
  ssh "$NAS_HOST" "touch /tmp/empty.env; MUSAI_TAG='${tag}' ${NAS_COMPOSE} -p yyc3-musai-server -f '${NAS_DIR}/docker-compose.yml' --env-file /tmp/empty.env up -d --no-build" >/dev/null
}

health() {
  ssh "$NAS_HOST" "curl -fsS --max-time 3 'http://127.0.0.1:${PORT}/health'" 2>/dev/null
}

wait_healthy() {
  for _ in $(seq 1 15); do
    if health >/dev/null; then return 0; fi
    sleep 2
  done
  return 1
}

rollback() {
  if [[ -z "$PREV" ]]; then
    echo "[deploy-nas] 无可用上一版本，保留容器供排查：${NAS_DOCKER} logs yyc3-musai-server" >&2
    return 1
  fi
  echo "[deploy-nas] 回滚到 ${IMAGE}:${PREV} ..." >&2
  if start_container "$PREV" && wait_healthy; then
    echo "[deploy-nas] 已回滚到 ${IMAGE}:${PREV}" >&2
    return 0
  fi
  echo "[deploy-nas] 回滚后仍不健康，需人工介入" >&2
  return 1
}

echo "[deploy-nas] 启动 ${IMAGE}:${TAG} ..."
if ! start_container "$TAG"; then
  echo "[deploy-nas] 容器启动失败" >&2
  ssh "$NAS_HOST" "${NAS_DOCKER} logs --tail 40 yyc3-musai-server" 2>&1 | tail -20 >&2 || true
  rollback || true
  exit 1
fi

if wait_healthy; then
  echo "[deploy-nas] 健康检查通过：$(health)"
  ssh "$NAS_HOST" "printf '%s' '${TAG}' > '${NAS_DIR}/.current-tag'"
  echo "[deploy-nas] 部署成功：${IMAGE}:${TAG}"
  exit 0
fi

echo "[deploy-nas] 健康检查失败" >&2
ssh "$NAS_HOST" "${NAS_DOCKER} logs --tail 40 yyc3-musai-server" 2>&1 | tail -20 >&2 || true
rollback || true
exit 1

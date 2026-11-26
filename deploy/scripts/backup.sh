#!/usr/bin/env bash
# ==============================================================================
# YYC³ MusAI · 数据备份（终审 R2）
#
# 用途：pg_dump（-Fc 自定义格式，支持选择性恢复）+ uploads 卷 tar 快照 + 轮转。
# 用法：
#   ./backup.sh                    # 全量备份（DB + uploads）
#   ./backup.sh db                 # 仅数据库
#   ./backup.sh uploads            # 仅上传文件卷
#   ./backup.sh restore <file>     # 恢复数据库（pg_restore，交互确认）
#   ./backup.sh verify <file>      # 校验备份归档完整性（pg_restore --list）
#
# env（默认对齐 NAS 形态，可在musai-server.env 或环境中覆盖）：
#   PGHOST（默认 192.168.3.45）  PGPORT（默认 5433）
#   PGDATABASE（默认 yyc3_music） PGUSER（默认 musai_owner，需读权限）
#   PGPASSWORD / PGPASSFILE      BACKUP_DIR（默认 ./backups）
#   UPLOADS_DIR（默认 ./uploads） KEEP_DAYS（默认 14）
#
# crontab（NAS，每日 03:30 备份 + 周日校验）：
#   30 3 * * * /Volume3/docker/yyc3-musai-server/scripts/backup.sh >> /var/log/musai-backup.log 2>&1
#   0  5 * * 0 /Volume3/docker/yyc3-musai-server/scripts/backup.sh verify latest >> /var/log/musai-backup.log 2>&1
# ==============================================================================
set -euo pipefail

MODE="${1:-all}"
PGHOST="${PGHOST:-192.168.3.45}"
PGPORT="${PGPORT:-5433}"
PGDATABASE="${PGDATABASE:-yyc3_music}"
PGUSER="${PGUSER:-musai_owner}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
UPLOADS_DIR="${UPLOADS_DIR:-./uploads}"
KEEP_DAYS="${KEEP_DAYS:-14}"

TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

log() { printf '[backup %s] %s\n' "$(date '+%F %T')" "$*"; }

do_db() {
  local out="$BACKUP_DIR/musai-db-$TS.dump"
  log "pg_dump -> $out"
  pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -Fc -f "$out"
  local size
  size=$(du -h "$out" | cut -f1)
  log "DB 备份完成：$size"
}

do_uploads() {
  local out="$BACKUP_DIR/musai-uploads-$TS.tar.gz"
  if [ ! -d "$UPLOADS_DIR" ]; then log "警告：UPLOADS_DIR=$UPLOADS_DIR 不存在，跳过"; return 0; fi
  log "tar uploads -> $out"
  tar -czf "$out" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
  log "uploads 备份完成：$(du -h "$out" | cut -f1)"
}

do_rotate() {
  log "轮转：删除 ${KEEP_DAYS} 天前的备份"
  find "$BACKUP_DIR" -name 'musai-db-*.dump' -mtime "+$KEEP_DAYS" -delete
  find "$BACKUP_DIR" -name 'musai-uploads-*.tar.gz' -mtime "+$KEEP_DAYS" -delete
}

latest_dump() {
  ls -1t "$BACKUP_DIR"/musai-db-*.dump 2>/dev/null | head -1 || { log "错误：无可用备份"; exit 1; }
}

case "$MODE" in
  db)      do_db ;;
  uploads) do_uploads ;;
  all)     do_db; do_uploads; do_rotate ;;
  verify)
    F="${2:-$(latest_dump)}"
    log "校验归档：$F"
    if pg_restore --list "$F" > /dev/null 2>&1; then log "✓ 归档完整（$(pg_restore --list "$F" | grep -c 'TABLE') 张表元数据可读）"; else log "✗ 归档损坏"; exit 1; fi
    ;;
  restore)
    F="${2:-$(latest_dump)}"
    log "目标：$PGHOST:$PGPORT/$PGDATABASE ← $F"
    read -r -p "将覆盖目标库当前数据，确认恢复？输入 YES 继续: " ok
    [ "$ok" = "YES" ] || { log "已取消"; exit 1; }
    # --clean 先删后建；--if-exists 首次恢复到空库也不报错
    pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" --clean --if-exists --no-owner "$F"
    log "✓ 恢复完成——立即执行 /health 冒烟与应用侧抽查"
    ;;
  *)
    echo "用法: $0 [all|db|uploads|verify <file>|restore <file>]" >&2
    exit 2
    ;;
esac

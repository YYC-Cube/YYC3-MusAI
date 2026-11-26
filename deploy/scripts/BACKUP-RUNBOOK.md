# MusAI 备份恢复 Runbook（终审 R2）

配套脚本：`backup.sh`（本目录）。目标环境：NAS（PG 17 @192.168.3.45:5433，uploads 卷随 compose 目录）。

## 一、日常备份（自动化）

crontab（NAS `YYC3` 用户）：

```cron
30 3 * * * /Volume3/docker/yyc3-musai-server/scripts/backup.sh >> /var/log/musai-backup.log 2>&1
0  5 * * 0 /Volume3/docker/yyc3-musai-server/scripts/backup.sh verify latest >> /var/log/musai-backup.log 2>&1
```

- DB：`pg_dump -Fc`（自定义格式，可选择性恢复单表）
- uploads：`tar.gz` 快照
- 轮转：默认保留 14 天（`KEEP_DAYS` 可调）
- 每周日自动校验归档完整性（`pg_restore --list`）

## 二、恢复演练（上线前置 + 每季度一次）

**演练目标**：验证「备份→恢复→应用可用」闭环，全程 ≤30 分钟。

```bash
# 1. 建演练库（隔离，不碰主库）
createdb -h 192.168.3.45 -p 5433 -U musai_owner yyc3_music_drill

# 2. 恢复最近备份到演练库
pg_restore -h 192.168.3.45 -p 5433 -U musai_owner -d yyc3_music_drill \
  --clean --if-exists --no-owner backups/musai-db-<TS>.dump

# 3. 抽查数据完整性（行数量级对得上即可）
psql -h 192.168.3.45 -U musai_owner -d yyc3_music_drill -c \
  "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;"

# 4. 应用侧演练（env 指到演练库起一个临时实例，冒烟 /health + 登录）
PGDATABASE=yyc3_music_drill PORT=3299 JWT_SECRET=<临时密钥> node packages/music-server/dist/index.js
curl -s http://127.0.0.1:3299/health   # 期望 {"status":"ok"}

# 5. uploads 恢复演练（解包到临时目录核对文件数）
tar -tzf backups/musai-uploads-<TS>.tar.gz | wc -l

# 6. 清理
dropdb -h 192.168.3.45 -p 5433 -U musai_owner yyc3_music_drill
```

## 三、生产事故恢复（真实执行）

1. `backup.sh restore backups/musai-db-<TS>.dump`（交互确认后 `--clean` 覆盖恢复）
2. 重启应用容器：`deploy/scripts/rollback.sh` 或 `docker compose -f nas/docker-compose.yml up -d --no-build`
3. 冒烟：`/health` 200 → 登录 → 播放 → 上传
4. uploads 如需回滚：停容器 → `tar -xzf musai-uploads-<TS>.tar.gz` 覆盖卷目录 → 起容器
5. 记录事故时间线到 `docs/05-交付与部署阶段`（RTO/RPO 复盘）

## 四、RPO/RTO 预期

| 指标 | 预期 | 依据 |
| --- | --- | --- |
| RPO | ≤24h（数据丢失上限一天） | 每日 03:30 全量 |
| RTO | ≤30min | 恢复演练实测口径 |

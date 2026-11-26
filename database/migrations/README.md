# MusAI 数据库迁移（终审 R3）

- `001_baseline_schema.sql` — 基线：31 表全量 DDL（源自 d_music_postgres.sql，`CREATE TABLE IF NOT EXISTS` 幂等）
- `002_audit_logs.sql` — musai.audit_logs 审计表（原 deploy/sql/001，收编入版本链）

## 使用
```bash
# 空库一键建全量 / 既有库自动跳过已应用版本
./scripts/migrate.sh
# 指定连接（默认与 NAS 部署形态一致）
PGHOST=192.168.3.45 PGPORT=5433 ./scripts/migrate.sh
```
已应用版本记录于 `musai.musai_migrations`（`musai.schema_migrations` 已被既有工具占用，故用独立表名）；脚本按文件名序号顺序执行，每个文件单独事务包裹，
失败即回滚该版本并退出非零（部署链可拦截）。

## 新增迁移规范
- `NNN_描述.sql` 递增序号，禁止修改历史文件
- 必须幂等（`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`）
- 所有外部输入走参数绑定（应用层约束同样适用于迁移中占位改造）

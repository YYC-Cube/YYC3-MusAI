# MusAI 密钥轮换 Runbook（终审遗留闭环）

## 背景

2026-11 终审 R6 已将代码库中全部 anon JWT 字面量出库（seed-users.js、check-*.js、
test-supabase-connection.js 共 5 处 + kv_store 注释脱敏）。**但该 key 在 git 历史中
存在（含 archive/ 归档目录），必须轮换作废。**

## 轮换步骤（Supabase 控制台，约 10 分钟）

1. 登录 Supabase Dashboard → 项目（ref: `phgrinrlnxzjyxxhsqry`）→ Settings → API
2. **轮换 anon key**：JWT Settings → `Rotate anon key`（旧 key 立即失效）
3. service_role key 同页轮换（若怀疑泄露一并轮换；本仓未泄露 service_role）
4. 分发新 key：
   - 本机 `.env`（`SUPABASE_ANON_KEY`）与 `deploy/musai-server.env`
   - NAS：`/Volume3/docker/yyc3-musai-server/musai-server.env`
   - CI/CD：GitHub repo Secrets（如 `SUPABASE_*` 有引用处）
5. 重启服务：`deploy/scripts/rollback.sh`（回当前 tag 即滚动重启）或 compose up -d
6. 冒烟：`/health` 200 → 登录/注册 → 存量端点（space-time 语音等 GoTrue 依赖功能）

## 验证

```bash
# 旧 key 应 401
curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: <旧 anon key>" https://phgrinrlnxzjyxxhsqry.supabase.co/rest/v1/
# 新 key 应 200
curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: <新 anon key>" https://phgrinrlnxzjyxxhsqry.supabase.co/rest/v1/
```

## 附注

- `archive/baseline/` 为历史归档（不再部署），其内旧 key 引用随轮换自然失效，无需清理
- git 历史清除（filter-repo）评估过：私有自托管 + key 已轮换 = 无必要
- JWT_SECRET（自签会话密钥）与 Supabase key 独立，泄露时单独轮换并重启服务即可

# YYC³ MusAI 生产落地现状审核评估与缺失规划方案

> 版本 v1.0 · 2026-11-24 · 依据：Mimosa deep 完整审计（seal 封印）+ 主项目深度盘点（git HEAD 975a69c，全部数字实测）
> 结论先行：**工程基础达标（typecheck/test/coverage/lint/安全加固全绿），生产落地未就绪——存在 4 项阻塞级错接，当前形态上线后前端请求将打不到自有后端**。修复路线明确，预计 1–2 周可进入预发。

---

## 一、现状审核评估

### 1.1 总体评分

| 域 | 评估 | 说明 |
| --- | --- | --- |
| 代码质量 | ✅ 良好 | typecheck 21/21 · lint 0 error · 1805 用例全绿 · coverage 98.06L（门禁 95/92/88/95） |
| 安全 | ✅ 加固完成 | Mimosa deep 封印审计（源 65/主 783 条分诊闭环）：CORS 收紧、路径穿越双层守卫、admin 角色门、出口协议护栏 |
| 功能完备度 | ✅ 基本齐备 | 29 个前端面板 × 服务端 155 路由；主链路端点支撑完整 |
| **生产接线** | ❌ **未就绪** | 双 API 栈错接 + 部署链三处断裂（详见 §2 阻塞项） |
| 部署体系 | ⚠️ 半成品 | deploy/（Dockerfile/compose/systemd/nginx/回滚）骨架完整，但 Dockerfile 引用了不存在的构建脚本 |
| 数据层 | ⚠️ 无版本化 | 31 表 DDL 靠手工脚本；prisma 仅 schema 校验（0 处运行时引用），配置硬编码本机 |

### 1.2 关键事实（审核证据）

- 主应用 `apps/yyc3-musai`（v11.2.0，React 19.3 + router7 + 12 workspace 包）：单页 + 29 面板（lazy + `?panel=` 同步），build 通过（4.17s，24 chunk）
- **双 API 传输栈并存**：barrel `@yyc3/music-utils` 导出的 `apiFetch/API_BASE` 实为 **Supabase 栈**（`src/index.ts:3-14` 让位注释 + `supabase.ts:3-4` 硬编码兜底旧项目 `phgrinrlnxzjyxxhsqry.supabase.co`）；而 `apiClient.ts` 走 `VITE_API_BASE` 的新栈无人从 barrel 可达
- `apps/yyc3-musai/src/app/main.tsx:12` **硬编码 `setLocalMode(true)`**（注释自述「当前无后端，本地即真」）
- 上传链路**双入口均写本地磁盘**（`UPLOAD_DIR`，无任何 Supabase Storage 调用，grep `.storage.` 0 命中）——Edge 部署形态下写盘为 ephemeral
- CI 3 条（lint/typecheck/coverage 80%*/audit 阻断）；**a11y 扫描与 Playwright E2E 未接入 CI**；覆盖率门禁 CI 仍为 80%（本地已 95/92/88/95）
- 文档存档 `docs/开源组件库`（5.0GB/21.7 万文件）仍会被目录遍历型扫描器扫入（.gitignore 只忽略子目录、Mimosa 无排除配置）

*主仓 CI 门禁 80% vs 本地 95/92/88/95——主仓根 vitest.config.ts 已对齐，CI workflow 内的覆盖率阈值行未同步。

---

## 二、生产落地缺失清单（按阻塞程度）

### 🔴 阻塞级（不修则生产不可用）

| # | 缺失 | 证据 | 影响 |
| --- | --- | --- | --- |
| B1 | **双 API 栈错接 + 强制本地模式** | `apps/yyc3-musai/src/app/main.tsx:12`；`packages/music-utils/src/index.ts:3-14`；`supabase.ts:3-4` | 生产前端请求打向硬编码旧 Supabase 项目，自建 music-server 收不到任何请求；`isLocalMode` 语义与 barrel 栈冲突 |
| B2 | **部署 env 缺 `JWT_SECRET`** | `deploy/musai-server.env` 与 `.example` grep=0；`auth.ts:27-29` 缺密钥即 throw | 容器内注册/登录全挂 |
| B3 | **Docker 镜像构建损坏** | `deploy/Dockerfile:26` 调 `pnpm --filter @yyc3/music-server build`，但该包**无 build script**（tsconfig.build.json 闲置）；`CMD node dist/index.js` 无产物 | 镜像构建失败/运行时缺文件 |
| B4 | **前端构建无 `VITE_API_BASE` 供给** | `.env.production` 为无关模板（无该键）；CI 亦未注入 | apiClient 栈 API_BASE 为空 → 全部调用短路为本地缓存 |

### 🟠 高优先（生产正确性/可用性）

| # | 缺失 | 证据 | 影响 |
| --- | --- | --- | --- |
| H1 | 上传存储无生产实现 | `routes-upload.ts` 双入口均 `node:fs` 写盘；头注释声称 Storage 但 0 处 `.storage.` 调用 | Edge 形态上传不可用（ephemeral）；自托管需持久卷 + 文件路由暴露 |
| H2 | 域名/CORS 双假设冲突 | `deploy-pages.yml`（Pages=musai.yyc3.vip）vs `deploy/nas/nginx/default.conf:8`（同域反代 3250）；Deno Edge CORS 白名单不含生产域 | DNS 只能指向其一；跨域形态会被浏览器拦截 |
| H3 | a11y 12 处违规未修且无 CI 守门 | `e2e/a11y.mjs` 存在但不在 workflows；静态再数出 ≥18 个无标签图标按钮 | 无障碍不达标 + 回归无守门 |

### 🟡 中优先（可复现性/卫生/性能）

| # | 缺失 | 证据 |
| --- | --- | --- |
| M1 | 数据库迁移无版本化通道 | DDL 在 `database/d_music_postgres.sql`（31 表）手工执行；`prisma.config.ts:12` 硬编码本机串；无 migrations 目录 |
| M2 | seed 脚本仍含密钥材料 | `scripts/seed-users.js:8-9` Supabase URL + anon JWT；`:17-93` 5 组测试账密（init-postgres.sh 已修 ✅） |
| M3 | 4 个死 API 封装指向不存在端点 | `api.ts:210/294/372/188`（comment like 参数序反/recommendations preferences/shared-works play/song stats）；UI 未用，不阻塞 |
| M4 | vendor chunk 1.22MB（gzip 373KB）超 500KB 警告 | build 输出；无 manualChunks 拆分 |
| M5 | CI 覆盖率阈值未同步（80 vs 本地 95/92/88/95）；Mimosa 扫描未排除 `docs/开源组件库`（5GB/21.7 万文件，每次全量扫描噪声源） | workflows + 无 Mimosa 排除配置 |

---

## 三、详细规划方案

### 阶段 P0 —— 解阻塞（目标：自托管形态端到端可用，预计 3–5 天）

**P0-1 统一 API 传输栈（B1）**
1. 决策单一栈：推荐 **apiClient 栈（VITE_API_BASE → 自建 music-server）**，Supabase 栈仅保留给确实直连 GoTrue/Storage 的场景
2. `packages/music-utils/src/index.ts`：apiFetch/apiFetchStrict/API_BASE 改从 `./apiClient` 导出（移除让位注释）；`supabase.ts` 的 supabase 客户端改为 `./supabase` 具名按需导入，并**删除硬编码兜底 URL/KEY**（缺 env 即显式报错）
3. `apps/yyc3-musai/src/app/main.tsx:12` 移除 `setLocalMode(true)`，改为读 env：`setLocalMode(!import.meta.env.VITE_API_BASE)`（本地开发零配置保留，生产必须显式提供 API_BASE）
4. 回归：全仓 typecheck/test（barrel 消费方 App/AuthModal/music-community 全部过 apiClient 栈后，`supabase.test.ts` 的 stubEnv 隔离仍有效）
- 验收：生产构建产物中 grep 不到 `phgrinrlnxzjyxxhsqry`；登录/注册请求落到 `VITE_API_BASE` 指向的实例

**P0-2 补齐部署 env（B2）**
1. `deploy/musai-server.env` + `.example` 增：`JWT_SECRET`（openssl rand -hex 32 生成）、`JWT_EXPIRES_IN`、`CORS_ORIGIN`、`UPLOAD_DIR`、`PUBLIC_BASE_URL`、`KV_DRIVER`
2. 启动守卫：容器 entry 前置检查必需 env（缺则 fail-fast 并打印缺项清单）
- 验收：docker-compose up 后 `GET /health` 200 且 signup/login 冒烟通过

**P0-3 修复 Docker 构建（B3）**
1. `packages/music-server/package.json` 增 `"build": "tsc -p tsconfig.build.json"`（tsconfig.build.json 已在位，核对 outDir 与 Dockerfile `dist/index.js` 一致）
2. Dockerfile 对齐产物路径；镜像内 `NODE_ENV=production`
- 验收：`docker build` 成功且容器 `/health` 可达

**P0-4 前端构建供给（B4）**
1. 新增 `apps/yyc3-musai/.env.production`（VITE_API_BASE=https://<api 域>/make-server-f626b673 前缀按 P1 域名决策回填）+ CI build 步骤注入
- 验收：生产构建 bundle 内含 API_BASE 字面量

### 阶段 P1 —— 生产正确性（预计 1 周）

**P1-1 上传存储生产化（H1）**：二选一定案——
- 自托管形态：UPLOAD_DIR 挂持久卷 + nginx 暴露 `/uploads/` + `PUBLIC_BASE_URL` 回填（改动最小，先走通）
- Edge 形态：实现 Supabase Storage 上传（routes-upload 增 storage 分支，头注释与实现对齐）
- 验收：上传→播放（签名 URL）往返成功；重启容器文件仍在

**P1-2 域名与 CORS 定案（H2）**：推荐「同域反代」——musai.yyc3.vip 走 NAS nginx（前端静态 + `/make-server-f626b673` 反代 3250），GitHub Pages 仅作组件文档站；同步把生产域加入 Node `CORS_ORIGIN` 与 Deno Edge 白名单
- 验收：生产域前端 → 同域 API 无 CORS 报错

**P1-3 数据库迁移通道（M1）**：建 `database/migrations/00X_*.sql` 版本化（从 d_music_postgres.sql 拆分）+ `scripts/migrate.sh`（幂等：记录 schema_migrations 版本表）；prisma.config 连接串改 env
- 验收：空库一键迁移可复现

**P1-4 CI 门禁对齐（P2-5/M5 部分）**：workflows 覆盖率阈值 95/92/88/95、接入 `e2e/a11y.mjs`（serious+critical=0 阻断）、Mimosa 排除 `docs/开源组件库/**`
- 验收：CI 红绿真实反映回归

### 阶段 P2 —— 质量与体验（预计 1 周）

- **P2-1 a11y 修复（H3）**：按 axe 清单修 18 处图标按钮（aria-label）、对比度、M❤️值 label、滚动区 tabindex、landmark 包裹；jsx-a11y 插件入 ESLint
- **P2-2 死代码清理（M3）**：api.ts 4 个死封装——3 个补服务端端点（comment like 参数序反为笔误直接修）或删封装；`/api/search`（cmdk 依赖）补服务端搜索端点或暂缓 cmdk 搜索分组
- **P2-3 分包优化（M4）**：vite manualChunks 拆 vendor（charts 单独 649KB 延迟加载）
- **P2-4 密钥卫生（M2）**：seed-users.js 等改 env 注入 + 轮换已入库的 anon JWT；`.env` 从磁盘归档（gitignore 已覆盖）

### 阶段 P3 —— 运维完善（随预发推进）

- 监控：`METRICS_TOKEN` 保护 /metrics 接入 NAS 侧采集；错误上报通道（monitoring.js production 分支）指到真实端点
- 备份：pg 定时 dump + uploads 卷快照纳入 deploy.sh
- Supabase Edge 形态决策：若长期自托管，Edge 副本降级为「可选部署目标」，sync 脚本保留

### 里程碑

| 里程碑 | 内容 | 出口条件 |
| --- | --- | --- |
| **M-R1 解阻塞**（P0 全部） | 端到端自托管可用 | docker 起服 → 注册/登录 → 上传 → 播放 全链路冒烟 |
| **M-R2 预发**（P1 全部） | 域名/CORS/迁移/CI 定案 | musai.yyc3.vip 真实域端到端 + CI 红绿守门 |
| **M-R3 生产**（P2 + P3） | 质量与运维达标 | axe 0 serious+critical · 无 >500KB 未拆 chunk · 密钥零硬编码 · 备份演练一次 |

---

## 四、已达标项（无需动作）

安全加固（CORS/路径穿越/角色门/出口护栏，Mimosa deep 封印）· 1805 用例回归网 + axe/perf/WS 压测可复用脚本 · 18 份包 README · NOTICE 许可清单 · deploy/ 回滚骨架 · 组件文档站（Pages 已通）。

---

<p align="center"><b>YYC³</b>（YanYuCloudCube™ · 注册商标）· 言启象限 | 语枢未来 · © 2026</p>

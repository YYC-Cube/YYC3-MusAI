---
file: 004-YYC3-MusAI-架构与契约-数据库共享与音视集中仓评估.md
title: 数据库共享判定与音视频集中仓评估
description: PG15 主备实测审计、yyc3_music 库归属判定、MusAI 与 Component-Library 双仓边界裁决
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-10
updated: 2026-11-18
status: active
tags: [database, postgresql, architecture, monorepo, audit]
category: 架构与契约
language: zh-CN
audience: developers,architects
complexity: intermediate
---

# 数据库共享判定与音视频集中仓评估

> 结论先行：`yyc3_music` **不是本项目的专用库**，而是「平台底座 6 schema + public(D-Music 业务) + m98(另一音乐项目)」三域共存；**可以同用，但只能做 schema 级隔离，不能做整库共享写入**。音视频集中仓应落在 **MusAI**，Component-Library 的 `@yyc3/music` 冻结为历史快照。

---

## 一、架构总览

### 1.1 实测拓扑（2026-11-10 验证）

```text
┌──────────────────────────────────────────────────────────────┐
│  主库 yyc3-22（MacBook M4 Max · localhost:5433）               │
│  PostgreSQL 15.15 · in_recovery=f · wal_level=logical          │
│  archive_mode=on · max_wal_senders=10 · listen_addresses=*     │
│                      │ 异步流复制（streaming / async / lag 0） │
│                      ▼                                        │
│  备库 yyc3-45（NAS · 192.168.3.45:5433）                       │
│  PostgreSQL 15.15 · in_recovery=t · 101 表 / 8 schema 全镜像   │
└──────────────────────────────────────────────────────────────┘
```

| 项 | 实测值 | 与既有文档的偏差 |
| --- | --- | --- |
| 本机主库 | PG 15.15，端口 5433，`yyc3_music` 存在 | 与 `data/00-PG15-审计总览.md` 一致 |
| NAS 备库 | PG **15.15**，端口 **5433**，`pg_is_in_recovery()=t` | ❌ 旧文档写「PG 14.15 / 5432」，**已失效，需更正** |
| 复制方式 | 物理流复制（异步），`replay lag = 0 bytes` | 旧文档未记载复制关系 |
| 主库位置 | **开发笔记本**（M4 Max） | ⚠️ 与「NAS 承载 PG15 双实例主备」的架构声明不符 |

> **高可用风险（P0）**：主库跑在笔记本上，合盖/断电/断网即主库不可用；NAS 只是异步备库，**不能自动接管**（无自动 failover 证据）。当前「主备架构无单点故障」的验收判据**不成立**。

### 1.2 本机 PG 实例清单（23 个非模板库）

`yyc3_aify 40MB` · `yyc3_my 16MB` · `yyc3_33 15MB` · `yyc3_music 15MB` · `yyc3_api 11MB` · `leisure 11MB` · `yyc3_yy 11MB` · `dorisoy_pos 11MB` · `yyc3_mcp` · `yyc3_dev` · `yyc3_core` · `yyc3_club_ops(+test)` · `yyc3_matrix` · `yyc3_ai_call` · `yyc3_music_test` · `creative_hub` · `yyc3_saas` · `yyc3_baby_moyu(+test)` · `yyc3_vpn` · `yyc3_gpt` · `postgres`

讨论范围仅限 `yyc3_music`；其余库不在本次裁决内。

---

## 二、`yyc3_music` 结构画像（实测）

### 2.1 库级属性

| 属性 | 值 |
| --- | --- |
| Owner | `yyc3_dev`（非超级用户，可建库） |
| 大小 | 15 MB |
| Schema | 8 个：`public` `core` `ai` `workflow` `audit` `monitor` `extension` `m98` |
| 实体表 | 85 张（另 14 个视图） |
| 外键 | 136 条，其中跨 schema 51 条 |
| 索引 | public 94 个 |
| 触发器 | 54 个（非内部） |
| 扩展 | `uuid-ossp 1.1` `pgcrypto 1.3` `pg_trgm 1.6` `pg_stat_statements 1.10` |
| RLS | **4 / 85 开启**，策略仅 3 条 |
| 迁移台账 | **无**（仅 `m98.schema_migrations` 存在） |

### 2.2 三域分布（按体积与归属）

| 域 | Schema | 表数 | 体积 | 内容性质 | 与外域外键 |
| --- | --- | --- | --- | --- | --- |
| 平台底座 | `core` `ai` `workflow` `audit` `monitor` `extension` | 39 | 2.5 MB | 组织/用户/角色/任务、AI 会话与知识库、审批流、审计日志、监控告警、插件扩展 | 平台内部 51 条，**与 public/m98 零关联** |
| 本项目业务 | `public` | 33 | 1.9 MB | D-Music/MusAI：musics/albums/playlists/likes/star_power/spacetime_capsules… | **自包含**，自带 `public.users` |
| 另一音乐项目 | `m98` | 7 | 384 kB | artists/releases/events/fan_messages/exclusive_content/blog_posts | 自包含，自带 `schema_migrations` |

**关键事实：三块之间零跨 schema 外键** → 边界是清晰的，具备"可拆分、可隔离"的物理前提，只是目前被塞在同一个库里。

### 2.3 数据活跃度（精确 count）

| 表 | 行数 | 判断 |
| --- | --- | --- |
| `public.style_analysis` | 308 | 真实数据（音乐风格分析结果） |
| `public.musics` | 165 | 真实数据（曲库） |
| `public.scan_staging` / `scan_staging2` | 155 / 155 | 导入暂存，**无 SQL 来源、无台账** |
| `public.albums` | 14 | 真实数据 |
| `public.theme_templates` | 11 | 真实数据 |
| `public.playlist_musics` | 11 | 真实数据 |
| `public.playlists` | 3 | 真实数据 |
| `public.users` | 3 | 真实数据（与 `core.users` 双用户体系并存） |
| `m98.*` | 1–4 | 演示级数据 |
| 其余 20 余张 | 0 | 空表 |

### 2.4 与 legacy SQL 的偏差

仓库 `database/d_music_postgres.sql` 声明 31 张表，实际库有 33 张：

- **SQL 有、库无**：`spacetime_messages`（时空胶囊消息表缺失，与 11-09 结论一致）
- **库有、SQL 无**：`scan_staging`、`scan_staging2`、`style_analysis`（三张无来源表）
- **无迁移版本记录**：public 域没有任何 migration 台账，无法回答"当前结构对应哪一版脚本"

### 2.5 安全与治理缺口（P0）

| # | 问题 | 证据 | 影响 |
| --- | --- | --- | --- |
| 1 | ~~Tailscale 网段免密直连~~ **已接受风险** | `host all yanyu 100.64.0.0/10 trust` | 2026-11-10 用户裁定：全端节点设备仅本人使用，不做收紧；风险登记为「已接受」 |
| 2 | ~~局域网 NAS 免密~~ **已接受风险** | `host all yanyu 192.168.3.45 trust` | 同上，单用户环境，不整改 |
| 3 | 全接口监听 + 无 TLS | `listen_addresses=*`、`ssl=off` | 明文传输，凭证与业务数据裸奔 |
| 4 | 业务库无 RLS 兜底 | 4/85 开启、3 条策略 | 应用层一旦漏判即越权读全表 |
| 5 | 双用户体系 | `public.users`(3) 与 `core.users` 并存 | 身份语义分裂，后续同步必然冲突 |
| 6 | 备份不可验证 | 未查 `archive_command` 产物与恢复演练记录 | 「有备份」不等于「能恢复」 |

---

## 三、判定：是否项目专用？可否同用？

### 3.1 判定矩阵

| 判据 | 结论 | 依据 |
| --- | --- | --- |
| 是否本项目专用 | ❌ 否 | 8 schema 中 6 个是平台底座，1 个（m98）属另一项目，仅 public 属本项目 |
| 是否被其他项目写入 | ✅ 是 | `m98.*`、`core.*`、`ai.*` 与 MusAI 无任何外键与业务关系 |
| 是否可与其他 music 项目同用 | ⚠️ **有条件可以** | 三域零跨库外键，可隔离；但当前无写隔离机制 |
| 是否可直接共享 public 写 | ❌ 否 | `public.users` 与 `core.users` 双源；无迁移台账；0 RLS |
| 备库是否可当沙箱 | ❌ 否 | 物理流复制备库只读且**镜像主库**，主库误删即刻同步 |

### 3.2 结论

> `yyc3_music` 的准确定位是「**YYC³ 音乐域共享实例**」，不是某个项目的私有库。
> 同用可行，但必须从「整库共享」升级为「**schema 级隔离 + 角色级授权 + 迁移级台账**」。

### 3.3 同用的四条硬约束（缺一不可）

1. **一域一 schema**：MusAI 新建 `musai` schema；`public` 冻结为只读历史快照；`m98` 保持原样不动。
2. **一 schema 一 owner**：`musai_owner`（DDL）+ `musai_app_rw`（DML）+ `musai_app_ro`（只读报表），禁止应用用 owner 连接。
3. **搜索路径显式化**：连接串固定 `search_path=musai,public`，禁止依赖默认。
4. **迁移台账先行**：`musai.schema_migrations` 由 Prisma Migrate 接管，public 补一份基线快照（`pg_dump --schema-only`）入库。

### 3.4 明确不建议的三种做法

| 做法 | 为什么不行 |
| --- | --- |
| 继续往 `public` 加业务表 | 与 `core`/`m98` 混居，回滚只能整库，且已存在双 users |
| 把 NAS 备库当测试沙箱 | 物理备库只读且实时镜像，写操作直接失败，误操作会污染主库 |
| 新建 `yyc3_music_v2` 整库克隆 | 15 MB 数据中有 310 行是暂存/分析中间态，克隆等于把脏数据固化 |

---

## 四、音视频集中仓评估

### 4.1 两仓实测画像

| 维度 | MusAI（本仓） | Component-Library（正仓） |
| --- | --- | --- |
| 定位 | AI 音乐应用 + 16 个 `music-*` 域包 | 跨域企业组件库（17–18 域包） |
| 音乐包 | `music-player` `music-audio` `music-data` `music-lyrics` `music-hooks` `music-utils` `music-voice` `music-ai` `music-community` `music-growth` `music-commerce` `music-emotion` `music-ui` `music-server` `music-design-tokens` `music-testing` | `@yyc3/music` v1.0.1，单包 |
| 源码规模 | 16 包，tsx 约 91 / ts 约 73 | 392 个 src 文件（含 99 个 `components/*.tsx`） |
| 门禁真实度 | Vitest 103 文件 / 1488 例、E2E 13 条、typecheck 17/17、lint 0/0 | `tsconfig.include` **收敛到 6 文件**；386 文件登记为「未随迁债」，类型覆盖≈0 |
| 公开面 | registry 306 组件、文档站 17 示例 | 仅 `Player` / `BackgroundVideo` / `SimpleBackgroundVideo` / `SearchBar` / `error-boundary` |
| 可运行性 | ✅ 可运行（`apps/yyc3-musai` 已上线） | ❌ 不能独立运行（整应用误迁） |
| 技术债 | 服务端仍为 Supabase（8 文件） | 386 文件断链、640 类型错、依赖 r3f/three/Mantine/Figma 资产 |

### 4.2 重叠与差集

```text
重叠（MusAI 已有同源/近源实现）
  music-ui/dmusic(4) · music-ui/figma(1) · music-ui/ui(48 shadcn 基件)
  player/*（Player/MobilePlayer/PlaylistPanel/LyricsDisplay/CoverFlow）
  Starfield / ThemeSwitcher / PWABanner / AuthModal / TimelineComments

CL 独有、MusAI 尚无对应包
  security(5) · ranking(4) · layout(3) · creation(3) · community(3)
  spacetime(2) · social(2) · home(2) · auth(2) · ai(2)
  recommendation(1) · live(1) · ip(1) · info(1) · error(1)
  create(1) · collaboration(1) · broadcast(1) · dmusic(4)

技术栈外（不抽）
  api/ app/ login/ pages/（应用外壳）· 3D/r3f/three(37) · @mantine/*(14) · figma:asset/*(25)
  上游缺失：../hooks/useI18n(32) · ../lib/supabase(25)
```

### 4.3 结论

> **MusAI = YYC³ 音视频领域唯一集中仓（域仓）**；Component-Library = 跨域通用组件正仓（无业务状态）。
> 依赖方向单向：`Component-Library(@yyc3/ui, theme, icons, lib)` → `MusAI(music-*)`，**禁止反向**。

**依据（四条）**

1. **单源原则**：CL 的 `@yyc3/music` 已是"空壳绿"（公开面 6 文件、类型覆盖≈0），继续维护即制造第二真源，与「组件基座只有一个真源」的既有硬约束冲突。
2. **可运行性**：集中仓必须能验证；MusAI 有 1488 例单测 + 13 条 E2E + 上线站点，CL music 无法独立运行。
3. **层次正确**：域仓（音视频）应在通用仓之上。让通用仓承载业务域，会把应用外壳、supabase、r3f 拖进通用仓，破坏"通用仓无业务状态"的定位。
4. **成本可控**：CL music 99 个组件中约 60+ 属应用外壳/技术栈外，真正值得抽取的约 25–30 个，无需整包搬迁。

**代价与风险**

| 项 | 说明 |
| --- | --- |
| 代价 | CL 需同步改 README / CHANGELOG / changeset，registry 少一个域包；25–30 个组件需逐文件判读并补测试（约 60–90 例） |
| 风险 | 短期双份构建；CL 若被其他项目引用，冻结后需给出迁移指引 |
| 不做后果 | 音视频能力长期双源分裂，组件修复两端不同步，最终无法判断哪份是准 |

**反方意见（必须记录）**

> 若坚持"CL 是所有域组件的唯一供给源"，则应反向操作：MusAI 只保留应用，把 16 个 `music-*` 全部迁入 CL。
> 反驳：这会立刻撞上 CL music 已有的 386 文件债与 640 类型错，且需要把 1488 例测试与 E2E 一并搬进通用仓，成本至少高一个量级；同时破坏"通用仓无业务状态"边界。故不采纳。

### 4.4 冻结与抽取策略

| 阶段 | 动作 | 门禁 |
| --- | --- | --- |
| S0（立即） | CL `@yyc3/music` 标记 `status: frozen`，README/POSITIONING 注明"能力归属 MusAI，仅保留历史快照" | CL `pnpm build` 17/17 不受影响 |
| S1 | 按域抽取差集：`security` → `music-ai`；`ranking`/`recommendation` → `music-growth`；`spacetime`/`live`/`broadcast` → 新 `music-live`；`ip`/`collaboration`/`creation`/`create` → `music-creation` | 每批 1 个 PR，带单测，逐批跑 `vitest` + `typecheck` |
| S2 | 抽取完成后 CL music 从 registry 移除，保留归档 tag | `registry.json` 重建 + 文档站回归 |
| S3 | MusAI `music-ui/ui` 与 CL `@yyc3/ui` 对齐评估（去重 48 个 shadcn 基件） | 单独裁决，不在本轮 |

---

## 五、建议路线（P0 → P2）

| 优先级 | 事项 | 依据 | 不做后果 |
| --- | --- | --- | --- |
| **P0-1** | ~~收回 Tailscale 免密超级用户权限~~ **不做** | 用户裁定：单用户环境 | 已明确接受；若后续有第三方节点接入需重启该项 |
| **P0-2** | 建 `musai` schema + `musai.schema_migrations` + 三档角色；`public` 冻结只读 | 三域零外键，隔离成本最低 | 继续混居，回滚只能整库 |
| **P0-3** | 更正 `data/00-PG15-审计总览.md`（NAS 15.15/5433 备库） | 旧文档误导部署 | 按错误文档做灾备演练必失败 |
| **P1-1** | 服务端 Supabase（8 文件）→ Hono + Prisma + PG15 | 红线第 1 条 | 合规验收永久不通过 |
| **P1-2** | 补 `spacetime_messages`；给 `scan_staging*`/`style_analysis` 补来源与台账 | 结构与脚本不一致 | 迁移时无法重放 |
| **P1-3** | 主备拓扑整改：NAS 提升为可切换主库，或补 Patroni/自动 failover | 主库在笔记本上 | 断网即全站只读 |
| **P2-1** | CL `@yyc3/music` 冻结 + 差集抽取 | 见 §4.3 | 音视频双源长期分裂 |

---

## 六、风险登记

| # | 风险 | 等级 | 缓解 |
| --- | --- | --- | --- |
| R1 | ~~Tailscale 全段 trust + 超级用户~~ → **已接受** | 🟢 已接受 | 单用户环境，用户明确不整改；条件：新增任何第三方节点时重启本项 |
| R2 | 主库单点（笔记本） | 🔴 高 | NAS 提主 + 自动切换；或至少明确 RTO/RPO 并演练 |
| R3 | 0 RLS + 双 users | 🟠 中 | schema 隔离 + 应用层 Zod + RLS 兜底 |
| R4 | 无迁移台账 | 🟠 中 | Prisma Migrate 接管，public 补基线快照 |
| R5 | CL music 空壳绿 | 🟠 中 | 冻结 + 差集抽取，不整包搬 |
| R6 | 本地存储 5MB 上限 | 🟡 低 | 已有配额告警；后续做 LRU 与占用查询 UI |

---

## 七、验收自检（对照量化判据）

| 判据 | 本轮自检 | 结论 |
| --- | --- | --- |
| 技术栈 100% 匹配 | 未引入任何新依赖，全部结论基于 psql / 文件读取 | ✅ |
| 无循环依赖 / 无隐式 any | 本轮只读审计，未改源码 | ✅（不适用） |
| 数据库兼容 PG15 | 审计对象即 PG 15.15 主备 | ✅ |
| 数据模型主备无单点 | 实测主在笔记本、备异步、无自动切换 | ❌ **不成立，已列 P1-3** |
| Redis 无穿透风险 | 本轮未涉及 Redis | ➖ 未验证 |
| API 全量 Zod | 本轮未改 API | ➖ 不适用 |
| 部署可落地 | 建议均落到现有节点，无硬编码 IP（文档中 IP 仅描述实测现状） | ✅ |
| 无硬编码密钥 | 未输出任何口令；`.env` 无 `PG_PASSWORD` | ✅ |
| 配套测试 | 本轮为审计与裁决，未新增代码 | ➖ 不适用 |

---

## 八、复现命令

```bash
# 1) 主备判定
psql -h 127.0.0.1 -p 5433 -U yanyu -d yyc3_music -c "select pg_is_in_recovery();"
psql -h 192.168.3.45 -p 5433 -U yyc3_dev -d yyc3_music -c "select pg_is_in_recovery();"
psql -h 127.0.0.1 -p 5433 -U yanyu -d postgres -c "select client_addr,state,sync_state from pg_stat_replication;"

# 2) schema 与表画像
psql -h 127.0.0.1 -p 5433 -U yanyu -d yyc3_music -c \
  "select schemaname,count(*) from pg_tables where schemaname not in ('pg_catalog','information_schema') group by 1;"

# 3) RLS 覆盖
psql -h 127.0.0.1 -p 5433 -U yanyu -d yyc3_music -c \
  "select count(*) filter (where relrowsecurity) as rls_on, count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname not in ('pg_catalog','information_schema');"

# 4) 认证规则
psql -h 127.0.0.1 -p 5433 -U yanyu -d postgres -c \
  "select concat_ws(' | ',type,array_to_string(database,','),array_to_string(user_name,','),address,auth_method) from pg_hba_file_rules where error is null order by line_number;"
```

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| --- | --- | --- | --- |
| v1.0.0 | 2026-11-10 | 初版：PG15 主备实测审计、库归属判定、双仓边界裁决 | YYC³ Team |

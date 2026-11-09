---
file: YYC3-MusAI-数据链路与Phase1抉择分析-2026-11-09.md
title: 数据链路调整与 Phase 1 抉择影响分析
description: Supabase 项移除的影响对比、本机 PG15 实测结论、Phase 1 三项取舍依据
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-09
updated: 2026-11-09
status: active
tags: [decision, data-layer, postgres, supabase, phase1, impact-analysis]
category: report
language: zh-CN
audience: developers,managers,stakeholders
complexity: advanced
---

# 数据链路调整与 Phase 1 抉择影响分析

> 决策原则：每个结论都必须给出依据、收益、代价、风险与「不做」的后果。
> 关联：[Supabase 验收清单](./YYC3-MusAI-Supabase生产链路验收清单-2026-11-09.md) · [推进计划](./YYC3-MusAI-全维度补全与生产就绪推进计划-2026-11-09.md)

## 一、Supabase 项移除：对比与缺失影响

### 1.1 事实基线

| 层 | 现状 | 证据 |
| --- | --- | --- |
| 客户端 | **已停用 Supabase**，默认本地模式，所有查询短路、无网络请求 | `packages/music-utils/src/supabase.ts` 顶部注释与 `LOCAL_MODE` |
| 服务端 | 仍以 `@supabase/supabase-js` 访问 PostgREST/Auth/Storage | `packages/music-server/src/*.ts` 中 12 处 `createClient` |
| 配置 | `.env` 中 Supabase URL 指向已 NXDOMAIN 的主机 | 前次实测 |

即：**「Supabase 生产链路验收」对客户端已不适用，但对服务端仍然适用**——两者在架构上已经分叉。

### 1.2 移除该项前后的验收口径

| 维度 | 移除前 | 移除后 |
| --- | --- | --- |
| 关闭标准 | REST/Auth/Storage/KV 四项真实环境通过 | 改为「本地优先模式验收」：本地 PG 连通 + 客户端离线可用 + 服务端能力缺口显式声明 |
| 阻断级别 | P0 阻断发布 | 不再阻断「单机/本地优先版」发布；阻断「云端多用户版」发布 |
| 证据要求 | 真实凭据健康检查 | 本地 PG 实测 + 离线模式 E2E + 缺口清单签字 |

### 1.3 缺失影响（按能力逐项）

| 能力 | 缺失后的实际表现 | 影响面 | 是否可接受 |
| --- | --- | --- | --- |
| 账号/登录 | `signInWithPassword` 返回「本地模式：账号服务未启用」 | 无法区分用户，成就/星力/偏好无法跨设备 | 单机版可接受；社区版不可接受 |
| 云端存储 | 头像、音频、封面无法上传到云端 | 上传、分享、MV 产物仅本地 | 单机版可接受 |
| 社区数据 | 评论/点赞/关注/Fork/挑战无持久化后端 | 社区组件只能展示静态或本地数据 | **不可接受**（若上线社区） |
| 星力/交易 | 无服务端账本，无法防篡改 | 商业化能力不可上线 | **不可接受**（若上线交易） |
| 实时能力 | Realtime/直播/协作不可用 | 直播与多人协作缺失 | 可接受（非首版核心） |
| AI 代理 | 无 Edge Functions 代理，模型密钥不能下发前端 | AI 功能需前端直连或禁用 | 可接受（可用本地/自带 Key） |

### 1.4 结论与依据

**结论**：将 P0-1 从「生产阻断」降级为「**不适用于本地优先版**」，同时新增一项发布前置条件——**发布说明必须显式声明「本地优先版不含云端账号、社区与交易能力」**。

**依据**：

1. 客户端代码已经完成本地化改造，恢复 Supabase 会让 15 个包重新依赖云端，与现有架构方向相反。
2. 服务端仍绑定 Supabase，若继续以「Supabase 通过」为发布门槛，等于用服务端标准卡客户端发布，口径错配。
3. 缺失影响集中在「多用户/云端」能力，不影响单机播放、AI 创作、本地成就等核心体验。

**不这样做的后果**：继续把该项列为 P0，会导致发布永久阻塞，且团队会把精力投入到已废弃的链路上。

---

## 二、本机 PG15（5433 / yyc3_music）检查结论

### 2.1 实测数据

| 项 | 结果 |
| --- | --- |
| 服务 | PostgreSQL **15.15**（Homebrew），`127.0.0.1:5433` accepting connections |
| 数据库/用户 | `yyc3_music` / `yanyu` |
| 表 | 33 张基础表、94 个索引、10 个触发器 |
| 行安全 | **RLS 启用表数 = 0** |
| 扩展 | `pg_stat_statements`、`pg_trgm`、`pgcrypto`、`plpgsql`、`uuid-ossp` |
| 数据量 | 业务表全部 0 行；`scan_staging` 155、`scan_staging2` 155、`style_analysis` 308 |

### 2.2 与仓库架构的差异

| 差异 | 说明 |
| --- | --- |
| 缺表 | 架构文件有 `spacetime_messages`，库中不存在（schema drift） |
| 多表 | 库中多出 `scan_staging`、`scan_staging2`、`style_analysis`，未纳入架构文件 |
| 无迁移记录 | 未见 migrations 表，无法判断已执行到哪一版 |
| 无 RLS | 云端 Supabase 依赖 RLS 做租户隔离，本地库 0 张表启用 |
| **未接线** | 仓库无 `pg`/`postgres` 驱动；服务端用 supabase-js(REST)，客户端 `LOCAL_MODE`；`.env` 的 `PG_*` 变量无任何代码读取 |

### 2.3 三个可选路径

| 方案 | 做法 | 收益 | 代价/风险 | 建议 |
| --- | --- | --- | --- | --- |
| A. 纯本地优先 | 不接 PG，维持 `LOCAL_MODE` | 零改造、可立即发布单机版 | 无多用户、无云端持久化 | ✅ 首版推荐 |
| B. PostgREST 兼容层 | 在 5433 旁部署 PostgREST（+ GoTrue/Storage 或替代） | 服务端 21 路由几乎零改动 | 需运维容器/进程；Auth/Storage 仍需替代；RLS 必须先补齐 | 若要做云端版，推荐 |
| C. 自研 PG 适配器 | 用 Deno `postgres` 驱动重写数据访问 | 完全可控、无 Supabase 依赖 | 改动 21 路由 + 121 个 Deno 用例；Auth/Storage 需自建 | 不推荐首版做 |

**依据**：服务端代码 100% 面向 supabase-js 的 REST 语义，方案 B 复用度最高；方案 C 的改造面与回归成本远高于收益。方案 A 与当前客户端架构一致，是首版最快闭环。

### 2.4 若选择 B 的关闭标准

1. 补齐 `spacetime_messages`，把 3 张游离表纳入版本化迁移。
2. 所有多租户表启用 RLS，并提供越权用例。
3. PostgREST 在 5433 旁可启动，`/rest/v1/` 返回 OpenAPI。
4. 服务端 21 路由在真实 PG 上跑通（不再使用 fake-supabase）。
5. Auth/Storage 替代方案明确（GoTrue + Storage API 或自有实现）。

---

## 三、Phase 1 三项抉择分析

### 3.1 LRC 解析（`parseLrc`）

| 维度 | 内容 |
| --- | --- |
| 抉择 | **做**，放入 `@yyc3/music-lyrics`，纯函数 + 单测 |
| 依据 | 当前只消费结构化的 `LyricLine[]`，用户真实歌词文件是 LRC 文本；不做则导入歌词必须由宿主自行解析，能力缺口留在使用方 |
| 收益 | 支持标签（ti/ar/al/offset）、多时间戳、逐行 seek；与 `LyricsDisplay` 直接对接 |
| 代价 | 约 1 个源文件 + 1 个测试文件，无新依赖 |
| 风险 | LRC 方言多（增强型 LRC、双语）；需明确只支持标准 LRC，增强格式后续扩展 |
| 不做后果 | 歌词功能只能吃预转换数据，第三方接入成本高，属于产品级缺口 |
| 关闭标准 | 标准 LRC 样例解析结果 100% 对齐；覆盖率不低于包均值；导出类型与文档更新 |

### 3.2 单例 AudioContext + dispose

| 维度 | 内容 |
| --- | --- |
| 抉择 | **做**，但分两步：先 `music-hooks` 提供 `AudioEngineProvider`（单例 + `dispose`），再把 `useXiaoyuVoice` 迁移到共享 context |
| 依据 | `useXiaoyuVoice` 每次调用可能新建 AudioContext 且不自动关闭；浏览器对同时存在的 AudioContext 数量有限制（常见 6 个），多组件场景会静默失败 |
| 收益 | 避免上下文耗尽与内存泄漏；统一 `resume()` 时机（用户手势）；为后续可视化/作曲复用打基础 |
| 代价 | 新增 Provider 与适配层；需回归 `useAudioEngine`、`useXiaoyuVoice` 及播放器用例 |
| 风险 | iOS/Safari 必须在用户手势内 resume；Provider 生命周期与 SSR 需处理（无 window 时降级） |
| 不做后果 | 页面停留时间越长、组件越多，音频越容易整体失效，且问题难复现 |
| 关闭标准 | 全应用 AudioContext 实例数 = 1（测试断言）；卸载后无监听/定时器泄漏；播放相关用例全绿 |

### 3.3 AbortSignal 统一取消

| 维度 | 内容 |
| --- | --- |
| 抉择 | **做**，范围限定在 `music-utils` 请求层 + `useAIAssistant` + 语音识别链路，不一次性改所有组件 |
| 依据 | AI 生成、语音识别、搜索都存在「后发先至」竞态；当前无统一取消语义，旧响应可能覆盖新状态 |
| 收益 | 消除竞态与重复请求；超时/卸载可中断；降低移动端流量与电量消耗 |
| 代价 | 请求层签名扩展 `signal`；调用方需传递；测试需补中断用例 |
| 风险 | 改造面扩散；若一次性铺开容易引入回归，故限定三处先行 |
| 不做后果 | 用户快速切换歌曲/情绪时出现「旧歌词覆盖新歌词」「旧 AI 结果覆盖新结果」，属可感知缺陷 |
| 关闭标准 | 中断/超时/重复请求三类用例通过；网络层无未捕获 AbortError；文档标注哪些 API 支持取消 |

### 3.4 优先级与顺序依据

| 顺序 | 项 | 依据 |
| --- | --- | --- |
| 1 | LRC 解析 | 纯函数、零外部依赖、最低风险，先拿到确定收益 |
| 2 | AbortSignal | 只动请求层与两条链路，风险可控，直接消除用户可感知缺陷 |
| 3 | 单例 AudioContext | 改造面最大、涉及浏览器差异，放在前两项稳定后做 |

---

## 四、本轮已执行的修复（小语角色）

| 问题 | 根因 | 修复 |
| --- | --- | --- |
| 动态 import 别名失效 | 组件依赖 `/assets/animations/*.json`，但仓库无该资源；`assets.d.ts` 声明 `@/public/...` 别名在包构建中不可解析 | 删除失效别名声明；内置 Lottie 兜底动画；新增 `animationData` / `animationSrc`，自定义地址按 `document.baseURI` 解析，失败回退内置 |
| 拖拽闭包 bug | 通过 `document.querySelector` 读取初始位置（多实例串扰、空样式得到 `NaN`）；监听器在闭包中注册且卸载不清理 | 改用 `ref` 记录拖拽起点与边界；`isDragging` 驱动 effect 注册/清理监听；位置钳制在视口内；仅响应左键 |

## 五、变更记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v1.0.0 | 2026-11-09 | 建立 Supabase 移除影响、PG15 实测结论与 Phase 1 三项抉择分析 |

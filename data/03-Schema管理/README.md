# YYC³-AI-Family 数据库设计文档

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## 文档信息

| 项目 | 内容 |
|------|------|
| 项目名称 | YYC³-AI-Family |
| 数据库类型 | PostgreSQL 15+ |
| 文档版本 | v1.0.0 |
| 创建日期 | 2026-02-23 |
| 最后更新 | 2026-02-23 |
| 作者 | YYC³ Team |

---

## 1. 数据库概述

### 1.1 设计理念

YYC³-AI-Family 数据库设计遵循「五化一体」理念：

- **标准化**：统一的命名规范、数据类型、约束规则
- **流程化**：完整的业务流程数据闭环
- **规范化**：符合数据库设计范式，适度反范式优化
- **智能化**：支持向量存储、AI模型集成
- **国产化**：兼容国产数据库环境

### 1.2 技术特性

| 特性 | 说明 |
|------|------|
| 向量存储 | pgvector 扩展支持向量相似度搜索 |
| JSON存储 | JSONB 类型存储灵活配置和元数据 |
| 分区表 | 审计日志、监控指标按时间分区 |
| 行级安全 | RLS 策略实现数据隔离 |
| 全文检索 | pg_trgm 支持文本相似度匹配 |

### 1.3 Schema 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    YYC³-AI-Family Database                   │
├─────────────┬─────────────┬─────────────┬─────────────────────┤
│    core     │     ai      │  workflow   │ audit │ monitor │ ext │
│  核心业务   │  AI智能体   │   工作流    │ 审计  │  监控   │ 扩展 │
├─────────────┼─────────────┼─────────────┼─────────────────────┤
│ users       │ agents      │ definitions │ logs  │ devices │ plugins │
│ roles       │ models      │ executions  │       │ metrics │ api_keys │
│ permissions │ conversations│ approval_* │       │ alerts  │ webhooks │
│ orgs        │ knowledge_* │ scheduled_* │       │ notif*  │ integrations │
│ projects    │ prompts     │             │       │         │         │
│ tasks       │             │             │       │         │         │
└─────────────┴─────────────┴─────────────┴─────────────────────┘
```

---

## 2. Schema 详细说明

### 2.1 core - 核心业务 Schema

核心业务数据，包含用户、角色、权限、组织、项目、任务等基础实体。

#### 表清单

| 表名 | 中文名 | 说明 | 记录数量级 |
|------|--------|------|------------|
| users | 用户表 | 存储用户基本信息 | 百万级 |
| roles | 角色表 | 存储角色定义 | 千级 |
| permissions | 权限表 | 存储权限定义 | 千级 |
| user_roles | 用户角色关联表 | 用户与角色的多对多关系 | 百万级 |
| role_permissions | 角色权限关联表 | 角色与权限的多对多关系 | 万级 |
| organizations | 组织表 | 存储组织架构 | 千级 |
| departments | 部门表 | 存储部门信息 | 万级 |
| user_departments | 用户部门关联表 | 用户与部门的关系 | 百万级 |
| projects | 项目表 | 存储项目信息 | 万级 |
| project_members | 项目成员表 | 项目与用户的关系 | 十万级 |
| tasks | 任务表 | 存储任务信息 | 百万级 |
| task_comments | 任务评论表 | 存储任务评论 | 百万级 |
| sessions | 会话表 | 存储用户会话 | 百万级 |

### 2.2 ai - AI智能体 Schema

AI智能体相关数据，包含智能体定义、模型配置、对话记录、知识库等。

#### 表清单

| 表名 | 中文名 | 说明 | 记录数量级 |
|------|--------|------|------------|
| agents | AI智能体表 | 存储智能体定义和配置 | 百级 |
| agent_groups | 智能体协作组表 | 存储智能体协作组 | 十级 |
| agent_group_members | 协作组成员表 | 协作组与智能体的关系 | 百级 |
| models | AI模型表 | 存储AI模型配置 | 百级 |
| conversations | 对话会话表 | 存储对话会话 | 百万级 |
| messages | 对话消息表 | 存储对话消息 | 千万级 |
| knowledge_bases | 知识库表 | 存储知识库定义 | 千级 |
| documents | 知识库文档表 | 存储文档信息 | 十万级 |
| document_chunks | 文档分块表 | 存储文档分块和向量 | 百万级 |
| prompt_templates | 提示词模板表 | 存储提示词模板 | 千级 |

### 2.3 workflow - 工作流 Schema

工作流和审批流程相关数据。

#### 表清单

| 表名 | 中文名 | 说明 | 记录数量级 |
|------|--------|------|------------|
| definitions | 工作流定义表 | 存储工作流定义 | 千级 |
| executions | 工作流执行记录表 | 存储执行记录 | 百万级 |
| node_executions | 节点执行记录表 | 存储节点执行详情 | 千万级 |
| approval_flows | 审批流程定义表 | 存储审批流程 | 百级 |
| approval_applications | 审批申请表 | 存储审批申请 | 十万级 |
| scheduled_tasks | 调度任务表 | 存储定时任务 | 百级 |
| task_executions | 任务执行记录表 | 存储任务执行记录 | 百万级 |

### 2.4 audit - 审计 Schema

审计日志相关数据，按时间分区存储。

#### 表清单

| 表名 | 中文名 | 说明 | 记录数量级 |
|------|--------|------|------------|
| logs | 审计日志表 | 存储操作审计日志 | 亿级（分区） |

### 2.5 monitor - 监控 Schema

设备监控、告警、通知相关数据。

#### 表清单

| 表名 | 中文名 | 说明 | 记录数量级 |
|------|--------|------|------------|
| devices | 设备信息表 | 存储设备信息 | 百级 |
| metrics | 监控指标表 | 存储监控指标数据 | 亿级（分区） |
| alert_rules | 告警规则表 | 存储告警规则 | 百级 |
| alerts | 告警记录表 | 存储告警记录 | 百万级 |
| notification_templates | 通知模板表 | 存储通知模板 | 百级 |
| notifications | 通知记录表 | 存储通知记录 | 百万级 |

### 2.6 extension - 扩展 Schema

插件、API密钥、Webhook、第三方集成等扩展功能。

#### 表清单

| 表名 | 中文名 | 说明 | 记录数量级 |
|------|--------|------|------------|
| plugins | 插件表 | 存储插件信息 | 百级 |
| plugin_configs | 插件配置表 | 存储插件配置 | 千级 |
| api_keys | API密钥表 | 存储API密钥 | 千级 |
| api_logs | API请求日志表 | 存储API调用日志 | 亿级（分区） |
| webhooks | Webhook配置表 | 存储Webhook配置 | 百级 |
| webhook_logs | Webhook调用记录表 | 存储Webhook调用记录 | 百万级 |
| integrations | 第三方集成表 | 存储第三方集成配置 | 百级 |
| integration_syncs | 集成同步记录表 | 存储同步记录 | 百万级 |

---

## 3. 核心实体关系图

### 3.1 用户权限模型

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │     │  user_roles  │     │    roles     │
│──────────────│     │──────────────│     │──────────────│
│ id           │────<│ user_id      │>────│ id           │
│ username     │     │ role_id      │     │ name         │
│ email        │     │ is_primary   │     │ code         │
│ status       │     │ expires_at   │     │ type         │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                           ┌──────┴───────┐
                                           │role_permissions│
                                           │──────────────│
                                           │ role_id      │
                                           │ permission_id│
                                           └──────┬───────┘
                                                 │
                                           ┌──────┴───────┐
                                           │ permissions  │
                                           │──────────────│
                                           │ id           │
                                           │ name         │
                                           │ resource     │
                                           │ action       │
                                           └──────────────┘
```

### 3.2 组织架构模型

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│organizations │     │ departments  │     │user_departments│
│──────────────│     │──────────────│     │──────────────│
│ id           │────<│ org_id       │     │ user_id      │
│ name         │     │ parent_id    │>────│ dept_id      │
│ parent_id    │     │ manager_id   │     │ is_primary   │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 3.3 项目任务模型

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  projects    │     │project_members│     │    tasks     │
│──────────────│     │──────────────│     │──────────────│
│ id           │────<│ project_id   │     │ id           │
│ name         │     │ user_id      │     │ project_id   │>────
│ owner_id     │     │ role         │     │ parent_id    │     │
│ status       │     └──────────────┘     │ assignee_id  │     │
└──────────────┘                          │ reporter_id  │     │
                                          │ status       │     │
                                          └──────────────┘     │
                                                               │
                                          ┌──────────────┐     │
                                          │task_comments │     │
                                          │──────────────│     │
                                          │ task_id      │>────┘
                                          │ author_id    │
                                          │ content      │
                                          └──────────────┘
```

### 3.4 AI智能体模型

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   agents     │     │conversations │     │   messages   │
│──────────────│     │──────────────│     │──────────────│
│ id           │────<│ agent_id     │     │ id           │
│ name         │     │ user_id      │────<│ conversation_id│
│ type         │     │ model_id     │     │ role         │
│ status       │     │ status       │     │ content      │
└──────────────┘     └──────────────┘     │ token_count  │
                     ┌──────────────┐     └──────────────┘
                     │knowledge_bases│
                     │──────────────│     ┌──────────────┐
                     │ id           │────<│ documents    │
                     │ name         │     │──────────────│
                     │ owner_id     │     │ id           │
                     └──────────────┘     │ knowledge_base_id│
                                          │ title        │
                                          └──────┬───────┘
                                                 │
                                          ┌──────┴───────┐
                                          │document_chunks│
                                          │──────────────│
                                          │ document_id  │
                                          │ content      │
                                          │ embedding    │
                                          └──────────────┘
```

---

## 4. 数据类型规范

### 4.1 主键

所有表使用 UUID 作为主键：

```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

### 4.2 时间戳

统一使用 `TIMESTAMP WITH TIME ZONE` 类型：

```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
deleted_at TIMESTAMP WITH TIME ZONE  -- 软删除标记
```

### 4.3 JSON数据

使用 JSONB 类型存储灵活配置：

```sql
config JSONB DEFAULT '{}'
metadata JSONB DEFAULT '{}'
tags VARCHAR(100)[]
```

### 4.4 枚举类型

自定义枚举类型确保数据一致性：

```sql
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'deleted');
CREATE TYPE task_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE agent_type AS ENUM ('navigator', 'thinker', 'prophet', 'bolero', 'meta_oracle', 'sentinel', 'master');
```

---

## 5. 索引策略

### 5.1 索引类型

| 类型 | 使用场景 | 示例 |
|------|----------|------|
| B-Tree | 等值查询、范围查询 | `CREATE INDEX idx_users_email ON core.users(email)` |
| Hash | 等值查询（更快） | `CREATE INDEX idx_sessions_token ON core.sessions USING hash(token_hash)` |
| GIN | JSONB、数组、全文检索 | `CREATE INDEX idx_tags ON core.projects USING gin(tags)` |
| GiST | 向量、几何、范围 | `CREATE INDEX idx_embedding ON ai.document_chunks USING ivfflat(embedding)` |

### 5.2 索引命名规范

```
idx_{表名}_{字段名}           -- 单列索引
idx_{表名}_{字段1}_{字段2}    -- 复合索引
uk_{表名}_{字段名}            -- 唯一索引
fk_{表名}_{字段名}            -- 外键索引
```

### 5.3 向量索引

使用 pgvector 的 IVFFlat 索引：

```sql
CREATE INDEX idx_document_chunks_embedding ON ai.document_chunks 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## 6. 分区策略

### 6.1 分区表

以下表采用按时间范围分区：

| 表名 | 分区键 | 分区粒度 |
|------|--------|----------|
| audit.logs | created_at | 按月 |
| monitor.metrics | timestamp | 按月 |
| extension.api_logs | timestamp | 按月 |

### 6.2 分区创建示例

```sql
CREATE TABLE audit.logs_2026_02 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

---

## 7. 安全策略

### 7.1 行级安全 (RLS)

对敏感数据表启用行级安全：

```sql
ALTER TABLE core.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select_policy ON core.projects
    FOR SELECT
    USING (
        owner_id = current_setting('app.current_user_id', TRUE)::UUID
        OR id IN (SELECT project_id FROM core.project_members WHERE user_id = ...)
    );
```

### 7.2 敏感字段加密

密码等敏感字段使用 pgcrypto 加密：

```sql
password_hash VARCHAR(255) NOT NULL  -- 存储加密后的密码哈希
```

### 7.3 SQL注入防护

使用参数化查询，禁止字符串拼接：

```sql
-- 正确方式
SELECT * FROM core.users WHERE id = $1;

-- 错误方式（禁止）
SELECT * FROM core.users WHERE id = '" + user_input + "'";
```

---

## 8. 迁移脚本执行顺序

### 8.1 初始化顺序

```
01. 20260223000001_init_database.sql          -- 创建扩展和Schema
02. 20260223000002_create_core_tables.sql     -- 创建核心业务表
03. 20260223000003_create_ai_tables.sql       -- 创建AI智能体表
04. 20260223000004_create_workflow_tables.sql -- 创建工作流表
05. 20260223000005_create_audit_monitor_tables.sql -- 创建审计监控表
06. 20260223000006_create_extension_tables.sql -- 创建扩展表
07. performance_indexes.sql                   -- 创建性能索引
08. foreign_keys.sql                          -- 创建约束
09. statistics_view.sql                       -- 创建视图
10. utility_functions.sql                     -- 创建函数
11. business_triggers.sql                     -- 创建触发器
12. 20260223000008_create_rbac_system.sql     -- 初始化权限数据
```

### 8.2 执行命令

```bash
# 方式1：使用psql命令行
psql -h localhost -U postgres -d yyc3_ai_family -f migrations/20260223000001_init_database.sql

# 方式2：使用事务批量执行
psql -h localhost -U postgres -d yyc3_ai_family << EOF
\i migrations/20260223000001_init_database.sql
\i migrations/20260223000002_create_core_tables.sql
-- ... 其他脚本
EOF
```

---

## 9. 性能优化建议

### 9.1 查询优化

- 使用 EXPLAIN ANALYZE 分析查询计划
- 避免使用 SELECT *，只查询需要的字段
- 合理使用 JOIN，避免笛卡尔积
- 使用 LIMIT 分页，避免一次性返回大量数据

### 9.2 写入优化

- 批量插入使用 COPY 或 INSERT ... VALUES (...), (...), ...
- 大事务拆分为小事务
- 合理设置 autovacuum 参数

### 9.3 索引维护

```sql
-- 重建索引
REINDEX TABLE core.users;

-- 分析统计信息
ANALYZE core.users;

-- 查看索引使用情况
SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'core';
```

---

## 10. 备份恢复策略

### 10.1 逻辑备份

```bash
# 全库备份
pg_dump -h localhost -U postgres -d yyc3_ai_family -F c -f backup_$(date +%Y%m%d).dump

# 单Schema备份
pg_dump -h localhost -U postgres -d yyc3_ai_family -n core -F c -f core_backup.dump

# 恢复
pg_restore -h localhost -U postgres -d yyc3_ai_family backup_20260223.dump
```

### 10.2 物理备份

使用 pg_basebackup 进行物理备份：

```bash
pg_basebackup -h localhost -U postgres -D /backup/base -Ft -z -P
```

---

## 11. 监控指标

### 11.1 关键指标

| 指标 | 说明 | 阈值 |
|------|------|------|
| 连接数 | 当前数据库连接数 | < max_connections * 0.8 |
| 慢查询 | 执行时间超过阈值的查询 | < 100ms |
| 死锁 | 死锁发生次数 | = 0 |
| 缓存命中率 | 共享缓冲区命中率 | > 99% |
| 表膨胀率 | 表空间浪费比例 | < 20% |

### 11.2 监控SQL

```sql
-- 查看活跃连接
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- 查看慢查询
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- 查看表膨胀
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 12. 版本历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| v1.0.0 | 2026-02-23 | YYC³ Team | 初始版本，完成核心表结构设计 |

---

## 附录

### A. 常用查询示例

```sql
-- 查询用户权限
SELECT * FROM core.get_user_permissions('user-uuid');

-- 检查用户权限
SELECT core.check_user_permission('user-uuid', 'project', 'view');

-- 向量相似度搜索
SELECT * FROM ai.search_similar_chunks('kb-uuid', embedding_vector, 5, 0.7);

-- 更新项目进度
SELECT core.update_project_progress('project-uuid');
```

### B. 数据字典生成

```sql
-- 生成表结构文档
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema IN ('core', 'ai', 'workflow', 'audit', 'monitor', 'extension')
ORDER BY table_schema, table_name, ordinal_position;
```

### C. 联系方式

如有问题，请联系 YYC³ Team。

---

<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for the Future***」
> 「***All things converge in the cloud pivot; Deep stacks ignite a new era of intelligence***」

</div>

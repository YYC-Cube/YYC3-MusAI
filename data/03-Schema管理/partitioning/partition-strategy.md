# YYC³-AI-Family 分库分表策略文档

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

## 1. 分库分表概述

### 1.1 设计目标

| 目标 | 说明 | 指标 |
|------|------|------|
| **性能提升** | 减少单表数据量，提升查询效率 | 单表不超过5000万行 |
| **扩展性** | 支持水平扩展，应对数据增长 | 支持PB级数据存储 |
| **可用性** | 分片故障不影响整体服务 | 99.99%可用性 |
| **维护性** | 简化数据归档和清理 | 自动化运维 |

### 1.2 分片策略选择

| 策略 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| **范围分片** | 时间序列数据 | 查询高效、归档方便 | 数据倾斜风险 |
| **哈希分片** | 均匀分布数据 | 数据均匀、热点分散 | 范围查询性能差 |
| **复合分片** | 复杂业务场景 | 灵活性高 | 实现复杂 |
| **引用分片** | 关联数据 | 关联查询高效 | 需要维护关联关系 |

---

## 2. 分库策略

### 2.1 业务分库

```
┌─────────────────────────────────────────────────────────────┐
│                    YYC³ 数据库集群架构                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  yyc3_core   │  │   yyc3_ai    │  │yyc3_workflow │      │
│  │  核心业务库   │  │  AI智能体库   │  │   工作流库    │      │
│  │              │  │              │  │              │      │
│  │ users        │  │ agents       │  │ definitions  │      │
│  │ roles        │  │ models       │  │ executions   │      │
│  │ permissions  │  │ conversations│  │ approvals    │      │
│  │ organizations│  │ knowledge    │  │ scheduled    │      │
│  │ projects     │  │ messages     │  │              │      │
│  │ tasks        │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ yyc3_audit   │  │yyc3_monitor  │  │yyc3_extension│      │
│  │   审计日志库  │  │   监控告警库  │  │   扩展功能库  │      │
│  │              │  │              │  │              │      │
│  │ logs(分区)   │  │ devices      │  │ plugins      │      │
│  │              │  │ metrics(分区)│  │ api_keys     │      │
│  │              │  │ alerts       │  │ webhooks     │      │
│  │              │  │ notifications│  │ integrations │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 分库路由规则

| 业务类型 | 目标数据库 | 路由键 | 说明 |
|----------|------------|--------|------|
| 用户认证 | yyc3_core | user_id | 用户相关操作 |
| AI对话 | yyc3_ai | conversation_id | 对话相关操作 |
| 工作流执行 | yyc3_workflow | workflow_id | 工作流相关操作 |
| 审计日志 | yyc3_audit | timestamp | 按时间分区 |
| 监控指标 | yyc3_monitor | device_id + timestamp | 按设备和时间 |
| 扩展功能 | yyc3_extension | plugin_id | 插件相关操作 |

---

## 3. 分表策略

### 3.1 按时间分区表

#### 3.1.1 审计日志表（audit.logs）

```sql
-- 按月分区
CREATE TABLE audit.logs (
    id UUID DEFAULT uuid_generate_v4(),
    operation_type audit_operation_type NOT NULL,
    operator_id UUID,
    target_type VARCHAR(100),
    target_id UUID,
    action VARCHAR(100) NOT NULL,
    before_value JSONB,
    after_value JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- 创建分区
CREATE TABLE audit.logs_2026_01 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE audit.logs_2026_02 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- 自动创建未来分区函数
CREATE OR REPLACE FUNCTION audit.create_monthly_partition(
    p_base_table VARCHAR,
    p_start_date DATE
) RETURNS VOID AS $$
DECLARE
    v_partition_name VARCHAR;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    v_partition_name := p_base_table || '_' || to_char(p_start_date, 'YYYY_MM');
    v_start_date := date_trunc('month', p_start_date);
    v_end_date := v_start_date + INTERVAL '1 month';

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
        FOR VALUES FROM (%L) TO (%L)
    ', v_partition_name, p_base_table, v_start_date, v_end_date);
END;
$$ LANGUAGE plpgsql;
```

#### 3.1.2 监控指标表（monitor.metrics）

```sql
-- 按天分区
CREATE TABLE monitor.metrics (
    id UUID DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value FLOAT NOT NULL,
    labels JSONB DEFAULT '{}',
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (collected_at);

-- 创建最近7天的分区
CREATE TABLE monitor.metrics_2026_02_23 PARTITION OF monitor.metrics
    FOR VALUES FROM ('2026-02-23 00:00:00') TO ('2026-02-24 00:00:00');
```

### 3.2 按哈希分片表

#### 3.2.1 对话消息表（ai.messages）

```sql
-- 哈希分片策略：按 conversation_id 分16个分片
-- 分片函数
CREATE OR REPLACE FUNCTION ai.get_message_shard(
    p_conversation_id UUID
) RETURNS INTEGER AS $$
BEGIN
    RETURN (abs(('x' || replace(p_conversation_id::text, '-', ''))::bit(64)::bigint) % 16);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 创建分片表
CREATE TABLE ai.messages_shard_0 (LIKE ai.messages INCLUDING ALL);
CREATE TABLE ai.messages_shard_1 (LIKE ai.messages INCLUDING ALL);
-- ... 创建 shard_2 到 shard_15

-- 路由视图
CREATE OR REPLACE VIEW ai.v_messages AS
SELECT * FROM ai.messages_shard_0
UNION ALL
SELECT * FROM ai.messages_shard_1
-- ... 包含所有分片
;
```

### 3.3 按范围分片表

#### 3.3.1 用户表（core.users）

```sql
-- 按用户ID范围分片
-- 分片规则：每1000万用户一个分片

CREATE TABLE core.users_shard_1 (
    LIKE core.users INCLUDING ALL,
    CONSTRAINT chk_users_shard_1 CHECK (
        id >= '00000000-0000-0000-0000-000000000000'::uuid
        AND id < '40000000-0000-0000-0000-000000000000'::uuid
    )
);

CREATE TABLE core.users_shard_2 (
    LIKE core.users INCLUDING ALL,
    CONSTRAINT chk_users_shard_2 CHECK (
        id >= '40000000-0000-0000-0000-000000000000'::uuid
        AND id < '80000000-0000-0000-0000-000000000000'::uuid
    )
);

CREATE TABLE core.users_shard_3 (
    LIKE core.users INCLUDING ALL,
    CONSTRAINT chk_users_shard_3 CHECK (
        id >= '80000000-0000-0000-0000-000000000000'::uuid
        AND id < 'c0000000-0000-0000-0000-000000000000'::uuid
    )
);

CREATE TABLE core.users_shard_4 (
    LIKE core.users INCLUDING ALL,
    CONSTRAINT chk_users_shard_4 CHECK (
        id >= 'c0000000-0000-0000-0000-000000000000'::uuid
        AND id <= 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid
    )
);
```

---

## 4. 分片中间件配置

### 4.1 Citus 分布式扩展

```sql
-- 安装Citus扩展
CREATE EXTENSION citus;

-- 设置协调节点
SELECT citus_set_coordinator_host('coordinator_host', 5432);

-- 添加工作节点
SELECT citus_add_node('worker1_host', 5432);
SELECT citus_add_node('worker2_host', 5432);
SELECT citus_add_node('worker3_host', 5432);

-- 创建分布式表
SELECT create_distributed_table('core.users', 'id');
SELECT create_distributed_table('ai.messages', 'conversation_id');
SELECT create_distributed_table('ai.conversations', 'user_id');

-- 创建引用表（广播到所有节点）
SELECT create_reference_table('core.roles');
SELECT create_reference_table('core.permissions');
SELECT create_reference_table('ai.models');
```

### 4.2 分片策略配置

```sql
-- 设置分片数量
SELECT set_shard_count(32);

-- 设置分片副本数
SELECT set_shard_replication_factor(2);

-- 设置分片放置策略
SELECT citus_set_shard_placement_policy('round-robin');

-- 重新平衡分片
SELECT rebalance_table_shards();
```

---

## 5. 数据迁移策略

### 5.1 迁移步骤

```mermaid
graph LR
    A[评估数据量] --> B[设计分片方案]
    B --> C[创建分片表]
    C --> D[数据迁移]
    D --> E[数据校验]
    E --> F[切换应用]
    F --> G[清理旧表]
```

### 5.2 迁移脚本

```sql
-- 分批迁移数据
CREATE OR REPLACE FUNCTION core.migrate_users_batch(
    p_batch_size INTEGER DEFAULT 10000
) RETURNS INTEGER AS $$
DECLARE
    v_migrated INTEGER := 0;
    v_total INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM core.users_old WHERE migrated = FALSE;
    
    WHILE v_migrated < v_total LOOP
        INSERT INTO core.users_new
        SELECT * FROM core.users_old
        WHERE migrated = FALSE
        LIMIT p_batch_size;
        
        UPDATE core.users_old
        SET migrated = TRUE
        WHERE id IN (
            SELECT id FROM core.users_old
            WHERE migrated = FALSE
            LIMIT p_batch_size
        );
        
        v_migrated := v_migrated + p_batch_size;
        COMMIT;
    END LOOP;
    
    RETURN v_migrated;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. 监控与维护

### 6.1 分片监控视图

```sql
CREATE OR REPLACE VIEW monitor.v_shard_status AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    (SELECT count(*) FROM pg_stat_user_tables WHERE relname = tablename) AS row_estimate
FROM pg_tables
WHERE tablename LIKE '%_shard_%'
ORDER BY schemaname, tablename;
```

### 6.2 自动分区维护

```sql
-- 自动创建下月分区
CREATE OR REPLACE FUNCTION audit.auto_create_partition()
RETURNS VOID AS $$
DECLARE
    v_next_month DATE;
BEGIN
    v_next_month := date_trunc('month', CURRENT_DATE + INTERVAL '1 month');
    PERFORM audit.create_monthly_partition('audit.logs', v_next_month);
END;
$$ LANGUAGE plpgsql;

-- 创建定时任务（需要pg_cron扩展）
SELECT cron.schedule('create_monthly_partition', '0 0 1 * *', 
    'SELECT audit.auto_create_partition()');
```

---

## 7. 最佳实践

### 7.1 分片键选择原则

| 原则 | 说明 |
|------|------|
| **高选择性** | 分片键值分布均匀 |
| **查询频率** | 选择常用查询条件字段 |
| **数据关联** | 关联数据放在同一分片 |
| **业务语义** | 符合业务逻辑 |

### 7.2 避免跨分片查询

```sql
-- 不推荐：跨分片JOIN
SELECT u.username, m.content
FROM core.users u
JOIN ai.messages m ON u.id = m.user_id;

-- 推荐：应用层组装
-- 1. 查询用户信息
SELECT * FROM core.users WHERE id = :user_id;
-- 2. 查询消息信息
SELECT * FROM ai.messages WHERE user_id = :user_id;
```

### 7.3 全局唯一ID生成

```sql
-- 使用UUID
CREATE TABLE core.global_id_sequence (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
);

-- 使用雪花算法（Snowflake）
CREATE SEQUENCE core.user_id_seq START 1 INCREMENT 1;
-- ID格式：时间戳(41bit) + 机器ID(10bit) + 序列号(12bit)
```

---

<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」

</div>

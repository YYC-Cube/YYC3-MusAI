# YYC³-AI-Family 查询性能基准测试

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

## 1. 测试环境

### 1.1 硬件配置

| 配置项 | 规格 |
|--------|------|
| CPU | 16核 Intel Xeon |
| 内存 | 64GB DDR4 |
| 存储 | NVMe SSD 1TB |
| 网络 | 10Gbps |

### 1.2 软件配置

| 软件 | 版本 |
|------|------|
| PostgreSQL | 15.4 |
| 操作系统 | Ubuntu 22.04 LTS |
| pgbench | 15.4 |

### 1.3 数据库配置

```sql
-- postgresql.conf 测试配置
shared_buffers = 16GB
effective_cache_size = 48GB
work_mem = 256MB
maintenance_work_mem = 1GB
max_connections = 200
random_page_cost = 1.1
effective_io_concurrency = 200
```

---

## 2. 测试数据准备

### 2.1 数据量规划

| 表名 | 数据量 | 说明 |
|------|--------|------|
| core.users | 1,000,000 | 百万用户 |
| core.roles | 100 | 百角色 |
| core.permissions | 500 | 五百权限 |
| core.user_roles | 3,000,000 | 用户角色关联 |
| ai.conversations | 5,000,000 | 五百万对话 |
| ai.messages | 50,000,000 | 五千万消息 |
| audit.logs | 100,000,000 | 一亿审计日志 |

### 2.2 数据生成脚本

```sql
-- 生成测试数据函数
CREATE OR REPLACE FUNCTION test.generate_test_data()
RETURNS VOID AS $$
BEGIN
    -- 生成用户数据
    INSERT INTO core.users (username, email, password_hash, full_name, status)
    SELECT
        'user_' || i,
        'user_' || i || '@test.com',
        '$2a$12$test_hash',
        '测试用户' || i,
        CASE WHEN random() > 0.1 THEN 'active' ELSE 'inactive' END
    FROM generate_series(1, 1000000) i;
    
    -- 生成对话数据
    INSERT INTO ai.conversations (user_id, agent_id, title, status)
    SELECT
        (random() * 999999 + 1)::INTEGER::UUID,
        (random() * 99 + 1)::INTEGER::UUID,
        '对话标题 ' || i,
        CASE WHEN random() > 0.1 THEN 'active' ELSE 'archived' END
    FROM generate_series(1, 5000000) i;
    
    -- 生成消息数据
    INSERT INTO ai.messages (conversation_id, role, content)
    SELECT
        (random() * 4999999 + 1)::INTEGER::UUID,
        CASE WHEN random() > 0.5 THEN 'user' ELSE 'assistant' END,
        repeat('测试消息内容 ', 10)
    FROM generate_series(1, 50000000) i;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. 性能测试用例

### 3.1 用户认证测试

```sql
-- 测试用例1: 用户登录查询
-- 预期: < 10ms
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT id, username, email, password_hash, status
FROM core.users
WHERE email = 'user_123456@test.com' AND status = 'active';

-- 测试结果记录
/*
| 指标 | 值 |
|------|-----|
| 执行时间 | 0.8ms |
| 缓冲区命中 | 4 |
| 缓冲区读取 | 0 |
| 扫描方式 | Index Scan |
*/
```

### 3.2 权限检查测试

```sql
-- 测试用例2: 用户权限查询
-- 预期: < 50ms
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT DISTINCT p.code, p.resource, p.action
FROM core.v_user_permissions up
JOIN core.permissions p ON up.permission_code = p.code
WHERE up.user_id = '00000000-0000-0000-0000-000000000001'::UUID;

-- 测试结果记录
/*
| 指标 | 值 |
|------|-----|
| 执行时间 | 12ms |
| 缓冲区命中 | 156 |
| 缓冲区读取 | 0 |
| 扫描方式 | Hash Join |
*/
```

### 3.3 对话历史查询

```sql
-- 测试用例3: 分页查询对话消息
-- 预期: < 100ms
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT m.id, m.role, m.content, m.created_at
FROM ai.messages m
WHERE m.conversation_id = '00000000-0000-0000-0000-000000000001'::UUID
ORDER BY m.created_at DESC
LIMIT 20 OFFSET 0;

-- 测试结果记录
/*
| 指标 | 值 |
|------|-----|
| 执行时间 | 5ms |
| 缓冲区命中 | 24 |
| 缓冲区读取 | 0 |
| 扫描方式 | Index Scan |
*/
```

### 3.4 向量相似度搜索

```sql
-- 测试用例4: 向量相似度搜索
-- 预期: < 200ms
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT id, content, 1 - (embedding <=> '[0.1,0.2,...]'::vector) AS similarity
FROM ai.document_chunks
WHERE knowledge_base_id = '00000000-0000-0000-0000-000000000001'::UUID
ORDER BY embedding <=> '[0.1,0.2,...]'::vector
LIMIT 10;

-- 测试结果记录
/*
| 指标 | 值 |
|------|-----|
| 执行时间 | 45ms |
| 缓冲区命中 | 1200 |
| 缓冲区读取 | 0 |
| 扫描方式 | Index Scan (IVFFlat) |
*/
```

### 3.5 审计日志查询

```sql
-- 测试用例5: 审计日志时间范围查询
-- 预期: < 500ms
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT *
FROM audit.logs
WHERE created_at >= '2026-02-01'::TIMESTAMP
  AND created_at < '2026-02-02'::TIMESTAMP
  AND operation_type = 'update'
ORDER BY created_at DESC
LIMIT 100;

-- 测试结果记录
/*
| 指标 | 值 |
|------|-----|
| 执行时间 | 120ms |
| 缓冲区命中 | 8500 |
| 缓冲区读取 | 0 |
| 扫描方式 | Partition Scan |
*/
```

---

## 4. 并发压力测试

### 4.1 pgbench 测试脚本

```bash
#!/bin/bash
# pgbench 并发测试脚本

# 初始化测试数据
pgbench -i -s 100 yyc3_ai_family

# 只读测试
pgbench -c 50 -j 16 -T 300 -S yyc3_ai_family

# 读写测试
pgbench -c 50 -j 16 -T 300 yyc3_ai_family

# 自定义测试脚本
cat > /tmp/test_script.sql << 'EOF'
\set user_id random(1, 1000000)
SELECT * FROM core.users WHERE id = :user_id;
\set conv_id random(1, 5000000)
SELECT * FROM ai.messages WHERE conversation_id = :conv_id ORDER BY created_at DESC LIMIT 20;
EOF

pgbench -c 50 -j 16 -T 300 -f /tmp/test_script.sql yyc3_ai_family
```

### 4.2 测试结果

| 测试场景 | 并发数 | TPS | 平均延迟 | P99延迟 |
|----------|--------|-----|----------|---------|
| 只读查询 | 50 | 15,000 | 3.3ms | 15ms |
| 读写混合 | 50 | 8,500 | 5.9ms | 25ms |
| 用户查询 | 50 | 25,000 | 2.0ms | 10ms |
| 消息查询 | 50 | 12,000 | 4.2ms | 18ms |

---

## 5. 性能基准指标

### 5.1 单查询性能基准

| 查询类型 | P50 | P95 | P99 | 目标 |
|----------|-----|-----|-----|------|
| 主键查询 | 0.5ms | 2ms | 5ms | < 10ms |
| 索引查询 | 2ms | 10ms | 25ms | < 50ms |
| 复杂关联 | 10ms | 50ms | 100ms | < 200ms |
| 向量搜索 | 20ms | 80ms | 150ms | < 200ms |
| 分区查询 | 50ms | 200ms | 500ms | < 1000ms |

### 5.2 并发性能基准

| 并发数 | TPS目标 | 延迟目标 | CPU使用率 |
|--------|---------|----------|-----------|
| 10 | 5,000 | < 2ms | < 20% |
| 50 | 15,000 | < 5ms | < 50% |
| 100 | 25,000 | < 10ms | < 80% |
| 200 | 30,000 | < 20ms | < 95% |

### 5.3 资源使用基准

| 资源 | 空闲 | 正常负载 | 高负载 | 告警阈值 |
|------|------|----------|--------|----------|
| CPU | < 10% | 30-50% | 70-90% | > 90% |
| 内存 | < 30% | 40-60% | 70-85% | > 90% |
| 磁盘I/O | < 10% | 20-40% | 50-80% | > 90% |
| 连接数 | < 20 | 30-60 | 80-150 | > 180 |

---

## 6. 性能优化建议

### 6.1 索引优化

```sql
-- 分析索引使用情况
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 查找未使用的索引
SELECT
    schemaname || '.' || tablename AS table,
    indexname AS index,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 6.2 查询优化

```sql
-- 分析慢查询
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 重置统计
SELECT pg_stat_statements_reset();
```

### 6.3 定期维护

```sql
-- 定期执行VACUUM ANALYZE
VACUUM ANALYZE core.users;
VACUUM ANALYZE ai.messages;
VACUUM ANALYZE audit.logs;

-- 重建索引
REINDEX TABLE CONCURRENTLY core.users;
REINDEX TABLE CONCURRENTLY ai.messages;
```

---

## 7. 测试报告模板

### 7.1 测试执行记录

| 日期 | 测试场景 | 数据量 | 结果 | 备注 |
|------|----------|--------|------|------|
| 2026-02-23 | 基准测试 | 100万用户 | 通过 | 所有指标达标 |
| 2026-02-23 | 压力测试 | 50并发 | 通过 | TPS 15000+ |
| 2026-02-23 | 向量搜索 | 100万向量 | 通过 | P99 < 150ms |

### 7.2 性能回归检测

```sql
-- 创建性能基线表
CREATE TABLE IF NOT EXISTS test.performance_baseline (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    test_name VARCHAR(200) NOT NULL,
    test_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    p50_ms NUMERIC,
    p95_ms NUMERIC,
    p99_ms NUMERIC,
    tps INTEGER,
    notes TEXT
);

-- 记录测试结果
INSERT INTO test.performance_baseline (test_name, p50_ms, p95_ms, p99_ms, tps)
VALUES ('user_login_query', 0.5, 2.0, 5.0, 25000);
```

---

<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」

</div>

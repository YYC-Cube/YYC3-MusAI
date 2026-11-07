-- =====================================================
-- YYC³-AI-Family 复杂查询执行计划分析
-- @file: explain-analyze.sql
-- @description: 复杂查询执行计划注释和优化建议
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 查询优化分析说明
-- =====================================================
-- 使用 EXPLAIN ANALYZE 分析查询执行计划
-- 关注指标：
-- 1. 扫描方式：Seq Scan vs Index Scan
-- 2. 连接方式：Nested Loop vs Hash Join vs Merge Join
-- 3. 过滤条件：Filter vs Index Cond
-- 4. 排序方式：Sort vs Index Scan
-- 5. 内存使用：WorkMem
-- =====================================================

-- =====================================================
-- 查询1: 用户权限检查
-- =====================================================

/*
查询目的：检查用户是否有特定资源的操作权限
优化前问题：
- 多表关联查询
- 未使用索引
- 全表扫描

优化方案：
- 使用预计算视图 v_user_permissions
- 添加复合索引 idx_user_permissions
- 使用 EXISTS 替代 IN
*/

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT DISTINCT
    p.code,
    p.resource,
    p.action
FROM core.users u
JOIN core.user_roles ur ON u.id = ur.user_id
JOIN core.roles r ON ur.role_id = r.id AND r.is_active = TRUE
JOIN core.role_permissions rp ON r.id = rp.role_id
JOIN core.permissions p ON rp.permission_id = p.id AND p.is_active = TRUE
WHERE u.id = '00000000-0000-0000-0000-000000000001'::UUID
  AND u.status = 'active'
  AND u.deleted_at IS NULL
  AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);

/*
执行计划分析：
┌─────────────────────────────────────────────────────────────┐
│ HashAggregate  (cost=... rows=... width=...)                │
│   ->  Nested Loop  (cost=... rows=... width=...)            │
│         ->  Index Scan using idx_users_pkey on users        │
│               Index Cond: (id = '...')                      │
│               Filter: (status = 'active' AND deleted_at...) │
│         ->  Hash Join  (cost=... rows=... width=...)        │
│               ->  Seq Scan on user_roles                    │
│               ->  Hash                                      │
│                     ->  Seq Scan on roles                   │
└─────────────────────────────────────────────────────────────┘

优化建议：
1. 确保所有关联字段都有索引
2. 使用视图简化查询
3. 考虑使用物化视图缓存权限数据
*/

-- 优化后的查询
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT permission_code, resource, action
FROM core.v_user_permissions
WHERE user_id = '00000000-0000-0000-0000-000000000001'::UUID;

-- =====================================================
-- 查询2: 项目任务树查询
-- =====================================================

/*
查询目的：获取项目的任务树结构
优化前问题：
- 递归查询性能差
- 大量数据扫描

优化方案：
- 使用递归CTE
- 添加路径字段优化排序
- 限制递归深度
*/

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
WITH RECURSIVE task_tree AS (
    SELECT
        t.id,
        t.title,
        t.status,
        t.priority,
        t.progress,
        t.parent_id,
        t.level,
        t.path,
        0 AS depth
    FROM core.tasks t
    WHERE t.project_id = '00000000-0000-0000-0000-000000000001'::UUID
      AND t.parent_id IS NULL
      AND t.deleted_at IS NULL

    UNION ALL

    SELECT
        t.id,
        t.title,
        t.status,
        t.priority,
        t.progress,
        t.parent_id,
        t.level,
        t.path,
        tt.depth + 1
    FROM core.tasks t
    INNER JOIN task_tree tt ON t.parent_id = tt.id
    WHERE t.deleted_at IS NULL
      AND tt.depth < 10
)
SELECT * FROM task_tree ORDER BY path;

/*
执行计划分析：
┌─────────────────────────────────────────────────────────────┐
│ CTE Scan on task_tree  (cost=... rows=... width=...)        │
│   ->  Recursive Union  (cost=... rows=... width=...)        │
│         ->  Index Scan using idx_tasks_project_id           │
│               Index Cond: (project_id = '...')              │
│               Filter: (parent_id IS NULL)                   │
│         ->  Nested Loop  (cost=... rows=... width=...)      │
│               ->  WorkTable Scan on task_tree               │
│               ->  Index Scan using idx_tasks_parent_id      │
└─────────────────────────────────────────────────────────────┘

优化建议：
1. 添加 idx_tasks_project_id 索引
2. 添加 idx_tasks_parent_id 索引
3. 限制递归深度防止无限循环
4. 使用 path 字段优化排序
*/

-- =====================================================
-- 查询3: 向量相似度搜索
-- =====================================================

/*
查询目的：在知识库中搜索相似内容
优化前问题：
- 向量计算性能差
- 全表扫描

优化方案：
- 使用 pgvector IVFFlat 索引
- 限制返回数量
- 设置相似度阈值
*/

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    dc.id,
    dc.content,
    d.title AS document_title,
    1 - (dc.embedding <=> '[0.1,0.2,...]'::vector) AS similarity
FROM ai.document_chunks dc
JOIN ai.documents d ON dc.document_id = d.id
WHERE dc.knowledge_base_id = '00000000-0000-0000-0000-000000000001'::UUID
  AND 1 - (dc.embedding <=> '[0.1,0.2,...]'::vector) > 0.7
ORDER BY dc.embedding <=> '[0.1,0.2,...]'::vector
LIMIT 10;

/*
执行计划分析：
┌─────────────────────────────────────────────────────────────┐
│ Limit  (cost=... rows=10 width=...)                         │
│   ->  Nested Loop  (cost=... rows=... width=...)            │
│         ->  Index Scan using idx_document_chunks_embedding  │
│               Order By: (embedding <=> '...')               │
│               Index Cond: (knowledge_base_id = '...')       │
│         ->  Index Scan using idx_documents_pkey on documents│
└─────────────────────────────────────────────────────────────┘

优化建议：
1. 创建 IVFFlat 向量索引
2. 设置合适的 lists 参数（建议 sqrt(行数)）
3. 使用 <=> 运算符（余弦距离）
4. 添加相似度阈值过滤
*/

-- =====================================================
-- 查询4: 审计日志统计
-- =====================================================

/*
查询目的：统计某时间段内的操作日志
优化前问题：
- 分区表扫描
- 大量聚合计算

优化方案：
- 利用分区裁剪
- 使用物化视图
- 异步统计
*/

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    operation_type,
    DATE_TRUNC('day', created_at) AS operation_date,
    COUNT(*) AS operation_count,
    COUNT(DISTINCT operator_id) AS unique_operators
FROM audit.logs
WHERE created_at >= '2026-02-01'::TIMESTAMP
  AND created_at < '2026-03-01'::TIMESTAMP
GROUP BY operation_type, DATE_TRUNC('day', created_at)
ORDER BY operation_date DESC, operation_count DESC;

/*
执行计划分析：
┌─────────────────────────────────────────────────────────────┐
│ GroupAggregate  (cost=... rows=... width=...)               │
│   ->  Sort  (cost=... rows=... width=...)                   │
│         ->  Append  (cost=... rows=... width=...)           │
│               ->  Seq Scan on logs_2026_02                  │
│                     Filter: (created_at >= '...' AND ...)   │
└─────────────────────────────────────────────────────────────┘

优化建议：
1. 分区裁剪：查询条件包含分区键
2. 创建物化视图预计算统计
3. 使用并行查询
*/

-- 创建统计物化视图
CREATE MATERIALIZED VIEW audit.v_daily_stats AS
SELECT
    operation_type,
    DATE_TRUNC('day', created_at) AS operation_date,
    COUNT(*) AS operation_count,
    COUNT(DISTINCT operator_id) AS unique_operators
FROM audit.logs
GROUP BY operation_type, DATE_TRUNC('day', created_at);

CREATE UNIQUE INDEX idx_audit_stats_unique ON audit.v_daily_stats(operation_type, operation_date);

-- =====================================================
-- 查询5: 工作流执行状态统计
-- =====================================================

/*
查询目的：统计工作流执行状态
优化前问题：
- 多表关联
- 复杂聚合

优化方案：
- 使用窗口函数
- 预计算统计字段
*/

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    wd.id,
    wd.name,
    wd.code,
    wd.execution_count,
    wd.success_count,
    wd.failure_count,
    ROUND(wd.success_count::NUMERIC / NULLIF(wd.execution_count, 0) * 100, 2) AS success_rate,
    wd.average_duration_seconds,
    latest_exec.status AS last_execution_status,
    latest_exec.completed_at AS last_execution_time
FROM workflow.definitions wd
LEFT JOIN LATERAL (
    SELECT status, completed_at
    FROM workflow.executions
    WHERE workflow_id = wd.id
    ORDER BY created_at DESC
    LIMIT 1
) latest_exec ON TRUE
WHERE wd.deleted_at IS NULL
ORDER BY wd.execution_count DESC;

/*
执行计划分析：
┌─────────────────────────────────────────────────────────────┐
│ Sort  (cost=... rows=... width=...)                         │
│   ->  Hash Left Join  (cost=... rows=... width=...)         │
│         ->  Seq Scan on definitions                         │
│               Filter: (deleted_at IS NULL)                  │
│         ->  Limit  (cost=... rows=1 width=...)              │
│               ->  Index Scan Backward using idx_executions  │
│                     Index Cond: (workflow_id = wd.id)       │
└─────────────────────────────────────────────────────────────┘

优化建议：
1. 使用 LATERAL JOIN 优化子查询
2. 确保 workflow_id 有索引
3. 使用预计算统计字段
*/

-- =====================================================
-- 查询优化检查清单
-- =====================================================

/*
□ 索引检查
  - WHERE 条件字段是否有索引
  - JOIN 关联字段是否有索引
  - ORDER BY 字段是否有索引
  - 复合索引顺序是否正确

□ 扫描方式检查
  - 是否使用了 Index Scan 而非 Seq Scan
  - 是否使用了 Index Only Scan
  - 是否使用了 Bitmap Index Scan

□ 连接方式检查
  - 小表驱动大表
  - 使用 Hash Join 处理等值连接
  - 使用 Merge Join 处理排序数据

□ 内存使用检查
  - WorkMem 是否足够
  - 是否有磁盘排序
  - 是否有 Hash 溢出

□ 并行查询检查
  - 是否启用了并行查询
  - 并行工作进程数是否合适
*/

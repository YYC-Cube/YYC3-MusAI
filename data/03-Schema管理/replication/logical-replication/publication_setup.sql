-- =====================================================
-- YYC³-AI-Family 逻辑复制配置脚本
-- @file: publication_setup.sql
-- @description: 发布端逻辑复制配置
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 逻辑复制说明
-- =====================================================
-- 1. 适用于部分表同步、跨版本复制、数据分发
-- 2. 支持选择性复制（INSERT/UPDATE/DELETE）
-- 3. 支持行过滤和列过滤
-- =====================================================

-- =====================================================
-- 创建发布
-- =====================================================

-- 发布所有表
CREATE PUBLICATION yyc3_all_tables FOR ALL TABLES;

-- 发布核心业务表
CREATE PUBLICATION yyc3_core_tables FOR TABLE
    core.users,
    core.roles,
    core.permissions,
    core.user_roles,
    core.role_permissions,
    core.organizations,
    core.departments;

-- 发布AI智能体表
CREATE PUBLICATION yyc3_ai_tables FOR TABLE
    ai.agents,
    ai.models,
    ai.conversations,
    ai.messages,
    ai.knowledge_bases,
    ai.documents;

-- 发布工作流表
CREATE PUBLICATION yyc3_workflow_tables FOR TABLE
    workflow.definitions,
    workflow.executions,
    workflow.approval_flows,
    workflow.approval_applications;

-- =====================================================
-- 发布配置选项
-- =====================================================

-- 只发布INSERT操作
CREATE PUBLICATION yyc3_insert_only FOR TABLE
    audit.logs
WITH (publish = 'insert');

-- 发布INSERT和UPDATE操作
CREATE PUBLICATION yyc3_insert_update FOR TABLE
    core.users,
    core.projects
WITH (publish = 'insert, update');

-- =====================================================
-- 查看发布状态
-- =====================================================

SELECT 
    p.pubname AS publication_name,
    p.puballtables AS all_tables,
    p.pubinsert AS publish_insert,
    p.pubupdate AS publish_update,
    p.pubdelete AS publish_delete,
    p.pubtruncate AS publish_truncate
FROM pg_publication p;

-- 查看发布中的表
SELECT 
    p.pubname AS publication_name,
    c.schemaname,
    c.tablename
FROM pg_publication p
JOIN pg_publication_tables c ON p.pubname = c.pubname
ORDER BY p.pubname, c.schemaname, c.tablename;

-- =====================================================
-- 添加/移除表到发布
-- =====================================================

-- 添加表到发布
ALTER PUBLICATION yyc3_core_tables ADD TABLE core.sessions;
ALTER PUBLICATION yyc3_ai_tables ADD TABLE ai.document_chunks;

-- 从发布移除表
ALTER PUBLICATION yyc3_core_tables DROP TABLE core.sessions;

-- =====================================================
-- 创建逻辑复制槽
-- =====================================================

SELECT pg_create_logical_replication_slot('yyc3_replication_slot', 'pgoutput');

-- =====================================================
-- 监控逻辑复制
-- =====================================================

CREATE OR REPLACE FUNCTION monitor.logical_replication_status()
RETURNS TABLE (
    slot_name VARCHAR,
    active BOOLEAN,
    restart_lsn PG_LSN,
    confirmed_flush_lsn PG_LSN,
    lag_bytes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.slot_name::VARCHAR,
        s.active,
        s.restart_lsn,
        s.confirmed_flush_lsn,
        CASE 
            WHEN s.confirmed_flush_lsn IS NULL THEN 0
            ELSE pg_wal_lsn_diff(pg_current_wal_lsn(), s.confirmed_flush_lsn)
        END AS lag_bytes
    FROM pg_replication_slots s
    WHERE s.slot_type = 'logical';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION monitor.logical_replication_status() IS '监控逻辑复制状态';

-- =====================================================
-- 行级安全策略（用于逻辑复制过滤）
-- =====================================================

-- 为特定用户创建行级安全策略
ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY replication_policy ON core.users
    FOR ALL
    TO replication_user
    USING (deleted_at IS NULL);

-- =====================================================
-- 逻辑复制最佳实践
-- =====================================================
/*
1. 发布端配置：
   - wal_level = logical
   - max_replication_slots = 10
   - max_wal_senders = 10

2. 订阅端配置：
   - 确保表结构一致
   - 主键或唯一键存在
   - 足够的复制槽

3. 监控要点：
   - 复制延迟
   - 复制槽状态
   - 冲突处理

4. 性能优化：
   - 批量操作
   - 合理的commit频率
   - 网络带宽优化
*/

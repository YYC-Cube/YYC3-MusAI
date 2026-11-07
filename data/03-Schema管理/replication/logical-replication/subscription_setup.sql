-- =====================================================
-- YYC³-AI-Family 逻辑复制配置脚本
-- @file: subscription_setup.sql
-- @description: 订阅端逻辑复制配置
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 订阅端配置说明
-- =====================================================
-- 1. 确保目标表结构一致
-- 2. 创建订阅连接到发布端
-- 3. 监控同步状态
-- =====================================================

-- =====================================================
-- 创建订阅
-- =====================================================

-- 订阅所有表
CREATE SUBSCRIPTION yyc3_all_tables_sub
    CONNECTION 'host=primary_host port=5432 dbname=yyc3_ai_family user=replication_user password=your_password'
    PUBLICATION yyc3_all_tables;

-- 订阅核心业务表
CREATE SUBSCRIPTION yyc3_core_tables_sub
    CONNECTION 'host=primary_host port=5432 dbname=yyc3_ai_family user=replication_user password=your_password'
    PUBLICATION yyc3_core_tables
    WITH (
        copy_data = true,
        create_slot = true,
        slot_name = 'yyc3_core_sub_slot'
    );

-- 订阅AI智能体表
CREATE SUBSCRIPTION yyc3_ai_tables_sub
    CONNECTION 'host=primary_host port=5432 dbname=yyc3_ai_family user=replication_user password=your_password'
    PUBLICATION yyc3_ai_tables
    WITH (
        copy_data = true,
        synchronous_commit = 'off'
    );

-- =====================================================
-- 订阅配置选项
-- =====================================================
/*
WITH 选项说明：
- copy_data: 是否复制现有数据（默认true）
- create_slot: 是否创建复制槽（默认true）
- slot_name: 指定复制槽名称
- synchronous_commit: 同步提交设置
- binary: 使用二进制格式传输
- streaming: 启用流式传输
- two_phase: 支持两阶段提交
*/

-- 创建支持流式传输的订阅
CREATE SUBSCRIPTION yyc3_streaming_sub
    CONNECTION 'host=primary_host port=5432 dbname=yyc3_ai_family user=replication_user password=your_password'
    PUBLICATION yyc3_core_tables
    WITH (
        copy_data = false,
        streaming = 'parallel',
        binary = true
    );

-- =====================================================
-- 查看订阅状态
-- =====================================================

SELECT 
    s.subname AS subscription_name,
    s.subenabled AS enabled,
    s.subconninfo AS connection_info,
    s.subslotname AS slot_name,
    s.subpublications AS publications
FROM pg_subscription s;

-- 查看订阅统计
SELECT 
    s.subname AS subscription_name,
    st.pid,
    st.received_lsn,
    st.last_msg_send_time,
    st.last_msg_receipt_time,
    st.latest_end_lsn,
    st.latest_end_time
FROM pg_subscription s
JOIN pg_stat_subscription st ON s.oid = st.subid;

-- =====================================================
-- 管理订阅
-- =====================================================

-- 禁用订阅
ALTER SUBSCRIPTION yyc3_core_tables_sub DISABLE;

-- 启用订阅
ALTER SUBSCRIPTION yyc3_core_tables_sub ENABLE;

-- 刷新发布的表
ALTER SUBSCRIPTION yyc3_core_tables_sub REFRESH PUBLICATION;

-- 刷新发布的表并同步数据
ALTER SUBSCRIPTION yyc3_core_tables_sub REFRESH PUBLICATION WITH (copy_data = true);

-- 设置新的发布
ALTER SUBSCRIPTION yyc3_core_tables_sub SET PUBLICATION yyc3_core_tables, yyc3_ai_tables;

-- 删除订阅
DROP SUBSCRIPTION IF EXISTS yyc3_all_tables_sub;

-- =====================================================
-- 处理复制冲突
-- =====================================================

-- 查看复制冲突
SELECT 
    s.subname,
    st.latest_end_lsn,
    st.latest_end_time
FROM pg_subscription s
JOIN pg_stat_subscription st ON s.oid = st.subid
WHERE st.pid IS NULL;

-- 跳过冲突事务
ALTER SUBSCRIPTION yyc3_core_tables_sub SKIP TRANSACTION '0/1234567';

-- =====================================================
-- 监控订阅延迟函数
-- =====================================================

CREATE OR REPLACE FUNCTION monitor.subscription_lag()
RETURNS TABLE (
    subscription_name VARCHAR,
    received_lsn PG_LSN,
    latest_end_lsn PG_LSN,
    lag_bytes BIGINT,
    last_msg_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.subname::VARCHAR,
        st.received_lsn,
        st.latest_end_lsn,
        CASE 
            WHEN st.received_lsn IS NULL OR st.latest_end_lsn IS NULL THEN 0
            ELSE pg_wal_lsn_diff(st.received_lsn, st.latest_end_lsn)
        END AS lag_bytes,
        st.last_msg_receipt_time,
        CASE 
            WHEN st.pid IS NULL THEN 'STOPPED'
            WHEN st.last_msg_receipt_time < now() - INTERVAL '60 seconds' THEN 'DELAYED'
            ELSE 'RUNNING'
        END::VARCHAR
    FROM pg_subscription s
    LEFT JOIN pg_stat_subscription st ON s.oid = st.subid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION monitor.subscription_lag() IS '监控订阅延迟';

-- =====================================================
-- 双向复制配置（多主架构）
-- =====================================================
/*
-- 节点A配置
CREATE PUBLICATION node_a_pub FOR ALL TABLES;
CREATE SUBSCRIPTION node_b_sub
    CONNECTION 'host=node_b port=5432 dbname=yyc3_ai_family user=replication_user'
    PUBLICATION node_b_pub
    WITH (copy_data = false, origin = none);

-- 节点B配置
CREATE PUBLICATION node_b_pub FOR ALL TABLES;
CREATE SUBSCRIPTION node_a_sub
    CONNECTION 'host=node_a port=5432 dbname=yyc3_ai_family user=replication_user'
    PUBLICATION node_a_pub
    WITH (copy_data = false, origin = none);

-- 注意：双向复制需要处理冲突
-- 1. 使用origin = none避免循环复制
-- 2. 设计冲突解决策略
-- 3. 监控数据一致性
*/

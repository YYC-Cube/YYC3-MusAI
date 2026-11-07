-- =====================================================
-- YYC³-AI-Family 流复制配置脚本
-- @file: primary_setup.sql
-- @description: 主库流复制配置
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 主库配置说明
-- =====================================================
-- 1. 修改 postgresql.conf 配置文件
-- 2. 修改 pg_hba.conf 配置文件
-- 3. 创建复制用户
-- 4. 创建复制槽（可选）
-- =====================================================

-- =====================================================
-- 创建复制用户
-- =====================================================

CREATE ROLE replication_user WITH
    REPLICATION
    LOGIN
    ENCRYPTED PASSWORD 'your_secure_password_here';

COMMENT ON ROLE replication_user IS '流复制专用用户';

-- =====================================================
-- 创建复制槽（推荐使用）
-- =====================================================

SELECT pg_create_physical_replication_slot('replication_slot_standby1');
SELECT pg_create_physical_replication_slot('replication_slot_standby2');

-- =====================================================
-- 查看复制状态
-- =====================================================

SELECT 
    slot_name,
    slot_type,
    active,
    restart_lsn,
    confirmed_flush_lsn
FROM pg_replication_slots;

-- =====================================================
-- 查看当前复制连接
-- =====================================================

SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    sync_state
FROM pg_stat_replication;

-- =====================================================
-- postgresql.conf 主库配置
-- =====================================================
/*
-- 监听地址
listen_addresses = '*'

-- WAL配置
wal_level = replica
max_wal_senders = 10
wal_keep_size = 1GB
max_replication_slots = 10

-- 同步提交
synchronous_commit = on

-- 同步复制配置（可选）
-- synchronous_standby_names = 'standby1,standby2'

-- WAL发送超时
wal_sender_timeout = 60s

-- 归档配置（可选）
archive_mode = on
archive_command = 'cp %p /archive/%f'
*/

-- =====================================================
-- pg_hba.conf 主库配置
-- =====================================================
/*
-- 允许复制用户连接
host    replication     replication_user     192.168.1.0/24     scram-sha-256
host    replication     replication_user     10.0.0.0/8         scram-sha-256
*/

-- =====================================================
-- 监控复制延迟函数
-- =====================================================

CREATE OR REPLACE FUNCTION monitor.replication_lag()
RETURNS TABLE (
    client_addr INET,
    application_name VARCHAR,
    state VARCHAR,
    sync_state VARCHAR,
    sent_lsn PG_LSN,
    replay_lsn PG_LSN,
    lag_bytes BIGINT,
    lag_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.client_addr,
        r.application_name,
        r.state,
        r.sync_state,
        r.sent_lsn,
        r.replay_lsn,
        CASE 
            WHEN r.sent_lsn = r.replay_lsn THEN 0
            ELSE pg_wal_lsn_diff(r.sent_lsn, r.replay_lsn)
        END AS lag_bytes,
        CASE 
            WHEN r.replay_lsn IS NULL THEN NULL
            ELSE now() - pg_last_xact_replay_timestamp()
        END AS lag_time
    FROM pg_stat_replication r;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION monitor.replication_lag() IS '监控复制延迟';

-- =====================================================
-- 告警：复制延迟超过阈值
-- =====================================================

CREATE OR REPLACE FUNCTION monitor.check_replication_lag(
    p_max_lag_bytes BIGINT DEFAULT 1073741824,
    p_max_lag_seconds INTEGER DEFAULT 60
) RETURNS TABLE (
    standby_name VARCHAR,
    lag_bytes BIGINT,
    lag_seconds INTEGER,
    alert_level VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.application_name::VARCHAR,
        pg_wal_lsn_diff(r.sent_lsn, r.replay_lsn)::BIGINT AS lag_bytes,
        EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::INTEGER AS lag_seconds,
        CASE 
            WHEN pg_wal_lsn_diff(r.sent_lsn, r.replay_lsn) > p_max_lag_bytes * 2 THEN 'CRITICAL'
            WHEN pg_wal_lsn_diff(r.sent_lsn, r.replay_lsn) > p_max_lag_bytes THEN 'WARNING'
            ELSE 'OK'
        END::VARCHAR
    FROM pg_stat_replication r
    WHERE pg_wal_lsn_diff(r.sent_lsn, r.replay_lsn) > p_max_lag_bytes
       OR EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) > p_max_lag_seconds;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION monitor.check_replication_lag(BIGINT, INTEGER) IS '检查复制延迟告警';

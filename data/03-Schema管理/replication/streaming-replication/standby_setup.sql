-- =====================================================
-- YYC³-AI-Family 流复制配置脚本
-- @file: standby_setup.sql
-- @description: 从库流复制配置
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 从库配置说明
-- =====================================================
-- 1. 使用 pg_basebackup 创建基础备份
-- 2. 配置 postgresql.conf
-- 3. 创建 standby.signal 文件
-- 4. 配置 primary_conninfo
-- =====================================================

-- =====================================================
-- 基础备份命令（在从库服务器执行）
-- =====================================================
/*
-- 停止从库服务
systemctl stop postgresql

-- 清空数据目录
rm -rf /var/lib/postgresql/15/main/*

-- 执行基础备份
pg_basebackup -h primary_host -p 5432 -U replication_user -D /var/lib/postgresql/15/main -Fp -Xs -P -R

-- 参数说明：
-- -h: 主库地址
-- -p: 主库端口
-- -U: 复制用户
-- -D: 数据目录
-- -Fp: plain格式
-- -Xs: 流式传输WAL
-- -P: 显示进度
-- -R: 自动创建standby配置
*/

-- =====================================================
-- postgresql.conf 从库配置
-- =====================================================
/*
-- 主库连接信息
primary_conninfo = 'host=primary_host port=5432 user=replication_user password=your_password'

-- 复制槽（可选，推荐）
primary_slot_name = 'replication_slot_standby1'

-- 热备模式
hot_standby = on

-- 反馈间隔
wal_receiver_status_interval = 10s

-- 热备反馈
hot_standby_feedback = on

-- 最大WAL发送进程
max_wal_senders = 10

-- 从库提升为主库后配置
-- wal_level = replica
-- max_replication_slots = 10
*/

-- =====================================================
-- 创建 standby.signal 文件
-- =====================================================
/*
touch /var/lib/postgresql/15/main/standby.signal
*/

-- =====================================================
-- 查看从库状态
-- =====================================================

SELECT 
    pg_is_in_recovery() AS is_standby,
    pg_last_wal_receive_lsn() AS received_lsn,
    pg_last_wal_replay_lsn() AS replayed_lsn,
    pg_last_xact_replay_timestamp() AS last_replay_time,
    CASE 
        WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() THEN 0
        ELSE pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn())
    END AS replay_lag_bytes;

-- =====================================================
-- 从库提升为主库（手动故障转移）
-- =====================================================
/*
-- 方法1: pg_ctl promote
pg_ctl promote -D /var/lib/postgresql/15/main

-- 方法2: SQL命令
SELECT pg_promote();

-- 方法3: 触发文件（旧版本）
-- 在 postgresql.conf 中配置
-- promote_trigger_file = '/tmp/postgresql.promote'
-- touch /tmp/postgresql.promote
*/

-- =====================================================
-- 监控从库状态函数
-- =====================================================

CREATE OR REPLACE FUNCTION monitor.standby_status()
RETURNS TABLE (
    is_standby BOOLEAN,
    received_lsn PG_LSN,
    replayed_lsn PG_LSN,
    replay_lag_bytes BIGINT,
    last_replay_time TIMESTAMP WITH TIME ZONE,
    sync_state VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_is_in_recovery() AS is_standby,
        pg_last_wal_receive_lsn() AS received_lsn,
        pg_last_wal_replay_lsn() AS replayed_lsn,
        CASE 
            WHEN pg_last_wal_receive_lsn() IS NULL OR pg_last_wal_replay_lsn() IS NULL THEN 0
            WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() THEN 0
            ELSE pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn())
        END AS replay_lag_bytes,
        pg_last_xact_replay_timestamp() AS last_replay_time,
        CASE 
            WHEN pg_is_in_recovery() = FALSE THEN 'PRIMARY'
            WHEN pg_last_wal_receive_lsn() IS NULL THEN 'DISCONNECTED'
            WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() THEN 'SYNC'
            ELSE 'CATCHING_UP'
        END::VARCHAR AS sync_state;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION monitor.standby_status() IS '监控从库状态';

-- =====================================================
-- 读写分离路由建议
-- =====================================================
/*
-- 应用层配置示例
-- 写操作 -> 主库
-- 读操作 -> 从库（可配置多个从库负载均衡）

-- 连接池配置示例
[primary]
host = primary_host
port = 5432
database = yyc3_ai_family
user = app_user
password = app_password
pool_size = 20

[standby1]
host = standby1_host
port = 5432
database = yyc3_ai_family
user = app_user
password = app_password
pool_size = 50

[standby2]
host = standby2_host
port = 5432
database = yyc3_ai_family
user = app_user
password = app_password
pool_size = 50
*/

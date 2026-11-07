-- =====================================================
-- YYC³-AI-Family pg_stat_statements扩展配置
-- @file: pg_stat_statements.sql
-- @description: 配置pg_stat_statements性能统计扩展
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- 创建pg_stat_statements扩展
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 查询性能统计视图
CREATE OR REPLACE VIEW monitor.v_query_stats AS
SELECT
    queryid,
    query,
    calls,
    total_exec_time AS total_time_ms,
    mean_exec_time AS mean_time_ms,
    min_exec_time AS min_time_ms,
    max_exec_time AS max_time_ms,
    rows,
    shared_blks_hit,
    shared_blks_read,
    shared_blks_dirtied,
    shared_blks_written,
    local_blks_hit,
    local_blks_read,
    temp_blks_read,
    temp_blks_written,
    blk_read_time,
    blk_write_time
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY total_exec_time DESC;

COMMENT ON VIEW monitor.v_query_stats IS '查询性能统计视图';

-- 慢查询视图（平均执行时间超过100ms）
CREATE OR REPLACE VIEW monitor.v_slow_queries AS
SELECT
    queryid,
    query,
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    round(min_exec_time::numeric, 2) AS min_time_ms,
    round(max_exec_time::numeric, 2) AS max_time_ms,
    rows,
    round((shared_blks_hit::numeric / NULLIF(shared_blks_hit + shared_blks_read, 0) * 100)::numeric, 2) AS cache_hit_ratio
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND mean_exec_time > 100
ORDER BY mean_exec_time DESC;

COMMENT ON VIEW monitor.v_slow_queries IS '慢查询视图（平均执行时间>100ms）';

-- 高频查询视图（调用次数超过1000次）
CREATE OR REPLACE VIEW monitor.v_frequent_queries AS
SELECT
    queryid,
    query,
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    rows,
    round((shared_blks_hit::numeric / NULLIF(shared_blks_hit + shared_blks_read, 0) * 100)::numeric, 2) AS cache_hit_ratio
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND calls > 1000
ORDER BY calls DESC;

COMMENT ON VIEW monitor.v_frequent_queries IS '高频查询视图（调用次数>1000次）';

-- I/O密集查询视图
CREATE OR REPLACE VIEW monitor.v_io_intensive_queries AS
SELECT
    queryid,
    query,
    calls,
    shared_blks_read,
    shared_blks_written,
    temp_blks_read,
    temp_blks_written,
    round(blk_read_time::numeric, 2) AS blk_read_time_ms,
    round(blk_write_time::numeric, 2) AS blk_write_time_ms,
    round((shared_blks_read + temp_blks_read)::numeric * 8 / 1024, 2) AS total_read_mb
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND (shared_blks_read + temp_blks_read) > 1000
ORDER BY (shared_blks_read + temp_blks_read) DESC;

COMMENT ON VIEW monitor.v_io_intensive_queries IS 'I/O密集查询视图';

-- 重置统计信息函数
CREATE OR REPLACE FUNCTION monitor.reset_query_stats()
RETURNS VOID AS $$
BEGIN
    PERFORM pg_stat_statements_reset();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION monitor.reset_query_stats() IS '重置查询统计信息';

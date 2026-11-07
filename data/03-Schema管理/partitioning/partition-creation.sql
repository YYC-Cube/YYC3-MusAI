-- =====================================================
-- YYC³-AI-Family 分区表创建脚本
-- @file: partition-creation.sql
-- @description: 创建分区表和自动分区维护
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 审计日志表 - 按月分区
-- =====================================================

CREATE TABLE IF NOT EXISTS audit.logs (
    id UUID DEFAULT uuid_generate_v4(),
    operation_type audit_operation_type NOT NULL,
    operation_level audit_operation_level DEFAULT 'info',
    operation_desc TEXT,
    operator_id UUID,
    operator_name VARCHAR(100),
    operator_ip INET,
    target_type VARCHAR(100),
    target_id UUID,
    target_name VARCHAR(500),
    action VARCHAR(100) NOT NULL,
    before_value JSONB,
    after_value JSONB,
    changes JSONB DEFAULT '{}',
    result VARCHAR(50) DEFAULT 'success',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- 创建2026年分区
CREATE TABLE audit.logs_2026_01 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-01-01 00:00:00') TO ('2026-02-01 00:00:00');

CREATE TABLE audit.logs_2026_02 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-02-01 00:00:00') TO ('2026-03-01 00:00:00');

CREATE TABLE audit.logs_2026_03 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-03-01 00:00:00') TO ('2026-04-01 00:00:00');

CREATE TABLE audit.logs_2026_04 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-04-01 00:00:00') TO ('2026-05-01 00:00:00');

CREATE TABLE audit.logs_2026_05 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-05-01 00:00:00') TO ('2026-06-01 00:00:00');

CREATE TABLE audit.logs_2026_06 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-06-01 00:00:00') TO ('2026-07-01 00:00:00');

CREATE TABLE audit.logs_2026_07 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-07-01 00:00:00') TO ('2026-08-01 00:00:00');

CREATE TABLE audit.logs_2026_08 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-08-01 00:00:00') TO ('2026-09-01 00:00:00');

CREATE TABLE audit.logs_2026_09 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-09-01 00:00:00') TO ('2026-10-01 00:00:00');

CREATE TABLE audit.logs_2026_10 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-10-01 00:00:00') TO ('2026-11-01 00:00:00');

CREATE TABLE audit.logs_2026_11 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-11-01 00:00:00') TO ('2026-12-01 00:00:00');

CREATE TABLE audit.logs_2026_12 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-12-01 00:00:00') TO ('2027-01-01 00:00:00');

-- 默认分区（防止数据插入失败）
CREATE TABLE audit.logs_default PARTITION OF audit.logs DEFAULT;

-- =====================================================
-- 监控指标表 - 按天分区
-- =====================================================

CREATE TABLE IF NOT EXISTS monitor.metrics (
    id UUID DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value FLOAT NOT NULL,
    unit VARCHAR(50),
    labels JSONB DEFAULT '{}',
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (collected_at);

-- 创建最近7天的分区
CREATE TABLE monitor.metrics_2026_02_17 PARTITION OF monitor.metrics
    FOR VALUES FROM ('2026-02-17 00:00:00') TO ('2026-02-18 00:00:00');

CREATE TABLE monitor.metrics_2026_02_18 PARTITION OF monitor.metrics
    FOR VALUES FROM ('2026-02-18 00:00:00') TO ('2026-02-19 00:00:00');

CREATE TABLE monitor.metrics_2026_02_19 PARTITION OF monitor.metrics
    FOR VALUES FROM ('2026-02-19 00:00:00') TO ('2026-02-20 00:00:00');

CREATE TABLE monitor.metrics_2026_02_20 PARTITION OF monitor.metrics
    FOR VALUES FROM ('2026-02-20 00:00:00') TO ('2026-02-21 00:00:00');

CREATE TABLE monitor.metrics_2026_02_21 PARTITION OF monitor.metrics
    FOR VALUES FROM ('2026-02-21 00:00:00') TO ('2026-02-22 00:00:00');

CREATE TABLE monitor.metrics_2026_02_22 PARTITION OF monitor.metrics
    FOR VALUES FROM ('2026-02-22 00:00:00') TO ('2026-02-23 00:00:00');

CREATE TABLE monitor.metrics_2026_02_23 PARTITION OF monitor.metrics
    FOR VALUES FROM ('2026-02-23 00:00:00') TO ('2026-02-24 00:00:00');

-- 默认分区
CREATE TABLE monitor.metrics_default PARTITION OF monitor.metrics DEFAULT;

-- =====================================================
-- API调用日志表 - 按周分区
-- =====================================================

CREATE TABLE IF NOT EXISTS extension.api_logs (
    id UUID DEFAULT uuid_generate_v4(),
    api_key_id UUID,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_headers JSONB DEFAULT '{}',
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- 创建分区
CREATE TABLE extension.api_logs_2026_w08 PARTITION OF extension.api_logs
    FOR VALUES FROM ('2026-02-16 00:00:00') TO ('2026-02-23 00:00:00');

CREATE TABLE extension.api_logs_2026_w09 PARTITION OF extension.api_logs
    FOR VALUES FROM ('2026-02-23 00:00:00') TO ('2026-03-02 00:00:00');

CREATE TABLE extension.api_logs_default PARTITION OF extension.api_logs DEFAULT;

-- =====================================================
-- 自动分区管理函数
-- =====================================================

-- 创建月度分区
CREATE OR REPLACE FUNCTION audit.create_monthly_partition(
    p_year INTEGER,
    p_month INTEGER
) RETURNS VOID AS $$
DECLARE
    v_partition_name VARCHAR;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    v_partition_name := 'audit.logs_' || p_year || '_' || lpad(p_month::TEXT, 2, '0');
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := v_start_date + INTERVAL '1 month';

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF audit.logs
        FOR VALUES FROM (%L) TO (%L)
    ', v_partition_name, v_start_date, v_end_date);
END;
$$ LANGUAGE plpgsql;

-- 创建日分区
CREATE OR REPLACE FUNCTION monitor.create_daily_partition(
    p_date DATE
) RETURNS VOID AS $$
DECLARE
    v_partition_name VARCHAR;
BEGIN
    v_partition_name := 'monitor.metrics_' || to_char(p_date, 'YYYY_MM_DD');

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF monitor.metrics
        FOR VALUES FROM (%L) TO (%L)
    ', v_partition_name, p_date, p_date + INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- 自动创建未来分区
CREATE OR REPLACE FUNCTION monitor.auto_create_future_partitions(
    p_days_ahead INTEGER DEFAULT 7
) RETURNS VOID AS $$
DECLARE
    v_date DATE;
BEGIN
    FOR i IN 0..p_days_ahead LOOP
        v_date := CURRENT_DATE + i;
        PERFORM monitor.create_daily_partition(v_date);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 删除旧分区（数据归档）
CREATE OR REPLACE FUNCTION audit.drop_old_partitions(
    p_months_to_keep INTEGER DEFAULT 12
) RETURNS INTEGER AS $$
DECLARE
    v_partition RECORD;
    v_dropped INTEGER := 0;
    v_cutoff_date DATE;
BEGIN
    v_cutoff_date := date_trunc('month', CURRENT_DATE - (p_months_to_keep || ' months')::INTERVAL);

    FOR v_partition IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'audit'
          AND tablename LIKE 'logs_%'
          AND tablename != 'logs_default'
    LOOP
        IF v_partition.tablename < 'logs_' || to_char(v_cutoff_date, 'YYYY_MM') THEN
            EXECUTE 'DROP TABLE IF EXISTS audit.' || v_partition.tablename;
            v_dropped := v_dropped + 1;
        END IF;
    END LOOP;

    RETURN v_dropped;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit.drop_old_partitions(INTEGER) IS '删除旧分区（数据归档）';

-- =====================================================
-- 分区索引创建
-- =====================================================

-- 审计日志分区索引
CREATE INDEX IF NOT EXISTS idx_logs_2026_01_operator_id ON audit.logs_2026_01(operator_id);
CREATE INDEX IF NOT EXISTS idx_logs_2026_01_target ON audit.logs_2026_01(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_logs_2026_01_operation ON audit.logs_2026_01(operation_type);

-- 监控指标分区索引
CREATE INDEX IF NOT EXISTS idx_metrics_device ON monitor.metrics(device_id);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON monitor.metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_device_name ON monitor.metrics(device_id, metric_name);

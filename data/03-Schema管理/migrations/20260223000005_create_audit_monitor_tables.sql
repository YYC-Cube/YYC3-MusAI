-- =====================================================
-- YYC³-AI-Family 审计监控表结构
-- @file: 05_create_audit_monitor_tables.sql
-- @description: 创建审计日志、监控指标、告警、设备管理等表
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 审计日志表
-- =====================================================

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit.logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 操作信息
    operation_type audit_operation_type NOT NULL,
    operation_level audit_operation_level DEFAULT 'info',
    operation_desc TEXT,

    -- 操作人信息
    operator_id UUID REFERENCES core.users(id),
    operator_name VARCHAR(100),
    operator_ip INET,
    operator_user_agent TEXT,
    operator_device JSONB DEFAULT '{}',

    -- 操作对象信息
    target_type VARCHAR(100), -- user, project, task, agent, workflow
    target_id UUID,
    target_name VARCHAR(500),

    -- 操作详情
    action VARCHAR(100) NOT NULL,
    before_value JSONB,
    after_value JSONB,
    changes JSONB DEFAULT '{}',

    -- 操作原因
    reason TEXT,
    impact TEXT,

    -- 操作结果
    result VARCHAR(50) DEFAULT 'success', -- success, failed, partial

    -- 审批信息
    approver_id UUID REFERENCES core.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,

    -- 备份信息
    backup_ref VARCHAR(200),

    -- 时间信息
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,

    -- 元数据
    metadata JSONB DEFAULT '{}',

    -- 索引优化字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE audit.logs IS '审计日志表（按时间分区）';
COMMENT ON COLUMN audit.logs.operation_type IS '操作类型';
COMMENT ON COLUMN audit.logs.operation_level IS '操作级别';
COMMENT ON COLUMN audit.logs.operator_id IS '操作人ID';
COMMENT ON COLUMN audit.logs.target_type IS '操作对象类型';
COMMENT ON COLUMN audit.logs.target_id IS '操作对象ID';
COMMENT ON COLUMN audit.logs.action IS '操作动作';
COMMENT ON COLUMN audit.logs.before_value IS '变更前值';
COMMENT ON COLUMN audit.logs.after_value IS '变更后值';
COMMENT ON COLUMN audit.logs.result IS '操作结果';

-- 创建审计日志分区表（按月）
CREATE TABLE audit.logs_2026_02 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE audit.logs_2026_03 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE audit.logs_default PARTITION OF audit.logs DEFAULT;

-- =====================================================
-- 监控指标表
-- =====================================================

-- 设备信息表
CREATE TABLE IF NOT EXISTS monitor.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type device_type NOT NULL,

    -- 网络信息
    ip_address INET,
    port INTEGER,
    mac_address VARCHAR(50),

    -- 位置信息
    location VARCHAR(200),
    rack VARCHAR(50),
    position VARCHAR(50),

    -- 硬件信息
    cpu_cores INTEGER,
    cpu_model VARCHAR(200),
    memory_gb DECIMAL(10,2),
    disk_gb DECIMAL(10,2),
    disk_type VARCHAR(50), -- ssd, hdd, nvme

    -- 操作系统
    os_type VARCHAR(50), -- linux, windows, macos
    os_version VARCHAR(100),

    -- 状态
    status device_status DEFAULT 'running',

    -- 配置
    config JSONB DEFAULT '{}',

    -- 标签
    tags VARCHAR(100)[],

    -- 元数据
    metadata JSONB DEFAULT '{}',

    -- 时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE monitor.devices IS '设备信息表';
COMMENT ON COLUMN monitor.devices.type IS '设备类型';
COMMENT ON COLUMN monitor.devices.status IS '设备状态';

-- 监控指标表
CREATE TABLE IF NOT EXISTS monitor.metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES monitor.devices(id) ON DELETE CASCADE,

    -- 指标信息
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50), -- cpu, memory, disk, network, custom

    -- 指标值
    value DECIMAL(20,6) NOT NULL,
    unit VARCHAR(50),

    -- 标签
    labels JSONB DEFAULT '{}',

    -- 时间
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 元数据
    metadata JSONB DEFAULT '{}'
) PARTITION BY RANGE (timestamp);

COMMENT ON TABLE monitor.metrics IS '监控指标表（按时间分区）';
COMMENT ON COLUMN monitor.metrics.device_id IS '设备ID';
COMMENT ON COLUMN monitor.metrics.metric_name IS '指标名称';
COMMENT ON COLUMN monitor.metrics.value IS '指标值';

-- 创建监控指标分区表
CREATE TABLE monitor.metrics_2026_02 PARTITION OF monitor.metrics
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE monitor.metrics_default PARTITION OF monitor.metrics DEFAULT;

-- =====================================================
-- 告警管理表
-- =====================================================

-- 告警规则表
CREATE TABLE IF NOT EXISTS monitor.alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,

    -- 规则配置
    metric_name VARCHAR(100) NOT NULL,
    condition JSONB NOT NULL, -- {operator: '>', threshold: 80, duration: 300}

    -- 告警级别
    level alert_level NOT NULL,

    -- 通知配置
    notification_config JSONB DEFAULT '{
        "channels": ["email", "sms"],
        "recipients": [],
        "template": ""
    }',

    -- 抑制配置
    suppression_config JSONB DEFAULT '{
        "enabled": true,
        "duration_seconds": 3600
    }',

    -- 统计
    trigger_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP WITH TIME ZONE,

    -- 状态
    is_active BOOLEAN DEFAULT TRUE,

    -- 权限
    owner_id UUID REFERENCES core.users(id),
    org_id UUID REFERENCES core.organizations(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE monitor.alert_rules IS '告警规则表';
COMMENT ON COLUMN monitor.alert_rules.metric_name IS '指标名称';
COMMENT ON COLUMN monitor.alert_rules.condition IS '触发条件';
COMMENT ON COLUMN monitor.alert_rules.level IS '告警级别';

-- 告警记录表
CREATE TABLE IF NOT EXISTS monitor.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES monitor.alert_rules(id),

    -- 告警信息
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    level alert_level NOT NULL,

    -- 告警对象
    device_id UUID REFERENCES monitor.devices(id),
    metric_name VARCHAR(100),
    metric_value DECIMAL(20,6),

    -- 状态
    status alert_status DEFAULT 'active',

    -- 处理信息
    acknowledged_by UUID REFERENCES core.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES core.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_note TEXT,

    -- 时间
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INTEGER,

    -- 元数据
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE monitor.alerts IS '告警记录表';
COMMENT ON COLUMN monitor.alerts.rule_id IS '告警规则ID';
COMMENT ON COLUMN monitor.alerts.level IS '告警级别';
COMMENT ON COLUMN monitor.alerts.status IS '告警状态';

-- =====================================================
-- 通知管理表
-- =====================================================

-- 通知模板表
CREATE TABLE IF NOT EXISTS monitor.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type notification_type NOT NULL,

    -- 模板内容
    subject VARCHAR(500),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',

    -- 状态
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id)
);

COMMENT ON TABLE monitor.notification_templates IS '通知模板表';
COMMENT ON COLUMN monitor.notification_templates.type IS '通知类型';
COMMENT ON COLUMN monitor.notification_templates.content IS '模板内容';

-- 通知记录表
CREATE TABLE IF NOT EXISTS monitor.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 通知信息
    type notification_type NOT NULL,
    template_id UUID REFERENCES monitor.notification_templates(id),
    subject VARCHAR(500),
    content TEXT NOT NULL,

    -- 收件人
    recipient_id UUID REFERENCES core.users(id),
    recipient_address VARCHAR(500),

    -- 状态
    status notification_status DEFAULT 'pending',

    -- 发送信息
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,

    -- 错误信息
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- 关联
    related_type VARCHAR(100),
    related_id UUID,

    -- 元数据
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE monitor.notifications IS '通知记录表';
COMMENT ON COLUMN monitor.notifications.type IS '通知类型';
COMMENT ON COLUMN monitor.notifications.status IS '通知状态';
COMMENT ON COLUMN monitor.notifications.recipient_id IS '收件人ID';

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE '审计监控表创建完成: 审计日志、监控指标、告警、通知表已创建';
END $$;

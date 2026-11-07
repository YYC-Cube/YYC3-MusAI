-- =====================================================
-- YYC³-AI-Family 扩展管理表结构
-- @file: 06_create_extension_tables.sql
-- @description: 创建插件、API密钥、Webhook、第三方集成等扩展表
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 插件管理表
-- =====================================================

-- 插件表
CREATE TABLE IF NOT EXISTS extension.plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    version VARCHAR(20) NOT NULL,
    description TEXT,

    -- 插件信息
    author VARCHAR(200),
    homepage VARCHAR(500),
    repository VARCHAR(500),
    license VARCHAR(50),

    -- 插件配置
    main_file VARCHAR(500),
    config_schema JSONB DEFAULT '{}',
    default_config JSONB DEFAULT '{}',

    -- 权限要求
    permissions JSONB DEFAULT '[]',

    -- 依赖
    dependencies JSONB DEFAULT '[]',

    -- 统计
    download_count INTEGER DEFAULT 0,
    install_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,

    -- 状态
    status plugin_status DEFAULT 'installed',
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE,

    -- 安装信息
    installed_at TIMESTAMP WITH TIME ZONE,
    installed_by UUID REFERENCES core.users(id),

    -- 权限
    owner_id UUID REFERENCES core.users(id),
    org_id UUID REFERENCES core.organizations(id),

    -- 元数据
    tags VARCHAR(100)[],
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE extension.plugins IS '插件表';
COMMENT ON COLUMN extension.plugins.code IS '插件编码';
COMMENT ON COLUMN extension.plugins.version IS '插件版本';
COMMENT ON COLUMN extension.plugins.permissions IS '权限要求';
COMMENT ON COLUMN extension.plugins.status IS '插件状态';

-- 插件配置表
CREATE TABLE IF NOT EXISTS extension.plugin_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id UUID NOT NULL REFERENCES extension.plugins(id) ON DELETE CASCADE,

    -- 配置范围
    scope VARCHAR(50) NOT NULL, -- global, org, user
    scope_id UUID, -- org_id or user_id

    -- 配置内容
    config JSONB NOT NULL DEFAULT '{}',

    -- 状态
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),

    UNIQUE(plugin_id, scope, scope_id)
);

COMMENT ON TABLE extension.plugin_configs IS '插件配置表';
COMMENT ON COLUMN extension.plugin_configs.plugin_id IS '插件ID';
COMMENT ON COLUMN extension.plugin_configs.scope IS '配置范围';

-- =====================================================
-- API密钥管理表
-- =====================================================

-- API密钥表
CREATE TABLE IF NOT EXISTS extension.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(20), -- 密钥前缀，用于识别

    -- 权限配置
    permissions JSONB DEFAULT '[]',
    scopes VARCHAR(100)[],

    -- 限制配置
    rate_limit INTEGER DEFAULT 1000, -- 每小时请求限制
    ip_whitelist INET[],
    ip_blacklist INET[],

    -- 统计
    total_requests INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- 状态
    status api_key_status DEFAULT 'active',
    expires_at TIMESTAMP WITH TIME ZONE,

    -- 权限
    owner_id UUID REFERENCES core.users(id),
    org_id UUID REFERENCES core.organizations(id),

    -- 元数据
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES core.users(id),
    revoke_reason TEXT
);

COMMENT ON TABLE extension.api_keys IS 'API密钥表';
COMMENT ON COLUMN extension.api_keys.key_hash IS '密钥哈希';
COMMENT ON COLUMN extension.api_keys.permissions IS '权限列表';
COMMENT ON COLUMN extension.api_keys.rate_limit IS '速率限制';
COMMENT ON COLUMN extension.api_keys.status IS '密钥状态';

-- API请求日志表
CREATE TABLE IF NOT EXISTS extension.api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID REFERENCES extension.api_keys(id),

    -- 请求信息
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    query_params JSONB DEFAULT '{}',
    headers JSONB DEFAULT '{}',
    body JSONB,

    -- 响应信息
    status_code INTEGER,
    response_time_ms INTEGER,
    response_size_bytes BIGINT,

    -- 客户端信息
    ip_address INET,
    user_agent TEXT,

    -- 错误信息
    error_message TEXT,

    -- 时间
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 元数据
    metadata JSONB DEFAULT '{}'
) PARTITION BY RANGE (timestamp);

COMMENT ON TABLE extension.api_logs IS 'API请求日志表（按时间分区）';
COMMENT ON COLUMN extension.api_logs.api_key_id IS 'API密钥ID';
COMMENT ON COLUMN extension.api_logs.method IS '请求方法';
COMMENT ON COLUMN extension.api_logs.path IS '请求路径';

-- 创建API日志分区表
CREATE TABLE extension.api_logs_2026_02 PARTITION OF extension.api_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE extension.api_logs_default PARTITION OF extension.api_logs DEFAULT;

-- =====================================================
-- Webhook管理表
-- =====================================================

-- Webhook配置表
CREATE TABLE IF NOT EXISTS extension.webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    url VARCHAR(1000) NOT NULL,

    -- 事件配置
    events VARCHAR(100)[] NOT NULL, -- 订阅的事件类型
    filters JSONB DEFAULT '{}',

    -- 认证配置
    auth_type VARCHAR(50), -- none, basic, bearer, hmac
    auth_config JSONB DEFAULT '{}',

    -- 重试配置
    retry_config JSONB DEFAULT '{
        "max_retries": 3,
        "retry_delay_seconds": 60,
        "exponential_backoff": true
    }',

    -- 超时配置
    timeout_seconds INTEGER DEFAULT 30,

    -- 统计
    total_calls INTEGER DEFAULT 0,
    success_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    last_called_at TIMESTAMP WITH TIME ZONE,

    -- 状态
    is_active BOOLEAN DEFAULT TRUE,

    -- 权限
    owner_id UUID REFERENCES core.users(id),
    org_id UUID REFERENCES core.organizations(id),

    -- 元数据
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE extension.webhooks IS 'Webhook配置表';
COMMENT ON COLUMN extension.webhooks.url IS 'Webhook URL';
COMMENT ON COLUMN extension.webhooks.events IS '订阅事件列表';
COMMENT ON COLUMN extension.webhooks.auth_type IS '认证类型';

-- Webhook调用记录表
CREATE TABLE IF NOT EXISTS extension.webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES extension.webhooks(id) ON DELETE CASCADE,

    -- 事件信息
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,

    -- 请求信息
    request_headers JSONB DEFAULT '{}',
    request_body TEXT,

    -- 响应信息
    response_status INTEGER,
    response_headers JSONB DEFAULT '{}',
    response_body TEXT,

    -- 执行信息
    duration_ms INTEGER,
    retry_count INTEGER DEFAULT 0,

    -- 状态
    status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed

    -- 错误信息
    error_message TEXT,

    -- 时间
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 元数据
    metadata JSONB DEFAULT '{}'
);

COMMENT ON TABLE extension.webhook_logs IS 'Webhook调用记录表';
COMMENT ON COLUMN extension.webhook_logs.webhook_id IS 'Webhook ID';
COMMENT ON COLUMN extension.webhook_logs.event_type IS '事件类型';
COMMENT ON COLUMN extension.webhook_logs.status IS '调用状态';

-- =====================================================
-- 第三方集成表
-- =====================================================

-- 第三方集成配置表
CREATE TABLE IF NOT EXISTS extension.integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- github, gitlab, jira, slack, dingtalk, wecom

    -- 配置
    config JSONB NOT NULL DEFAULT '{}',
    credentials_encrypted TEXT,

    -- 同步配置
    sync_config JSONB DEFAULT '{
        "enabled": false,
        "interval_seconds": 3600,
        "last_sync_at": null
    }',

    -- 统计
    total_syncs INTEGER DEFAULT 0,
    success_syncs INTEGER DEFAULT 0,
    failed_syncs INTEGER DEFAULT 0,
    last_sync_at TIMESTAMP WITH TIME ZONE,

    -- 状态
    is_active BOOLEAN DEFAULT TRUE,

    -- 权限
    owner_id UUID REFERENCES core.users(id),
    org_id UUID REFERENCES core.organizations(id),

    -- 元数据
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE extension.integrations IS '第三方集成配置表';
COMMENT ON COLUMN extension.integrations.type IS '集成类型';
COMMENT ON COLUMN extension.integrations.config IS '集成配置';
COMMENT ON COLUMN extension.integrations.credentials_encrypted IS '加密凭据';

-- 集成同步记录表
CREATE TABLE IF NOT EXISTS extension.integration_syncs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES extension.integrations(id) ON DELETE CASCADE,

    -- 同步信息
    sync_type VARCHAR(50) NOT NULL, -- full, incremental
    sync_direction VARCHAR(50), -- import, export, bidirectional

    -- 统计
    total_records INTEGER DEFAULT 0,
    created_records INTEGER DEFAULT 0,
    updated_records INTEGER DEFAULT 0,
    deleted_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,

    -- 执行信息
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,

    -- 状态
    status execution_status DEFAULT 'pending',

    -- 错误信息
    error_message TEXT,
    error_details JSONB DEFAULT '[]',

    -- 元数据
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE extension.integration_syncs IS '集成同步记录表';
COMMENT ON COLUMN extension.integration_syncs.integration_id IS '集成ID';
COMMENT ON COLUMN extension.integration_syncs.sync_type IS '同步类型';
COMMENT ON COLUMN extension.integration_syncs.status IS '同步状态';

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE '扩展管理表创建完成: 插件、API密钥、Webhook、第三方集成表已创建';
END $$;

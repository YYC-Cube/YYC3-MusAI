-- =====================================================
-- YYC³-AI-Family 会话表定义
-- @file: sessions.sql
-- @description: 用户会话管理表结构定义
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- 会话表
CREATE TABLE IF NOT EXISTS core.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(255),
    
    -- 设备信息
    device_type VARCHAR(50),
    device_name VARCHAR(200),
    user_agent TEXT,
    ip_address INET,
    
    -- 会话状态
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- 安全信息
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    login_method VARCHAR(50) DEFAULT 'password',
    mfa_verified BOOLEAN DEFAULT FALSE,
    
    -- 位置信息
    location_country VARCHAR(100),
    location_city VARCHAR(100),
    
    -- 元数据
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE core.sessions IS '用户会话表';
COMMENT ON COLUMN core.sessions.id IS '会话ID';
COMMENT ON COLUMN core.sessions.user_id IS '用户ID';
COMMENT ON COLUMN core.sessions.token_hash IS '访问令牌哈希';
COMMENT ON COLUMN core.sessions.refresh_token_hash IS '刷新令牌哈希';
COMMENT ON COLUMN core.sessions.device_type IS '设备类型';
COMMENT ON COLUMN core.sessions.device_name IS '设备名称';
COMMENT ON COLUMN core.sessions.user_agent IS '用户代理';
COMMENT ON COLUMN core.sessions.ip_address IS 'IP地址';
COMMENT ON COLUMN core.sessions.is_active IS '是否活跃';
COMMENT ON COLUMN core.sessions.expires_at IS '过期时间';
COMMENT ON COLUMN core.sessions.refresh_expires_at IS '刷新令牌过期时间';
COMMENT ON COLUMN core.sessions.last_activity_at IS '最后活动时间';
COMMENT ON COLUMN core.sessions.login_method IS '登录方式';
COMMENT ON COLUMN core.sessions.mfa_verified IS '是否通过MFA验证';

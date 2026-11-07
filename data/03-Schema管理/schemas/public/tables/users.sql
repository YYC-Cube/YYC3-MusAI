-- =====================================================
-- YYC³-AI-Family 用户表定义
-- @file: users.sql
-- @description: 用户基础信息表结构定义
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- 用户表
CREATE TABLE IF NOT EXISTS core.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    status user_status DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    login_count INTEGER DEFAULT 0,
    failed_login_count INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE core.users IS '用户表';
COMMENT ON COLUMN core.users.id IS '用户ID';
COMMENT ON COLUMN core.users.username IS '用户名';
COMMENT ON COLUMN core.users.email IS '邮箱';
COMMENT ON COLUMN core.users.password_hash IS '密码哈希';
COMMENT ON COLUMN core.users.full_name IS '全名';
COMMENT ON COLUMN core.users.avatar_url IS '头像URL';
COMMENT ON COLUMN core.users.phone IS '手机号';
COMMENT ON COLUMN core.users.status IS '用户状态';
COMMENT ON COLUMN core.users.email_verified IS '邮箱是否验证';
COMMENT ON COLUMN core.users.phone_verified IS '手机是否验证';
COMMENT ON COLUMN core.users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN core.users.last_login_ip IS '最后登录IP';
COMMENT ON COLUMN core.users.login_count IS '登录次数';
COMMENT ON COLUMN core.users.failed_login_count IS '失败登录次数';
COMMENT ON COLUMN core.users.locked_until IS '锁定截止时间';
COMMENT ON COLUMN core.users.preferences IS '用户偏好设置';
COMMENT ON COLUMN core.users.metadata IS '元数据';
COMMENT ON COLUMN core.users.created_at IS '创建时间';
COMMENT ON COLUMN core.users.updated_at IS '更新时间';
COMMENT ON COLUMN core.users.created_by IS '创建人';
COMMENT ON COLUMN core.users.updated_by IS '更新人';
COMMENT ON COLUMN core.users.deleted_at IS '删除时间';

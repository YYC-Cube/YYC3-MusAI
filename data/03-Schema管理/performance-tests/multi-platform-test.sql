-- =====================================================
-- YYC³-AI-Family 多端数据库实测脚本
-- @file: multi-platform-test.sql
-- @description: 多端数据库连接和性能测试
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @database: yyc3_aify (PostgreSQL 15)
-- =====================================================

-- =====================================================
-- 第一部分: 环境检查
-- =====================================================

-- 1.1 检查数据库版本
SELECT version();

-- 1.2 检查已安装扩展
SELECT extname, extversion 
FROM pg_extension 
ORDER BY extname;

-- 1.3 检查当前连接配置
SHOW max_connections;
SHOW shared_buffers;
SHOW work_mem;
SHOW effective_cache_size;

-- 1.4 检查当前数据库大小
SELECT 
    datname,
    pg_size_pretty(pg_database_size(datname)) AS size
FROM pg_database 
WHERE datname = current_database();

-- =====================================================
-- 第二部分: Schema 初始化检查
-- =====================================================

-- 2.1 检查现有 Schema
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY schema_name;

-- 2.2 检查现有表
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;

-- 2.3 检查现有索引
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY schemaname, tablename;

-- =====================================================
-- 第三部分: 创建测试 Schema (如果不存在)
-- =====================================================

-- 创建核心 Schema
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS workflow;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS monitor;
CREATE SCHEMA IF NOT EXISTS extension;

-- 创建测试 Schema
CREATE SCHEMA IF NOT EXISTS test;

-- =====================================================
-- 第四部分: 创建测试表
-- =====================================================

-- 4.1 用户表
CREATE TABLE IF NOT EXISTS core.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 4.2 会话表
CREATE TABLE IF NOT EXISTS core.sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES core.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4.3 角色表
CREATE TABLE IF NOT EXISTS core.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4.4 权限表
CREATE TABLE IF NOT EXISTS core.permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4.5 用户角色关联表
CREATE TABLE IF NOT EXISTS core.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES core.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES core.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES core.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, role_id)
);

-- 4.6 角色权限关联表
CREATE TABLE IF NOT EXISTS core.role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID REFERENCES core.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES core.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- 4.7 AI 对话表
CREATE TABLE IF NOT EXISTS ai.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES core.users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4.8 AI 消息表
CREATE TABLE IF NOT EXISTS ai.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES ai.conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4.9 审计日志表
CREATE TABLE IF NOT EXISTS audit.logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    operator_id UUID,
    target_type VARCHAR(100),
    target_id UUID,
    action VARCHAR(100) NOT NULL,
    before_value JSONB,
    after_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 第五部分: 创建索引
-- =====================================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON core.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON core.users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON core.users(created_at);

-- 会话表索引
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON core.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON core.sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON core.sessions(expires_at);

-- 对话表索引
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON ai.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON ai.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON ai.conversations(created_at);

-- 消息表索引
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON ai.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON ai.messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON ai.messages(created_at);

-- 审计日志索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_operator_id ON audit.logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_type ON audit.logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit.logs(created_at);

-- =====================================================
-- 第六部分: 插入测试数据
-- =====================================================

-- 6.1 插入测试用户 (1000条)
INSERT INTO core.users (username, email, password_hash, full_name, status)
SELECT 
    'user_' || i,
    'user_' || i || '@yyc3.test',
    '$2a$12$test.hash.password.' || i,
    '测试用户' || i,
    CASE WHEN random() > 0.1 THEN 'active' ELSE 'inactive' END
FROM generate_series(1, 1000) i
ON CONFLICT (username) DO NOTHING;

-- 6.2 插入测试角色
INSERT INTO core.roles (name, code, description) VALUES
    ('超级管理员', 'super_admin', '系统超级管理员'),
    ('管理员', 'admin', '系统管理员'),
    ('普通用户', 'user', '普通用户'),
    ('访客', 'guest', '访客用户')
ON CONFLICT (code) DO NOTHING;

-- 6.3 插入测试权限
INSERT INTO core.permissions (name, code, resource, action) VALUES
    ('用户管理', 'user:manage', 'user', 'manage'),
    ('用户查看', 'user:view', 'user', 'view'),
    ('角色管理', 'role:manage', 'role', 'manage'),
    ('角色查看', 'role:view', 'role', 'view'),
    ('对话管理', 'conversation:manage', 'conversation', 'manage'),
    ('对话查看', 'conversation:view', 'conversation', 'view'),
    ('消息发送', 'message:send', 'message', 'send'),
    ('消息查看', 'message:view', 'message', 'view')
ON CONFLICT (code) DO NOTHING;

-- 6.4 分配用户角色
INSERT INTO core.user_roles (user_id, role_id)
SELECT 
    u.id,
    r.id
FROM core.users u
CROSS JOIN core.roles r
WHERE u.username = 'user_1' AND r.code = 'super_admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 6.5 分配角色权限
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
CROSS JOIN core.permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 6.6 插入测试对话 (10000条)
INSERT INTO ai.conversations (user_id, title, status)
SELECT 
    (SELECT id FROM core.users ORDER BY random() LIMIT 1),
    '测试对话 ' || i,
    CASE WHEN random() > 0.1 THEN 'active' ELSE 'archived' END
FROM generate_series(1, 10000) i;

-- 6.7 插入测试消息 (50000条)
INSERT INTO ai.messages (conversation_id, role, content, tokens_used)
SELECT 
    (SELECT id FROM ai.conversations ORDER BY random() LIMIT 1),
    CASE WHEN random() > 0.5 THEN 'user' ELSE 'assistant' END,
    '这是一条测试消息内容，用于性能测试。消息编号: ' || i,
    (random() * 500)::INTEGER
FROM generate_series(1, 50000) i;

-- 6.8 插入审计日志 (100000条)
INSERT INTO audit.logs (operation_type, operator_id, target_type, action)
SELECT 
    CASE (i % 4)
        WHEN 0 THEN 'create'
        WHEN 1 THEN 'update'
        WHEN 2 THEN 'delete'
        ELSE 'read'
    END,
    (SELECT id FROM core.users ORDER BY random() LIMIT 1),
    CASE (i % 5)
        WHEN 0 THEN 'user'
        WHEN 1 THEN 'role'
        WHEN 2 THEN 'conversation'
        WHEN 3 THEN 'message'
        ELSE 'permission'
    END,
    'action_' || i
FROM generate_series(1, 100000) i;

-- =====================================================
-- 第七部分: 性能测试
-- =====================================================

-- 7.1 单条查询性能测试
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT * FROM core.users WHERE email = 'user_500@yyc3.test';

-- 7.2 关联查询性能测试
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT 
    u.username,
    u.email,
    r.name AS role_name
FROM core.users u
LEFT JOIN core.user_roles ur ON u.id = ur.user_id
LEFT JOIN core.roles r ON ur.role_id = r.id
WHERE u.status = 'active'
LIMIT 100;

-- 7.3 分页查询性能测试
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT * FROM ai.messages
WHERE conversation_id = (SELECT id FROM ai.conversations LIMIT 1)
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- 7.4 聚合查询性能测试
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT 
    DATE_TRUNC('day', created_at) AS day,
    COUNT(*) AS message_count,
    AVG(tokens_used) AS avg_tokens
FROM ai.messages
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC
LIMIT 30;

-- 7.5 复杂关联查询性能测试
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT 
    u.id,
    u.username,
    COUNT(DISTINCT c.id) AS conversation_count,
    COUNT(m.id) AS message_count,
    SUM(m.tokens_used) AS total_tokens
FROM core.users u
LEFT JOIN ai.conversations c ON u.id = c.user_id
LEFT JOIN ai.messages m ON c.id = m.conversation_id
WHERE u.status = 'active'
GROUP BY u.id, u.username
ORDER BY message_count DESC
LIMIT 20;

-- =====================================================
-- 第八部分: 并发测试准备
-- =====================================================

-- 8.1 创建并发测试函数
CREATE OR REPLACE FUNCTION test.concurrent_insert_test(p_count INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit.logs (operation_type, operator_id, target_type, action)
    SELECT 
        'test',
        (SELECT id FROM core.users ORDER BY random() LIMIT 1),
        'concurrent_test',
        'concurrent_action_' || i
    FROM generate_series(1, p_count) i;
END;
$$ LANGUAGE plpgsql;

-- 8.2 创建并发更新测试函数
CREATE OR REPLACE FUNCTION test.concurrent_update_test(p_count INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE core.users
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id IN (
        SELECT id FROM core.users 
        WHERE status = 'active' 
        ORDER BY random() 
        LIMIT p_count
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 第九部分: 连接池测试
-- =====================================================

-- 9.1 查看当前连接数
SELECT 
    state,
    COUNT(*) AS connection_count
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY connection_count DESC;

-- 9.2 查看连接详情
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    EXTRACT(EPOCH FROM (now() - query_start)) AS duration_seconds,
    query
FROM pg_stat_activity
WHERE datname = current_database()
ORDER BY query_start;

-- =====================================================
-- 第十部分: 测试结果汇总
-- =====================================================

-- 10.1 数据统计
SELECT 
    'users' AS table_name,
    COUNT(*) AS row_count,
    pg_size_pretty(pg_total_relation_size('core.users')) AS size
FROM core.users
UNION ALL
SELECT 
    'conversations',
    COUNT(*),
    pg_size_pretty(pg_total_relation_size('ai.conversations'))
FROM ai.conversations
UNION ALL
SELECT 
    'messages',
    COUNT(*),
    pg_size_pretty(pg_total_relation_size('ai.messages'))
FROM ai.messages
UNION ALL
SELECT 
    'audit_logs',
    COUNT(*),
    pg_size_pretty(pg_total_relation_size('audit.logs'))
FROM audit.logs;

-- 10.2 索引使用统计
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname IN ('core', 'ai', 'audit')
ORDER BY idx_scan DESC;

-- 10.3 表统计信息
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del
FROM pg_stat_user_tables
WHERE schemaname IN ('core', 'ai', 'audit')
ORDER BY schemaname, tablename;

-- =====================================================
-- 清理测试数据 (可选)
-- =====================================================

-- 取消注释以下命令来清理测试数据
-- TRUNCATE TABLE audit.logs CASCADE;
-- TRUNCATE TABLE ai.messages CASCADE;
-- TRUNCATE TABLE ai.conversations CASCADE;
-- TRUNCATE TABLE core.user_roles CASCADE;
-- TRUNCATE TABLE core.role_permissions CASCADE;
-- TRUNCATE TABLE core.sessions CASCADE;
-- TRUNCATE TABLE core.users CASCADE;
-- TRUNCATE TABLE core.roles CASCADE;
-- TRUNCATE TABLE core.permissions CASCADE;

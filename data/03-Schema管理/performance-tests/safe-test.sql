-- =====================================================
-- YYC³-AI-Family 多端数据库安全测试脚本
-- @file: safe-test.sql
-- @description: 完全隔离的测试，不影响现有项目数据
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @database: yyc3_aify (PostgreSQL 15)
-- =====================================================

-- =====================================================
-- 重要说明：
-- 1. 所有测试在独立的 test schema 中进行
-- 2. 不会影响现有 core, public, telemetry schema
-- 3. 测试完成后可安全删除 test schema
-- =====================================================

-- 创建测试专用 schema
DROP SCHEMA IF EXISTS test CASCADE;
CREATE SCHEMA test;

-- =====================================================
-- 第一部分: 环境检查 (不影响现有数据)
-- =====================================================

\echo '========== 环境检查 =========='

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

-- 1.4 检查现有 schema (只读)
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY schema_name;

-- 1.5 检查现有表 (只读)
SELECT schemaname, COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
GROUP BY schemaname
ORDER BY schemaname;

-- =====================================================
-- 第二部分: 创建测试表 (在 test schema 中)
-- =====================================================

\echo '========== 创建测试表 =========='

-- 2.1 测试用户表
CREATE TABLE test.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.2 测试会话表
CREATE TABLE test.sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES test.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.3 测试角色表
CREATE TABLE test.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.4 测试权限表
CREATE TABLE test.permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.5 测试用户角色关联表
CREATE TABLE test.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES test.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES test.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- 2.6 测试角色权限关联表
CREATE TABLE test.role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID REFERENCES test.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES test.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- 2.7 测试对话表
CREATE TABLE test.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES test.users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.8 测试消息表
CREATE TABLE test.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES test.conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.9 测试审计日志表
CREATE TABLE test.audit_logs (
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
-- 第三部分: 创建测试索引
-- =====================================================

\echo '========== 创建测试索引 =========='

CREATE INDEX idx_test_users_email ON test.users(email);
CREATE INDEX idx_test_users_status ON test.users(status);
CREATE INDEX idx_test_sessions_user_id ON test.sessions(user_id);
CREATE INDEX idx_test_conversations_user_id ON test.conversations(user_id);
CREATE INDEX idx_test_messages_conversation_id ON test.messages(conversation_id);
CREATE INDEX idx_test_messages_created_at ON test.messages(created_at);
CREATE INDEX idx_test_audit_logs_created_at ON test.audit_logs(created_at);

-- =====================================================
-- 第四部分: 插入测试数据
-- =====================================================

\echo '========== 插入测试数据 =========='

-- 4.1 插入测试用户 (1000条)
INSERT INTO test.users (username, email, password_hash, full_name, status)
SELECT 
    'test_user_' || i,
    'test_user_' || i || '@yyc3.test',
    '$2a$12$test.hash.password.' || i,
    '测试用户' || i,
    CASE WHEN random() > 0.1 THEN 'active' ELSE 'inactive' END
FROM generate_series(1, 1000) i;

-- 4.2 插入测试角色
INSERT INTO test.roles (name, code, description) VALUES
    ('超级管理员', 'super_admin', '系统超级管理员'),
    ('管理员', 'admin', '系统管理员'),
    ('普通用户', 'user', '普通用户'),
    ('访客', 'guest', '访客用户');

-- 4.3 插入测试权限
INSERT INTO test.permissions (name, code, resource, action) VALUES
    ('用户管理', 'user:manage', 'user', 'manage'),
    ('用户查看', 'user:view', 'user', 'view'),
    ('角色管理', 'role:manage', 'role', 'manage'),
    ('对话管理', 'conversation:manage', 'conversation', 'manage'),
    ('消息发送', 'message:send', 'message', 'send');

-- 4.4 分配用户角色
INSERT INTO test.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM test.users u
CROSS JOIN test.roles r
WHERE u.username = 'test_user_1';

-- 4.5 分配角色权限
INSERT INTO test.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM test.roles r
CROSS JOIN test.permissions p;

-- 4.6 插入测试对话 (10000条)
INSERT INTO test.conversations (user_id, title, status)
SELECT 
    (SELECT id FROM test.users ORDER BY random() LIMIT 1),
    '测试对话 ' || i,
    CASE WHEN random() > 0.1 THEN 'active' ELSE 'archived' END
FROM generate_series(1, 10000) i;

-- 4.7 插入测试消息 (50000条)
INSERT INTO test.messages (conversation_id, role, content, tokens_used)
SELECT 
    (SELECT id FROM test.conversations ORDER BY random() LIMIT 1),
    CASE WHEN random() > 0.5 THEN 'user' ELSE 'assistant' END,
    '这是一条测试消息内容，用于性能测试。消息编号: ' || i,
    (random() * 500)::INTEGER
FROM generate_series(1, 50000) i;

-- 4.8 插入审计日志 (100000条)
INSERT INTO test.audit_logs (operation_type, operator_id, target_type, action)
SELECT 
    CASE (i % 4) WHEN 0 THEN 'create' WHEN 1 THEN 'update' WHEN 2 THEN 'delete' ELSE 'read' END,
    (SELECT id FROM test.users ORDER BY random() LIMIT 1),
    CASE (i % 5) WHEN 0 THEN 'user' WHEN 1 THEN 'role' WHEN 2 THEN 'conversation' WHEN 3 THEN 'message' ELSE 'permission' END,
    'action_' || i
FROM generate_series(1, 100000) i;

\echo '========== 测试数据插入完成 =========='

-- =====================================================
-- 第五部分: 性能测试
-- =====================================================

\echo '========== 性能测试 =========='

-- 5.1 单条查询性能测试
\echo '--- 测试1: 单条查询性能 ---'
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT * FROM test.users WHERE email = 'test_user_500@yyc3.test';

-- 5.2 关联查询性能测试
\echo '--- 测试2: 关联查询性能 ---'
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT 
    u.username,
    u.email,
    r.name AS role_name
FROM test.users u
LEFT JOIN test.user_roles ur ON u.id = ur.user_id
LEFT JOIN test.roles r ON ur.role_id = r.id
WHERE u.status = 'active'
LIMIT 100;

-- 5.3 分页查询性能测试
\echo '--- 测试3: 分页查询性能 ---'
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT * FROM test.messages
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- 5.4 聚合查询性能测试
\echo '--- 测试4: 聚合查询性能 ---'
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT 
    DATE_TRUNC('day', created_at) AS day,
    COUNT(*) AS message_count,
    AVG(tokens_used) AS avg_tokens
FROM test.messages
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC
LIMIT 30;

-- 5.5 复杂关联查询性能测试
\echo '--- 测试5: 复杂关联查询性能 ---'
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
SELECT 
    u.id,
    u.username,
    COUNT(DISTINCT c.id) AS conversation_count,
    COUNT(m.id) AS message_count,
    SUM(m.tokens_used) AS total_tokens
FROM test.users u
LEFT JOIN test.conversations c ON u.id = c.user_id
LEFT JOIN test.messages m ON c.id = m.conversation_id
WHERE u.status = 'active'
GROUP BY u.id, u.username
ORDER BY message_count DESC
LIMIT 20;

-- =====================================================
-- 第六部分: 测试结果汇总
-- =====================================================

\echo '========== 测试结果汇总 =========='

-- 6.1 数据统计
SELECT 
    'test.users' AS table_name,
    COUNT(*) AS row_count,
    pg_size_pretty(pg_total_relation_size('test.users')) AS size
FROM test.users
UNION ALL
SELECT 
    'test.conversations',
    COUNT(*),
    pg_size_pretty(pg_total_relation_size('test.conversations'))
FROM test.conversations
UNION ALL
SELECT 
    'test.messages',
    COUNT(*),
    pg_size_pretty(pg_total_relation_size('test.messages'))
FROM test.messages
UNION ALL
SELECT 
    'test.audit_logs',
    COUNT(*),
    pg_size_pretty(pg_total_relation_size('test.audit_logs'))
FROM test.audit_logs;

-- 6.2 索引使用统计
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'test'
ORDER BY idx_scan DESC;

-- 6.3 连接状态
SELECT 
    state,
    COUNT(*) AS connection_count
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY connection_count DESC;

-- =====================================================
-- 第七部分: 清理测试数据 (可选)
-- =====================================================

\echo '========== 测试完成 =========='
\echo '测试数据在 test schema 中，不会影响现有项目'
\echo '如需清理测试数据，请执行: DROP SCHEMA test CASCADE;'

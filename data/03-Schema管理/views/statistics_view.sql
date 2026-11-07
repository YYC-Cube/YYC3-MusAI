-- =====================================================
-- YYC³-AI-Family 视图创建脚本
-- @file: views.sql
-- @description: 创建常用查询视图，简化复杂查询
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 用户相关视图
-- =====================================================

-- 用户详细信息视图
CREATE OR REPLACE VIEW core.v_user_details AS
SELECT
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.avatar_url,
    u.phone,
    u.status,
    u.email_verified,
    u.phone_verified,
    u.last_login_at,
    u.login_count,
    u.created_at,
    u.updated_at,
    -- 主角色信息
    r.id AS primary_role_id,
    r.name AS primary_role_name,
    r.code AS primary_role_code,
    r.type AS primary_role_type,
    -- 主部门信息
    d.id AS primary_dept_id,
    d.name AS primary_dept_name,
    o.id AS org_id,
    o.name AS org_name
FROM core.users u
LEFT JOIN core.user_roles ur ON u.id = ur.user_id AND ur.is_primary = TRUE
LEFT JOIN core.roles r ON ur.role_id = r.id
LEFT JOIN core.user_departments ud ON u.id = ud.user_id AND ud.is_primary = TRUE
LEFT JOIN core.departments d ON ud.dept_id = d.id
LEFT JOIN core.organizations o ON d.org_id = o.id
WHERE u.deleted_at IS NULL;

COMMENT ON VIEW core.v_user_details IS '用户详细信息视图';

-- 用户权限视图
CREATE OR REPLACE VIEW core.v_user_permissions AS
SELECT DISTINCT
    u.id AS user_id,
    u.username,
    r.id AS role_id,
    r.name AS role_name,
    r.code AS role_code,
    p.id AS permission_id,
    p.name AS permission_name,
    p.code AS permission_code,
    p.resource,
    p.action
FROM core.users u
JOIN core.user_roles ur ON u.id = ur.user_id
JOIN core.roles r ON ur.role_id = r.id
JOIN core.role_permissions rp ON r.id = rp.role_id
JOIN core.permissions p ON rp.permission_id = p.id
WHERE u.deleted_at IS NULL
  AND u.status = 'active'
  AND r.is_active = TRUE
  AND p.is_active = TRUE
  AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);

COMMENT ON VIEW core.v_user_permissions IS '用户权限视图';

-- =====================================================
-- 项目相关视图
-- =====================================================

-- 项目概览视图
CREATE OR REPLACE VIEW core.v_project_overview AS
SELECT
    p.id,
    p.name,
    p.code,
    p.description,
    p.status,
    p.priority,
    p.progress,
    p.start_date,
    p.end_date,
    p.budget,
    p.created_at,
    -- 项目负责人信息
    u.id AS owner_id,
    u.username AS owner_name,
    u.full_name AS owner_full_name,
    -- 组织信息
    o.id AS org_id,
    o.name AS org_name,
    -- 统计信息
    (SELECT COUNT(*) FROM core.project_members pm WHERE pm.project_id = p.id) AS member_count,
    (SELECT COUNT(*) FROM core.tasks t WHERE t.project_id = p.id AND t.deleted_at IS NULL) AS total_tasks,
    (SELECT COUNT(*) FROM core.tasks t WHERE t.project_id = p.id AND t.status = 'completed' AND t.deleted_at IS NULL) AS completed_tasks,
    (SELECT COUNT(*) FROM core.tasks t WHERE t.project_id = p.id AND t.status = 'pending' AND t.deleted_at IS NULL) AS pending_tasks,
    (SELECT COUNT(*) FROM core.tasks t WHERE t.project_id = p.id AND t.status = 'running' AND t.deleted_at IS NULL) AS running_tasks,
    (SELECT COUNT(*) FROM core.tasks t WHERE t.project_id = p.id AND t.status = 'failed' AND t.deleted_at IS NULL) AS failed_tasks
FROM core.projects p
LEFT JOIN core.users u ON p.owner_id = u.id
LEFT JOIN core.organizations o ON p.org_id = o.id
WHERE p.deleted_at IS NULL;

COMMENT ON VIEW core.v_project_overview IS '项目概览视图';

-- 任务统计视图
CREATE OR REPLACE VIEW core.v_task_statistics AS
SELECT
    t.project_id,
    p.name AS project_name,
    COUNT(*) AS total_tasks,
    COUNT(*) FILTER (WHERE t.status = 'pending') AS pending_tasks,
    COUNT(*) FILTER (WHERE t.status = 'running') AS running_tasks,
    COUNT(*) FILTER (WHERE t.status = 'completed') AS completed_tasks,
    COUNT(*) FILTER (WHERE t.status = 'failed') AS failed_tasks,
    COUNT(*) FILTER (WHERE t.status = 'cancelled') AS cancelled_tasks,
    AVG(t.progress) AS avg_progress,
    AVG(t.estimated_hours) AS avg_estimated_hours,
    AVG(t.actual_hours) AS avg_actual_hours,
    COUNT(*) FILTER (WHERE t.due_date < CURRENT_TIMESTAMP AND t.status NOT IN ('completed', 'cancelled')) AS overdue_tasks
FROM core.tasks t
JOIN core.projects p ON t.project_id = p.id
WHERE t.deleted_at IS NULL
GROUP BY t.project_id, p.name;

COMMENT ON VIEW core.v_task_statistics IS '任务统计视图';

-- =====================================================
-- AI智能体相关视图
-- =====================================================

-- AI智能体状态视图
CREATE OR REPLACE VIEW ai.v_agent_status AS
SELECT
    a.id,
    a.name,
    a.code,
    a.type,
    a.status,
    a.version,
    -- 性能指标
    a.total_tasks_completed,
    a.total_tasks_failed,
    a.success_rate,
    a.average_response_time_ms,
    -- 配置信息
    a.max_concurrent_tasks,
    a.model_config->>'model' AS model_name,
    -- 时间信息
    a.created_at,
    a.updated_at
FROM ai.agents a
WHERE a.deleted_at IS NULL;

COMMENT ON VIEW ai.v_agent_status IS 'AI智能体状态视图';

-- 对话统计视图
CREATE OR REPLACE VIEW ai.v_conversation_statistics AS
SELECT
    c.user_id,
    u.username,
    c.agent_id,
    a.name AS agent_name,
    a.type AS agent_type,
    COUNT(c.id) AS total_conversations,
    SUM(c.message_count) AS total_messages,
    SUM(c.total_tokens) AS total_tokens,
    SUM(c.total_cost) AS total_cost,
    AVG(c.message_count) AS avg_messages_per_conversation,
    MAX(c.last_message_at) AS last_activity_at
FROM ai.conversations c
LEFT JOIN core.users u ON c.user_id = u.id
LEFT JOIN ai.agents a ON c.agent_id = a.id
WHERE c.deleted_at IS NULL
GROUP BY c.user_id, u.username, c.agent_id, a.name, a.type;

COMMENT ON VIEW ai.v_conversation_statistics IS '对话统计视图';

-- 知识库统计视图
CREATE OR REPLACE VIEW ai.v_knowledge_base_statistics AS
SELECT
    kb.id,
    kb.name,
    kb.code,
    kb.is_public,
    kb.is_active,
    -- 统计信息
    kb.document_count,
    kb.chunk_count,
    kb.total_tokens,
    -- 文档状态统计
    COUNT(d.id) FILTER (WHERE d.status = 'pending') AS pending_documents,
    COUNT(d.id) FILTER (WHERE d.status = 'processing') AS processing_documents,
    COUNT(d.id) FILTER (WHERE d.status = 'completed') AS completed_documents,
    COUNT(d.id) FILTER (WHERE d.status = 'failed') AS failed_documents,
    -- 所有者信息
    u.username AS owner_name,
    o.name AS org_name,
    -- 时间信息
    kb.created_at,
    kb.updated_at
FROM ai.knowledge_bases kb
LEFT JOIN ai.documents d ON kb.id = d.knowledge_base_id AND d.deleted_at IS NULL
LEFT JOIN core.users u ON kb.owner_id = u.id
LEFT JOIN core.organizations o ON kb.org_id = o.id
WHERE kb.deleted_at IS NULL
GROUP BY kb.id, kb.name, kb.code, kb.is_public, kb.is_active,
         kb.document_count, kb.chunk_count, kb.total_tokens,
         u.username, o.name, kb.created_at, kb.updated_at;

COMMENT ON VIEW ai.v_knowledge_base_statistics IS '知识库统计视图';

-- =====================================================
-- 工作流相关视图
-- =====================================================

-- 工作流执行统计视图
CREATE OR REPLACE VIEW workflow.v_execution_statistics AS
SELECT
    w.id AS workflow_id,
    w.name AS workflow_name,
    w.code AS workflow_code,
    w.status AS workflow_status,
    -- 统计信息
    COUNT(e.id) AS total_executions,
    COUNT(e.id) FILTER (WHERE e.status = 'success') AS success_executions,
    COUNT(e.id) FILTER (WHERE e.status = 'failed') AS failed_executions,
    COUNT(e.id) FILTER (WHERE e.status = 'running') AS running_executions,
    AVG(e.duration_seconds) AS avg_duration_seconds,
    MAX(e.started_at) AS last_execution_at,
    -- 所有者信息
    u.username AS owner_name
FROM workflow.definitions w
LEFT JOIN workflow.executions e ON w.id = e.workflow_id
LEFT JOIN core.users u ON w.owner_id = u.id
WHERE w.deleted_at IS NULL
GROUP BY w.id, w.name, w.code, w.status, u.username;

COMMENT ON VIEW workflow.v_execution_statistics IS '工作流执行统计视图';

-- =====================================================
-- 审计监控相关视图
-- =====================================================

-- 审计日志统计视图
CREATE OR REPLACE VIEW audit.v_operation_statistics AS
SELECT
    DATE(timestamp) AS operation_date,
    operation_type,
    operation_level,
    COUNT(*) AS operation_count,
    COUNT(*) FILTER (WHERE result = 'success') AS success_count,
    COUNT(*) FILTER (WHERE result = 'failed') AS failed_count,
    COUNT(DISTINCT operator_id) AS unique_operators,
    COUNT(DISTINCT target_type) AS unique_target_types
FROM audit.logs
GROUP BY DATE(timestamp), operation_type, operation_level
ORDER BY operation_date DESC, operation_count DESC;

COMMENT ON VIEW audit.v_operation_statistics IS '审计日志统计视图';

-- 设备状态视图
CREATE OR REPLACE VIEW monitor.v_device_status AS
SELECT
    d.id,
    d.name,
    d.code,
    d.type,
    d.status,
    d.ip_address,
    d.location,
    -- 硬件信息
    d.cpu_cores,
    d.memory_gb,
    d.disk_gb,
    d.os_type,
    d.os_version,
    -- 最新监控数据
    (SELECT value FROM monitor.metrics m WHERE m.device_id = d.id AND m.metric_name = 'cpu_usage' ORDER BY timestamp DESC LIMIT 1) AS cpu_usage,
    (SELECT value FROM monitor.metrics m WHERE m.device_id = d.id AND m.metric_name = 'memory_usage' ORDER BY timestamp DESC LIMIT 1) AS memory_usage,
    (SELECT value FROM monitor.metrics m WHERE m.device_id = d.id AND m.metric_name = 'disk_usage' ORDER BY timestamp DESC LIMIT 1) AS disk_usage,
    -- 时间信息
    d.last_heartbeat_at,
    d.created_at,
    d.updated_at
FROM monitor.devices d
WHERE d.deleted_at IS NULL;

COMMENT ON VIEW monitor.v_device_status IS '设备状态视图';

-- 告警统计视图
CREATE OR REPLACE VIEW monitor.v_alert_statistics AS
SELECT
    DATE(triggered_at) AS alert_date,
    level,
    status,
    COUNT(*) AS alert_count,
    COUNT(*) FILTER (WHERE status = 'active') AS active_count,
    COUNT(*) FILTER (WHERE status = 'acknowledged') AS acknowledged_count,
    COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, CURRENT_TIMESTAMP) - triggered_at))) AS avg_resolution_seconds
FROM monitor.alerts
GROUP BY DATE(triggered_at), level, status
ORDER BY alert_date DESC, alert_count DESC;

COMMENT ON VIEW monitor.v_alert_statistics IS '告警统计视图';

-- =====================================================
-- 扩展管理相关视图
-- =====================================================

-- API密钥使用统计视图
CREATE OR REPLACE VIEW extension.v_api_key_usage AS
SELECT
    ak.id,
    ak.name,
    ak.key_prefix,
    ak.status,
    ak.rate_limit,
    ak.expires_at,
    -- 统计信息
    ak.total_requests,
    COUNT(al.id) AS requests_in_period,
    COUNT(al.id) FILTER (WHERE al.status_code >= 200 AND al.status_code < 300) AS success_requests,
    COUNT(al.id) FILTER (WHERE al.status_code >= 400) AS error_requests,
    AVG(al.response_time_ms) AS avg_response_time_ms,
    MAX(al.timestamp) AS last_request_at,
    -- 所有者信息
    u.username AS owner_name
FROM extension.api_keys ak
LEFT JOIN extension.api_logs al ON ak.id = al.api_key_id
    AND al.timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
LEFT JOIN core.users u ON ak.owner_id = u.id
GROUP BY ak.id, ak.name, ak.key_prefix, ak.status, ak.rate_limit, ak.expires_at, ak.total_requests, u.username;

COMMENT ON VIEW extension.v_api_key_usage IS 'API密钥使用统计视图';

-- Webhook调用统计视图
CREATE OR REPLACE VIEW extension.v_webhook_statistics AS
SELECT
    w.id,
    w.name,
    w.url,
    w.is_active,
    -- 统计信息
    w.total_calls,
    w.success_calls,
    w.failed_calls,
    COUNT(wl.id) FILTER (WHERE wl.timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days') AS calls_in_period,
    COUNT(wl.id) FILTER (WHERE wl.status = 'success' AND wl.timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days') AS success_calls_in_period,
    COUNT(wl.id) FILTER (WHERE wl.status = 'failed' AND wl.timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days') AS failed_calls_in_period,
    MAX(wl.timestamp) AS last_call_at,
    -- 所有者信息
    u.username AS owner_name
FROM extension.webhooks w
LEFT JOIN extension.webhook_logs wl ON w.id = wl.webhook_id
LEFT JOIN core.users u ON w.owner_id = u.id
GROUP BY w.id, w.name, w.url, w.is_active, w.total_calls, w.success_calls, w.failed_calls, u.username;

COMMENT ON VIEW extension.v_webhook_statistics IS 'Webhook调用统计视图';

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE '视图创建完成: 所有常用查询视图已创建';
END $$;

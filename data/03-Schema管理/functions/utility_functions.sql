-- =====================================================
-- YYC³-AI-Family 函数创建脚本
-- @file: utility_functions.sql
-- @description: 创建常用存储过程和函数
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 用户管理函数
-- =====================================================

-- 检查用户权限
CREATE OR REPLACE FUNCTION core.check_user_permission(
    p_user_id UUID,
    p_resource VARCHAR,
    p_action VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM core.v_user_permissions up
        WHERE up.user_id = p_user_id
          AND up.resource = p_resource
          AND up.action = p_action
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION core.check_user_permission(UUID, VARCHAR, VARCHAR) IS '检查用户是否有指定权限';

-- 获取用户所有权限
CREATE OR REPLACE FUNCTION core.get_user_permissions(
    p_user_id UUID
) RETURNS TABLE (
    permission_code VARCHAR,
    permission_name VARCHAR,
    resource VARCHAR,
    action VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        up.permission_code::VARCHAR,
        up.permission_name::VARCHAR,
        up.resource::VARCHAR,
        up.action::VARCHAR
    FROM core.v_user_permissions up
    WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION core.get_user_permissions(UUID) IS '获取用户所有权限';

-- 更新用户最后登录信息
CREATE OR REPLACE FUNCTION core.update_last_login(
    p_user_id UUID,
    p_ip_address INET
) RETURNS VOID AS $$
BEGIN
    UPDATE core.users
    SET last_login_at = CURRENT_TIMESTAMP,
        last_login_ip = p_ip_address,
        login_count = login_count + 1,
        failed_login_count = 0,
        locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.update_last_login(UUID, INET) IS '更新用户最后登录信息';

-- 记录登录失败
CREATE OR REPLACE FUNCTION core.record_failed_login(
    p_user_id UUID,
    p_max_attempts INTEGER DEFAULT 5,
    p_lock_duration_minutes INTEGER DEFAULT 30
) RETURNS BOOLEAN AS $$
DECLARE
    v_failed_count INTEGER;
BEGIN
    UPDATE core.users
    SET failed_login_count = failed_login_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id
    RETURNING failed_login_count INTO v_failed_count;

    IF v_failed_count >= p_max_attempts THEN
        UPDATE core.users
        SET locked_until = CURRENT_TIMESTAMP + (p_lock_duration_minutes || ' minutes')::INTERVAL
        WHERE id = p_user_id;
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.record_failed_login(UUID, INTEGER, INTEGER) IS '记录登录失败，超过次数则锁定账户';

-- =====================================================
-- 项目管理函数
-- =====================================================

-- 更新项目进度
CREATE OR REPLACE FUNCTION core.update_project_progress(
    p_project_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_progress INTEGER;
BEGIN
    SELECT COALESCE(AVG(progress), 0)::INTEGER
    INTO v_progress
    FROM core.tasks
    WHERE project_id = p_project_id
      AND deleted_at IS NULL;

    UPDATE core.projects
    SET progress = v_progress,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_project_id;

    RETURN v_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.update_project_progress(UUID) IS '更新项目进度（基于任务平均进度）';

-- 获取项目任务树
CREATE OR REPLACE FUNCTION core.get_task_tree(
    p_project_id UUID,
    p_parent_id UUID DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    title VARCHAR,
    status task_status,
    priority task_priority,
    progress INTEGER,
    level INTEGER,
    path VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE task_tree AS (
        SELECT
            t.id,
            t.title,
            t.status,
            t.priority,
            t.progress,
            t.level,
            t.path
        FROM core.tasks t
        WHERE t.project_id = p_project_id
          AND t.parent_id IS NULL
          AND t.deleted_at IS NULL

        UNION ALL

        SELECT
            t.id,
            t.title,
            t.status,
            t.priority,
            t.progress,
            t.level,
            t.path
        FROM core.tasks t
        INNER JOIN task_tree tt ON t.parent_id = tt.id
        WHERE t.deleted_at IS NULL
    )
    SELECT * FROM task_tree
    ORDER BY path;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION core.get_task_tree(UUID, UUID) IS '获取项目任务树结构';

-- =====================================================
-- AI智能体函数
-- =====================================================

-- 向量相似度搜索
CREATE OR REPLACE FUNCTION ai.search_similar_chunks(
    p_knowledge_base_id UUID,
    p_query_embedding vector,
    p_top_k INTEGER DEFAULT 5,
    p_similarity_threshold FLOAT DEFAULT 0.7
) RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    document_title VARCHAR,
    content TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id AS chunk_id,
        dc.document_id,
        d.title AS document_title,
        dc.content,
        1 - (dc.embedding <=> p_query_embedding) AS similarity
    FROM ai.document_chunks dc
    JOIN ai.documents d ON dc.document_id = d.id
    WHERE dc.knowledge_base_id = p_knowledge_base_id
      AND d.deleted_at IS NULL
    ORDER BY dc.embedding <=> p_query_embedding
    LIMIT p_top_k;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION ai.search_similar_chunks(UUID, vector, INTEGER, FLOAT) IS '向量相似度搜索';

-- 更新智能体统计信息
CREATE OR REPLACE FUNCTION ai.update_agent_statistics(
    p_agent_id UUID,
    p_success BOOLEAN,
    p_response_time_ms INTEGER
) RETURNS VOID AS $$
DECLARE
    v_total_completed INTEGER;
    v_total_failed INTEGER;
    v_success_rate DECIMAL(5,2);
    v_avg_response_time INTEGER;
BEGIN
    UPDATE ai.agents
    SET
        total_tasks_completed = total_tasks_completed + CASE WHEN p_success THEN 1 ELSE 0 END,
        total_tasks_failed = total_tasks_failed + CASE WHEN NOT p_success THEN 1 ELSE 0 END,
        average_response_time_ms = (
            (average_response_time_ms * (total_tasks_completed + total_tasks_failed) + p_response_time_ms) /
            (total_tasks_completed + total_tasks_failed + 1)
        )::INTEGER,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_agent_id
    RETURNING
        total_tasks_completed,
        total_tasks_failed
    INTO v_total_completed, v_total_failed;

    v_success_rate := CASE
        WHEN (v_total_completed + v_total_failed) > 0
        THEN (v_total_completed::DECIMAL / (v_total_completed + v_total_failed)) * 100
        ELSE 0
    END;

    UPDATE ai.agents
    SET success_rate = v_success_rate
    WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION ai.update_agent_statistics(UUID, BOOLEAN, INTEGER) IS '更新智能体统计信息';

-- =====================================================
-- 审计日志函数
-- =====================================================

-- 记录审计日志
CREATE OR REPLACE FUNCTION audit.log_operation(
    p_operation_type audit_operation_type,
    p_operation_level audit_operation_level DEFAULT 'info',
    p_operation_desc TEXT DEFAULT NULL,
    p_operator_id UUID DEFAULT NULL,
    p_operator_name VARCHAR DEFAULT NULL,
    p_operator_ip INET DEFAULT NULL,
    p_target_type VARCHAR DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_target_name VARCHAR DEFAULT NULL,
    p_action VARCHAR,
    p_before_value JSONB DEFAULT NULL,
    p_after_value JSONB DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_result VARCHAR DEFAULT 'success',
    p_duration_ms INTEGER DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO audit.logs (
        operation_type,
        operation_level,
        operation_desc,
        operator_id,
        operator_name,
        operator_ip,
        target_type,
        target_id,
        target_name,
        action,
        before_value,
        after_value,
        reason,
        result,
        duration_ms,
        metadata
    ) VALUES (
        p_operation_type,
        p_operation_level,
        p_operation_desc,
        p_operator_id,
        p_operator_name,
        p_operator_ip,
        p_target_type,
        p_target_id,
        p_target_name,
        p_action,
        p_before_value,
        p_after_value,
        p_reason,
        p_result,
        p_duration_ms,
        p_metadata
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit.log_operation IS '记录审计日志';

-- 清理过期审计日志
CREATE OR REPLACE FUNCTION audit.cleanup_old_logs(
    p_retention_days INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM audit.logs
    WHERE created_at < CURRENT_TIMESTAMP - (p_retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit.cleanup_old_logs(INTEGER) IS '清理过期审计日志';

-- =====================================================
-- 监控函数
-- =====================================================

-- 记录监控指标
CREATE OR REPLACE FUNCTION monitor.record_metric(
    p_device_id UUID,
    p_metric_name VARCHAR,
    p_value DECIMAL,
    p_unit VARCHAR DEFAULT NULL,
    p_labels JSONB DEFAULT '{}',
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_metric_id UUID;
BEGIN
    INSERT INTO monitor.metrics (
        device_id,
        metric_name,
        value,
        unit,
        labels,
        metadata
    ) VALUES (
        p_device_id,
        p_metric_name,
        p_value,
        p_unit,
        p_labels,
        p_metadata
    )
    RETURNING id INTO v_metric_id;

    RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION monitor.record_metric(UUID, VARCHAR, DECIMAL, VARCHAR, JSONB, JSONB) IS '记录监控指标';

-- 创建告警
CREATE OR REPLACE FUNCTION monitor.create_alert(
    p_rule_id UUID,
    p_title VARCHAR,
    p_message TEXT,
    p_level alert_level,
    p_device_id UUID DEFAULT NULL,
    p_metric_name VARCHAR DEFAULT NULL,
    p_metric_value DECIMAL DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_alert_id UUID;
BEGIN
    INSERT INTO monitor.alerts (
        rule_id,
        title,
        message,
        level,
        device_id,
        metric_name,
        metric_value,
        metadata
    ) VALUES (
        p_rule_id,
        p_title,
        p_message,
        p_level,
        p_device_id,
        p_metric_name,
        p_metric_value,
        p_metadata
    )
    RETURNING id INTO v_alert_id;

    -- 更新规则统计
    UPDATE monitor.alert_rules
    SET trigger_count = trigger_count + 1,
        last_triggered_at = CURRENT_TIMESTAMP
    WHERE id = p_rule_id;

    RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION monitor.create_alert(UUID, VARCHAR, TEXT, alert_level, UUID, VARCHAR, DECIMAL, JSONB) IS '创建告警';

-- 确认告警
CREATE OR REPLACE FUNCTION monitor.acknowledge_alert(
    p_alert_id UUID,
    p_user_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE monitor.alerts
    SET status = 'acknowledged',
        acknowledged_by = p_user_id,
        acknowledged_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION monitor.acknowledge_alert(UUID, UUID) IS '确认告警';

-- 解决告警
CREATE OR REPLACE FUNCTION monitor.resolve_alert(
    p_alert_id UUID,
    p_user_id UUID,
    p_resolution_note TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE monitor.alerts
    SET status = 'resolved',
        resolved_by = p_user_id,
        resolved_at = CURRENT_TIMESTAMP,
        resolution_note = p_resolution_note,
        duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - triggered_at))::INTEGER,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION monitor.resolve_alert(UUID, UUID, TEXT) IS '解决告警';

-- =====================================================
-- 工具函数
-- =====================================================

-- 生成唯一编码
CREATE OR REPLACE FUNCTION core.generate_code(
    p_prefix VARCHAR,
    p_length INTEGER DEFAULT 8
) RETURNS VARCHAR AS $$
DECLARE
    v_code VARCHAR;
BEGIN
    v_code := p_prefix || '_' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR p_length));
    RETURN v_code;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION core.generate_code(VARCHAR, INTEGER) IS '生成唯一编码';

-- 解析JSON路径
CREATE OR REPLACE FUNCTION core.jsonb_extract_path_text(
    p_jsonb JSONB,
    p_path TEXT[]
) RETURNS TEXT AS $$
BEGIN
    RETURN p_jsonb #>> p_path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION core.jsonb_extract_path_text(JSONB, TEXT[]) IS '解析JSON路径获取文本值';

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE '函数创建完成: 所有常用存储过程和函数已创建';
END $$;

-- =====================================================
-- YYC³-AI-Family 函数异常处理脚本
-- @file: exception_handling.sql
-- @description: 完善函数异常处理机制
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 异常处理基础框架
-- =====================================================

-- 创建异常日志表
CREATE TABLE IF NOT EXISTS core.function_errors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    function_name VARCHAR(200) NOT NULL,
    error_code VARCHAR(50),
    error_message TEXT,
    error_detail TEXT,
    error_hint TEXT,
    error_context TEXT,
    parameters JSONB DEFAULT '{}',
    stack_trace TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_function_errors_function ON core.function_errors(function_name);
CREATE INDEX idx_function_errors_created_at ON core.function_errors(created_at);

-- =====================================================
-- 异常处理函数
-- =====================================================

CREATE OR REPLACE FUNCTION core.log_function_error(
    p_function_name VARCHAR,
    p_error_code VARCHAR DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_parameters JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO core.function_errors (
        function_name,
        error_code,
        error_message,
        error_detail,
        error_hint,
        error_context,
        parameters,
        user_id
    ) VALUES (
        p_function_name,
        p_error_code,
        p_error_message,
        SQLERRM,
        NULL,
        NULL,
        p_parameters,
        current_setting('app.current_user_id', TRUE)::UUID
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 用户管理函数（带异常处理）
-- =====================================================

CREATE OR REPLACE FUNCTION core.create_user_safe(
    p_username VARCHAR,
    p_email VARCHAR,
    p_password VARCHAR,
    p_full_name VARCHAR DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_password_hash VARCHAR;
BEGIN
    BEGIN
        IF p_username IS NULL OR char_length(p_username) < 3 THEN
            RAISE EXCEPTION '用户名长度必须至少3个字符';
        END IF;

        IF p_email IS NULL OR p_email !~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$' THEN
            RAISE EXCEPTION '邮箱格式不正确';
        END IF;

        IF p_password IS NULL OR char_length(p_password) < 8 THEN
            RAISE EXCEPTION '密码长度必须至少8个字符';
        END IF;

        v_password_hash := core.secure_hash_password(p_password);

        INSERT INTO core.users (
            username,
            email,
            password_hash,
            full_name,
            created_by
        ) VALUES (
            p_username,
            lower(p_email),
            v_password_hash,
            p_full_name,
            p_created_by
        ) RETURNING id INTO v_user_id;

        RETURN v_user_id;

    EXCEPTION
        WHEN unique_violation THEN
            PERFORM core.log_function_error(
                'core.create_user_safe',
                'UNIQUE_VIOLATION',
                '用户名或邮箱已存在',
                jsonb_build_object('username', p_username, 'email', p_email)
            );
            RAISE EXCEPTION '用户名或邮箱已存在';
        WHEN check_violation THEN
            PERFORM core.log_function_error(
                'core.create_user_safe',
                'CHECK_VIOLATION',
                SQLERRM,
                jsonb_build_object('username', p_username, 'email', p_email)
            );
            RAISE EXCEPTION '%', SQLERRM;
        WHEN OTHERS THEN
            PERFORM core.log_function_error(
                'core.create_user_safe',
                SQLSTATE,
                SQLERRM,
                jsonb_build_object('username', p_username, 'email', p_email)
            );
            RAISE EXCEPTION '创建用户失败: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.create_user_safe(VARCHAR, VARCHAR, VARCHAR, VARCHAR, UUID) IS '安全创建用户（带异常处理）';

-- =====================================================
-- 权限检查函数（带异常处理）
-- =====================================================

CREATE OR REPLACE FUNCTION core.check_permission_safe(
    p_user_id UUID,
    p_resource VARCHAR,
    p_action VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    BEGIN
        IF p_user_id IS NULL THEN
            RAISE EXCEPTION '用户ID不能为空';
        END IF;

        IF p_resource IS NULL OR p_action IS NULL THEN
            RAISE EXCEPTION '资源和操作不能为空';
        END IF;

        SELECT EXISTS (
            SELECT 1
            FROM core.v_user_permissions up
            WHERE up.user_id = p_user_id
              AND up.resource = p_resource
              AND up.action = p_action
        ) INTO v_has_permission;

        RETURN v_has_permission;

    EXCEPTION
        WHEN OTHERS THEN
            PERFORM core.log_function_error(
                'core.check_permission_safe',
                SQLSTATE,
                SQLERRM,
                jsonb_build_object('user_id', p_user_id, 'resource', p_resource, 'action', p_action)
            );
            RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION core.check_permission_safe(UUID, VARCHAR, VARCHAR) IS '安全检查权限（带异常处理）';

-- =====================================================
-- AI对话函数（带异常处理）
-- =====================================================

CREATE OR REPLACE FUNCTION ai.create_conversation_safe(
    p_user_id UUID,
    p_agent_id UUID,
    p_model_id UUID DEFAULT NULL,
    p_title VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
    v_agent_status agent_status;
BEGIN
    BEGIN
        IF p_user_id IS NULL THEN
            RAISE EXCEPTION '用户ID不能为空';
        END IF;

        IF p_agent_id IS NULL THEN
            RAISE EXCEPTION '智能体ID不能为空';
        END IF;

        SELECT status INTO v_agent_status
        FROM ai.agents
        WHERE id = p_agent_id AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION '智能体不存在';
        END IF;

        IF v_agent_status = 'offline' THEN
            RAISE EXCEPTION '智能体当前离线，无法创建对话';
        END IF;

        IF v_agent_status = 'maintenance' THEN
            RAISE EXCEPTION '智能体维护中，请稍后再试';
        END IF;

        INSERT INTO ai.conversations (
            user_id,
            agent_id,
            model_id,
            title,
            status
        ) VALUES (
            p_user_id,
            p_agent_id,
            p_model_id,
            COALESCE(p_title, '新对话'),
            'active'
        ) RETURNING id INTO v_conversation_id;

        RETURN v_conversation_id;

    EXCEPTION
        WHEN foreign_key_violation THEN
            PERFORM core.log_function_error(
                'ai.create_conversation_safe',
                'FOREIGN_KEY_VIOLATION',
                '关联的用户或智能体不存在',
                jsonb_build_object('user_id', p_user_id, 'agent_id', p_agent_id)
            );
            RAISE EXCEPTION '关联的用户或智能体不存在';
        WHEN OTHERS THEN
            PERFORM core.log_function_error(
                'ai.create_conversation_safe',
                SQLSTATE,
                SQLERRM,
                jsonb_build_object('user_id', p_user_id, 'agent_id', p_agent_id)
            );
            RAISE EXCEPTION '创建对话失败: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION ai.create_conversation_safe(UUID, UUID, UUID, VARCHAR) IS '安全创建对话（带异常处理）';

-- =====================================================
-- 工作流执行函数（带异常处理）
-- =====================================================

CREATE OR REPLACE FUNCTION workflow.execute_workflow_safe(
    p_workflow_id UUID,
    p_input JSONB DEFAULT '{}',
    p_executed_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_execution_id UUID;
    v_workflow_status workflow_status;
    v_definition JSONB;
BEGIN
    BEGIN
        IF p_workflow_id IS NULL THEN
            RAISE EXCEPTION '工作流ID不能为空';
        END IF;

        SELECT status, definition INTO v_workflow_status, v_definition
        FROM workflow.definitions
        WHERE id = p_workflow_id AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION '工作流不存在';
        END IF;

        IF v_workflow_status != 'published' THEN
            RAISE EXCEPTION '工作流未发布，无法执行';
        END IF;

        INSERT INTO workflow.executions (
            workflow_id,
            trigger_type,
            trigger_data,
            input,
            status,
            executed_by
        ) VALUES (
            p_workflow_id,
            'manual',
            '{}',
            p_input,
            'pending',
            p_executed_by
        ) RETURNING id INTO v_execution_id;

        RETURN v_execution_id;

    EXCEPTION
        WHEN foreign_key_violation THEN
            PERFORM core.log_function_error(
                'workflow.execute_workflow_safe',
                'FOREIGN_KEY_VIOLATION',
                '工作流不存在',
                jsonb_build_object('workflow_id', p_workflow_id)
            );
            RAISE EXCEPTION '工作流不存在';
        WHEN OTHERS THEN
            PERFORM core.log_function_error(
                'workflow.execute_workflow_safe',
                SQLSTATE,
                SQLERRM,
                jsonb_build_object('workflow_id', p_workflow_id, 'input', p_input)
            );
            RAISE EXCEPTION '执行工作流失败: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION workflow.execute_workflow_safe(UUID, JSONB, UUID) IS '安全执行工作流（带异常处理）';

-- =====================================================
-- 批量操作函数（带事务和异常处理）
-- =====================================================

CREATE OR REPLACE FUNCTION core.batch_assign_roles_safe(
    p_assignments JSONB
) RETURNS TABLE (
    user_id UUID,
    role_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_assignment JSONB;
    v_user_id UUID;
    v_role_id UUID;
BEGIN
    FOR v_assignment IN SELECT * FROM jsonb_array_elements(p_assignments)
    LOOP
        v_user_id := (v_assignment->>'user_id')::UUID;
        v_role_id := (v_assignment->>'role_id')::UUID;

        BEGIN
            PERFORM core.assign_role(
                v_user_id,
                v_role_id,
                current_setting('app.current_user_id', TRUE)::UUID
            );

            user_id := v_user_id;
            role_id := v_role_id;
            success := TRUE;
            error_message := NULL;
            RETURN NEXT;

        EXCEPTION
            WHEN OTHERS THEN
                user_id := v_user_id;
                role_id := v_role_id;
                success := FALSE;
                error_message := SQLERRM;
                RETURN NEXT;

                PERFORM core.log_function_error(
                    'core.batch_assign_roles_safe',
                    SQLSTATE,
                    SQLERRM,
                    v_assignment
                );
        END;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.batch_assign_roles_safe(JSONB) IS '批量分配角色（带异常处理）';

-- =====================================================
-- 重试机制函数
-- =====================================================

CREATE OR REPLACE FUNCTION core.execute_with_retry(
    p_sql TEXT,
    p_max_retries INTEGER DEFAULT 3,
    p_retry_delay_ms INTEGER DEFAULT 100
) RETURNS VOID AS $$
DECLARE
    v_retry_count INTEGER := 0;
BEGIN
    LOOP
        BEGIN
            EXECUTE p_sql;
            RETURN;
        EXCEPTION
            WHEN lock_not_available OR deadlock_detected THEN
                v_retry_count := v_retry_count + 1;
                IF v_retry_count >= p_max_retries THEN
                    PERFORM core.log_function_error(
                        'core.execute_with_retry',
                        SQLSTATE,
                        '重试次数超限: ' || SQLERRM,
                        jsonb_build_object('sql', p_sql, 'retries', v_retry_count)
                    );
                    RAISE EXCEPTION '重试次数超限: %', SQLERRM;
                END IF;
                PERFORM pg_sleep(p_retry_delay_ms / 1000.0);
            WHEN OTHERS THEN
                PERFORM core.log_function_error(
                    'core.execute_with_retry',
                    SQLSTATE,
                    SQLERRM,
                    jsonb_build_object('sql', p_sql)
                );
                RAISE EXCEPTION '%', SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.execute_with_retry(TEXT, INTEGER, INTEGER) IS '带重试机制的SQL执行';

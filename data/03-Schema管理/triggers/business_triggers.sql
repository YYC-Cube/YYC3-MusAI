-- =====================================================
-- YYC³-AI-Family 触发器创建脚本
-- @file: triggers.sql
-- @description: 创建自动更新、审计、验证等触发器
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 自动更新 updated_at 字段触发器
-- =====================================================

-- 通用更新时间触发器函数
CREATE OR REPLACE FUNCTION core.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.update_updated_at_column() IS '自动更新 updated_at 字段';

-- 为核心业务表创建更新时间触发器
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON core.users
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_roles_updated_at
    BEFORE UPDATE ON core.roles
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_organizations_updated_at
    BEFORE UPDATE ON core.organizations
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_departments_updated_at
    BEFORE UPDATE ON core.departments
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON core.projects
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON core.tasks
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

-- 为AI智能体表创建更新时间触发器
CREATE TRIGGER trigger_agents_updated_at
    BEFORE UPDATE ON ai.agents
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON ai.conversations
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_knowledge_bases_updated_at
    BEFORE UPDATE ON ai.knowledge_bases
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON ai.documents
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_prompt_templates_updated_at
    BEFORE UPDATE ON ai.prompt_templates
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

-- 为工作流表创建更新时间触发器
CREATE TRIGGER trigger_workflow_definitions_updated_at
    BEFORE UPDATE ON workflow.definitions
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_workflow_executions_updated_at
    BEFORE UPDATE ON workflow.executions
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_approval_flows_updated_at
    BEFORE UPDATE ON workflow.approval_flows
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_approval_applications_updated_at
    BEFORE UPDATE ON workflow.approval_applications
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_scheduled_tasks_updated_at
    BEFORE UPDATE ON workflow.scheduled_tasks
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

-- 为监控表创建更新时间触发器
CREATE TRIGGER trigger_devices_updated_at
    BEFORE UPDATE ON monitor.devices
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_alert_rules_updated_at
    BEFORE UPDATE ON monitor.alert_rules
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_alerts_updated_at
    BEFORE UPDATE ON monitor.alerts
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON monitor.notifications
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

-- 为扩展表创建更新时间触发器
CREATE TRIGGER trigger_plugins_updated_at
    BEFORE UPDATE ON extension.plugins
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_plugin_configs_updated_at
    BEFORE UPDATE ON extension.plugin_configs
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_api_keys_updated_at
    BEFORE UPDATE ON extension.api_keys
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_webhooks_updated_at
    BEFORE UPDATE ON extension.webhooks
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_integrations_updated_at
    BEFORE UPDATE ON extension.integrations
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

-- =====================================================
-- 审计日志触发器
-- =====================================================

-- 通用审计日志触发器函数
CREATE OR REPLACE FUNCTION core.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_operation_type audit_operation_type;
    v_operation_desc TEXT;
    v_operator_id UUID;
    v_operator_name VARCHAR;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_operation_type := 'create';
        v_operation_desc := '创建' || TG_TABLE_NAME;
        INSERT INTO audit.logs (
            operation_type,
            operation_level,
            operation_desc,
            operator_id,
            target_type,
            target_id,
            action,
            after_value,
            metadata
        ) VALUES (
            v_operation_type,
            'info',
            v_operation_desc,
            NEW.created_by,
            TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
            NEW.id,
            'INSERT',
            to_jsonb(NEW),
            jsonb_build_object('table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA)
        );
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        v_operation_type := 'update';
        v_operation_desc := '更新' || TG_TABLE_NAME;
        INSERT INTO audit.logs (
            operation_type,
            operation_level,
            operation_desc,
            operator_id,
            target_type,
            target_id,
            action,
            before_value,
            after_value,
            metadata
        ) VALUES (
            v_operation_type,
            'info',
            v_operation_desc,
            NEW.updated_by,
            TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
            NEW.id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW),
            jsonb_build_object('table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA, 'changed_fields',
                (SELECT jsonb_object_agg(key, value) FROM jsonb_each(to_jsonb(NEW)) WHERE key IN (SELECT jsonb_object_keys(to_jsonb(NEW)) EXCEPT SELECT jsonb_object_keys(to_jsonb(OLD)))))
        );
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        v_operation_type := 'delete';
        v_operation_desc := '删除' || TG_TABLE_NAME;
        INSERT INTO audit.logs (
            operation_type,
            operation_level,
            operation_desc,
            target_type,
            target_id,
            action,
            before_value,
            metadata
        ) VALUES (
            v_operation_type,
            'warning',
            v_operation_desc,
            TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
            OLD.id,
            'DELETE',
            to_jsonb(OLD),
            jsonb_build_object('table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA)
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.audit_trigger_func() IS '通用审计日志触发器函数';

-- 为核心业务表创建审计触发器
CREATE TRIGGER trigger_users_audit
    AFTER INSERT OR UPDATE OR DELETE ON core.users
    FOR EACH ROW
    EXECUTE FUNCTION core.audit_trigger_func();

CREATE TRIGGER trigger_roles_audit
    AFTER INSERT OR UPDATE OR DELETE ON core.roles
    FOR EACH ROW
    EXECUTE FUNCTION core.audit_trigger_func();

CREATE TRIGGER trigger_organizations_audit
    AFTER INSERT OR UPDATE OR DELETE ON core.organizations
    FOR EACH ROW
    EXECUTE FUNCTION core.audit_trigger_func();

CREATE TRIGGER trigger_projects_audit
    AFTER INSERT OR UPDATE OR DELETE ON core.projects
    FOR EACH ROW
    EXECUTE FUNCTION core.audit_trigger_func();

CREATE TRIGGER trigger_tasks_audit
    AFTER INSERT OR UPDATE OR DELETE ON core.tasks
    FOR EACH ROW
    EXECUTE FUNCTION core.audit_trigger_func();

-- 为AI智能体表创建审计触发器
CREATE TRIGGER trigger_agents_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai.agents
    FOR EACH ROW
    EXECUTE FUNCTION core.audit_trigger_func();

CREATE TRIGGER trigger_knowledge_bases_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai.knowledge_bases
    FOR EACH ROW
    EXECUTE FUNCTION core.audit_trigger_func();

-- =====================================================
-- 业务逻辑触发器
-- =====================================================

-- 任务状态变更时更新项目进度
CREATE OR REPLACE FUNCTION core.update_project_progress_on_task_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM core.update_project_progress(NEW.project_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM core.update_project_progress(OLD.project_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.update_project_progress_on_task_change() IS '任务变更时更新项目进度';

CREATE TRIGGER trigger_tasks_project_progress
    AFTER INSERT OR UPDATE OR DELETE ON core.tasks
    FOR EACH ROW
    EXECUTE FUNCTION core.update_project_progress_on_task_change();

-- 对话消息计数更新
CREATE OR REPLACE FUNCTION ai.update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ai.conversations
        SET message_count = message_count + 1,
            total_tokens = total_tokens + COALESCE(NEW.token_count, 0),
            last_message_at = NEW.created_at,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.conversation_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ai.conversations
        SET message_count = message_count - 1,
            total_tokens = total_tokens - COALESCE(OLD.token_count, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.conversation_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION ai.update_conversation_message_count() IS '更新对话消息计数';

CREATE TRIGGER trigger_messages_count
    AFTER INSERT OR DELETE ON ai.messages
    FOR EACH ROW
    EXECUTE FUNCTION ai.update_conversation_message_count();

-- 知识库文档计数更新
CREATE OR REPLACE FUNCTION ai.update_knowledge_base_document_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ai.knowledge_bases
        SET document_count = document_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.knowledge_base_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ai.knowledge_bases
        SET document_count = document_count - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.knowledge_base_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION ai.update_knowledge_base_document_count() IS '更新知识库文档计数';

CREATE TRIGGER trigger_documents_count
    AFTER INSERT OR DELETE ON ai.documents
    FOR EACH ROW
    EXECUTE FUNCTION ai.update_knowledge_base_document_count();

-- 知识库分块计数更新
CREATE OR REPLACE FUNCTION ai.update_knowledge_base_chunk_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ai.knowledge_bases
        SET chunk_count = chunk_count + 1,
            total_tokens = total_tokens + COALESCE(NEW.token_count, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.knowledge_base_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ai.knowledge_bases
        SET chunk_count = chunk_count - 1,
            total_tokens = total_tokens - COALESCE(OLD.token_count, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.knowledge_base_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION ai.update_knowledge_base_chunk_count() IS '更新知识库分块计数';

CREATE TRIGGER trigger_document_chunks_count
    AFTER INSERT OR DELETE ON ai.document_chunks
    FOR EACH ROW
    EXECUTE FUNCTION ai.update_knowledge_base_chunk_count();

-- 工作流执行统计更新
CREATE OR REPLACE FUNCTION workflow.update_workflow_execution_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE workflow.definitions
        SET execution_count = execution_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.workflow_id;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'success' AND OLD.status != 'success' THEN
            UPDATE workflow.definitions
            SET success_count = success_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.workflow_id;
        ELSIF NEW.status = 'failed' AND OLD.status != 'failed' THEN
            UPDATE workflow.definitions
            SET failure_count = failure_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.workflow_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION workflow.update_workflow_execution_count() IS '更新工作流执行统计';

CREATE TRIGGER trigger_workflow_executions_count
    AFTER INSERT OR UPDATE ON workflow.executions
    FOR EACH ROW
    EXECUTE FUNCTION workflow.update_workflow_execution_count();

-- 审批申请统计更新
CREATE OR REPLACE FUNCTION workflow.update_approval_flow_statistics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE workflow.approval_flows
        SET total_applications = total_applications + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.flow_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
            UPDATE workflow.approval_flows
            SET approved_count = approved_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.flow_id;
        ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
            UPDATE workflow.approval_flows
            SET rejected_count = rejected_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.flow_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION workflow.update_approval_flow_statistics() IS '更新审批流程统计';

CREATE TRIGGER trigger_approval_applications_stats
    AFTER INSERT OR UPDATE ON workflow.approval_applications
    FOR EACH ROW
    EXECUTE FUNCTION workflow.update_approval_flow_statistics();

-- API密钥请求计数更新
CREATE OR REPLACE FUNCTION extension.update_api_key_request_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE extension.api_keys
    SET total_requests = total_requests + 1,
        last_used_at = NEW.timestamp
    WHERE id = NEW.api_key_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION extension.update_api_key_request_count() IS '更新API密钥请求计数';

CREATE TRIGGER trigger_api_logs_count
    AFTER INSERT ON extension.api_logs
    FOR EACH ROW
    EXECUTE FUNCTION extension.update_api_key_request_count();

-- Webhook调用统计更新
CREATE OR REPLACE FUNCTION extension.update_webhook_call_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE extension.webhooks
    SET total_calls = total_calls + 1,
        success_calls = success_calls + CASE WHEN NEW.status = 'success' THEN 1 ELSE 0 END,
        failed_calls = failed_calls + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
        last_called_at = NEW.timestamp
    WHERE id = NEW.webhook_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION extension.update_webhook_call_count() IS '更新Webhook调用统计';

CREATE TRIGGER trigger_webhook_logs_count
    AFTER INSERT ON extension.webhook_logs
    FOR EACH ROW
    EXECUTE FUNCTION extension.update_webhook_call_count();

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE '触发器创建完成: 自动更新、审计、业务逻辑触发器已创建';
END $$;

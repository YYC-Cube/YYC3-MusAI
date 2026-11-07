-- =====================================================
-- YYC³-AI-Family 审计触发器创建脚本
-- @file: audit_trigger.sql
-- @description: 创建数据变更审计触发器
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 审计日志记录函数
-- =====================================================

CREATE OR REPLACE FUNCTION audit.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_operation_type audit_operation_type;
    v_old_data JSONB;
    v_new_data JSONB;
    v_changes JSONB;
    v_user_id UUID;
    v_ip_address INET;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_operation_type := 'create';
        v_old_data := NULL;
        v_new_data := to_jsonb(NEW);
        v_changes := v_new_data;
    ELSIF TG_OP = 'UPDATE' THEN
        v_operation_type := 'update';
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        v_changes := (
            SELECT jsonb_object_agg(key, value)
            FROM jsonb_each(v_new_data)
            WHERE key NOT IN ('created_at', 'updated_at')
              AND (v_old_data -> key IS DISTINCT FROM v_new_data -> key)
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_operation_type := 'delete';
        v_old_data := to_jsonb(OLD);
        v_new_data := NULL;
        v_changes := v_old_data;
    END IF;

    v_user_id := current_setting('app.current_user_id', TRUE)::UUID;
    v_ip_address := NULLIF(current_setting('app.current_ip', TRUE), '')::INET;

    INSERT INTO audit.logs (
        operation_type,
        operation_level,
        operation_desc,
        operator_id,
        operator_ip,
        target_type,
        target_id,
        target_name,
        action,
        before_value,
        after_value,
        changes,
        result
    ) VALUES (
        v_operation_type,
        'info',
        TG_OP || ' on ' || TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        v_user_id,
        v_ip_address,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.name, NEW.username, NEW.code, OLD.name, OLD.username, OLD.code),
        TG_OP,
        v_old_data,
        v_new_data,
        v_changes,
        'success'
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit.audit_trigger_func() IS '审计触发器函数';

-- =====================================================
-- 为核心业务表创建审计触发器
-- =====================================================

CREATE TRIGGER trigger_users_audit
    AFTER INSERT OR UPDATE OR DELETE ON core.users
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_roles_audit
    AFTER INSERT OR UPDATE OR DELETE ON core.roles
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_permissions_audit
    AFTER INSERT OR UPDATE OR DELETE ON core.permissions
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_user_roles_audit
    AFTER INSERT OR UPDATE OR DELETE ON core.user_roles
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_role_permissions_audit
    AFTER INSERT OR UPDATE OR DELETE ON core.role_permissions
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_organizations_audit
    AFTER INSERT OR UPDATE OR DELETE ON core.organizations
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_departments_audit
    AFTER INSERT OR UPDATE OR DELETE ON core.departments
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_projects_audit
    AFTER INSERT OR UPDATE OR DELETE ON core.projects
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_tasks_audit
    AFTER INSERT OR UPDATE OR DELETE ON core.tasks
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

-- =====================================================
-- 为AI智能体表创建审计触发器
-- =====================================================

CREATE TRIGGER trigger_agents_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai.agents
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_models_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai.models
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_knowledge_bases_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai.knowledge_bases
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_documents_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai.documents
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

-- =====================================================
-- 为工作流表创建审计触发器
-- =====================================================

CREATE TRIGGER trigger_workflow_definitions_audit
    AFTER INSERT OR UPDATE OR DELETE ON workflow.definitions
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_workflow_executions_audit
    AFTER INSERT OR UPDATE OR DELETE ON workflow.executions
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_approval_flows_audit
    AFTER INSERT OR UPDATE OR DELETE ON workflow.approval_flows
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

-- =====================================================
-- 为扩展管理表创建审计触发器
-- =====================================================

CREATE TRIGGER trigger_plugins_audit
    AFTER INSERT OR UPDATE OR DELETE ON extension.plugins
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_api_keys_audit
    AFTER INSERT OR UPDATE OR DELETE ON extension.api_keys
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER trigger_webhooks_audit
    AFTER INSERT OR UPDATE OR DELETE ON extension.webhooks
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

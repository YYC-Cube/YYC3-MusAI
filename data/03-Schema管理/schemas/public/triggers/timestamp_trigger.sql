-- =====================================================
-- YYC³-AI-Family 时间戳触发器创建脚本
-- @file: timestamp_trigger.sql
-- @description: 创建自动更新时间戳的触发器
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 通用更新时间戳触发器函数
-- =====================================================

CREATE OR REPLACE FUNCTION core.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.update_updated_at_column() IS '自动更新 updated_at 字段';

-- =====================================================
-- 为核心业务表创建时间戳触发器
-- =====================================================

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON core.users
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_roles_updated_at
    BEFORE UPDATE ON core.roles
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_permissions_updated_at
    BEFORE UPDATE ON core.permissions
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_user_roles_updated_at
    BEFORE UPDATE ON core.user_roles
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_role_permissions_updated_at
    BEFORE UPDATE ON core.role_permissions
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_organizations_updated_at
    BEFORE UPDATE ON core.organizations
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_departments_updated_at
    BEFORE UPDATE ON core.departments
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_user_departments_updated_at
    BEFORE UPDATE ON core.user_departments
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON core.projects
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_project_members_updated_at
    BEFORE UPDATE ON core.project_members
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON core.tasks
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_task_comments_updated_at
    BEFORE UPDATE ON core.task_comments
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON core.sessions
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

-- =====================================================
-- 为AI智能体表创建时间戳触发器
-- =====================================================

CREATE TRIGGER trigger_agents_updated_at
    BEFORE UPDATE ON ai.agents
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_agent_groups_updated_at
    BEFORE UPDATE ON ai.agent_groups
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_models_updated_at
    BEFORE UPDATE ON ai.models
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON ai.conversations
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_knowledge_bases_updated_at
    BEFORE UPDATE ON ai.knowledge_bases
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON ai.documents
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_document_chunks_updated_at
    BEFORE UPDATE ON ai.document_chunks
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_prompt_templates_updated_at
    BEFORE UPDATE ON ai.prompt_templates
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

-- =====================================================
-- 为工作流表创建时间戳触发器
-- =====================================================

CREATE TRIGGER trigger_workflow_definitions_updated_at
    BEFORE UPDATE ON workflow.definitions
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_workflow_executions_updated_at
    BEFORE UPDATE ON workflow.executions
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_node_executions_updated_at
    BEFORE UPDATE ON workflow.node_executions
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_approval_flows_updated_at
    BEFORE UPDATE ON workflow.approval_flows
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_approval_applications_updated_at
    BEFORE UPDATE ON workflow.approval_applications
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_approval_records_updated_at
    BEFORE UPDATE ON workflow.approval_records
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_scheduled_tasks_updated_at
    BEFORE UPDATE ON workflow.scheduled_tasks
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

-- =====================================================
-- 为监控表创建时间戳触发器
-- =====================================================

CREATE TRIGGER trigger_devices_updated_at
    BEFORE UPDATE ON monitor.devices
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_alert_rules_updated_at
    BEFORE UPDATE ON monitor.alert_rules
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_notification_channels_updated_at
    BEFORE UPDATE ON monitor.notification_channels
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_alerts_updated_at
    BEFORE UPDATE ON monitor.alerts
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

-- =====================================================
-- 为扩展管理表创建时间戳触发器
-- =====================================================

CREATE TRIGGER trigger_plugins_updated_at
    BEFORE UPDATE ON extension.plugins
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_plugin_configs_updated_at
    BEFORE UPDATE ON extension.plugin_configs
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_api_keys_updated_at
    BEFORE UPDATE ON extension.api_keys
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_webhooks_updated_at
    BEFORE UPDATE ON extension.webhooks
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_integrations_updated_at
    BEFORE UPDATE ON extension.integrations
    FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

-- =====================================================
-- 创建时间戳触发器函数（带创建人更新）
-- =====================================================

CREATE OR REPLACE FUNCTION core.update_timestamp_and_user()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    IF TG_OP = 'INSERT' THEN
        NEW.created_by = NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
    END IF;
    
    NEW.updated_by = NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.update_timestamp_and_user() IS '自动更新时间戳和操作用户';

-- =====================================================
-- YYC³-AI-Family 唯一约束创建脚本
-- @file: unique_constraints.sql
-- @description: 创建所有表的唯一约束
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 用户管理唯一约束
-- =====================================================

ALTER TABLE core.users
    ADD CONSTRAINT uq_users_username UNIQUE (username),
    ADD CONSTRAINT uq_users_email UNIQUE (email);

ALTER TABLE core.roles
    ADD CONSTRAINT uq_roles_name UNIQUE (name),
    ADD CONSTRAINT uq_roles_code UNIQUE (code);

ALTER TABLE core.permissions
    ADD CONSTRAINT uq_permissions_name UNIQUE (name),
    ADD CONSTRAINT uq_permissions_code UNIQUE (code);

ALTER TABLE core.user_roles
    ADD CONSTRAINT uq_user_roles UNIQUE (user_id, role_id);

ALTER TABLE core.role_permissions
    ADD CONSTRAINT uq_role_permissions UNIQUE (role_id, permission_id);

-- =====================================================
-- 组织管理唯一约束
-- =====================================================

ALTER TABLE core.organizations
    ADD CONSTRAINT uq_organizations_code UNIQUE (code),
    ADD CONSTRAINT uq_organizations_name UNIQUE (name);

ALTER TABLE core.departments
    ADD CONSTRAINT uq_departments_code UNIQUE (org_id, code);

ALTER TABLE core.user_departments
    ADD CONSTRAINT uq_user_departments UNIQUE (user_id, dept_id);

-- =====================================================
-- 项目管理唯一约束
-- =====================================================

ALTER TABLE core.projects
    ADD CONSTRAINT uq_projects_code UNIQUE (code),
    ADD CONSTRAINT uq_projects_name UNIQUE (org_id, name);

ALTER TABLE core.project_members
    ADD CONSTRAINT uq_project_members UNIQUE (project_id, user_id);

ALTER TABLE core.tasks
    ADD CONSTRAINT uq_tasks_number UNIQUE (project_id, task_number);

-- =====================================================
-- 会话管理唯一约束
-- =====================================================

ALTER TABLE core.sessions
    ADD CONSTRAINT uq_sessions_token_hash UNIQUE (token_hash),
    ADD CONSTRAINT uq_sessions_refresh_token UNIQUE (refresh_token_hash);

-- =====================================================
-- AI智能体唯一约束
-- =====================================================

ALTER TABLE ai.agents
    ADD CONSTRAINT uq_agents_code UNIQUE (code),
    ADD CONSTRAINT uq_agents_name UNIQUE (name);

ALTER TABLE ai.agent_groups
    ADD CONSTRAINT uq_agent_groups_code UNIQUE (code);

ALTER TABLE ai.models
    ADD CONSTRAINT uq_models_code UNIQUE (code);

ALTER TABLE ai.conversations
    ADD CONSTRAINT uq_conversations_session_id UNIQUE (session_id);

ALTER TABLE ai.knowledge_bases
    ADD CONSTRAINT uq_knowledge_bases_code UNIQUE (code);

ALTER TABLE ai.documents
    ADD CONSTRAINT uq_documents_hash UNIQUE (knowledge_base_id, content_hash);

ALTER TABLE ai.prompt_templates
    ADD CONSTRAINT uq_prompt_templates_code UNIQUE (code);

-- =====================================================
-- 工作流唯一约束
-- =====================================================

ALTER TABLE workflow.definitions
    ADD CONSTRAINT uq_workflow_definitions_code UNIQUE (code);

ALTER TABLE workflow.approval_flows
    ADD CONSTRAINT uq_approval_flows_code UNIQUE (code);

ALTER TABLE workflow.scheduled_tasks
    ADD CONSTRAINT uq_scheduled_tasks_name UNIQUE (name);

-- =====================================================
-- 监控唯一约束
-- =====================================================

ALTER TABLE monitor.devices
    ADD CONSTRAINT uq_devices_code UNIQUE (code);

ALTER TABLE monitor.alert_rules
    ADD CONSTRAINT uq_alert_rules_name UNIQUE (name);

ALTER TABLE monitor.notification_channels
    ADD CONSTRAINT uq_notification_channels_code UNIQUE (code);

-- =====================================================
-- 扩展管理唯一约束
-- =====================================================

ALTER TABLE extension.plugins
    ADD CONSTRAINT uq_plugins_code UNIQUE (code);

ALTER TABLE extension.api_keys
    ADD CONSTRAINT uq_api_keys_hash UNIQUE (key_hash),
    ADD CONSTRAINT uq_api_keys_prefix UNIQUE (key_prefix);

ALTER TABLE extension.webhooks
    ADD CONSTRAINT uq_webhooks_code UNIQUE (code);

ALTER TABLE extension.integrations
    ADD CONSTRAINT uq_integrations_code UNIQUE (code);

-- =====================================================
-- 复合唯一约束
-- =====================================================

ALTER TABLE core.task_comments
    ADD CONSTRAINT uq_task_comments UNIQUE (task_id, author_id, created_at);

ALTER TABLE ai.message_feedback
    ADD CONSTRAINT uq_message_feedback UNIQUE (message_id, user_id);

ALTER TABLE workflow.approval_records
    ADD CONSTRAINT uq_approval_records UNIQUE (application_id, approver_id, level);

ALTER TABLE extension.plugin_configs
    ADD CONSTRAINT uq_plugin_configs UNIQUE (plugin_id, scope, scope_id);

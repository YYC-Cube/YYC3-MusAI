-- =====================================================
-- YYC³-AI-Family 索引创建脚本
-- @file: 07_create_indexes.sql
-- @description: 创建所有表的索引，优化查询性能
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 核心业务表索引
-- =====================================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_username ON core.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON core.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON core.users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON core.users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON core.users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON core.users(last_login_at DESC);

-- 角色表索引
CREATE INDEX IF NOT EXISTS idx_roles_code ON core.roles(code);
CREATE INDEX IF NOT EXISTS idx_roles_type ON core.roles(type);
CREATE INDEX IF NOT EXISTS idx_roles_parent_id ON core.roles(parent_id);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON core.roles(is_active);

-- 用户角色关联表索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON core.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON core.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_expires_at ON core.user_roles(expires_at);

-- 权限表索引
CREATE INDEX IF NOT EXISTS idx_permissions_code ON core.permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON core.permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_parent_id ON core.permissions(parent_id);

-- 角色权限关联表索引
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON core.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON core.role_permissions(permission_id);

-- 组织表索引
CREATE INDEX IF NOT EXISTS idx_organizations_code ON core.organizations(code);
CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON core.organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON core.organizations(is_active);

-- 部门表索引
CREATE INDEX IF NOT EXISTS idx_departments_org_id ON core.departments(org_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON core.departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON core.departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON core.departments(is_active);

-- 用户部门关联表索引
CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON core.user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_dept_id ON core.user_departments(dept_id);

-- 项目表索引
CREATE INDEX IF NOT EXISTS idx_projects_code ON core.projects(code);
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON core.projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON core.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON core.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON core.projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON core.projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON core.projects(deleted_at);

-- 项目成员表索引
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON core.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON core.project_members(user_id);

-- 任务表索引
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON core.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON core.tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON core.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reporter_id ON core.tasks(reporter_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON core.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON core.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON core.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON core.tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON core.tasks(deleted_at);

-- 任务评论表索引
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON core.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_author_id ON core.task_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON core.task_comments(created_at);

-- 会话表索引
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON core.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON core.sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON core.sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON core.sessions(expires_at);

-- =====================================================
-- AI智能体表索引
-- =====================================================

-- AI智能体表索引
CREATE INDEX IF NOT EXISTS idx_agents_code ON ai.agents(code);
CREATE INDEX IF NOT EXISTS idx_agents_type ON ai.agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_status ON ai.agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON ai.agents(created_at);
CREATE INDEX IF NOT EXISTS idx_agents_deleted_at ON ai.agents(deleted_at);

-- AI智能体协作组表索引
CREATE INDEX IF NOT EXISTS idx_agent_groups_code ON ai.agent_groups(code);
CREATE INDEX IF NOT EXISTS idx_agent_groups_leader_agent_id ON ai.agent_groups(leader_agent_id);

-- AI模型表索引
CREATE INDEX IF NOT EXISTS idx_models_code ON ai.models(code);
CREATE INDEX IF NOT EXISTS idx_models_provider ON ai.models(provider);
CREATE INDEX IF NOT EXISTS idx_models_model_type ON ai.models(model_type);
CREATE INDEX IF NOT EXISTS idx_models_is_active ON ai.models(is_active);

-- 对话会话表索引
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON ai.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON ai.conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_model_id ON ai.conversations(model_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON ai.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON ai.conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON ai.conversations(last_message_at DESC);

-- 对话消息表索引
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON ai.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON ai.messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON ai.messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_model_id ON ai.messages(model_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON ai.messages(created_at);

-- 知识库表索引
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_code ON ai.knowledge_bases(code);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_owner_id ON ai.knowledge_bases(owner_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_org_id ON ai.knowledge_bases(org_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_is_active ON ai.knowledge_bases(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_deleted_at ON ai.knowledge_bases(deleted_at);

-- 知识库文档表索引
CREATE INDEX IF NOT EXISTS idx_documents_knowledge_base_id ON ai.documents(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_documents_source_type ON ai.documents(source_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON ai.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON ai.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON ai.documents(deleted_at);

-- 文档分块表索引
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON ai.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_knowledge_base_id ON ai.document_chunks(knowledge_base_id);

-- 向量索引（使用pgvector）
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON ai.document_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 提示词模板表索引
CREATE INDEX IF NOT EXISTS idx_prompt_templates_code ON ai.prompt_templates(code);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON ai.prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_owner_id ON ai.prompt_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_active ON ai.prompt_templates(is_active);

-- =====================================================
-- 工作流表索引
-- =====================================================

-- 工作流定义表索引
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_code ON workflow.definitions(code);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_category ON workflow.definitions(category);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_owner_id ON workflow.definitions(owner_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_status ON workflow.definitions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_is_active ON workflow.definitions(is_active);

-- 工作流执行记录表索引
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow.executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow.executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_executed_by ON workflow.executions(executed_by);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON workflow.executions(created_at);

-- 工作流节点执行记录表索引
CREATE INDEX IF NOT EXISTS idx_node_executions_execution_id ON workflow.node_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_node_executions_status ON workflow.node_executions(status);

-- 审批流程定义表索引
CREATE INDEX IF NOT EXISTS idx_approval_flows_code ON workflow.approval_flows(code);
CREATE INDEX IF NOT EXISTS idx_approval_flows_is_active ON workflow.approval_flows(is_active);

-- 审批申请表索引
CREATE INDEX IF NOT EXISTS idx_approval_applications_flow_id ON workflow.approval_applications(flow_id);
CREATE INDEX IF NOT EXISTS idx_approval_applications_applicant_id ON workflow.approval_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_approval_applications_status ON workflow.approval_applications(status);
CREATE INDEX IF NOT EXISTS idx_approval_applications_created_at ON workflow.approval_applications(created_at);

-- 调度任务表索引
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_code ON workflow.scheduled_tasks(code);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_task_type ON workflow.scheduled_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_is_active ON workflow.scheduled_tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run_at ON workflow.scheduled_tasks(next_run_at);

-- 调度任务执行记录表索引
CREATE INDEX IF NOT EXISTS idx_task_executions_task_id ON workflow.task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON workflow.task_executions(status);
CREATE INDEX IF NOT EXISTS idx_task_executions_scheduled_at ON workflow.task_executions(scheduled_at);

-- =====================================================
-- 审计监控表索引
-- =====================================================

-- 审计日志表索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_type ON audit.logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operator_id ON audit.logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON audit.logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit.logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit.logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit.logs(created_at);

-- 设备信息表索引
CREATE INDEX IF NOT EXISTS idx_devices_code ON monitor.devices(code);
CREATE INDEX IF NOT EXISTS idx_devices_type ON monitor.devices(type);
CREATE INDEX IF NOT EXISTS idx_devices_status ON monitor.devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_ip_address ON monitor.devices(ip_address);

-- 监控指标表索引
CREATE INDEX IF NOT EXISTS idx_metrics_device_id ON monitor.metrics(device_id);
CREATE INDEX IF NOT EXISTS idx_metrics_metric_name ON monitor.metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON monitor.metrics(timestamp);

-- 告警规则表索引
CREATE INDEX IF NOT EXISTS idx_alert_rules_code ON monitor.alert_rules(code);
CREATE INDEX IF NOT EXISTS idx_alert_rules_metric_name ON monitor.alert_rules(metric_name);
CREATE INDEX IF NOT EXISTS idx_alert_rules_level ON monitor.alert_rules(level);
CREATE INDEX IF NOT EXISTS idx_alert_rules_is_active ON monitor.alert_rules(is_active);

-- 告警记录表索引
CREATE INDEX IF NOT EXISTS idx_alerts_rule_id ON monitor.alerts(rule_id);
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON monitor.alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_level ON monitor.alerts(level);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON monitor.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON monitor.alerts(triggered_at);

-- 通知记录表索引
CREATE INDEX IF NOT EXISTS idx_notifications_type ON monitor.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON monitor.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON monitor.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON monitor.notifications(created_at);

-- =====================================================
-- 扩展管理表索引
-- =====================================================

-- 插件表索引
CREATE INDEX IF NOT EXISTS idx_plugins_code ON extension.plugins(code);
CREATE INDEX IF NOT EXISTS idx_plugins_status ON extension.plugins(status);
CREATE INDEX IF NOT EXISTS idx_plugins_is_active ON extension.plugins(is_active);
CREATE INDEX IF NOT EXISTS idx_plugins_owner_id ON extension.plugins(owner_id);

-- 插件配置表索引
CREATE INDEX IF NOT EXISTS idx_plugin_configs_plugin_id ON extension.plugin_configs(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_configs_scope ON extension.plugin_configs(scope);

-- API密钥表索引
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON extension.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON extension.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON extension.api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_owner_id ON extension.api_keys(owner_id);

-- API请求日志表索引
CREATE INDEX IF NOT EXISTS idx_api_logs_api_key_id ON extension.api_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON extension.api_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON extension.api_logs(status_code);

-- Webhook配置表索引
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON extension.webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_owner_id ON extension.webhooks(owner_id);

-- Webhook调用记录表索引
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON extension.webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON extension.webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON extension.webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_timestamp ON extension.webhook_logs(timestamp);

-- 第三方集成配置表索引
CREATE INDEX IF NOT EXISTS idx_integrations_code ON extension.integrations(code);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON extension.integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_is_active ON extension.integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_integrations_owner_id ON extension.integrations(owner_id);

-- 集成同步记录表索引
CREATE INDEX IF NOT EXISTS idx_integration_syncs_integration_id ON extension.integration_syncs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_syncs_status ON extension.integration_syncs(status);
CREATE INDEX IF NOT EXISTS idx_integration_syncs_created_at ON extension.integration_syncs(created_at);

-- =====================================================
-- 复合索引（优化常用查询）
-- =====================================================

-- 用户查询优化
CREATE INDEX IF NOT EXISTS idx_users_status_created_at ON core.users(status, created_at DESC);

-- 任务查询优化
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON core.tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON core.tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_priority ON core.tasks(project_id, priority);

-- 对话查询优化
CREATE INDEX IF NOT EXISTS idx_conversations_user_status ON ai.conversations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_status ON ai.conversations(agent_id, status);

-- 消息查询优化
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON ai.messages(conversation_id, created_at DESC);

-- 审计日志查询优化
CREATE INDEX IF NOT EXISTS idx_audit_logs_operator_type_time ON audit.logs(operator_id, operation_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type_id ON audit.logs(target_type, target_id, timestamp DESC);

-- 监控指标查询优化
CREATE INDEX IF NOT EXISTS idx_metrics_device_name_time ON monitor.metrics(device_id, metric_name, timestamp DESC);

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE '索引创建完成: 所有表的索引已创建';
END $$;

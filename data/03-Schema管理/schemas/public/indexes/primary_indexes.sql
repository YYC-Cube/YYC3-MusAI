-- =====================================================
-- YYC³-AI-Family 主键索引创建脚本
-- @file: primary_indexes.sql
-- @description: 创建所有表的主键和基础索引
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 核心业务表主键索引
-- =====================================================

-- 用户表主键（已在表创建时定义）
-- ALTER TABLE core.users ADD CONSTRAINT pk_users PRIMARY KEY (id);

-- 角色表主键
ALTER TABLE core.roles ADD CONSTRAINT pk_roles PRIMARY KEY (id);

-- 权限表主键
ALTER TABLE core.permissions ADD CONSTRAINT pk_permissions PRIMARY KEY (id);

-- 用户角色关联表主键
ALTER TABLE core.user_roles ADD CONSTRAINT pk_user_roles PRIMARY KEY (id);

-- 角色权限关联表主键
ALTER TABLE core.role_permissions ADD CONSTRAINT pk_role_permissions PRIMARY KEY (id);

-- 组织表主键
ALTER TABLE core.organizations ADD CONSTRAINT pk_organizations PRIMARY KEY (id);

-- 部门表主键
ALTER TABLE core.departments ADD CONSTRAINT pk_departments PRIMARY KEY (id);

-- 用户部门关联表主键
ALTER TABLE core.user_departments ADD CONSTRAINT pk_user_departments PRIMARY KEY (id);

-- 项目表主键
ALTER TABLE core.projects ADD CONSTRAINT pk_projects PRIMARY KEY (id);

-- 项目成员表主键
ALTER TABLE core.project_members ADD CONSTRAINT pk_project_members PRIMARY KEY (id);

-- 任务表主键
ALTER TABLE core.tasks ADD CONSTRAINT pk_tasks PRIMARY KEY (id);

-- 任务评论表主键
ALTER TABLE core.task_comments ADD CONSTRAINT pk_task_comments PRIMARY KEY (id);

-- 会话表主键
ALTER TABLE core.sessions ADD CONSTRAINT pk_sessions PRIMARY KEY (id);

-- =====================================================
-- AI智能体表主键索引
-- =====================================================

-- AI智能体表主键
ALTER TABLE ai.agents ADD CONSTRAINT pk_agents PRIMARY KEY (id);

-- AI智能体协作组表主键
ALTER TABLE ai.agent_groups ADD CONSTRAINT pk_agent_groups PRIMARY KEY (id);

-- AI模型表主键
ALTER TABLE ai.models ADD CONSTRAINT pk_models PRIMARY KEY (id);

-- 对话会话表主键
ALTER TABLE ai.conversations ADD CONSTRAINT pk_conversations PRIMARY KEY (id);

-- 对话消息表主键
ALTER TABLE ai.messages ADD CONSTRAINT pk_messages PRIMARY KEY (id);

-- 知识库表主键
ALTER TABLE ai.knowledge_bases ADD CONSTRAINT pk_knowledge_bases PRIMARY KEY (id);

-- 文档表主键
ALTER TABLE ai.documents ADD CONSTRAINT pk_documents PRIMARY KEY (id);

-- 文档块表主键
ALTER TABLE ai.document_chunks ADD CONSTRAINT pk_document_chunks PRIMARY KEY (id);

-- 提示词模板表主键
ALTER TABLE ai.prompt_templates ADD CONSTRAINT pk_prompt_templates PRIMARY KEY (id);

-- 消息反馈表主键
ALTER TABLE ai.message_feedback ADD CONSTRAINT pk_message_feedback PRIMARY KEY (id);

-- =====================================================
-- 工作流表主键索引
-- =====================================================

-- 工作流定义表主键
ALTER TABLE workflow.definitions ADD CONSTRAINT pk_workflow_definitions PRIMARY KEY (id);

-- 工作流执行记录表主键
ALTER TABLE workflow.executions ADD CONSTRAINT pk_workflow_executions PRIMARY KEY (id);

-- 工作流节点执行记录表主键
ALTER TABLE workflow.node_executions ADD CONSTRAINT pk_node_executions PRIMARY KEY (id);

-- 审批流程表主键
ALTER TABLE workflow.approval_flows ADD CONSTRAINT pk_approval_flows PRIMARY KEY (id);

-- 审批申请表主键
ALTER TABLE workflow.approval_applications ADD CONSTRAINT pk_approval_applications PRIMARY KEY (id);

-- 审批记录表主键
ALTER TABLE workflow.approval_records ADD CONSTRAINT pk_approval_records PRIMARY KEY (id);

-- 调度任务表主键
ALTER TABLE workflow.scheduled_tasks ADD CONSTRAINT pk_scheduled_tasks PRIMARY KEY (id);

-- =====================================================
-- 审计日志表主键索引
-- =====================================================

-- 审计日志表主键
ALTER TABLE audit.logs ADD CONSTRAINT pk_audit_logs PRIMARY KEY (id);

-- =====================================================
-- 监控表主键索引
-- =====================================================

-- 设备信息表主键
ALTER TABLE monitor.devices ADD CONSTRAINT pk_devices PRIMARY KEY (id);

-- 监控指标表主键
ALTER TABLE monitor.metrics ADD CONSTRAINT pk_metrics PRIMARY KEY (id);

-- 告警表主键
ALTER TABLE monitor.alerts ADD CONSTRAINT pk_alerts PRIMARY KEY (id);

-- 告警规则表主键
ALTER TABLE monitor.alert_rules ADD CONSTRAINT pk_alert_rules PRIMARY KEY (id);

-- 通知渠道表主键
ALTER TABLE monitor.notification_channels ADD CONSTRAINT pk_notification_channels PRIMARY KEY (id);

-- 通知记录表主键
ALTER TABLE monitor.notifications ADD CONSTRAINT pk_notifications PRIMARY KEY (id);

-- =====================================================
-- 扩展管理表主键索引
-- =====================================================

-- 插件表主键
ALTER TABLE extension.plugins ADD CONSTRAINT pk_plugins PRIMARY KEY (id);

-- 插件配置表主键
ALTER TABLE extension.plugin_configs ADD CONSTRAINT pk_plugin_configs PRIMARY KEY (id);

-- API密钥表主键
ALTER TABLE extension.api_keys ADD CONSTRAINT pk_api_keys PRIMARY KEY (id);

-- Webhook表主键
ALTER TABLE extension.webhooks ADD CONSTRAINT pk_webhooks PRIMARY KEY (id);

-- Webhook事件表主键
ALTER TABLE extension.webhook_events ADD CONSTRAINT pk_webhook_events PRIMARY KEY (id);

-- 第三方集成表主键
ALTER TABLE extension.integrations ADD CONSTRAINT pk_integrations PRIMARY KEY (id);

-- =====================================================
-- 基础查询索引
-- =====================================================

-- 用户表基础索引
CREATE INDEX IF NOT EXISTS idx_users_username ON core.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON core.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON core.users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON core.users(created_at);

-- 角色表基础索引
CREATE INDEX IF NOT EXISTS idx_roles_code ON core.roles(code);
CREATE INDEX IF NOT EXISTS idx_roles_type ON core.roles(type);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON core.roles(is_active);

-- 权限表基础索引
CREATE INDEX IF NOT EXISTS idx_permissions_code ON core.permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON core.permissions(resource);

-- 用户角色关联表基础索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON core.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON core.user_roles(role_id);

-- 角色权限关联表基础索引
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON core.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON core.role_permissions(permission_id);

-- 会话表基础索引
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON core.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON core.sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON core.sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON core.sessions(expires_at);

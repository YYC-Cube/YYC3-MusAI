-- =====================================================
-- YYC³-AI-Family 检查约束创建脚本
-- @file: check_constraints.sql
-- @description: 创建所有表的检查约束
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 用户管理检查约束
-- =====================================================

ALTER TABLE core.users
    ADD CONSTRAINT chk_users_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    ADD CONSTRAINT chk_users_username CHECK (char_length(username) >= 3 AND char_length(username) <= 50),
    ADD CONSTRAINT chk_users_phone CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{10,15}$'),
    ADD CONSTRAINT chk_users_login_count CHECK (login_count >= 0),
    ADD CONSTRAINT chk_users_failed_login_count CHECK (failed_login_count >= 0);

-- =====================================================
-- 角色管理检查约束
-- =====================================================

ALTER TABLE core.roles
    ADD CONSTRAINT chk_roles_level CHECK (level >= 0 AND level <= 100),
    ADD CONSTRAINT chk_roles_sort_order CHECK (sort_order >= 0);

-- =====================================================
-- 组织管理检查约束
-- =====================================================

ALTER TABLE core.organizations
    ADD CONSTRAINT chk_organizations_level CHECK (level >= 0 AND level <= 10);

ALTER TABLE core.departments
    ADD CONSTRAINT chk_departments_level CHECK (level >= 0 AND level <= 20);

-- =====================================================
-- 项目管理检查约束
-- =====================================================

ALTER TABLE core.projects
    ADD CONSTRAINT chk_projects_progress CHECK (progress >= 0 AND progress <= 100),
    ADD CONSTRAINT chk_projects_budget CHECK (budget IS NULL OR budget >= 0),
    ADD CONSTRAINT chk_projects_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
    ADD CONSTRAINT chk_projects_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'));

-- =====================================================
-- 任务管理检查约束
-- =====================================================

ALTER TABLE core.tasks
    ADD CONSTRAINT chk_tasks_progress CHECK (progress >= 0 AND progress <= 100),
    ADD CONSTRAINT chk_tasks_estimated_hours CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
    ADD CONSTRAINT chk_tasks_actual_hours CHECK (actual_hours IS NULL OR actual_hours >= 0),
    ADD CONSTRAINT chk_tasks_story_points CHECK (story_points IS NULL OR story_points >= 0),
    ADD CONSTRAINT chk_tasks_dates CHECK (due_date IS NULL OR created_at IS NULL OR due_date >= created_at);

-- =====================================================
-- AI智能体检查约束
-- =====================================================

ALTER TABLE ai.agents
    ADD CONSTRAINT chk_agents_max_concurrent_tasks CHECK (max_concurrent_tasks >= 1 AND max_concurrent_tasks <= 100),
    ADD CONSTRAINT chk_agents_task_timeout CHECK (task_timeout_seconds >= 60 AND task_timeout_seconds <= 86400),
    ADD CONSTRAINT chk_agents_success_rate CHECK (success_rate >= 0 AND success_rate <= 100),
    ADD CONSTRAINT chk_agents_total_tasks CHECK (total_tasks_completed >= 0 AND total_tasks_failed >= 0);

ALTER TABLE ai.models
    ADD CONSTRAINT chk_models_max_tokens CHECK (max_tokens > 0),
    ADD CONSTRAINT chk_models_temperature CHECK (temperature >= 0 AND temperature <= 2),
    ADD CONSTRAINT chk_models_top_p CHECK (top_p >= 0 AND top_p <= 1);

ALTER TABLE ai.conversations
    ADD CONSTRAINT chk_conversations_token_usage CHECK (total_tokens >= 0 AND prompt_tokens >= 0 AND completion_tokens >= 0);

ALTER TABLE ai.knowledge_bases
    ADD CONSTRAINT chk_knowledge_bases_document_count CHECK (document_count >= 0),
    ADD CONSTRAINT chk_knowledge_bases_chunk_count CHECK (chunk_count >= 0),
    ADD CONSTRAINT chk_knowledge_bases_embedding_dimension CHECK (embedding_dimension IN (256, 512, 768, 1024, 1536, 2048, 3072));

-- =====================================================
-- 工作流检查约束
-- =====================================================

ALTER TABLE workflow.definitions
    ADD CONSTRAINT chk_workflow_timeout CHECK (timeout_seconds >= 60 AND timeout_seconds <= 604800),
    ADD CONSTRAINT chk_workflow_execution_count CHECK (execution_count >= 0 AND success_count >= 0 AND failure_count >= 0);

ALTER TABLE workflow.executions
    ADD CONSTRAINT chk_workflow_exec_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    ADD CONSTRAINT chk_workflow_exec_nodes CHECK (total_nodes >= 0 AND completed_nodes >= 0 AND failed_nodes >= 0);

ALTER TABLE workflow.approval_flows
    ADD CONSTRAINT chk_approval_flows_timeout CHECK (timeout_hours >= 1 AND timeout_hours <= 720);

-- =====================================================
-- 监控检查约束
-- =====================================================

ALTER TABLE monitor.devices
    ADD CONSTRAINT chk_devices_cpu_cores CHECK (cpu_cores IS NULL OR cpu_cores > 0),
    ADD CONSTRAINT chk_devices_memory CHECK (memory_gb IS NULL OR memory_gb > 0),
    ADD CONSTRAINT chk_devices_disk CHECK (disk_gb IS NULL OR disk_gb > 0);

ALTER TABLE monitor.metrics
    ADD CONSTRAINT chk_metrics_value CHECK (metric_value IS NOT NULL);

ALTER TABLE monitor.alerts
    ADD CONSTRAINT chk_alerts_threshold CHECK (threshold IS NOT NULL AND threshold >= 0);

-- =====================================================
-- 扩展管理检查约束
-- =====================================================

ALTER TABLE extension.plugins
    ADD CONSTRAINT chk_plugins_rating CHECK (rating >= 0 AND rating <= 5),
    ADD CONSTRAINT chk_plugins_counts CHECK (download_count >= 0 AND install_count >= 0 AND rating_count >= 0);

ALTER TABLE extension.api_keys
    ADD CONSTRAINT chk_api_keys_rate_limit CHECK (rate_limit >= 1 AND rate_limit <= 100000);

ALTER TABLE extension.webhooks
    ADD CONSTRAINT chk_webhooks_timeout CHECK (timeout_seconds >= 1 AND timeout_seconds <= 300),
    ADD CONSTRAINT chk_webhooks_retry_count CHECK (retry_count >= 0 AND retry_count <= 10);

-- =====================================================
-- 审计日志检查约束
-- =====================================================

ALTER TABLE audit.logs
    ADD CONSTRAINT chk_audit_duration CHECK (duration_ms IS NULL OR duration_ms >= 0);

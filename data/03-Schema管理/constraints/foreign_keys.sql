-- =====================================================
-- YYC³-AI-Family 约束创建脚本
-- @file: constraints.sql
-- @description: 创建所有表的外键、检查约束、唯一约束
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 外键约束
-- =====================================================

-- 用户表外键
ALTER TABLE core.users
    ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES core.users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES core.users(id) ON DELETE SET NULL;

-- 角色表外键
ALTER TABLE core.roles
    ADD CONSTRAINT fk_roles_parent_id FOREIGN KEY (parent_id) REFERENCES core.roles(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES core.users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_roles_updated_by FOREIGN KEY (updated_by) REFERENCES core.users(id) ON DELETE SET NULL;

-- 用户角色关联表外键
ALTER TABLE core.user_roles
    ADD CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES core.users(id) ON DELETE SET NULL;

-- 权限表外键
ALTER TABLE core.permissions
    ADD CONSTRAINT fk_permissions_parent_id FOREIGN KEY (parent_id) REFERENCES core.permissions(id) ON DELETE SET NULL;

-- 角色权限关联表外键
ALTER TABLE core.role_permissions
    ADD CONSTRAINT fk_role_permissions_created_by FOREIGN KEY (created_by) REFERENCES core.users(id) ON DELETE SET NULL;

-- 组织表外键
ALTER TABLE core.organizations
    ADD CONSTRAINT fk_organizations_parent_id FOREIGN KEY (parent_id) REFERENCES core.organizations(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_organizations_created_by FOREIGN KEY (created_by) REFERENCES core.users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_organizations_updated_by FOREIGN KEY (updated_by) REFERENCES core.users(id) ON DELETE SET NULL;

-- 部门表外键
ALTER TABLE core.departments
    ADD CONSTRAINT fk_departments_org_id FOREIGN KEY (org_id) REFERENCES core.organizations(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_departments_parent_id FOREIGN KEY (parent_id) REFERENCES core.departments(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_departments_manager_id FOREIGN KEY (manager_id) REFERENCES core.users(id) ON DELETE SET NULL;

-- 项目表外键
ALTER TABLE core.projects
    ADD CONSTRAINT fk_projects_org_id FOREIGN KEY (org_id) REFERENCES core.organizations(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_projects_owner_id FOREIGN KEY (owner_id) REFERENCES core.users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES core.users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_projects_updated_by FOREIGN KEY (updated_by) REFERENCES core.users(id) ON DELETE SET NULL;

-- 任务表外键
ALTER TABLE core.tasks
    ADD CONSTRAINT fk_tasks_assignee_id FOREIGN KEY (assignee_id) REFERENCES core.users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_tasks_reporter_id FOREIGN KEY (reporter_id) REFERENCES core.users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES core.users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_tasks_updated_by FOREIGN KEY (updated_by) REFERENCES core.users(id) ON DELETE SET NULL;

-- AI智能体表外键
ALTER TABLE ai.agents
    ADD CONSTRAINT fk_agents_created_by FOREIGN KEY (created_by) REFERENCES core.users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_agents_updated_by FOREIGN KEY (updated_by) REFERENCES core.users(id) ON DELETE SET NULL;

-- 对话会话表外键
ALTER TABLE ai.conversations
    ADD CONSTRAINT fk_conversations_agent_id FOREIGN KEY (agent_id) REFERENCES ai.agents(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_conversations_model_id FOREIGN KEY (model_id) REFERENCES ai.models(id) ON DELETE SET NULL;

-- 知识库表外键
ALTER TABLE ai.knowledge_bases
    ADD CONSTRAINT fk_knowledge_bases_embedding_model_id FOREIGN KEY (embedding_model_id) REFERENCES ai.models(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_knowledge_bases_owner_id FOREIGN KEY (owner_id) REFERENCES core.users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_knowledge_bases_org_id FOREIGN KEY (org_id) REFERENCES core.organizations(id) ON DELETE SET NULL;

-- =====================================================
-- 检查约束
-- =====================================================

-- 用户表检查约束
ALTER TABLE core.users
    ADD CONSTRAINT chk_users_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    ADD CONSTRAINT chk_users_username CHECK (char_length(username) >= 3 AND char_length(username) <= 50),
    ADD CONSTRAINT chk_users_phone CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{10,15}$');

-- 任务表检查约束
ALTER TABLE core.tasks
    ADD CONSTRAINT chk_tasks_progress CHECK (progress >= 0 AND progress <= 100),
    ADD CONSTRAINT chk_tasks_estimated_hours CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
    ADD CONSTRAINT chk_tasks_actual_hours CHECK (actual_hours IS NULL OR actual_hours >= 0);

-- 项目表检查约束
ALTER TABLE core.projects
    ADD CONSTRAINT chk_projects_progress CHECK (progress >= 0 AND progress <= 100),
    ADD CONSTRAINT chk_projects_budget CHECK (budget IS NULL OR budget >= 0),
    ADD CONSTRAINT chk_projects_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);

-- AI智能体表检查约束
ALTER TABLE ai.agents
    ADD CONSTRAINT chk_agents_max_concurrent_tasks CHECK (max_concurrent_tasks > 0),
    ADD CONSTRAINT chk_agents_task_timeout CHECK (task_timeout_seconds > 0),
    ADD CONSTRAINT chk_agents_success_rate CHECK (success_rate >= 0 AND success_rate <= 100);

-- 监控指标表检查约束
ALTER TABLE monitor.metrics
    ADD CONSTRAINT chk_metrics_value CHECK (value IS NOT NULL);

-- 告警规则表检查约束
ALTER TABLE monitor.alert_rules
    ADD CONSTRAINT chk_alert_rules_timeout CHECK (timeout_hours > 0);

-- API密钥表检查约束
ALTER TABLE extension.api_keys
    ADD CONSTRAINT chk_api_keys_rate_limit CHECK (rate_limit > 0);

-- =====================================================
-- 唯一约束
-- =====================================================

-- 用户部门关联表唯一约束
ALTER TABLE core.user_departments
    ADD CONSTRAINT uk_user_departments UNIQUE (user_id, dept_id);

-- 项目成员表唯一约束
ALTER TABLE core.project_members
    ADD CONSTRAINT uk_project_members UNIQUE (project_id, user_id);

-- 文档分块表唯一约束
ALTER TABLE ai.document_chunks
    ADD CONSTRAINT uk_document_chunks UNIQUE (document_id, chunk_index);

-- 插件配置表唯一约束
ALTER TABLE extension.plugin_configs
    ADD CONSTRAINT uk_plugin_configs UNIQUE (plugin_id, scope, scope_id);

-- =====================================================
-- 排除约束
-- =====================================================

-- 确保用户在同一项目中只有一个角色
ALTER TABLE core.project_members
    ADD CONSTRAINT ex_project_members_role EXCLUDE USING gist (
        project_id WITH =,
        user_id WITH =
    );

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE '约束创建完成: 外键、检查约束、唯一约束已创建';
END $$;

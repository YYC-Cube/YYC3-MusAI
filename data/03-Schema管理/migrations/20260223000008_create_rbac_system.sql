-- =====================================================
-- YYC³-AI-Family 权限管理脚本
-- @file: 08_create_rbac_system.sql
-- @description: 创建角色、权限、行级安全策略
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 初始化系统角色
-- =====================================================

-- 插入系统角色
INSERT INTO core.roles (id, name, code, type, description, is_system, is_active, level, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000001', '超级管理员', 'super_admin', 'super_admin', '系统超级管理员，拥有所有权限', TRUE, TRUE, 1, 1),
    ('00000000-0000-0000-0000-000000000002', '系统管理员', 'system_admin', 'system_admin', '系统管理员，负责系统配置和维护', TRUE, TRUE, 2, 2),
    ('00000000-0000-0000-0000-000000000003', '安全管理员', 'security_admin', 'security_admin', '安全管理员，负责安全策略和审计', TRUE, TRUE, 3, 3),
    ('00000000-0000-0000-0000-000000000004', '审计人员', 'auditor', 'auditor', '审计人员，负责查看审计日志', TRUE, TRUE, 4, 4),
    ('00000000-0000-0000-0000-000000000005', '业务负责人', 'business_owner', 'business_owner', '业务负责人，负责业务管理和决策', TRUE, TRUE, 5, 5),
    ('00000000-0000-0000-0000-000000000006', '开发者', 'developer', 'developer', '开发者，负责开发和测试', TRUE, TRUE, 6, 6),
    ('00000000-0000-0000-0000-000000000007', '普通用户', 'user', 'user', '普通用户，使用基本功能', TRUE, TRUE, 7, 7)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 初始化系统权限
-- =====================================================

-- 用户管理权限
INSERT INTO core.permissions (id, name, code, resource, action, description, is_system, is_active) VALUES
    ('10000000-0000-0000-0000-000000000001', '查看用户', 'user:view', 'user', 'view', '查看用户信息', TRUE, TRUE),
    ('10000000-0000-0000-0000-000000000002', '创建用户', 'user:create', 'user', 'create', '创建新用户', TRUE, TRUE),
    ('10000000-0000-0000-0000-000000000003', '编辑用户', 'user:edit', 'user', 'edit', '编辑用户信息', TRUE, TRUE),
    ('10000000-0000-0000-0000-000000000004', '删除用户', 'user:delete', 'user', 'delete', '删除用户', TRUE, TRUE),
    ('10000000-0000-0000-0000-000000000005', '管理用户角色', 'user:manage_roles', 'user', 'manage_roles', '管理用户角色分配', TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 角色管理权限
INSERT INTO core.permissions (id, name, code, resource, action, description, is_system, is_active) VALUES
    ('11000000-0000-0000-0000-000000000001', '查看角色', 'role:view', 'role', 'view', '查看角色信息', TRUE, TRUE),
    ('11000000-0000-0000-0000-000000000002', '创建角色', 'role:create', 'role', 'create', '创建新角色', TRUE, TRUE),
    ('11000000-0000-0000-0000-000000000003', '编辑角色', 'role:edit', 'role', 'edit', '编辑角色信息', TRUE, TRUE),
    ('11000000-0000-0000-0000-000000000004', '删除角色', 'role:delete', 'role', 'delete', '删除角色', TRUE, TRUE),
    ('11000000-0000-0000-0000-000000000005', '管理角色权限', 'role:manage_permissions', 'role', 'manage_permissions', '管理角色权限分配', TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 组织管理权限
INSERT INTO core.permissions (id, name, code, resource, action, description, is_system, is_active) VALUES
    ('12000000-0000-0000-0000-000000000001', '查看组织', 'organization:view', 'organization', 'view', '查看组织信息', TRUE, TRUE),
    ('12000000-0000-0000-0000-000000000002', '创建组织', 'organization:create', 'organization', 'create', '创建新组织', TRUE, TRUE),
    ('12000000-0000-0000-0000-000000000003', '编辑组织', 'organization:edit', 'organization', 'edit', '编辑组织信息', TRUE, TRUE),
    ('12000000-0000-0000-0000-000000000004', '删除组织', 'organization:delete', 'organization', 'delete', '删除组织', TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 项目管理权限
INSERT INTO core.permissions (id, name, code, resource, action, description, is_system, is_active) VALUES
    ('13000000-0000-0000-0000-000000000001', '查看项目', 'project:view', 'project', 'view', '查看项目信息', TRUE, TRUE),
    ('13000000-0000-0000-0000-000000000002', '创建项目', 'project:create', 'project', 'create', '创建新项目', TRUE, TRUE),
    ('13000000-0000-0000-0000-000000000003', '编辑项目', 'project:edit', 'project', 'edit', '编辑项目信息', TRUE, TRUE),
    ('13000000-0000-0000-0000-000000000004', '删除项目', 'project:delete', 'project', 'delete', '删除项目', TRUE, TRUE),
    ('13000000-0000-0000-0000-000000000005', '管理项目成员', 'project:manage_members', 'project', 'manage_members', '管理项目成员', TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 任务管理权限
INSERT INTO core.permissions (id, name, code, resource, action, description, is_system, is_active) VALUES
    ('14000000-0000-0000-0000-000000000001', '查看任务', 'task:view', 'task', 'view', '查看任务信息', TRUE, TRUE),
    ('14000000-0000-0000-0000-000000000002', '创建任务', 'task:create', 'task', 'create', '创建新任务', TRUE, TRUE),
    ('14000000-0000-0000-0000-000000000003', '编辑任务', 'task:edit', 'task', 'edit', '编辑任务信息', TRUE, TRUE),
    ('14000000-0000-0000-0000-000000000004', '删除任务', 'task:delete', 'task', 'delete', '删除任务', TRUE, TRUE),
    ('14000000-0000-0000-0000-000000000005', '分配任务', 'task:assign', 'task', 'assign', '分配任务给用户', TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- AI智能体权限
INSERT INTO core.permissions (id, name, code, resource, action, description, is_system, is_active) VALUES
    ('15000000-0000-0000-0000-000000000001', '查看AI智能体', 'agent:view', 'agent', 'view', '查看AI智能体信息', TRUE, TRUE),
    ('15000000-0000-0000-0000-000000000002', '创建AI智能体', 'agent:create', 'agent', 'create', '创建新AI智能体', TRUE, TRUE),
    ('15000000-0000-0000-0000-000000000003', '编辑AI智能体', 'agent:edit', 'agent', 'edit', '编辑AI智能体配置', TRUE, TRUE),
    ('15000000-0000-0000-0000-000000000004', '删除AI智能体', 'agent:delete', 'agent', 'delete', '删除AI智能体', TRUE, TRUE),
    ('15000000-0000-0000-0000-000000000005', '使用AI智能体', 'agent:use', 'agent', 'use', '使用AI智能体进行对话', TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 知识库权限
INSERT INTO core.permissions (id, name, code, resource, action, description, is_system, is_active) VALUES
    ('16000000-0000-0000-0000-000000000001', '查看知识库', 'knowledge_base:view', 'knowledge_base', 'view', '查看知识库信息', TRUE, TRUE),
    ('16000000-0000-0000-0000-000000000002', '创建知识库', 'knowledge_base:create', 'knowledge_base', 'create', '创建新知识库', TRUE, TRUE),
    ('16000000-0000-0000-0000-000000000003', '编辑知识库', 'knowledge_base:edit', 'knowledge_base', 'edit', '编辑知识库配置', TRUE, TRUE),
    ('16000000-0000-0000-0000-000000000004', '删除知识库', 'knowledge_base:delete', 'knowledge_base', 'delete', '删除知识库', TRUE, TRUE),
    ('16000000-0000-0000-0000-000000000005', '管理知识库文档', 'knowledge_base:manage_documents', 'knowledge_base', 'manage_documents', '管理知识库文档', TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 工作流权限
INSERT INTO core.permissions (id, name, code, resource, action, description, is_system, is_active) VALUES
    ('17000000-0000-0000-0000-000000000001', '查看工作流', 'workflow:view', 'workflow', 'view', '查看工作流信息', TRUE, TRUE),
    ('17000000-0000-0000-0000-000000000002', '创建工作流', 'workflow:create', 'workflow', 'create', '创建新工作流', TRUE, TRUE),
    ('17000000-0000-0000-0000-000000000003', '编辑工作流', 'workflow:edit', 'workflow', 'edit', '编辑工作流配置', TRUE, TRUE),
    ('17000000-0000-0000-0000-000000000004', '删除工作流', 'workflow:delete', 'workflow', 'delete', '删除工作流', TRUE, TRUE),
    ('17000000-0000-0000-0000-000000000005', '执行工作流', 'workflow:execute', 'workflow', 'execute', '执行工作流', TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 审计权限
INSERT INTO core.permissions (id, name, code, resource, action, description, is_system, is_active) VALUES
    ('18000000-0000-0000-0000-000000000001', '查看审计日志', 'audit:view', 'audit', 'view', '查看审计日志', TRUE, TRUE),
    ('18000000-0000-0000-0000-000000000002', '导出审计日志', 'audit:export', 'audit', 'export', '导出审计日志', TRUE, TRUE),
    ('18000000-0000-0000-0000-000000000003', '清理审计日志', 'audit:cleanup', 'audit', 'cleanup', '清理过期审计日志', TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 系统设置权限
INSERT INTO core.permissions (id, name, code, resource, action, description, is_system, is_active) VALUES
    ('19000000-0000-0000-0000-000000000001', '查看系统设置', 'settings:view', 'settings', 'view', '查看系统设置', TRUE, TRUE),
    ('19000000-0000-0000-0000-000000000002', '编辑系统设置', 'settings:edit', 'settings', 'edit', '编辑系统设置', TRUE, TRUE),
    ('19000000-0000-0000-0000-000000000003', '管理系统扩展', 'settings:manage_extensions', 'settings', 'manage_extensions', '管理系统扩展和插件', TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 分配角色权限
-- =====================================================

-- 超级管理员拥有所有权限
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT
    '00000000-0000-0000-0000-000000000001'::UUID,
    id
FROM core.permissions
ON CONFLICT DO NOTHING;

-- 系统管理员权限
INSERT INTO core.role_permissions (role_id, permission_id) VALUES
    ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003'),
    ('00000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000003'),
    ('00000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000003'),
    ('00000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- 安全管理员权限
INSERT INTO core.role_permissions (role_id, permission_id) VALUES
    ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- 审计人员权限
INSERT INTO core.role_permissions (role_id, permission_id) VALUES
    ('00000000-0000-0000-0000-000000000004', '18000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000004', '18000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- 业务负责人权限
INSERT INTO core.role_permissions (role_id, permission_id) VALUES
    ('00000000-0000-0000-0000-000000000005', '13000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000005', '13000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000005', '13000000-0000-0000-0000-000000000003'),
    ('00000000-0000-0000-0000-000000000005', '13000000-0000-0000-0000-000000000005'),
    ('00000000-0000-0000-0000-000000000005', '14000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000005', '14000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000005', '14000000-0000-0000-0000-000000000003'),
    ('00000000-0000-0000-0000-000000000005', '14000000-0000-0000-0000-000000000005'),
    ('00000000-0000-0000-0000-000000000005', '15000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000005', '15000000-0000-0000-0000-000000000005'),
    ('00000000-0000-0000-0000-000000000005', '16000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000005', '17000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000005', '17000000-0000-0000-0000-000000000005')
ON CONFLICT DO NOTHING;

-- 开发者权限
INSERT INTO core.role_permissions (role_id, permission_id) VALUES
    ('00000000-0000-0000-0000-000000000006', '13000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000006', '13000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000006', '13000000-0000-0000-0000-000000000003'),
    ('00000000-0000-0000-0000-000000000006', '14000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000006', '14000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000006', '14000000-0000-0000-0000-000000000003'),
    ('00000000-0000-0000-0000-000000000006', '15000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000006', '15000000-0000-0000-0000-000000000005'),
    ('00000000-0000-0000-0000-000000000006', '16000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000006', '16000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000006', '16000000-0000-0000-0000-000000000003'),
    ('00000000-0000-0000-0000-000000000006', '17000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000006', '17000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000006', '17000000-0000-0000-0000-000000000003'),
    ('00000000-0000-0000-0000-000000000006', '17000000-0000-0000-0000-000000000005')
ON CONFLICT DO NOTHING;

-- 普通用户权限
INSERT INTO core.role_permissions (role_id, permission_id) VALUES
    ('00000000-0000-0000-0000-000000000007', '13000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000007', '14000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000007', '14000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000007', '15000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000007', '15000000-0000-0000-0000-000000000005'),
    ('00000000-0000-0000-0000-000000000007', '16000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000007', '17000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000007', '17000000-0000-0000-0000-000000000005')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 行级安全策略 (Row Level Security)
-- =====================================================

-- 启用行级安全
ALTER TABLE core.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.knowledge_bases ENABLE ROW LEVEL SECURITY;

-- 项目表行级安全策略
CREATE POLICY projects_select_policy ON core.projects
    FOR SELECT
    USING (
        owner_id = current_setting('app.current_user_id', TRUE)::UUID
        OR id IN (
            SELECT project_id FROM core.project_members
            WHERE user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
        OR EXISTS (
            SELECT 1 FROM core.v_user_permissions
            WHERE user_id = current_setting('app.current_user_id', TRUE)::UUID
              AND resource = 'project'
              AND action = 'view'
              AND role_type IN ('super_admin', 'system_admin')
        )
    );

CREATE POLICY projects_insert_policy ON core.projects
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM core.v_user_permissions
            WHERE user_id = current_setting('app.current_user_id', TRUE)::UUID
              AND resource = 'project'
              AND action = 'create'
        )
    );

CREATE POLICY projects_update_policy ON core.projects
    FOR UPDATE
    USING (
        owner_id = current_setting('app.current_user_id', TRUE)::UUID
        OR EXISTS (
            SELECT 1 FROM core.v_user_permissions
            WHERE user_id = current_setting('app.current_user_id', TRUE)::UUID
              AND resource = 'project'
              AND action = 'edit'
              AND role_type IN ('super_admin', 'system_admin')
        )
    );

CREATE POLICY projects_delete_policy ON core.projects
    FOR DELETE
    USING (
        owner_id = current_setting('app.current_user_id', TRUE)::UUID
        OR EXISTS (
            SELECT 1 FROM core.v_user_permissions
            WHERE user_id = current_setting('app.current_user_id', TRUE)::UUID
              AND resource = 'project'
              AND action = 'delete'
              AND role_type IN ('super_admin', 'system_admin')
        )
    );

-- 任务表行级安全策略
CREATE POLICY tasks_select_policy ON core.tasks
    FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM core.projects
            WHERE owner_id = current_setting('app.current_user_id', TRUE)::UUID
               OR id IN (
                   SELECT project_id FROM core.project_members
                   WHERE user_id = current_setting('app.current_user_id', TRUE)::UUID
               )
        )
        OR assignee_id = current_setting('app.current_user_id', TRUE)::UUID
        OR reporter_id = current_setting('app.current_user_id', TRUE)::UUID
    );

-- 对话表行级安全策略
CREATE POLICY conversations_select_policy ON ai.conversations
    FOR SELECT
    USING (
        user_id = current_setting('app.current_user_id', TRUE)::UUID
        OR EXISTS (
            SELECT 1 FROM core.v_user_permissions
            WHERE user_id = current_setting('app.current_user_id', TRUE)::UUID
              AND role_type IN ('super_admin', 'system_admin')
        )
    );

CREATE POLICY conversations_insert_policy ON ai.conversations
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('app.current_user_id', TRUE)::UUID
    );

CREATE POLICY conversations_update_policy ON ai.conversations
    FOR UPDATE
    USING (
        user_id = current_setting('app.current_user_id', TRUE)::UUID
    );

CREATE POLICY conversations_delete_policy ON ai.conversations
    FOR DELETE
    USING (
        user_id = current_setting('app.current_user_id', TRUE)::UUID
        OR EXISTS (
            SELECT 1 FROM core.v_user_permissions
            WHERE user_id = current_setting('app.current_user_id', TRUE)::UUID
              AND role_type IN ('super_admin', 'system_admin')
        )
    );

-- 知识库表行级安全策略
CREATE POLICY knowledge_bases_select_policy ON ai.knowledge_bases
    FOR SELECT
    USING (
        is_public = TRUE
        OR owner_id = current_setting('app.current_user_id', TRUE)::UUID
        OR org_id IN (
            SELECT org_id FROM core.user_departments ud
            JOIN core.departments d ON ud.dept_id = d.id
            WHERE ud.user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
        OR EXISTS (
            SELECT 1 FROM core.v_user_permissions
            WHERE user_id = current_setting('app.current_user_id', TRUE)::UUID
              AND role_type IN ('super_admin', 'system_admin')
        )
    );

CREATE POLICY knowledge_bases_insert_policy ON ai.knowledge_bases
    FOR INSERT
    WITH CHECK (
        owner_id = current_setting('app.current_user_id', TRUE)::UUID
        AND EXISTS (
            SELECT 1 FROM core.v_user_permissions
            WHERE user_id = current_setting('app.current_user_id', TRUE)::UUID
              AND resource = 'knowledge_base'
              AND action = 'create'
        )
    );

CREATE POLICY knowledge_bases_update_policy ON ai.knowledge_bases
    FOR UPDATE
    USING (
        owner_id = current_setting('app.current_user_id', TRUE)::UUID
        OR EXISTS (
            SELECT 1 FROM core.v_user_permissions
            WHERE user_id = current_setting('app.current_user_id', TRUE)::UUID
              AND resource = 'knowledge_base'
              AND action = 'edit'
              AND role_type IN ('super_admin', 'system_admin')
        )
    );

CREATE POLICY knowledge_bases_delete_policy ON ai.knowledge_bases
    FOR DELETE
    USING (
        owner_id = current_setting('app.current_user_id', TRUE)::UUID
        OR EXISTS (
            SELECT 1 FROM core.v_user_permissions
            WHERE user_id = current_setting('app.current_user_id', TRUE)::UUID
              AND resource = 'knowledge_base'
              AND action = 'delete'
              AND role_type IN ('super_admin', 'system_admin')
        )
    );

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE '权限管理脚本执行完成: 角色、权限、行级安全策略已创建';
END $$;

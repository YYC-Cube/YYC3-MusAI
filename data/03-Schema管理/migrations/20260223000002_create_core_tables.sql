-- =====================================================
-- YYC³-AI-Family 核心业务表结构
-- @file: 02_create_core_tables.sql
-- @description: 创建用户、角色、权限、项目等核心业务表
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 用户管理表
-- =====================================================

-- 用户表
CREATE TABLE IF NOT EXISTS core.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    status user_status DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    login_count INTEGER DEFAULT 0,
    failed_login_count INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE core.users IS '用户表';
COMMENT ON COLUMN core.users.id IS '用户ID';
COMMENT ON COLUMN core.users.username IS '用户名';
COMMENT ON COLUMN core.users.email IS '邮箱';
COMMENT ON COLUMN core.users.password_hash IS '密码哈希';
COMMENT ON COLUMN core.users.full_name IS '全名';
COMMENT ON COLUMN core.users.avatar_url IS '头像URL';
COMMENT ON COLUMN core.users.phone IS '手机号';
COMMENT ON COLUMN core.users.status IS '用户状态';
COMMENT ON COLUMN core.users.email_verified IS '邮箱是否验证';
COMMENT ON COLUMN core.users.phone_verified IS '手机是否验证';
COMMENT ON COLUMN core.users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN core.users.last_login_ip IS '最后登录IP';
COMMENT ON COLUMN core.users.login_count IS '登录次数';
COMMENT ON COLUMN core.users.failed_login_count IS '失败登录次数';
COMMENT ON COLUMN core.users.locked_until IS '锁定截止时间';
COMMENT ON COLUMN core.users.preferences IS '用户偏好设置';
COMMENT ON COLUMN core.users.metadata IS '元数据';
COMMENT ON COLUMN core.users.created_at IS '创建时间';
COMMENT ON COLUMN core.users.updated_at IS '更新时间';
COMMENT ON COLUMN core.users.created_by IS '创建人';
COMMENT ON COLUMN core.users.updated_by IS '更新人';
COMMENT ON COLUMN core.users.deleted_at IS '删除时间';

-- 角色表
CREATE TABLE IF NOT EXISTS core.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type role_type NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    parent_id UUID REFERENCES core.roles(id),
    level INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

COMMENT ON TABLE core.roles IS '角色表';
COMMENT ON COLUMN core.roles.id IS '角色ID';
COMMENT ON COLUMN core.roles.name IS '角色名称';
COMMENT ON COLUMN core.roles.code IS '角色编码';
COMMENT ON COLUMN core.roles.type IS '角色类型';
COMMENT ON COLUMN core.roles.description IS '角色描述';
COMMENT ON COLUMN core.roles.permissions IS '权限列表';
COMMENT ON COLUMN core.roles.is_system IS '是否系统角色';
COMMENT ON COLUMN core.roles.is_active IS '是否激活';
COMMENT ON COLUMN core.roles.parent_id IS '父角色ID';
COMMENT ON COLUMN core.roles.level IS '角色层级';
COMMENT ON COLUMN core.roles.sort_order IS '排序顺序';

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS core.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES core.roles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES core.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

COMMENT ON TABLE core.user_roles IS '用户角色关联表';
COMMENT ON COLUMN core.user_roles.user_id IS '用户ID';
COMMENT ON COLUMN core.user_roles.role_id IS '角色ID';
COMMENT ON COLUMN core.user_roles.is_primary IS '是否主角色';
COMMENT ON COLUMN core.user_roles.assigned_at IS '分配时间';
COMMENT ON COLUMN core.user_roles.assigned_by IS '分配人';
COMMENT ON COLUMN core.user_roles.expires_at IS '过期时间';

-- 权限表
CREATE TABLE IF NOT EXISTS core.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    conditions JSONB DEFAULT '{}',
    parent_id UUID REFERENCES core.permissions(id),
    level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE core.permissions IS '权限表';
COMMENT ON COLUMN core.permissions.id IS '权限ID';
COMMENT ON COLUMN core.permissions.name IS '权限名称';
COMMENT ON COLUMN core.permissions.code IS '权限编码';
COMMENT ON COLUMN core.permissions.resource IS '资源';
COMMENT ON COLUMN core.permissions.action IS '操作';
COMMENT ON COLUMN core.permissions.description IS '权限描述';
COMMENT ON COLUMN core.permissions.conditions IS '权限条件';
COMMENT ON COLUMN core.permissions.parent_id IS '父权限ID';
COMMENT ON COLUMN core.permissions.level IS '权限层级';

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS core.role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES core.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES core.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    UNIQUE(role_id, permission_id)
);

COMMENT ON TABLE core.role_permissions IS '角色权限关联表';

-- =====================================================
-- 组织管理表
-- =====================================================

-- 组织表
CREATE TABLE IF NOT EXISTS core.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    website VARCHAR(255),
    type VARCHAR(50),
    parent_id UUID REFERENCES core.organizations(id),
    level INTEGER DEFAULT 0,
    path VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

COMMENT ON TABLE core.organizations IS '组织表';

-- 部门表
CREATE TABLE IF NOT EXISTS core.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    parent_id UUID REFERENCES core.departments(id),
    level INTEGER DEFAULT 0,
    path VARCHAR(500),
    manager_id UUID REFERENCES core.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

COMMENT ON TABLE core.departments IS '部门表';

-- 用户部门关联表
CREATE TABLE IF NOT EXISTS core.user_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    dept_id UUID NOT NULL REFERENCES core.departments(id) ON DELETE CASCADE,
    position VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    is_leader BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, dept_id)
);

COMMENT ON TABLE core.user_departments IS '用户部门关联表';

-- =====================================================
-- 项目管理表
-- =====================================================

-- 项目表
CREATE TABLE IF NOT EXISTS core.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    org_id UUID REFERENCES core.organizations(id),
    status project_status DEFAULT 'planning',
    priority task_priority DEFAULT 'medium',
    owner_id UUID NOT NULL REFERENCES core.users(id),
    team_id UUID,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    progress INTEGER DEFAULT 0,
    tags VARCHAR(100)[],
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE core.projects IS '项目表';
COMMENT ON COLUMN core.projects.id IS '项目ID';
COMMENT ON COLUMN core.projects.name IS '项目名称';
COMMENT ON COLUMN core.projects.code IS '项目编码';
COMMENT ON COLUMN core.projects.status IS '项目状态';
COMMENT ON COLUMN core.projects.priority IS '项目优先级';
COMMENT ON COLUMN core.projects.owner_id IS '项目负责人ID';
COMMENT ON COLUMN core.projects.progress IS '项目进度(0-100)';

-- 项目成员表
CREATE TABLE IF NOT EXISTS core.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    invited_by UUID REFERENCES core.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

COMMENT ON TABLE core.project_members IS '项目成员表';

-- 任务表
CREATE TABLE IF NOT EXISTS core.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES core.projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES core.tasks(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'pending',
    priority task_priority DEFAULT 'medium',
    assignee_id UUID REFERENCES core.users(id),
    reporter_id UUID REFERENCES core.users(id),
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),
    progress INTEGER DEFAULT 0,
    tags VARCHAR(100)[],
    labels VARCHAR(50)[],
    sort_order INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    path VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    completed_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE core.tasks IS '任务表';
COMMENT ON COLUMN core.tasks.id IS '任务ID';
COMMENT ON COLUMN core.tasks.project_id IS '项目ID';
COMMENT ON COLUMN core.tasks.parent_id IS '父任务ID';
COMMENT ON COLUMN core.tasks.title IS '任务标题';
COMMENT ON COLUMN core.tasks.status IS '任务状态';
COMMENT ON COLUMN core.tasks.priority IS '任务优先级';
COMMENT ON COLUMN core.tasks.assignee_id IS '负责人ID';
COMMENT ON COLUMN core.tasks.reporter_id IS '报告人ID';

-- 任务评论表
CREATE TABLE IF NOT EXISTS core.task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES core.tasks(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES core.task_comments(id),
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES core.users(id),
    mentions UUID[],
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE core.task_comments IS '任务评论表';

-- =====================================================
-- 会话管理表
-- =====================================================

-- 会话表
CREATE TABLE IF NOT EXISTS core.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(255),
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE core.sessions IS '会话表';
COMMENT ON COLUMN core.sessions.id IS '会话ID';
COMMENT ON COLUMN core.sessions.user_id IS '用户ID';
COMMENT ON COLUMN core.sessions.token_hash IS 'Token哈希';
COMMENT ON COLUMN core.sessions.refresh_token_hash IS '刷新Token哈希';
COMMENT ON COLUMN core.sessions.device_info IS '设备信息';
COMMENT ON COLUMN core.sessions.ip_address IS 'IP地址';
COMMENT ON COLUMN core.sessions.is_active IS '是否活跃';
COMMENT ON COLUMN core.sessions.expires_at IS '过期时间';

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE '核心业务表创建完成: 用户、角色、权限、组织、项目、任务、会话表已创建';
END $$;

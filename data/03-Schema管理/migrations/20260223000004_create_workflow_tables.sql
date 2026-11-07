-- =====================================================
-- YYC³-AI-Family 工作流管理表结构
-- @file: 04_create_workflow_tables.sql
-- @description: 创建工作流、执行记录、审批流程等工作流相关表
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 工作流定义表
-- =====================================================

-- 工作流定义表
CREATE TABLE IF NOT EXISTS workflow.definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50),

    -- 工作流定义
    definition JSONB NOT NULL, -- 工作流JSON定义
    version VARCHAR(20) DEFAULT '1.0.0',

    -- 触发配置
    triggers JSONB DEFAULT '[]', -- [{type: 'manual'|'schedule'|'event', config: {}}]

    -- 变量配置
    variables JSONB DEFAULT '{}',

    -- 超时配置
    timeout_seconds INTEGER DEFAULT 3600,

    -- 重试配置
    retry_config JSONB DEFAULT '{
        "max_retries": 3,
        "retry_delay_seconds": 60
    }',

    -- 统计信息
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    average_duration_seconds INTEGER DEFAULT 0,

    -- 状态
    status workflow_status DEFAULT 'draft',
    is_active BOOLEAN DEFAULT TRUE,

    -- 权限
    owner_id UUID REFERENCES core.users(id),
    org_id UUID REFERENCES core.organizations(id),

    -- 元数据
    tags VARCHAR(100)[],
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE workflow.definitions IS '工作流定义表';
COMMENT ON COLUMN workflow.definitions.definition IS '工作流JSON定义';
COMMENT ON COLUMN workflow.definitions.triggers IS '触发器配置';
COMMENT ON COLUMN workflow.definitions.variables IS '变量配置';

-- 工作流执行记录表
CREATE TABLE IF NOT EXISTS workflow.executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflow.definitions(id) ON DELETE CASCADE,
    workflow_version VARCHAR(20),

    -- 执行信息
    trigger_type VARCHAR(50) NOT NULL, -- manual, schedule, event, api
    trigger_data JSONB DEFAULT '{}',

    -- 输入输出
    input JSONB DEFAULT '{}',
    output JSONB DEFAULT '{}',

    -- 执行状态
    status execution_status DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,

    -- 错误信息
    error_message TEXT,
    error_stack TEXT,

    -- 执行节点
    nodes JSONB DEFAULT '[]', -- [{id, name, status, started_at, completed_at, output}]

    -- 统计
    total_nodes INTEGER DEFAULT 0,
    completed_nodes INTEGER DEFAULT 0,
    failed_nodes INTEGER DEFAULT 0,

    -- 执行人
    executed_by UUID REFERENCES core.users(id),

    -- 元数据
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE workflow.executions IS '工作流执行记录表';
COMMENT ON COLUMN workflow.executions.workflow_id IS '工作流ID';
COMMENT ON COLUMN workflow.executions.trigger_type IS '触发类型';
COMMENT ON COLUMN workflow.executions.status IS '执行状态';
COMMENT ON COLUMN workflow.executions.nodes IS '执行节点信息';

-- 工作流节点执行记录表
CREATE TABLE IF NOT EXISTS workflow.node_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES workflow.executions(id) ON DELETE CASCADE,

    -- 节点信息
    node_id VARCHAR(100) NOT NULL,
    node_name VARCHAR(200),
    node_type VARCHAR(50), -- start, end, task, condition, parallel, loop

    -- 执行信息
    status execution_status DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,

    -- 输入输出
    input JSONB DEFAULT '{}',
    output JSONB DEFAULT '{}',

    -- 重试信息
    retry_count INTEGER DEFAULT 0,

    -- 错误信息
    error_message TEXT,
    error_stack TEXT,

    -- 元数据
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE workflow.node_executions IS '工作流节点执行记录表';
COMMENT ON COLUMN workflow.node_executions.execution_id IS '执行记录ID';
COMMENT ON COLUMN workflow.node_executions.node_id IS '节点ID';
COMMENT ON COLUMN workflow.node_executions.node_type IS '节点类型';

-- =====================================================
-- 审批流程表
-- =====================================================

-- 审批流程定义表
CREATE TABLE IF NOT EXISTS workflow.approval_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,

    -- 流程定义
    steps JSONB NOT NULL, -- [{step: 1, name: '', approver_type: 'user'|'role'|'dept', approver_ids: [], conditions: {}}]

    -- 配置
    auto_approve BOOLEAN DEFAULT FALSE,
    allow_delegate BOOLEAN DEFAULT TRUE,
    allow_reject BOOLEAN DEFAULT TRUE,
    allow_cancel BOOLEAN DEFAULT TRUE,

    -- 超时配置
    timeout_hours INTEGER DEFAULT 72,
    timeout_action VARCHAR(50) DEFAULT 'notify', -- notify, auto_approve, auto_reject

    -- 统计
    total_applications INTEGER DEFAULT 0,
    approved_count INTEGER DEFAULT 0,
    rejected_count INTEGER DEFAULT 0,

    -- 状态
    is_active BOOLEAN DEFAULT TRUE,

    -- 权限
    owner_id UUID REFERENCES core.users(id),
    org_id UUID REFERENCES core.organizations(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE workflow.approval_flows IS '审批流程定义表';
COMMENT ON COLUMN workflow.approval_flows.steps IS '审批步骤定义';

-- 审批申请表
CREATE TABLE IF NOT EXISTS workflow.approval_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_id UUID NOT NULL REFERENCES workflow.approval_flows(id),

    -- 申请信息
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(50), -- leave, expense, purchase, change_request

    -- 申请内容
    content JSONB DEFAULT '{}',
    attachments JSONB DEFAULT '[]',

    -- 申请人
    applicant_id UUID NOT NULL REFERENCES core.users(id),

    -- 当前状态
    current_step INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, cancelled

    -- 审批记录
    approval_records JSONB DEFAULT '[]', -- [{step, approver_id, action, comment, created_at}]

    -- 时间
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- 元数据
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE workflow.approval_applications IS '审批申请表';
COMMENT ON COLUMN workflow.approval_applications.flow_id IS '审批流程ID';
COMMENT ON COLUMN workflow.approval_applications.applicant_id IS '申请人ID';
COMMENT ON COLUMN workflow.approval_applications.current_step IS '当前步骤';
COMMENT ON COLUMN workflow.approval_applications.approval_records IS '审批记录';

-- =====================================================
-- 调度任务表
-- =====================================================

-- 调度任务表
CREATE TABLE IF NOT EXISTS workflow.scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,

    -- 任务类型
    task_type VARCHAR(50) NOT NULL, -- workflow, script, api, backup

    -- 任务配置
    task_config JSONB NOT NULL,

    -- 调度配置
    schedule_type VARCHAR(50) NOT NULL, -- once, interval, cron
    schedule_config JSONB NOT NULL, -- {cron: '', interval_seconds: 0, run_at: ''}

    -- 执行配置
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,
    timeout_seconds INTEGER DEFAULT 3600,

    -- 统计
    total_runs INTEGER DEFAULT 0,
    success_runs INTEGER DEFAULT 0,
    failure_runs INTEGER DEFAULT 0,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_run_status VARCHAR(50),
    next_run_at TIMESTAMP WITH TIME ZONE,

    -- 状态
    is_active BOOLEAN DEFAULT TRUE,

    -- 权限
    owner_id UUID REFERENCES core.users(id),
    org_id UUID REFERENCES core.organizations(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE workflow.scheduled_tasks IS '调度任务表';
COMMENT ON COLUMN workflow.scheduled_tasks.task_type IS '任务类型';
COMMENT ON COLUMN workflow.scheduled_tasks.schedule_type IS '调度类型';
COMMENT ON COLUMN workflow.scheduled_tasks.schedule_config IS '调度配置';

-- 调度任务执行记录表
CREATE TABLE IF NOT EXISTS workflow.task_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES workflow.scheduled_tasks(id) ON DELETE CASCADE,

    -- 执行信息
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,

    -- 执行状态
    status execution_status DEFAULT 'pending',

    -- 执行结果
    output JSONB DEFAULT '{}',

    -- 错误信息
    error_message TEXT,
    error_stack TEXT,

    -- 重试信息
    retry_count INTEGER DEFAULT 0,

    -- 元数据
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE workflow.task_executions IS '调度任务执行记录表';
COMMENT ON COLUMN workflow.task_executions.task_id IS '任务ID';
COMMENT ON COLUMN workflow.task_executions.scheduled_at IS '计划执行时间';
COMMENT ON COLUMN workflow.task_executions.status IS '执行状态';

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE '工作流管理表创建完成: 工作流定义、执行记录、审批流程、调度任务表已创建';
END $$;

-- =====================================================
-- YYC³-AI-Family AI智能体表结构
-- @file: 03_create_ai_tables.sql
-- @description: 创建AI智能体、模型、对话、知识库等AI相关表
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- AI智能体管理表
-- =====================================================

-- AI智能体表
CREATE TABLE IF NOT EXISTS ai.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type agent_type NOT NULL,
    description TEXT,
    avatar_url VARCHAR(500),
    status agent_status DEFAULT 'idle',
    version VARCHAR(20) DEFAULT '1.0.0',

    -- 能力配置
    capabilities JSONB DEFAULT '[]',
    skills JSONB DEFAULT '[]',
    tools JSONB DEFAULT '[]',

    -- 模型配置
    model_config JSONB DEFAULT '{
        "model": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 4096,
        "top_p": 1.0,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0
    }',

    -- 提示词配置
    system_prompt TEXT,
    user_prompt_template TEXT,
    prompt_variables JSONB DEFAULT '{}',

    -- 知识库配置
    knowledge_base_ids UUID[] DEFAULT '{}',
    retrieval_config JSONB DEFAULT '{
        "top_k": 5,
        "similarity_threshold": 0.7,
        "rerank": true
    }',

    -- 工作配置
    max_concurrent_tasks INTEGER DEFAULT 5,
    task_timeout_seconds INTEGER DEFAULT 300,
    retry_config JSONB DEFAULT '{
        "max_retries": 3,
        "retry_delay": 1000,
        "exponential_backoff": true
    }',

    -- 性能指标
    total_tasks_completed INTEGER DEFAULT 0,
    total_tasks_failed INTEGER DEFAULT 0,
    average_response_time_ms INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,

    -- 元数据
    metadata JSONB DEFAULT '{}',
    tags VARCHAR(100)[],

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE ai.agents IS 'AI智能体表';
COMMENT ON COLUMN ai.agents.id IS '智能体ID';
COMMENT ON COLUMN ai.agents.name IS '智能体名称';
COMMENT ON COLUMN ai.agents.code IS '智能体编码';
COMMENT ON COLUMN ai.agents.type IS '智能体类型';
COMMENT ON COLUMN ai.agents.status IS '智能体状态';
COMMENT ON COLUMN ai.agents.capabilities IS '能力列表';
COMMENT ON COLUMN ai.agents.skills IS '技能列表';
COMMENT ON COLUMN ai.agents.tools IS '工具列表';
COMMENT ON COLUMN ai.agents.model_config IS '模型配置';
COMMENT ON COLUMN ai.agents.system_prompt IS '系统提示词';
COMMENT ON COLUMN ai.agents.knowledge_base_ids IS '关联知识库ID列表';
COMMENT ON COLUMN ai.agents.max_concurrent_tasks IS '最大并发任务数';
COMMENT ON COLUMN ai.agents.total_tasks_completed IS '已完成任务总数';
COMMENT ON COLUMN ai.agents.success_rate IS '成功率';

-- AI智能体协作组表
CREATE TABLE IF NOT EXISTS ai.agent_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    type VARCHAR(50),

    -- 成员配置
    agent_ids UUID[] NOT NULL,
    leader_agent_id UUID REFERENCES ai.agents(id),

    -- 协作配置
    collaboration_mode VARCHAR(50) DEFAULT 'sequential', -- sequential, parallel, voting
    voting_strategy VARCHAR(50) DEFAULT 'majority', -- majority, unanimous, weighted
    max_rounds INTEGER DEFAULT 10,

    -- 通信配置
    communication_protocol JSONB DEFAULT '{
        "message_format": "json",
        "timeout_ms": 5000,
        "retry_count": 3
    }',

    -- 工作配置
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id)
);

COMMENT ON TABLE ai.agent_groups IS 'AI智能体协作组表';
COMMENT ON COLUMN ai.agent_groups.agent_ids IS '成员智能体ID列表';
COMMENT ON COLUMN ai.agent_groups.leader_agent_id IS '组长智能体ID';
COMMENT ON COLUMN ai.agent_groups.collaboration_mode IS '协作模式';

-- =====================================================
-- AI模型管理表
-- =====================================================

-- AI模型表
CREATE TABLE IF NOT EXISTS ai.models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL, -- openai, anthropic, google, custom
    model_type VARCHAR(50) NOT NULL, -- chat, completion, embedding, image
    version VARCHAR(20),
    description TEXT,

    -- API配置
    api_endpoint VARCHAR(500),
    api_key_encrypted TEXT,
    api_config JSONB DEFAULT '{}',

    -- 模型参数
    default_parameters JSONB DEFAULT '{
        "temperature": 0.7,
        "max_tokens": 4096,
        "top_p": 1.0
    }',

    -- 能力配置
    capabilities JSONB DEFAULT '[]',
    context_window INTEGER DEFAULT 4096,
    max_output_tokens INTEGER DEFAULT 4096,

    -- 定价配置
    pricing JSONB DEFAULT '{
        "input_cost_per_1k_tokens": 0.0,
        "output_cost_per_1k_tokens": 0.0
    }',

    -- 性能指标
    average_latency_ms INTEGER DEFAULT 0,
    availability DECIMAL(5,2) DEFAULT 100.00,

    -- 状态
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id)
);

COMMENT ON TABLE ai.models IS 'AI模型表';
COMMENT ON COLUMN ai.models.provider IS '模型提供商';
COMMENT ON COLUMN ai.models.model_type IS '模型类型';
COMMENT ON COLUMN ai.models.context_window IS '上下文窗口大小';
COMMENT ON COLUMN ai.models.pricing IS '定价配置';

-- =====================================================
-- 对话管理表
-- =====================================================

-- 对话会话表
CREATE TABLE IF NOT EXISTS ai.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai.agents(id),
    title VARCHAR(500),

    -- 上下文配置
    context JSONB DEFAULT '{}',
    variables JSONB DEFAULT '{}',

    -- 模型配置
    model_id UUID REFERENCES ai.models(id),
    model_parameters JSONB DEFAULT '{}',

    -- 统计信息
    message_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,4) DEFAULT 0.0000,

    -- 状态
    status VARCHAR(50) DEFAULT 'active', -- active, archived, deleted
    is_pinned BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,

    -- 元数据
    tags VARCHAR(100)[],
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE ai.conversations IS '对话会话表';
COMMENT ON COLUMN ai.conversations.user_id IS '用户ID';
COMMENT ON COLUMN ai.conversations.agent_id IS '智能体ID';
COMMENT ON COLUMN ai.conversations.message_count IS '消息数量';
COMMENT ON COLUMN ai.conversations.total_tokens IS '总Token数';
COMMENT ON COLUMN ai.conversations.total_cost IS '总成本';

-- 对话消息表
CREATE TABLE IF NOT EXISTS ai.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES ai.conversations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES ai.messages(id),

    -- 消息内容
    role VARCHAR(20) NOT NULL, -- system, user, assistant, function
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text', -- text, markdown, code, image, file

    -- 附件
    attachments JSONB DEFAULT '[]',

    -- Token统计
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,

    -- 成本
    cost DECIMAL(10,6) DEFAULT 0.000000,

    -- 模型信息
    model_id UUID REFERENCES ai.models(id),
    model_name VARCHAR(100),

    -- 元数据
    metadata JSONB DEFAULT '{}',

    -- 反馈
    feedback JSONB DEFAULT '{}', -- {rating: 1-5, comment: '', tags: []}

    -- 状态
    status VARCHAR(50) DEFAULT 'completed', -- pending, streaming, completed, failed, cancelled
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ai.messages IS '对话消息表';
COMMENT ON COLUMN ai.messages.conversation_id IS '对话ID';
COMMENT ON COLUMN ai.messages.role IS '消息角色';
COMMENT ON COLUMN ai.messages.content IS '消息内容';
COMMENT ON COLUMN ai.messages.prompt_tokens IS '提示Token数';
COMMENT ON COLUMN ai.messages.completion_tokens IS '完成Token数';

-- =====================================================
-- 知识库管理表
-- =====================================================

-- 知识库表
CREATE TABLE IF NOT EXISTS ai.knowledge_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,

    -- 向量配置
    embedding_model_id UUID REFERENCES ai.models(id),
    vector_dimension INTEGER DEFAULT 1536,
    distance_metric VARCHAR(50) DEFAULT 'cosine', -- cosine, euclidean, dot_product

    -- 检索配置
    retrieval_config JSONB DEFAULT '{
        "top_k": 5,
        "similarity_threshold": 0.7,
        "rerank_model": null
    }',

    -- 统计信息
    document_count INTEGER DEFAULT 0,
    chunk_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,

    -- 状态
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE,

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

COMMENT ON TABLE ai.knowledge_bases IS '知识库表';
COMMENT ON COLUMN ai.knowledge_bases.embedding_model_id IS '嵌入模型ID';
COMMENT ON COLUMN ai.knowledge_bases.vector_dimension IS '向量维度';
COMMENT ON COLUMN ai.knowledge_bases.document_count IS '文档数量';
COMMENT ON COLUMN ai.knowledge_bases.chunk_count IS '分块数量';

-- 知识库文档表
CREATE TABLE IF NOT EXISTS ai.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_base_id UUID NOT NULL REFERENCES ai.knowledge_bases(id) ON DELETE CASCADE,

    -- 文档信息
    title VARCHAR(500) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- file, url, text, api
    source_url VARCHAR(1000),
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    file_size BIGINT DEFAULT 0,

    -- 内容
    content TEXT,
    summary TEXT,

    -- 分块配置
    chunk_strategy VARCHAR(50) DEFAULT 'fixed', -- fixed, semantic, recursive
    chunk_size INTEGER DEFAULT 500,
    chunk_overlap INTEGER DEFAULT 50,

    -- 统计信息
    chunk_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,

    -- 状态
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,

    -- 元数据
    metadata JSONB DEFAULT '{}',
    tags VARCHAR(100)[],

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE ai.documents IS '知识库文档表';
COMMENT ON COLUMN ai.documents.knowledge_base_id IS '知识库ID';
COMMENT ON COLUMN ai.documents.source_type IS '来源类型';
COMMENT ON COLUMN ai.documents.chunk_count IS '分块数量';

-- 文档分块表（向量存储）
CREATE TABLE IF NOT EXISTS ai.document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES ai.documents(id) ON DELETE CASCADE,
    knowledge_base_id UUID NOT NULL REFERENCES ai.knowledge_bases(id) ON DELETE CASCADE,

    -- 分块信息
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,

    -- 向量
    embedding vector(1536),

    -- 元数据
    metadata JSONB DEFAULT '{}',

    -- 统计
    token_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(document_id, chunk_index)
);

COMMENT ON TABLE ai.document_chunks IS '文档分块表';
COMMENT ON COLUMN ai.document_chunks.embedding IS '向量嵌入';
COMMENT ON COLUMN ai.document_chunks.chunk_index IS '分块索引';

-- =====================================================
-- 提示词模板表
-- =====================================================

-- 提示词模板表
CREATE TABLE IF NOT EXISTS ai.prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50),
    description TEXT,

    -- 模板内容
    template TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- [{name: '', type: '', required: true, default: ''}]

    -- 示例
    examples JSONB DEFAULT '[]',

    -- 统计
    usage_count INTEGER DEFAULT 0,

    -- 状态
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE,

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

COMMENT ON TABLE ai.prompt_templates IS '提示词模板表';
COMMENT ON COLUMN ai.prompt_templates.template IS '模板内容';
COMMENT ON COLUMN ai.prompt_templates.variables IS '变量定义';

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE 'AI智能体表创建完成: 智能体、模型、对话、知识库、提示词模板表已创建';
END $$;

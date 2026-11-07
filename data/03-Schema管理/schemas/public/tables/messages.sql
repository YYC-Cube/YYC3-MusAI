-- =====================================================
-- YYC³-AI-Family 消息表定义
-- @file: messages.sql
-- @description: AI对话消息表结构定义
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- 对话消息表
CREATE TABLE IF NOT EXISTS ai.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES ai.conversations(id) ON DELETE CASCADE,
    
    -- 消息信息
    role VARCHAR(20) NOT NULL, -- user, assistant, system, tool
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text', -- text, markdown, json, image
    
    -- Token统计
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    
    -- 模型信息
    model_id UUID REFERENCES ai.models(id),
    model_name VARCHAR(100),
    
    -- 工具调用
    tool_calls JSONB DEFAULT '[]',
    tool_call_id VARCHAR(100),
    
    -- 向量嵌入
    embedding vector(1536),
    
    -- 元数据
    metadata JSONB DEFAULT '{}',
    
    -- 时间信息
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引优化
    sequence_number INTEGER DEFAULT 0
);

COMMENT ON TABLE ai.messages IS '对话消息表';
COMMENT ON COLUMN ai.messages.id IS '消息ID';
COMMENT ON COLUMN ai.messages.conversation_id IS '对话ID';
COMMENT ON COLUMN ai.messages.role IS '消息角色';
COMMENT ON COLUMN ai.messages.content IS '消息内容';
COMMENT ON COLUMN ai.messages.content_type IS '内容类型';
COMMENT ON COLUMN ai.messages.prompt_tokens IS '提示词Token数';
COMMENT ON COLUMN ai.messages.completion_tokens IS '完成Token数';
COMMENT ON COLUMN ai.messages.total_tokens IS '总Token数';
COMMENT ON COLUMN ai.messages.model_id IS '模型ID';
COMMENT ON COLUMN ai.messages.tool_calls IS '工具调用列表';
COMMENT ON COLUMN ai.messages.embedding IS '向量嵌入';
COMMENT ON COLUMN ai.messages.sequence_number IS '消息序号';

-- 创建消息向量索引（用于相似度搜索）
CREATE INDEX IF NOT EXISTS idx_messages_embedding ON ai.messages 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

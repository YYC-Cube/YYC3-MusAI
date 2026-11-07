-- =====================================================
-- YYC³-AI-Family pgvector扩展配置
-- @file: pgvector.sql
-- @description: 配置pgvector向量存储扩展
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- 创建pgvector扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 配置向量索引参数
SET ivfflat.probes = 10;

-- 创建向量相似度搜索函数
CREATE OR REPLACE FUNCTION ai.cosine_similarity(
    a vector,
    b vector
) RETURNS FLOAT AS $$
BEGIN
    RETURN 1 - (a <=> b);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

COMMENT ON FUNCTION ai.cosine_similarity(vector, vector) IS '计算向量余弦相似度';

CREATE OR REPLACE FUNCTION ai.euclidean_distance(
    a vector,
    b vector
) RETURNS FLOAT AS $$
BEGIN
    RETURN (a <-> b);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

COMMENT ON FUNCTION ai.euclidean_distance(vector, vector) IS '计算向量欧几里得距离';

CREATE OR REPLACE FUNCTION ai.inner_product(
    a vector,
    b vector
) RETURNS FLOAT AS $$
BEGIN
    RETURN (a <#> b);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

COMMENT ON FUNCTION ai.inner_product(vector, vector) IS '计算向量内积';

-- 向量搜索函数
CREATE OR REPLACE FUNCTION ai.search_similar_vectors(
    query_vector vector,
    table_name VARCHAR DEFAULT 'ai.document_chunks',
    vector_column VARCHAR DEFAULT 'embedding',
    top_k INTEGER DEFAULT 10,
    similarity_threshold FLOAT DEFAULT 0.7
) RETURNS TABLE (
    id UUID,
    similarity FLOAT
) AS $$
DECLARE
    query TEXT;
BEGIN
    query := format('
        SELECT id, 1 - (%I <=> $1) as similarity
        FROM %I
        WHERE 1 - (%I <=> $1) >= $2
        ORDER BY %I <=> $1
        LIMIT $3
    ', vector_column, table_name, vector_column, vector_column);
    
    RETURN QUERY EXECUTE query USING query_vector, similarity_threshold, top_k;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION ai.search_similar_vectors(vector, VARCHAR, VARCHAR, INTEGER, FLOAT) IS '向量相似度搜索';

-- 创建向量索引建议
-- 对于大规模向量数据，建议使用IVFFlat或HNSW索引
-- CREATE INDEX idx_document_chunks_embedding ON ai.document_chunks 
--     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- 
-- CREATE INDEX idx_messages_embedding ON ai.messages 
--     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

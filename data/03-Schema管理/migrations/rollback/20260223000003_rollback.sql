-- =====================================================
-- YYC³-AI-Family AI智能体表回滚脚本
-- @file: 20260223000003_rollback.sql
-- @description: 回滚AI智能体表创建操作
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- 删除AI智能体相关表（按依赖顺序倒序删除）
DROP TABLE IF EXISTS ai.message_feedback CASCADE;
DROP TABLE IF EXISTS ai.messages CASCADE;
DROP TABLE IF EXISTS ai.conversations CASCADE;
DROP TABLE IF EXISTS ai.document_chunks CASCADE;
DROP TABLE IF EXISTS ai.documents CASCADE;
DROP TABLE IF EXISTS ai.knowledge_bases CASCADE;
DROP TABLE IF EXISTS ai.prompt_templates CASCADE;
DROP TABLE IF EXISTS ai.models CASCADE;
DROP TABLE IF EXISTS ai.agent_group_members CASCADE;
DROP TABLE IF EXISTS ai.agent_groups CASCADE;
DROP TABLE IF EXISTS ai.agents CASCADE;

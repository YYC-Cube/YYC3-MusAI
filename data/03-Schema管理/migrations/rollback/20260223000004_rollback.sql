-- =====================================================
-- YYC³-AI-Family 工作流表回滚脚本
-- @file: 20260223000004_rollback.sql
-- @description: 回滚工作流表创建操作
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- 删除工作流相关表（按依赖顺序倒序删除）
DROP TABLE IF EXISTS workflow.scheduled_task_logs CASCADE;
DROP TABLE IF EXISTS workflow.scheduled_tasks CASCADE;
DROP TABLE IF EXISTS workflow.approval_records CASCADE;
DROP TABLE IF EXISTS workflow.approval_applications CASCADE;
DROP TABLE IF EXISTS workflow.approval_flows CASCADE;
DROP TABLE IF EXISTS workflow.node_executions CASCADE;
DROP TABLE IF EXISTS workflow.executions CASCADE;
DROP TABLE IF EXISTS workflow.definitions CASCADE;

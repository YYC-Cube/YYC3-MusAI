-- =====================================================
-- YYC³-AI-Family 扩展管理表回滚脚本
-- @file: 20260223000006_rollback.sql
-- @description: 回滚扩展管理表创建操作
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- 删除扩展管理相关表（按依赖顺序倒序删除）
DROP TABLE IF EXISTS extension.webhook_events CASCADE;
DROP TABLE IF EXISTS extension.webhooks CASCADE;
DROP TABLE IF EXISTS extension.api_keys CASCADE;
DROP TABLE IF EXISTS extension.plugin_configs CASCADE;
DROP TABLE IF EXISTS extension.plugins CASCADE;
DROP TABLE IF EXISTS extension.integrations CASCADE;

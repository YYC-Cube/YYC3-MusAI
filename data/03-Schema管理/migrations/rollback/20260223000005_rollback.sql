-- =====================================================
-- YYC³-AI-Family 审计监控表回滚脚本
-- @file: 20260223000005_rollback.sql
-- @description: 回滚审计监控表创建操作
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- 删除审计日志分区表
DROP TABLE IF EXISTS audit.logs_default CASCADE;
DROP TABLE IF EXISTS audit.logs_2026_03 CASCADE;
DROP TABLE IF EXISTS audit.logs_2026_02 CASCADE;

-- 删除审计日志主表
DROP TABLE IF EXISTS audit.logs CASCADE;

-- 删除监控相关表（按依赖顺序倒序删除）
DROP TABLE IF EXISTS monitor.notifications CASCADE;
DROP TABLE IF EXISTS monitor.alerts CASCADE;
DROP TABLE IF EXISTS monitor.alert_rules CASCADE;
DROP TABLE IF EXISTS monitor.notification_channels CASCADE;
DROP TABLE IF EXISTS monitor.metrics CASCADE;
DROP TABLE IF EXISTS monitor.devices CASCADE;
